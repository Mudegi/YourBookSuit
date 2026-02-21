import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

const include = {
  customer: {
    select: {
      id: true, firstName: true, lastName: true, companyName: true,
      email: true, phone: true, billingAddress: true, shippingAddress: true,
    },
  },
  items: {
    include: { product: { select: { id: true, name: true, sku: true } } },
    orderBy: { sortOrder: 'asc' as const },
  },
};

// ─── GET: Single estimate ─────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const estimate = await prisma.estimate.findFirst({
      where: { id: params.id, organizationId },
      include,
    });

    if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: estimate });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── PATCH: Update estimate (content OR status transition) ────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);
    const body = await request.json();

    const existing = await prisma.estimate.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!existing) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });

    // ── Status-only transition ──────────────────────────────────────────
    if (body.status && Object.keys(body).length === 1) {
      const statusTimestamps: Record<string, object> = {
        SENT:     { sentAt: new Date() },
        ACCEPTED: { acceptedAt: new Date() },
        DECLINED: { declinedAt: new Date() },
      };
      const updated = await prisma.estimate.update({
        where: { id: params.id },
        data: { status: body.status, ...( statusTimestamps[body.status] || {}) },
        include,
      });
      return NextResponse.json({ success: true, data: updated });
    }

    // ── Full update (DRAFT only editing is enforced on the client) ──────
    const { items, ...headerFields } = body;

    const updateData: any = {};
    if (headerFields.customerId)   updateData.customerId    = headerFields.customerId;
    if (headerFields.estimateDate) updateData.estimateDate  = new Date(headerFields.estimateDate);
    if (headerFields.expirationDate) updateData.expirationDate = new Date(headerFields.expirationDate);
    if (headerFields.currency)     updateData.currency      = headerFields.currency;
    if (headerFields.exchangeRate) updateData.exchangeRate  = headerFields.exchangeRate;
    if (headerFields.notes !== undefined)     updateData.notes     = headerFields.notes;
    if (headerFields.terms !== undefined)     updateData.terms     = headerFields.terms;
    if (headerFields.reference !== undefined) updateData.reference = headerFields.reference;
    if (headerFields.status)       updateData.status        = headerFields.status;

    if (items) {
      // Recalculate totals
      const taxCalculationMethod = headerFields.taxCalculationMethod || existing.taxCalculationMethod;
      let subtotal = 0, taxAmount = 0, discountAmount = 0;

      const newItems = items.map((item: any, index: number) => {
        const qty    = parseFloat(item.quantity) || 0;
        const price  = parseFloat(item.unitPrice) || 0;
        const discPct = parseFloat(item.discountPercent) || 0;
        const discAmt = parseFloat(item.discount) || (qty * price * discPct / 100);
        const taxRate = parseFloat(item.taxRate) || 0;
        const itemSubtotal = qty * price;
        const itemAfterDisc = itemSubtotal - discAmt;
        const itemTax = taxCalculationMethod === 'INCLUSIVE'
          ? itemAfterDisc - (itemAfterDisc / (1 + taxRate / 100))
          : itemAfterDisc * (taxRate / 100);
        const itemTotal = taxCalculationMethod === 'INCLUSIVE'
          ? itemAfterDisc
          : itemAfterDisc + itemTax;

        subtotal += itemSubtotal;
        taxAmount += itemTax;
        discountAmount += discAmt;

        return {
          productId:    item.productId  || null,
          serviceId:    item.serviceId  || null,
          description:  item.description || '',
          isOptional:   item.isOptional || false,
          quantity:     qty,
          unitPrice:    price,
          discount:     discAmt,
          discountPercent: discPct || null,
          taxRate,
          taxAmount:    itemTax,
          taxCategory:  item.taxCategory || null,
          taxRateId:    item.taxRateId || null,
          taxExempt:    item.taxExempt  || false,
          subtotal:     itemSubtotal,
          total:        itemTotal,
          sortOrder:    item.sortOrder ?? index,
          notes:        item.notes || null,
        };
      });

      const shipping = parseFloat(headerFields.shippingAmount || existing.shippingAmount.toString()) || 0;
      updateData.subtotal       = subtotal;
      updateData.taxAmount      = taxAmount;
      updateData.discountAmount = discountAmount;
      updateData.shippingAmount = shipping;
      updateData.total          = subtotal - discountAmount + taxAmount + shipping;
      updateData.taxCalculationMethod = taxCalculationMethod;

      // Replace items
      await prisma.estimateItem.deleteMany({ where: { estimateId: params.id } });
      updateData.items = { create: newItems };
    }

    const updated = await prisma.estimate.update({
      where: { id: params.id },
      data:  updateData,
      include,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('PATCH /estimates/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── DELETE: Remove estimate ──────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const estimate = await prisma.estimate.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    if (estimate.status === 'INVOICED') {
      return NextResponse.json({ error: 'Cannot delete an estimate that has been converted to an invoice' }, { status: 400 });
    }

    await prisma.estimate.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
