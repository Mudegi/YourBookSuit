import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { Permission } from '@/lib/permissions';

const binSchema = z.object({
  warehouseId: z.string().min(1, 'Warehouse is required'),
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['STANDARD', 'REPLENISHMENT', 'PICKING', 'BULK', 'RECEIVING', 'SHIPPING', 'HOLD']).default('STANDARD'),
});

// GET /api/[orgSlug]/warehouse/bins?warehouseId=...
export async function GET(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.VIEW_WAREHOUSE);
    const warehouseId = req.nextUrl.searchParams.get('warehouseId') || undefined;

    const bins = await prisma.inventoryBin.findMany({
      where: {
        warehouse: { organizationId: org.id },
        warehouseId: warehouseId || undefined,
      },
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        _count: { select: { lots: true, serials: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const data = bins.map((b) => ({
      id: b.id,
      warehouseId: b.warehouseId,
      warehouseCode: b.warehouse?.code,
      warehouseName: b.warehouse?.name,
      code: b.code,
      name: b.name,
      type: b.type,
      isActive: b.isActive,
      lots: b._count.lots,
      serials: b._count.serials,
      createdAt: b.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error listing bins:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch bins' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/warehouse/bins
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.MANAGE_WAREHOUSE);
    const body = await request.json();
    const parsed = binSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    const warehouse = await prisma.inventoryWarehouse.findFirst({
      where: { id: input.warehouseId, organizationId: org.id },
      select: { id: true },
    });

    if (!warehouse) {
      return NextResponse.json({ success: false, error: 'Warehouse not found' }, { status: 404 });
    }

    const created = await prisma.inventoryBin.create({
      data: {
        warehouseId: input.warehouseId,
        code: input.code,
        name: input.name,
        type: input.type,
      },
    });

    return NextResponse.json({ success: true, data: { id: created.id } }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating bin:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Bin code already exists in this warehouse' },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: false, error: 'Failed to create bin' }, { status: 500 });
  }
}
