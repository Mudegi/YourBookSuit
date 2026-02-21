import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

/**
 * POST /api/orgs/[orgSlug]/estimates/[id]/convert
 *
 * Converts an accepted estimate into a new Draft Invoice.
 * - Non-posting: Estimate itself never touched the GL.
 * - Creates Invoice + copies all non-optional (and optionally, chosen optional) items.
 * - Links invoice → estimate via sourceDocumentId convention in notes.
 * - Updates estimate status → INVOICED.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId, userId } = await requireAuth(params.orgSlug);
    const body = await request.json().catch(() => ({}));

    // Optional: array of item ids the customer accepted (for optional lines)
    const acceptedOptionalItemIds: string[] = body.acceptedOptionalItemIds || [];

    const estimate = await prisma.estimate.findFirst({
      where: { id: params.id, organizationId },
      include: {
        customer: { include: { paymentTerm: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    if (estimate.status === 'INVOICED') {
      return NextResponse.json({ error: 'This estimate has already been converted to an invoice' }, { status: 400 });
    }
    if (estimate.convertedInvoiceId) {
      return NextResponse.json({
        error: 'Already converted',
        invoiceId: estimate.convertedInvoiceId,
      }, { status: 400 });
    }

    // Generate invoice number
    const year = new Date().getFullYear();
    const orgInfo = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    const prefix = orgInfo?.name?.substring(0, 3).toUpperCase() || 'INV';
    const countThisYear = await prisma.invoice.count({
      where: { organizationId, invoiceNumber: { startsWith: `${prefix}-${year}-` } },
    });
    const invoiceNumber = `${prefix}-${year}-${String(countThisYear + 1).padStart(4, '0')}`;

    // Calculate due date (default NET30)
    const invoiceDate = new Date();
    const daysUntilDue = estimate.customer.paymentTerm?.daysUntilDue ?? 30;
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + daysUntilDue);

    // Filter items: include all non-optional + explicitly accepted optional ones
    const itemsToInclude = estimate.items.filter(
      (item: any) => !item.isOptional || acceptedOptionalItemIds.includes(item.id)
    );

    // Recalculate totals from included items only
    let subtotal = 0, taxAmount = 0, discountAmount = 0;
    const invoiceItems = itemsToInclude.map((item: any, index: number) => {
      const itemSubtotal  = Number(item.subtotal);
      const itemTax       = Number(item.taxAmount);
      const itemDisc      = Number(item.discount);
      const itemTotal     = Number(item.total);
      subtotal     += itemSubtotal;
      taxAmount    += itemTax;
      discountAmount += itemDisc;
      return {
        productId:       item.productId || null,
        serviceId:       item.serviceId || null,
        description:     item.description,
        quantity:        item.quantity,
        unitPrice:       item.unitPrice,
        discount:        item.discount,
        discountPercent: item.discountPercent || null,
        taxRate:         item.taxRate,
        taxAmount:       item.taxAmount,
        taxCategory:     item.taxCategory || null,
        taxRateId:       item.taxRateId   || null,
        taxExempt:       item.taxExempt,
        subtotal:        item.subtotal,
        total:           item.total,
        sortOrder:       index,
        notes:           item.notes || null,
      };
    });

    const shippingAmount = Number(estimate.shippingAmount);
    const total    = subtotal - discountAmount + taxAmount + shippingAmount;
    const amountDue = total;

    const invoice = await prisma.$transaction(async (tx) => {
      // Create the invoice
      const inv = await tx.invoice.create({
        data: {
          organizationId,
          customerId:    estimate.customerId,
          invoiceNumber,
          invoiceDate,
          dueDate,
          currency:          estimate.currency,
          exchangeRate:      estimate.exchangeRate,
          taxCalculationMethod: estimate.taxCalculationMethod,
          subtotal,
          taxAmount,
          discountAmount,
          shippingAmount,
          total,
          amountPaid:  0,
          amountDue,
          status:      'DRAFT',
          reference:   estimate.estimateNumber, // Link back to estimate
          notes:       estimate.notes
            ? `${estimate.notes}\n\n[Converted from Estimate ${estimate.estimateNumber}]`
            : `Converted from Estimate ${estimate.estimateNumber}`,
          terms:       estimate.terms || null,
          createdById: userId,
          items: { create: invoiceItems },
        },
      });

      // Update estimate → INVOICED + store invoice link
      await tx.estimate.update({
        where: { id: params.id },
        data: {
          status:             'INVOICED',
          convertedInvoiceId: inv.id,
        },
      });

      return inv;
    });

    return NextResponse.json({
      success: true,
      invoiceId:     invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      message:       `Invoice ${invoice.invoiceNumber} created from Estimate ${estimate.estimateNumber}`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /estimates/[id]/convert error:', error);
    return NextResponse.json({ error: error.message || 'Conversion failed' }, { status: 500 });
  }
}
