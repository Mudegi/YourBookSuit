import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BillService } from '@/services/accounts-payable/bill.service';
import { z } from 'zod';
import { BillStatus } from '@prisma/client';

// Zod schema for bill item
const billItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  productId: z.string().optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  accountId: z.string().optional(), // Optional - required only for non-inventory items
  taxAmount: z.number().min(0, 'Tax amount cannot be negative').default(0),
  taxRate: z.number().optional().default(0),
  taxCategory: z.enum(['STANDARD', 'ZERO', 'EXEMPT']).optional().default('STANDARD'),
  claimInputTax: z.boolean().optional().default(true),
}).refine(
  (data) => data.productId || data.accountId,
  {
    message: 'Either productId (for inventory) or accountId (for expenses) is required',
    path: ['accountId'],
  }
);

// Zod schema for bill creation (with URA fields)
const createBillSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  billDate: z.string().transform((str) => new Date(str)),
  dueDate: z.string().transform((str) => new Date(str)),
  billNumber: z.string().optional(),
  items: z.array(billItemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional(),
  referenceNumber: z.string().optional(),
  vendorInvoiceNo: z.string().optional(),
  taxCategory: z.enum(['STANDARD', 'ZERO', 'EXEMPT']).optional(),
  whtApplicable: z.boolean().optional(),
  whtRate: z.number().min(0).max(100).optional(),
  whtAmount: z.number().min(0).optional(),
});

/**
 * GET /api/orgs/[orgSlug]/bills
 * List all bills with optional filters
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    let organizationId = request.headers.get('x-organization-id');

    // Fallback: resolve organization by slug if header is missing
    if (!organizationId) {
      const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
      if (!org) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }
      organizationId = org.id;
    }

    const { searchParams } = new URL(request.url);
    const nextReference = searchParams.get('nextReference') === 'true';

    // Fast path: return next reference number
    if (nextReference) {
      const count = await prisma.bill.count({ where: { organizationId } });
      const nextNumber = (count + 1).toString().padStart(5, '0');
      return NextResponse.json({ nextReference: nextNumber });
    }

    const status = searchParams.get('status');
    const vendorId = searchParams.get('vendorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const branchId = searchParams.get('branchId') || undefined;

    // Build where clause
    const where: any = {
      organizationId,
      ...(branchId ? { branchId } : {}),
    };

    const normalizeFilterStatus = (value: string | null) => {
      if (!value) return null;
      switch (value.toUpperCase()) {
        case 'SENT':
          return BillStatus.SUBMITTED;
        case 'PAID':
          return BillStatus.PAID;
        case 'OVERDUE':
          return BillStatus.OVERDUE;
        case 'CANCELLED':
          return BillStatus.CANCELLED;
        case 'DRAFT':
        default:
          return BillStatus.DRAFT;
      }
    };

    const dbStatusFilter = normalizeFilterStatus(status);
    if (dbStatusFilter) {
      where.status = dbStatusFilter;
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (startDate) {
      where.billDate = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.billDate = {
        ...where.billDate,
        lte: new Date(endDate),
      };
    }

    const bills = await prisma.bill.findMany({
      where,
      orderBy: { billDate: 'desc' },
      include: {
        vendor: {
          select: {
            id: true,
            companyName: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    // Normalize Prisma result to UI-friendly shape
    const mapStatusToUi = (s: BillStatus | string) => {
      if (String(s) === BillStatus.SUBMITTED) return 'SENT';
      return String(s);
    };

    const normalizedBills = bills.map((b: any) => ({
      id: b.id,
      billNumber: b.billNumber,
      billDate: b.billDate,
      dueDate: b.dueDate,
      subtotalAmount: Number(b.subtotal),
      taxAmount: Number(b.taxAmount),
      totalAmount: Number(b.total),
      amountPaid: Number(b.amountPaid || 0),
      amountDue: Number(b.amountDue || b.total),
      status: mapStatusToUi(b.status),
      vendor: { id: b.vendor.id, name: b.vendor.companyName },
      _count: b._count,
    }));

    // Calculate summary statistics based on normalized bills
    // Outstanding = approved/submitted obligations that are not yet paid (DRAFT excluded — no GL posting yet)
    const unpaidStatuses = [String(BillStatus.SUBMITTED), String(BillStatus.APPROVED), String(BillStatus.OVERDUE), 'PARTIALLY_PAID', 'SENT'];
    const stats = {
      total: normalizedBills.length,
      draft: normalizedBills.filter((b) => b.status === String(BillStatus.DRAFT)).length,
      draftAmount: normalizedBills
        .filter((b) => b.status === String(BillStatus.DRAFT))
        .reduce((sum, b) => sum + b.totalAmount, 0),
      outstanding: normalizedBills.filter((b) => unpaidStatuses.includes(b.status)).length,
      outstandingAmount: normalizedBills
        .filter((b) => unpaidStatuses.includes(b.status))
        .reduce((sum, b) => sum + b.totalAmount, 0),
      totalAmount: normalizedBills.reduce((sum, b) => sum + b.totalAmount, 0),
      paid: normalizedBills.filter((b) => b.status === String(BillStatus.PAID)).length,
      paidAmount: normalizedBills
        .filter((b) => b.status === String(BillStatus.PAID))
        .reduce((sum, b) => sum + b.totalAmount, 0),
      overdue: normalizedBills.filter((b) => b.status === String(BillStatus.OVERDUE)).length,
      overdueAmount: normalizedBills
        .filter((b) => b.status === String(BillStatus.OVERDUE))
        .reduce((sum, b) => sum + b.totalAmount, 0),
    };

    return NextResponse.json({
      bills: normalizedBills,
      stats,
    });
  } catch (error) {
    console.error('Error fetching bills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[orgSlug]/bills
 * Create a new bill with automatic GL posting via DoubleEntryService
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
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
    const validatedData = createBillSchema.parse(body);

    // Use BillService to create bill with GL posting
    const bill = await BillService.createBill(
      {
        vendorId: validatedData.vendorId,
        billDate: validatedData.billDate,
        dueDate: validatedData.dueDate,
        billNumber: validatedData.billNumber,
        notes: validatedData.notes,
        referenceNumber: validatedData.referenceNumber,
        vendorInvoiceNo: validatedData.vendorInvoiceNo,
        taxCategory: validatedData.taxCategory,
        whtApplicable: validatedData.whtApplicable,
        whtRate: validatedData.whtRate,
        whtAmount: validatedData.whtAmount,
        items: validatedData.items,
      },
      organizationId,
      userId
    );

    // Update inventory from bill items
    await updateInventoryFromBill(bill, organizationId);

    return NextResponse.json(getResponseData(bill), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating bill:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create bill' },
      { status: 500 }
    );
  }
}

// Helper function to update inventory from bill items
async function updateInventoryFromBill(
  bill: any,
  organizationId: string
) {
  for (const item of bill.items) {
    if (!item.productId) continue;

    // Get product to check if it tracks inventory
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { id: true, trackInventory: true, name: true }
    });

    if (!product || !product.trackInventory) continue;

    const quantity = Number(item.quantity);
    const unitCost = Number(item.unitPrice); // Purchase cost

    // Find or create inventory item (keyed by productId + warehouseLocation)
    const existingInventory = await prisma.inventoryItem.findUnique({
      where: {
        productId_warehouseLocation: {
          productId: product.id,
          warehouseLocation: 'Main',
        },
      },
    });

    if (existingInventory) {
      // Calculate weighted average cost
      const oldQty = Number(existingInventory.quantityOnHand);
      const oldCost = Number(existingInventory.averageCost);
      const newQty = oldQty + quantity;
      const newAvgCost = newQty > 0 
        ? ((oldQty * oldCost) + (quantity * unitCost)) / newQty
        : unitCost;
      const newTotalValue = newQty * newAvgCost;

      // Update inventory
      await prisma.inventoryItem.update({
        where: { id: existingInventory.id },
        data: {
          quantityOnHand: newQty,
          quantityAvailable: Number(existingInventory.quantityAvailable) + quantity,
          averageCost: newAvgCost,
          totalValue: newTotalValue,
        },
      });
    } else {
      // Create new inventory item
      await prisma.inventoryItem.create({
        data: {
          productId: product.id,
          warehouseLocation: 'Main',
          quantityOnHand: quantity,
          quantityAvailable: quantity,
          averageCost: unitCost,
          totalValue: quantity * unitCost,
        },
      });
    }

    // Create stock movement record
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        movementType: 'PURCHASE',
        quantity: quantity,
        unitCost: unitCost,
        totalCost: quantity * unitCost,
        balanceAfter: (existingInventory ? Number(existingInventory.quantityOnHand) : 0) + quantity,
        referenceType: 'BILL',
        referenceId: bill.id,
        referenceNumber: bill.billNumber,
        notes: `Purchase from ${bill.vendor.companyName} - Bill ${bill.billNumber}`,
        movementDate: bill.billDate,
      },
    });
  }
}

// Helper function to format bill response
function getResponseData(bill: any) {
  return {
    id: bill.id,
    billNumber: bill.billNumber,
    billDate: bill.billDate,
    dueDate: bill.dueDate,
    subtotalAmount: Number(bill.subtotal),
    taxAmount: Number(bill.taxAmount),
    totalAmount: Number(bill.total),
    status: bill.status,
    vendor: { id: bill.vendor.id, name: bill.vendor.companyName },
    items: bill.items.map((item: any) => ({
      id: item.id,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxAmount: Number(item.taxAmount),
      totalAmount: Number(item.total),
      accountId: item.accountId,
    })),
    transactionId: bill.transactionId,
  };
}
