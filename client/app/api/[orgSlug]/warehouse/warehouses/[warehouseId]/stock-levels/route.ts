import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import { Permission } from '@/lib/permissions';
import { WarehouseService } from '@/services/warehouse/warehouse.service';

// GET /api/[orgSlug]/warehouse/warehouses/[warehouseId]/stock-levels
export async function GET(
  req: NextRequest,
  { params }: { params: { orgSlug: string; warehouseId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.VIEW_WAREHOUSE);

    const url = new URL(req.url);
    const search = url.searchParams.get('search') || undefined;
    const productId = url.searchParams.get('productId') || undefined;
    const belowReorder = url.searchParams.get('belowReorder') === 'true';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const result = await WarehouseService.getStockLevels({
      organizationId: org.id,
      warehouseId: params.warehouseId,
      search,
      productId,
      belowReorder,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching stock levels:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stock levels' }, { status: 500 });
  }
}
