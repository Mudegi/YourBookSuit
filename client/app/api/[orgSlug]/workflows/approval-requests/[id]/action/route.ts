import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';
import { Permission } from '@/lib/permissions';

const approvalActionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'DELEGATE', 'COMMENT']),
  comment: z.string().optional(),
  delegatedTo: z.string().optional(),
});

// POST /api/[orgSlug]/workflows/approval-requests/[id]/action - Take action on approval
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId, userId } = await requirePermission(
      params.orgSlug,
      Permission.APPROVE_REQUESTS
    );

    const body = await request.json();
    const data = approvalActionSchema.parse(body);

    // Get the approval request
    const approvalRequest = await prisma.approvalRequest.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      include: {
        workflow: {
          include: {
            steps: {
              where: { stepOrder: { gte: 0 } },
              orderBy: { stepOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!approvalRequest) {
      return NextResponse.json(
        {
          success: false,
          error: 'Approval request not found',
        },
        { status: 404 }
      );
    }

    if (approvalRequest.status !== 'PENDING' && approvalRequest.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        {
          success: false,
          error: 'Approval request is already completed',
        },
        { status: 400 }
      );
    }

    // Get current step
    const currentStep = approvalRequest.workflow.steps.find(
      (step: any) => step.stepOrder === approvalRequest.currentStepOrder
    );

    if (!currentStep) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid workflow step',
        },
        { status: 400 }
      );
    }

    // Create approval action
    await prisma.approvalAction.create({
      data: {
        requestId: params.id,
        stepId: currentStep.id,
        approverId: userId,
        action: data.action,
        comment: data.comment,
        delegatedTo: data.delegatedTo,
      },
    });

    // Update approval request status based on action
    let newStatus = approvalRequest.status;
    let newStepOrder = approvalRequest.currentStepOrder;

    if (data.action === 'APPROVE') {
      // Check if there are more steps
      if (approvalRequest.currentStepOrder < approvalRequest.workflow.steps.length) {
        newStatus = 'IN_PROGRESS';
        newStepOrder = approvalRequest.currentStepOrder + 1;
      } else {
        newStatus = 'APPROVED';
      }
    } else if (data.action === 'REJECT') {
      newStatus = 'REJECTED';
    } else if (data.action === 'DELEGATE') {
      newStatus = 'IN_PROGRESS';
    }

    const updatedRequest = await prisma.approvalRequest.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        currentStepOrder: newStepOrder,
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
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: `Approval request ${data.action.toLowerCase()}d successfully`,
    });
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
        error: error.message || 'Failed to process approval action',
      },
      { status: error.status || 500 }
    );
  }
}
