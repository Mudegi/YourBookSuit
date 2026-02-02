import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';
import { Permission } from '@/lib/permissions';

const createApprovalRequestSchema = z.object({
  workflowId: z.string(),
  entityType: z.enum([
    'PURCHASE_ORDER',
    'BILL',
    'PAYMENT',
    'JOURNAL',
    'EXPENSE_CLAIM',
    'CREDIT_NOTE',
    'DEBIT_NOTE',
    'TRANSFER',
    'INVOICE',
  ]),
  entityId: z.string(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  metadata: z.record(z.any()).optional(),
});

// GET /api/[orgSlug]/workflows/approval-requests - List approval requests
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requirePermission(
      params.orgSlug,
      Permission.VIEW_APPROVALS
    );

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const entityType = searchParams.get('entityType');

    const approvalRequests = await prisma.approvalRequest.findMany({
      where: {
        organizationId,
        ...(status && { status: status as any }),
        ...(entityType && { entityType: entityType as any }),
      },
      include: {
        workflow: {
          select: {
            name: true,
          },
        },
        requestedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        actions: {
          include: {
            approver: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            step: {
              select: {
                name: true,
                stepOrder: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: approvalRequests,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch approval requests',
      },
      { status: error.status || 500 }
    );
  }
}

// POST /api/[orgSlug]/workflows/approval-requests - Submit for approval
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requirePermission(
      params.orgSlug,
      Permission.SUBMIT_FOR_APPROVAL
    );

    const body = await request.json();
    const data = createApprovalRequestSchema.parse(body);

    // Verify workflow exists and is active
    const workflow = await prisma.approvalWorkflow.findFirst({
      where: {
        id: data.workflowId,
        organizationId,
        isActive: true,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        {
          success: false,
          error: 'Workflow not found or inactive',
        },
        { status: 404 }
      );
    }

    const approvalRequest = await prisma.approvalRequest.create({
      data: {
        ...data,
        organizationId,
        requestedById: userId,
        status: 'PENDING',
        currentStepOrder: 1,
      },
      include: {
        workflow: {
          select: {
            name: true,
          },
        },
        requestedBy: {
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
        data: approvalRequest,
        message: 'Submitted for approval successfully',
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
        error: error.message || 'Failed to create approval request',
      },
      { status: error.status || 500 }
    );
  }
}
