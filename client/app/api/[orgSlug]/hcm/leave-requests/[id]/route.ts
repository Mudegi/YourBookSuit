import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { checkDepartmentOverlap } from '@/services/leaveService';

// GET /api/[orgSlug]/hcm/leave-requests/[id] — full details + overlap info
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const request = await (prisma.leaveRequest as any).findFirst({
      where: { id: params.id, employee: { organizationId: org.id } },
      include: {
        employee: {
          select: {
            id: true, firstName: true, lastName: true, employeeNumber: true,
            department: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
            managerId: true,
            manager: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        leaveType: true,
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!request) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    // Check for department overlaps
    const overlaps = await checkDepartmentOverlap(
      request.employeeId,
      request.employee.department?.id || null,
      request.startDate,
      request.endDate,
      request.id,
    );

    return NextResponse.json({
      success: true,
      data: {
        ...request,
        daysRequested: Number(request.daysRequested),
        leaveType: {
          ...request.leaveType,
          daysPerYear: request.leaveType.daysPerYear ? Number(request.leaveType.daysPerYear) : null,
          maxCarryForward: request.leaveType.maxCarryForward ? Number(request.leaveType.maxCarryForward) : null,
        },
      },
      overlaps,
    });
  } catch (error) {
    console.error('Error fetching leave request:', error);
    return NextResponse.json({ error: 'Failed to fetch leave request' }, { status: 500 });
  }
}

// PUT /api/[orgSlug]/hcm/leave-requests/[id] — Approve / Reject / Cancel
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);

    const body = await request.json();
    const schema = z.object({
      action: z.enum(['APPROVE', 'REJECT', 'CANCEL']),
      rejectionReason: z.string().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { action, rejectionReason } = parsed.data;

    const leaveReq = await prisma.leaveRequest.findFirst({
      where: { id: params.id, employee: { organizationId: org.id } },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, managerId: true, status: true } },
        leaveType: { select: { name: true } },
      },
    });

    if (!leaveReq) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    // Only PENDING requests can be approved/rejected
    if (action !== 'CANCEL' && leaveReq.status !== 'PENDING') {
      return NextResponse.json({ error: `Cannot ${action.toLowerCase()} a ${leaveReq.status.toLowerCase()} request` }, { status: 400 });
    }

    // Cancel: only the requester or an admin
    if (action === 'CANCEL' && leaveReq.status !== 'PENDING' && leaveReq.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Only pending or approved requests can be cancelled' }, { status: 400 });
    }

    // Approve/Reject: require update permission (manager+)
    if (action === 'APPROVE' || action === 'REJECT') {
      ensurePermission(membership.role, 'update');
    }

    if (action === 'REJECT' && !rejectionReason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (action === 'APPROVE') {
      updateData.status = 'APPROVED';
      updateData.approvedBy = user.id;
      updateData.approvedAt = new Date();
    } else if (action === 'REJECT') {
      updateData.status = 'REJECTED';
      updateData.approvedBy = user.id;
      updateData.approvedAt = new Date();
      updateData.rejectionReason = rejectionReason;
    } else if (action === 'CANCEL') {
      updateData.status = 'CANCELLED';
    }

    await prisma.leaveRequest.update({
      where: { id: params.id },
      data: updateData,
    });

    // If approved, update employee status to ON_LEAVE if leave starts today or is ongoing
    if (action === 'APPROVE') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(leaveReq.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(leaveReq.endDate);
      end.setHours(23, 59, 59);

      if (today >= start && today <= end && leaveReq.employee.status === 'ACTIVE') {
        await prisma.employee.update({
          where: { id: leaveReq.employeeId },
          data: { status: 'ON_LEAVE' },
        });
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: action === 'APPROVE' ? 'APPROVE' : 'UPDATE',
        entityType: 'LEAVE_REQUEST',
        entityId: params.id,
        changes: {
          action,
          employee: `${leaveReq.employee.firstName} ${leaveReq.employee.lastName}`,
          leaveType: leaveReq.leaveType.name,
          rejectionReason: rejectionReason || undefined,
        },
      },
    });

    return NextResponse.json({ success: true, action });
  } catch (error: any) {
    if (error?.message?.includes('Permission denied')) {
      return NextResponse.json({ error: 'You do not have permission to approve/reject requests' }, { status: 403 });
    }
    console.error('Error updating leave request:', error);
    return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 });
  }
}
