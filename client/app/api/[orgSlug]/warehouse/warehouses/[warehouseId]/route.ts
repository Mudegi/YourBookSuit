import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import { Permission } from '@/lib/permissions';
import { WarehouseService } from '@/services/warehouse/warehouse.service';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum([
    'GENERAL', 'MANUFACTURING', 'RECEIVING', 'SHIPPING',
    'QA_HOLD', 'THIRD_PARTY', 'TRANSIT', 'DAMAGED', 'QUARANTINE',
  ]).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  branchId: z.string().nullable().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  managerId: z.string().nullable().optional(),
  capacityVolume: z.number().nullable().optional(),
  capacityWeight: z.number().nullable().optional(),
});

// GET /api/[orgSlug]/warehouse/warehouses/[warehouseId]
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; warehouseId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.VIEW_WAREHOUSE);

    const warehouse = await WarehouseService.getById(org.id, params.warehouseId);

    if (!warehouse) {
      return NextResponse.json({ success: false, error: 'Warehouse not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: warehouse });
  } catch (error) {
    console.error('Error fetching warehouse:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch warehouse' }, { status: 500 });
  }
}

// PATCH /api/[orgSlug]/warehouse/warehouses/[warehouseId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgSlug: string; warehouseId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.MANAGE_WAREHOUSE);

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const warehouse = await WarehouseService.update(org.id, params.warehouseId, parsed.data);

    return NextResponse.json({ success: true, data: warehouse });
  } catch (error: any) {
    console.error('Error updating warehouse:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Warehouse code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update warehouse' },
      { status: 500 }
    );
  }
}
