import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';
import { Permission } from '@/lib/permissions';

const createCycleCountSchema = z.object({
  warehouseId: z.string().optional(),
  scheduledDate: z.string(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        expectedQty: z.number(),
      })
    )
    .min(1, 'At least one item is required'),
});

// GET /api/[orgSlug]/inventory/cycle-counts - List all cycle counts
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requirePermission(
      params.orgSlug,
      Permission.VIEW_CYCLE_COUNTS
    );

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const cycleCounts = await prisma.cycleCount.findMany({
      where: {
        organizationId,
        ...(status && { status: status as any }),
      },
      include: {
        warehouse: {
          select: {
            code: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                sku: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: cycleCounts,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch cycle counts',
      },
      { status: error.status || 500 }
    );
  }
}

// POST /api/[orgSlug]/inventory/cycle-counts - Create a new cycle count
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requirePermission(
      params.orgSlug,
      Permission.MANAGE_CYCLE_COUNTS
    );

    const body = await request.json();
    const { items, ...cycleCountData } = createCycleCountSchema.parse(body);

    // Generate cycle count number
    const lastCount = await prisma.cycleCount.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { countNumber: true },
    });

    let countNumber = 'CC-00001';
    if (lastCount?.countNumber) {
      const lastNum = parseInt(lastCount.countNumber.split('-')[1]);
      countNumber = `CC-${String(lastNum + 1).padStart(5, '0')}`;
    }

    const cycleCount = await prisma.cycleCount.create({
      data: {
        ...cycleCountData,
        countNumber,
        organizationId,
        scheduledDate: new Date(cycleCountData.scheduledDate),
        status: 'PLANNED',
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            expectedQty: item.expectedQty,
          })),
        },
      },
      include: {
        warehouse: {
          select: {
            code: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                sku: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: cycleCount,
        message: 'Cycle count created successfully',
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
        error: error.message || 'Failed to create cycle count',
      },
      { status: error.status || 500 }
    );
  }
}
