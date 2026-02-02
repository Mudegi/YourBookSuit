import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';

// GET /api/[orgSlug]/inventory/products/[id]/activity
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    // Verify product belongs to org
    const product = await prisma.product.findFirst({ where: { id: params.id, organizationId: org.id } });
    if (!product) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const movements = await prisma.stockMovement.findMany({
      where: { productId: params.id },
      orderBy: { movementDate: 'desc' },
      take: 200,
    });

    const data = movements.map((m) => ({
      id: m.id,
      movementType: m.movementType,
      quantity: Number(m.quantity),
      unitCost: Number(m.unitCost),
      totalCost: Number(m.totalCost),
      warehouseLocation: m.warehouseLocation,
      referenceType: m.referenceType,
      referenceId: m.referenceId,
      notes: m.notes,
      movementDate: m.movementDate,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching product activity', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch activity' }, { status: 500 });
  }
}
