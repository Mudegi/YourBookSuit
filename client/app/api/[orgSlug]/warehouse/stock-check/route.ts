import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import { Permission } from '@/lib/permissions';
import { WarehouseService } from '@/services/warehouse/warehouse.service';

// GET /api/[orgSlug]/warehouse/stock-check?warehouseId=xxx&productId=yyy&qty=10
export async function GET(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.VIEW_WAREHOUSE);

    const url = new URL(req.url);
    const warehouseId = url.searchParams.get('warehouseId');
    const productId = url.searchParams.get('productId');
    const qty = parseFloat(url.searchParams.get('qty') || '0');

    if (!warehouseId || !productId) {
      return NextResponse.json(
        { success: false, error: 'warehouseId and productId are required' },
        { status: 400 }
      );
    }

    const result = await WarehouseService.checkAvailability({
      organizationId: org.id,
      warehouseId,
      productId,
      requestedQty: qty,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error checking stock:', error);
    return NextResponse.json({ success: false, error: 'Failed to check stock' }, { status: 500 });
  }
}
