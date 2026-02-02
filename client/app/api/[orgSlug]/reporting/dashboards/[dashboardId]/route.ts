import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';
import { Permission } from '@/lib/permissions';

// GET /api/[orgSlug]/reporting/dashboards/[dashboardId] - fetch single dashboard with widgets
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; dashboardId: string } }
) {
  try {
    const { organizationId } = await requirePermission(
      params.orgSlug,
      Permission.VIEW_DASHBOARDS
    );

    const dashboard = await prisma.dashboard.findFirst({
      where: { id: params.dashboardId, organizationId },
      include: {
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        widgets: {
          include: {
            report: { select: { name: true, reportType: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!dashboard) {
      return NextResponse.json({ success: false, error: 'Dashboard not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: dashboard });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch dashboard' },
      { status: error.status || 500 }
    );
  }
}
