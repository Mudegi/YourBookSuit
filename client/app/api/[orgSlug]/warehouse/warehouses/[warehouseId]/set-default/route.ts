import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import { Permission } from '@/lib/permissions';
import { WarehouseService } from '@/services/warehouse/warehouse.service';

// POST /api/[orgSlug]/warehouse/warehouses/[warehouseId]/set-default
export async function POST(
  _request: NextRequest,
  { params }: { params: { orgSlug: string; warehouseId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.MANAGE_WAREHOUSE);

    const warehouse = await WarehouseService.setDefault(org.id, params.warehouseId);

    return NextResponse.json({ success: true, data: { id: warehouse.id } });
  } catch (error: any) {
    console.error('Error setting default warehouse:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to set default warehouse' },
      { status: 500 }
    );
  }
}
