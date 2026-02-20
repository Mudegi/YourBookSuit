import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/orgs/[orgSlug]/credit-notes/[id] - Get credit note details
export async function GET(req: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true }
    });

    if (!org) return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });

    const creditNote = await prisma.creditNote.findFirst({
      where: { id: params.id, organizationId: org.id },
      include: {
        customer: { select: { id: true, customerNumber: true, companyName: true, firstName: true, lastName: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
        branch: { select: { id: true, name: true } },
        lineItems: {
          include: { product: { select: { id: true, name: true, sku: true } } },
          orderBy: { createdAt: 'asc' }
        },
        applications: {
          include: {
            invoice: { select: { id: true, invoiceNumber: true } }
          },
          orderBy: { appliedDate: 'desc' }
        }
      }
    });

    if (!creditNote) return NextResponse.json({ success: false, error: 'Credit note not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: creditNote });
  } catch (error: any) {
    console.error('Error fetching credit note:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/orgs/[orgSlug]/credit-notes/[id] - Update credit note
export async function PUT(req: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true }
    });

    if (!org) return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });

    const existing = await prisma.creditNote.findFirst({
      where: { id: params.id, organizationId: org.id }
    });

    if (!existing) return NextResponse.json({ success: false, error: 'Credit note not found' }, { status: 404 });

    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ success: false, error: 'Only DRAFT credit notes can be edited' }, { status: 400 });
    }

    const { customerId, invoiceId, branchId, creditDate, reason, description, internalNotes, lineItems } = body;

    // Recalculate totals
    const subtotal = lineItems.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice));
    }, 0);

    const totalTax = lineItems.reduce((sum: number, item: any) => {
      const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
      return sum + (itemSubtotal * parseFloat(item.taxRate) / 100);
    }, 0);

    const total = subtotal + totalTax;

    // Update in transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Delete existing line items
      await tx.creditNoteItem.deleteMany({ where: { creditNoteId: params.id } });

      // Update credit note
      return await tx.creditNote.update({
        where: { id: params.id },
        data: {
          customerId,
          invoiceId: invoiceId || null,
          branchId: branchId || null,
          creditDate: new Date(creditDate),
          reason,
          description,
          internalNotes,
          subtotal,
          taxAmount: totalTax,
          totalAmount: total,
          remainingAmount: total,
          lineItems: {
            create: lineItems.map((item: any) => {
              const qty = parseFloat(item.quantity);
              const price = parseFloat(item.unitPrice);
              const rate = parseFloat(item.taxRate || 0);
              const itemSubtotal = qty * price;
              const itemTax = itemSubtotal * (rate / 100);
              return {
                description: item.description,
                quantity: qty,
                unitPrice: price,
                taxRate: rate,
                taxAmount: itemTax,
                subtotal: itemSubtotal,
                totalAmount: itemSubtotal + itemTax,
                productId: item.productId || null,
                accountId: item.accountId || null,
              };
            })
          }
        },
        include: {
          customer: true,
          invoice: true,
          lineItems: true
        }
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating credit note:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/orgs/[orgSlug]/credit-notes/[id] - Delete credit note
export async function DELETE(req: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true }
    });

    if (!org) return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });

    const existing = await prisma.creditNote.findFirst({
      where: { id: params.id, organizationId: org.id }
    });

    if (!existing) return NextResponse.json({ success: false, error: 'Credit note not found' }, { status: 404 });

    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ success: false, error: 'Only DRAFT credit notes can be deleted' }, { status: 400 });
    }

    await prisma.creditNote.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting credit note:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
