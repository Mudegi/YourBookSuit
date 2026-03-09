import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import { Permission } from '@/lib/permissions';
import { BOMService } from '@/services/manufacturing/bom.service';

// GET /api/[orgSlug]/manufacturing/boms/[bomId]
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; bomId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'read');

    const bom = await BOMService.getBOM(params.bomId, org.id);
    if (!bom) {
      return NextResponse.json({ success: false, error: 'BOM not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: bom });
  } catch (error) {
    console.error('Error fetching BOM:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch BOM' }, { status: 500 });
  }
}

// PUT /api/[orgSlug]/manufacturing/boms/[bomId]
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; bomId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'update');

    const body = await request.json();
    const updated = await BOMService.updateBOM(params.bomId, org.id, body);

    return NextResponse.json({ success: true, data: { id: updated.id } });
  } catch (error: any) {
    console.error('Error updating BOM:', error);
    if (error.message?.includes('Circular reference')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (error.message === 'BOM not found') {
      return NextResponse.json({ success: false, error: 'BOM not found' }, { status: 404 });
    }
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'BOM version already exists for this product' },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to update BOM' }, { status: 500 });
  }
}

// DELETE /api/[orgSlug]/manufacturing/boms/[bomId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; bomId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'delete');

    await BOMService.deleteBOM(params.bomId, org.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting BOM:', error);
    if (error.message === 'BOM not found') {
      return NextResponse.json({ success: false, error: 'BOM not found' }, { status: 404 });
    }
    if (error.message?.includes('Cannot delete')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to delete BOM' }, { status: 500 });
  }
}
