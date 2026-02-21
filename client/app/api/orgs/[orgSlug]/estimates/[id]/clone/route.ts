import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

/**
 * POST /api/orgs/[orgSlug]/estimates/[id]/clone
 * Creates a new version of an estimate (increments versionNumber).
 * Customer-requested revisions create a new document instead of mutating the original.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId, userId } = await requireAuth(params.orgSlug);

    const source = await prisma.estimate.findFirst({
      where: { id: params.id, organizationId },
      include: { items: true },
    });
    if (!source) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });

    // Determine next version number among all clones of this original
    const rootId = source.sourceEstimateId || source.id;
    const maxVersion = await prisma.estimate.aggregate({
      where: {
        organizationId,
        OR: [{ id: rootId }, { sourceEstimateId: rootId }],
      },
      _max: { versionNumber: true },
    });
    const nextVersion = (maxVersion._max.versionNumber ?? source.versionNumber) + 1;

    // New estimate number appends -V{n}
    const baseNumber = source.estimateNumber.replace(/-V\d+$/, '');
    const newNumber  = `${baseNumber}-V${nextVersion}`;

    // Clone 7-day expiry from today
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7);

    const clone = await prisma.estimate.create({
      data: {
        organizationId,
        customerId:          source.customerId,
        estimateNumber:      newNumber,
        estimateDate:        new Date(),
        expirationDate,
        status:              'DRAFT',
        versionNumber:       nextVersion,
        sourceEstimateId:    rootId,
        currency:            source.currency,
        exchangeRate:        source.exchangeRate,
        taxCalculationMethod: source.taxCalculationMethod,
        subtotal:            source.subtotal,
        taxAmount:           source.taxAmount,
        discountAmount:      source.discountAmount,
        shippingAmount:      source.shippingAmount,
        total:               source.total,
        notes:               source.notes,
        terms:               source.terms,
        reference:           source.reference,
        deliveryAddress:     source.deliveryAddress as any,
        createdById:         userId,
        items: {
          create: source.items.map(({ id: _id, estimateId: _eid, ...item }: any) => item),
        },
      },
      include: { customer: true, items: true },
    });

    return NextResponse.json({ success: true, data: clone }, { status: 201 });
  } catch (error: any) {
    console.error('POST /estimates/[id]/clone error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
