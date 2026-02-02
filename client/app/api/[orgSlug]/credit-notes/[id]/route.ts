import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/[orgSlug]/credit-notes/[id] - Get credit note details
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

    const creditNote = await prisma.creditNote.findFirst({
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
        applications: {
          include: {
            invoice: {
              select: {
                invoiceNumber: true,
                total: true,
                amountDue: true,
              },
            },
          },
        },
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

    if (!creditNote) {
      return NextResponse.json({ success: false, error: 'Credit note not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: creditNote,
    });
  } catch (error: any) {
    console.error('Error fetching credit note:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch credit note' },
      { status: 500 }
    );
  }
}

// PUT /api/[orgSlug]/credit-notes/[id] - Update credit note
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
    const { reason, description, internalNotes, lineItems } = body;

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });

    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    // Check if credit note exists and is in DRAFT status
    const existingNote = await prisma.creditNote.findFirst({
      where: {
        id: params.id,
        organizationId: org.id,
      },
    });

    if (!existingNote) {
      return NextResponse.json({ success: false, error: 'Credit note not found' }, { status: 404 });
    }

    if (existingNote.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: 'Only draft credit notes can be edited' },
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

      // Delete existing line items
      await prisma.creditNoteItem.deleteMany({
        where: { creditNoteId: params.id },
      });
    }

    // Update credit note
    const creditNote = await prisma.creditNote.update({
      where: { id: params.id },
      data: {
        reason: reason || existingNote.reason,
        description: description || existingNote.description,
        internalNotes: internalNotes !== undefined ? internalNotes : existingNote.internalNotes,
        subtotal,
        taxAmount,
        totalAmount,
        remainingAmount: totalAmount, // Reset remaining amount
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
      data: creditNote,
      message: 'Credit note updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating credit note:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update credit note' },
      { status: 500 }
    );
  }
}

// DELETE /api/[orgSlug]/credit-notes/[id] - Delete credit note (only DRAFT)
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

    // Check if credit note exists and is in DRAFT status
    const existingNote = await prisma.creditNote.findFirst({
      where: {
        id: params.id,
        organizationId: org.id,
      },
    });

    if (!existingNote) {
      return NextResponse.json({ success: false, error: 'Credit note not found' }, { status: 404 });
    }

    if (existingNote.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: 'Only draft credit notes can be deleted' },
        { status: 400 }
      );
    }

    await prisma.creditNote.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Credit note deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting credit note:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete credit note' },
      { status: 500 }
    );
  }
}
