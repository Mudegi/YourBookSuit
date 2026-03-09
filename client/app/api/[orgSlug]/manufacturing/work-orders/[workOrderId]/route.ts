import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import { WorkOrderService } from '@/services/manufacturing/work-order.service';

// GET /api/[orgSlug]/manufacturing/work-orders/[workOrderId]
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; workOrderId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const data = await WorkOrderService.getWorkOrder(params.workOrderId, org.id);
    if (!data) return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching work order:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch work order' }, { status: 500 });
  }
}

// PUT /api/[orgSlug]/manufacturing/work-orders/[workOrderId]
// Actions: release, start, hold, resume, complete, close, cancel
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; workOrderId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const body = await request.json();
    const { action, ...payload } = body;

    let result: any;

    switch (action) {
      case 'release':
        result = await WorkOrderService.releaseWorkOrder(params.workOrderId, org.id);
        break;
      case 'start':
        result = await WorkOrderService.startWorkOrder(params.workOrderId, org.id);
        break;
      case 'hold':
        result = await WorkOrderService.holdWorkOrder(params.workOrderId, org.id, payload.reason);
        break;
      case 'resume':
        result = await WorkOrderService.resumeWorkOrder(params.workOrderId, org.id);
        break;
      case 'complete':
        result = await WorkOrderService.completeWorkOrder(
          params.workOrderId,
          org.id,
          {
            actualProduced: payload.actualProduced,
            actualScrapped: payload.actualScrapped,
            laborCost: payload.laborCost,
            overheadCost: payload.overheadCost,
            notes: payload.notes,
          },
          user.id,
        );
        break;
      case 'close':
        result = await WorkOrderService.closeWorkOrder(params.workOrderId, org.id);
        break;
      case 'cancel':
        result = await WorkOrderService.cancelWorkOrder(params.workOrderId, org.id, payload.reason);
        break;
      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error updating work order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update work order' },
      { status: 400 }
    );
  }
}
