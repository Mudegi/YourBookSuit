import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { Permission } from '@/lib/permissions';

const warehouseSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['GENERAL', 'MANUFACTURING', 'RECEIVING', 'SHIPPING', 'QA_HOLD', 'THIRD_PARTY']).default('GENERAL'),
  isDefault: z.boolean().default(false),
  branchId: z.string().optional(),
  address: z.string().optional(),
});

// GET /api/[orgSlug]/warehouse/warehouses
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.VIEW_WAREHOUSE);

    const warehouses = await prisma.inventoryWarehouse.findMany({
      where: { organizationId: org.id },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        _count: { select: { bins: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const data = warehouses.map((w) => ({
      id: w.id,
      code: w.code,
      name: w.name,
      type: w.type,
      isDefault: w.isDefault,
      isActive: w.isActive,
      branchId: w.branchId,
      branchCode: w.branch?.code,
      branchName: w.branch?.name,
      address: w.address,
      bins: w._count.bins,
      createdAt: w.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error listing warehouses:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch warehouses' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/warehouse/warehouses
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.MANAGE_WAREHOUSE);
    const body = await request.json();
    const parsed = warehouseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    const created = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.inventoryWarehouse.updateMany({
          where: { organizationId: org.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.inventoryWarehouse.create({
        data: {
          organizationId: org.id,
          branchId: input.branchId,
          code: input.code,
          name: input.name,
          type: input.type,
          isDefault: input.isDefault,
          address: input.address,
        },
      });
    });

    return NextResponse.json({ success: true, data: { id: created.id } }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating warehouse:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Warehouse code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: false, error: 'Failed to create warehouse' }, { status: 500 });
  }
}
