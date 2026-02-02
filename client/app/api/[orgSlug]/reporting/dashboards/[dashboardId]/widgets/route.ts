import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';
import { Permission } from '@/lib/permissions';

const widgetSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  widgetType: z.string().min(1, 'Widget type is required'),
  reportId: z.string().optional(),
  position: z.record(z.any()).default({ x: 0, y: 0, w: 4, h: 2 }),
  config: z.record(z.any()).default({}),
  refreshInterval: z.number().int().positive().optional(),
});

async function ensureDashboard(orgSlug: string, dashboardId: string) {
  const { organizationId } = await requirePermission(orgSlug, Permission.VIEW_DASHBOARDS);
  const dashboard = await prisma.dashboard.findFirst({ where: { id: dashboardId, organizationId } });
  if (!dashboard) throw Object.assign(new Error('Dashboard not found'), { status: 404 });
  return { organizationId };
}

// GET list widgets for a dashboard
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; dashboardId: string } }
) {
  try {
    const { organizationId } = await ensureDashboard(params.orgSlug, params.dashboardId);
    const widgets = await prisma.dashboardWidget.findMany({
      where: { dashboardId: params.dashboardId, dashboard: { organizationId } },
      include: { report: { select: { name: true, reportType: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: widgets });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch widgets' },
      { status: error.status || 500 }
    );
  }
}

// POST create widget
export async function POST(
  req: NextRequest,
  { params }: { params: { orgSlug: string; dashboardId: string } }
) {
  try {
    const { organizationId } = await requirePermission(params.orgSlug, Permission.CREATE_DASHBOARDS);
    // Ensure dashboard belongs to org
    const dashboard = await prisma.dashboard.findFirst({ where: { id: params.dashboardId, organizationId } });
    if (!dashboard) return NextResponse.json({ success: false, error: 'Dashboard not found' }, { status: 404 });

    const body = await req.json();
    const data = widgetSchema.parse(body);

    const widget = await prisma.dashboardWidget.create({
      data: {
        title: data.title,
        widgetType: data.widgetType,
        reportId: data.reportId || null,
        position: data.position,
        config: data.config,
        refreshInterval: data.refreshInterval,
        dashboardId: params.dashboardId,
      },
      include: { report: { select: { name: true, reportType: true } } },
    });

    return NextResponse.json({ success: true, data: widget }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create widget' },
      { status: error.status || 500 }
    );
  }
}
