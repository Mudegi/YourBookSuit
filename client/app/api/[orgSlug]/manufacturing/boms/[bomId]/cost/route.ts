import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import { Permission } from '@/lib/permissions';
import { BOMService } from '@/services/manufacturing/bom.service';

// GET /api/[orgSlug]/manufacturing/boms/[bomId]/cost
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; bomId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.VIEW_MANUFACTURING);

    const costBreakdown = await BOMService.calculateBOMCost(params.bomId, org.id);
    return NextResponse.json({ success: true, data: costBreakdown });
  } catch (error: any) {
    console.error('Error calculating BOM cost:', error);
    if (error.message === 'BOM not found') {
      return NextResponse.json({ success: false, error: 'BOM not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Failed to calculate BOM cost' }, { status: 500 });
  }
}
