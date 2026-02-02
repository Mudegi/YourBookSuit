import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BillService } from '@/services/accounts-payable/bill.service';
import { z } from 'zod';

// Zod schema for bill status update
const updateBillSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']),
});

// Zod schema for editing bill (header + items)
const editBillItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  productId: z.string().optional(),
  accountId: z.string().optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  taxAmount: z.number().min(0, 'Tax amount cannot be negative').default(0),
});

const editBillSchema = z.object({
  billDate: z.string().transform((str) => new Date(str)),
  dueDate: z.string().transform((str) => new Date(str)),
  billNumber: z.string().optional(),
  notes: z.string().optional(),
  referenceNumber: z.string().optional(),
  items: z.array(editBillItemSchema).min(1, 'At least one item is required'),
});

/**
 * GET /api/orgs/[orgSlug]/bills/[id]
 * Get a single bill by ID with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const organizationId = request.headers.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const bill = await prisma.bill.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      include: {
        vendor: true,
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
                accountType: true,
              },
            },
          },
        },
      },
    });

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const normalized = {
      id: bill.id,
      billNumber: bill.billNumber,
      billDate: bill.billDate,
      dueDate: bill.dueDate,
      subtotalAmount: Number(bill.subtotal),
      taxAmount: Number(bill.taxAmount),
      totalAmount: Number(bill.total),
      status: String(bill.status),
      notes: bill.notes ?? null,
      referenceNumber: bill.vendorInvoiceNo ?? null,
      vendor: {
        id: bill.vendor.id,
        name: bill.vendor.companyName,
        email: bill.vendor.email,
        phone: bill.vendor.phone,
      },
      items: bill.items.map((item) => ({
        id: item.id,
        lineNumber: item.sortOrder,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        taxAmount: Number(item.taxAmount),
        totalAmount: Number(item.total),
        account: item.account
          ? {
              id: item.account.id,
              code: item.account.code,
              name: item.account.name,
              accountType: item.account.accountType,
            }
          : null,
      })),
    };

    return NextResponse.json(normalized);
  } catch (error) {
    console.error('Error fetching bill:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bill' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orgs/[orgSlug]/bills/[id]
 * Update bill status (only status can be updated)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const organizationId = request.headers.get('x-organization-id');
    const userId = request.headers.get('x-user-id');

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: 'Organization or user not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateBillSchema.parse(body);

    // Check if bill exists
    const existingBill = await prisma.bill.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
    });

    if (!existingBill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Only allow updates for DRAFT or SENT bills
    if (existingBill.status === 'PAID' || existingBill.status === 'CANCELLED') {
      return NextResponse.json(
        { error: `Cannot update a ${existingBill.status.toLowerCase()} bill` },
        { status: 400 }
      );
    }

    // Update bill status using BillService
    const updatedBill = await BillService.updateBillStatus(
      params.id,
      validatedData.status,
      organizationId,
      userId
    );
    // Normalize status for UI (map SUBMITTED back to SENT)
    const status = updatedBill.status === 'SUBMITTED' ? 'SENT' : String(updatedBill.status);
    return NextResponse.json({ ...updatedBill, status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating bill:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update bill' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orgs/[orgSlug]/bills/[id]
 * Edit a bill (header + items). Only allowed for DRAFT bills.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const organizationId = request.headers.get('x-organization-id');
    const userId = request.headers.get('x-user-id');

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: 'Organization or user not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = editBillSchema.parse(body);

    // Check bill exists and is editable
    const existingBill = await prisma.bill.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!existingBill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }
    if (existingBill.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only DRAFT bills can be edited' },
        { status: 400 }
      );
    }

    // Validate accounts exist when provided
    const accountIds = data.items.map((i) => i.accountId).filter(Boolean) as string[];
    if (accountIds.length > 0) {
      const accounts = await prisma.chartOfAccount.findMany({
        where: { id: { in: accountIds }, organizationId, isActive: true },
      });
      if (accounts.length !== accountIds.length) {
        return NextResponse.json(
          { error: 'One or more accounts not found' },
          { status: 400 }
        );
      }
    }

    // Calculate totals
    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxTotal = data.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    const total = subtotal + taxTotal;

    // Update bill and replace items in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update bill header and totals
      const bill = await tx.bill.update({
        where: { id: params.id },
        data: {
          billDate: data.billDate,
          dueDate: data.dueDate,
          billNumber: data.billNumber ?? existingBill.billNumber,
          notes: data.notes,
          subtotal: subtotal.toString(),
          taxAmount: taxTotal.toString(),
          total: total.toString(),
          amountDue: (total - Number(existingBill.amountPaid)).toString(),
          vendorInvoiceNo: data.referenceNumber ?? existingBill.vendorInvoiceNo ?? null,
        },
      });

      // Replace items
      await tx.billItem.deleteMany({ where: { billId: params.id } });
      await tx.billItem.createMany({
        data: data.items.map((item, idx) => ({
          billId: params.id,
          description: item.description,
          productId: item.productId ?? null,
          accountId: item.accountId ?? null,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          taxAmount: (item.taxAmount || 0).toString(),
          total: (item.quantity * item.unitPrice + (item.taxAmount || 0)).toString(),
          sortOrder: idx,
        })),
      });

      return bill;
    });

    return NextResponse.json({ success: true, id: updated.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error editing bill:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to edit bill' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orgs/[orgSlug]/bills/[id]
 * Delete a bill (only DRAFT bills can be deleted)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const organizationId = request.headers.get('x-organization-id');
    const userId = request.headers.get('x-user-id');

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: 'Organization or user not found' },
        { status: 404 }
      );
    }

    const bill = await prisma.bill.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Only allow deletion of DRAFT bills
    if (bill.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft bills can be deleted. Use void for posted bills.' },
        { status: 400 }
      );
    }

    // Delete bill and associated transaction
    await prisma.$transaction(async (tx) => {
      // Delete bill items
      await tx.billItem.deleteMany({
        where: { billId: params.id },
      });

      // Delete bill
      await tx.bill.delete({
        where: { id: params.id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bill:', error);
    return NextResponse.json(
      { error: 'Failed to delete bill' },
      { status: 500 }
    );
  }
}
