import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import { WarehouseDashboardService } from '@/services/warehouse/warehouse-dashboard.service';

// GET /api/[orgSlug]/warehouse/dashboard?warehouseId=xxx
export async function GET(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const url = new URL(req.url);
    const warehouseId = url.searchParams.get('warehouseId') || undefined;

    const dashboard = await WarehouseDashboardService.getDashboard(org.id, warehouseId);

    return NextResponse.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Error fetching warehouse dashboard:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}
