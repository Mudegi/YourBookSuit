import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/[orgSlug]/debit-notes/[id] - Get debit note details
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });

    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    const debitNote = await prisma.debitNote.findFirst({
      where: {
        id: params.id,
        organizationId: org.id,
      },
      include: {
        customer: true,
        invoice: {
          include: {
            items: true,
          },
        },
        branch: true,
        lineItems: {
          include: {
            product: true,
            account: true,
          },
        },
        payments: true,
        transaction: {
          include: {
            ledgerEntries: {
              include: {
                account: true,
              },
            },
          },
        },
      },
    });

    if (!debitNote) {
      return NextResponse.json({ success: false, error: 'Debit note not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: debitNote,
    });
  } catch (error: any) {
    console.error('Error fetching debit note:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch debit note' },
      { status: 500 }
    );
  }
}

// PUT /api/[orgSlug]/debit-notes/[id] - Update debit note
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reason, description, internalNotes, dueDate, lineItems } = body;

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });

    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    const existingNote = await prisma.debitNote.findFirst({
      where: {
        id: params.id,
        organizationId: org.id,
      },
    });

    if (!existingNote) {
      return NextResponse.json({ success: false, error: 'Debit note not found' }, { status: 404 });
    }

    if (existingNote.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: 'Only draft debit notes can be edited' },
        { status: 400 }
      );
    }

    // Recalculate totals if line items provided
    let subtotal = existingNote.subtotal;
    let taxAmount = existingNote.taxAmount;
    let totalAmount = existingNote.totalAmount;

    if (lineItems) {
      subtotal = 0;
      taxAmount = 0;

      for (const item of lineItems) {
        const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
        const itemTax = (itemSubtotal * parseFloat(item.taxRate || 0)) / 100;
        subtotal += itemSubtotal;
        taxAmount += itemTax;
      }

      totalAmount = subtotal + taxAmount;

      await prisma.debitNoteItem.deleteMany({
        where: { debitNoteId: params.id },
      });
    }

    const debitNote = await prisma.debitNote.update({
      where: { id: params.id },
      data: {
        reason: reason || existingNote.reason,
        description: description || existingNote.description,
        internalNotes: internalNotes !== undefined ? internalNotes : existingNote.internalNotes,
        dueDate: dueDate ? new Date(dueDate) : existingNote.dueDate,
        subtotal,
        taxAmount,
        totalAmount,
        balanceAmount: totalAmount,
        ...(lineItems && {
          lineItems: {
            create: lineItems.map((item: any) => {
              const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
              const itemTax = (itemSubtotal * parseFloat(item.taxRate || 0)) / 100;

              return {
                productId: item.productId || undefined,
                description: item.description,
                quantity: parseFloat(item.quantity),
                unitPrice: parseFloat(item.unitPrice),
                taxRateId: item.taxRateId || undefined,
                taxRate: parseFloat(item.taxRate || 0),
                taxAmount: itemTax,
                subtotal: itemSubtotal,
                totalAmount: itemSubtotal + itemTax,
                accountId: item.accountId || undefined,
              };
            }),
          },
        }),
      },
      include: {
        customer: true,
        invoice: true,
        lineItems: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: debitNote,
      message: 'Debit note updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating debit note:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update debit note' },
      { status: 500 }
    );
  }
}

// DELETE /api/[orgSlug]/debit-notes/[id] - Delete debit note (only DRAFT)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });

    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    const existingNote = await prisma.debitNote.findFirst({
      where: {
        id: params.id,
        organizationId: org.id,
      },
    });

    if (!existingNote) {
      return NextResponse.json({ success: false, error: 'Debit note not found' }, { status: 404 });
    }

    if (existingNote.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: 'Only draft debit notes can be deleted' },
        { status: 400 }
      );
    }

    await prisma.debitNote.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Debit note deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting debit note:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete debit note' },
      { status: 500 }
    );
  }
}
