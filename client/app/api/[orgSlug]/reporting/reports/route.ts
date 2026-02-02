import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';
import { Permission } from '@/lib/permissions';

const createReportSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  reportType: z.enum([
    'BALANCE_SHEET',
    'PROFIT_LOSS',
    'CASH_FLOW',
    'TRIAL_BALANCE',
    'AGED_RECEIVABLES',
    'AGED_PAYABLES',
    'INVENTORY_VALUATION',
    'SALES_ANALYSIS',
    'PURCHASE_ANALYSIS',
    'CUSTOM',
  ]),
  category: z.string().optional(),
  query: z.record(z.any()),
  columns: z.array(z.record(z.any())),
  filters: z.record(z.any()).optional(),
  sorting: z.record(z.any()).optional(),
  grouping: z.record(z.any()).optional(),
  aggregations: z.record(z.any()).optional(),
  chartConfig: z.record(z.any()).optional(),
  isPublic: z.boolean().default(false),
});

// GET /api/[orgSlug]/reporting/reports - List all reports
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requirePermission(
      params.orgSlug,
      Permission.VIEW_REPORTS_ADVANCED
    );

    const reports = await prisma.report.findMany({
      where: { organizationId },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: reports,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch reports',
      },
      { status: error.status || 500 }
    );
  }
}

// POST /api/[orgSlug]/reporting/reports - Create a new report
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requirePermission(
      params.orgSlug,
      Permission.CREATE_REPORTS
    );

    const body = await request.json();
    const data = createReportSchema.parse(body);

    const report = await prisma.report.create({
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
        data: report,
        message: 'Report created successfully',
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
        error: error.message || 'Failed to create report',
      },
      { status: error.status || 500 }
    );
  }
}
