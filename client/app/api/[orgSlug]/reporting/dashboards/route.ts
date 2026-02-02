import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';
import { Permission } from '@/lib/permissions';

const createDashboardSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  layout: z.record(z.any()),
  isDefault: z.boolean().default(false),
  isPublic: z.boolean().default(false),
});

// GET /api/[orgSlug]/reporting/dashboards - List all dashboards
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requirePermission(
      params.orgSlug,
      Permission.VIEW_DASHBOARDS
    );

    const dashboards = await prisma.dashboard.findMany({
      where: { organizationId },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        widgets: {
          include: {
            report: {
              select: {
                name: true,
                reportType: true,
              },
            },
          },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: dashboards,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch dashboards',
      },
      { status: error.status || 500 }
    );
  }
}

// POST /api/[orgSlug]/reporting/dashboards - Create a new dashboard
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requirePermission(
      params.orgSlug,
      Permission.CREATE_DASHBOARDS
    );

    const body = await request.json();
    const data = createDashboardSchema.parse(body);

    const dashboard = await prisma.dashboard.create({
      data: {
        ...data,
        organizationId,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: dashboard,
        message: 'Dashboard created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create dashboard',
      },
      { status: error.status || 500 }
    );
  }
}
