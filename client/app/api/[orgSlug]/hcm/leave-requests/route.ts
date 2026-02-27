import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
  getLeaveBalances,
  validateLeaveRequest,
  checkDepartmentOverlap,
  calculateBusinessDays,
} from '@/services/leaveService';

const leaveRequestSchema = z.object({
  employeeId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  daysRequested: z.number().positive(),
  isHalfDay: z.boolean().default(false),
  halfDayPeriod: z.enum(['MORNING', 'AFTERNOON']).optional(),
  reason: z.string().optional(),
  attachmentUrl: z.string().optional(),
});

// GET /api/[orgSlug]/hcm/leave-requests
export async function GET(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');
    const departmentId = searchParams.get('departmentId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const view = searchParams.get('view'); // 'calendar' returns calendar-friendly data

    const where: any = { employee: { organizationId: org.id } };
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    if (departmentId) where.employee = { ...where.employee, departmentId };

    // Date range filter
    if (year) {
      const y = parseInt(year);
      const m = month ? parseInt(month) - 1 : 0;
      const rangeStart = month ? new Date(y, m, 1) : new Date(y, 0, 1);
      const rangeEnd = month ? new Date(y, m + 1, 0, 23, 59, 59) : new Date(y, 11, 31, 23, 59, 59);
      where.startDate = { lte: rangeEnd };
      where.endDate = { gte: rangeStart };
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true, firstName: true, lastName: true, employeeNumber: true,
            department: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
            managerId: true,
          },
        },
        leaveType: { select: { id: true, name: true, code: true, isPaid: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // Compute metrics
    const allRequests = await prisma.leaveRequest.groupBy({
      by: ['status'],
      where: { employee: { organizationId: org.id } },
      _count: { id: true },
    });
    const metrics = {
      total: allRequests.reduce((s, g) => s + g._count.id, 0),
      pending: allRequests.find((g) => g.status === 'PENDING')?._count.id || 0,
      approved: allRequests.find((g) => g.status === 'APPROVED')?._count.id || 0,
      rejected: allRequests.find((g) => g.status === 'REJECTED')?._count.id || 0,
      cancelled: allRequests.find((g) => g.status === 'CANCELLED')?._count.id || 0,
    };

    const data = requests.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
      employeeNumber: r.employee.employeeNumber,
      departmentName: r.employee.department?.name || null,
      departmentId: r.employee.department?.id || null,
      branchName: (r.employee as any).branch?.name || null,
      managerId: r.employee.managerId,
      leaveTypeId: r.leaveType.id,
      leaveTypeName: r.leaveType.name,
      leaveTypeCode: r.leaveType.code,
      isPaid: r.leaveType.isPaid,
      startDate: r.startDate,
      endDate: r.endDate,
      daysRequested: Number(r.daysRequested),
      isHalfDay: (r as any).isHalfDay || false,
      halfDayPeriod: (r as any).halfDayPeriod || null,
      reason: r.reason,
      attachmentUrl: (r as any).attachmentUrl || null,
      status: r.status,
      approvedBy: r.approver ? `${r.approver.firstName} ${r.approver.lastName}` : null,
      approvedAt: r.approvedAt,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({ success: true, data, metrics });
  } catch (error) {
    console.error('Error listing leave requests:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch leave requests' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/hcm/leave-requests
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const body = await request.json();
    const parsed = leaveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    // Validate employee
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, organizationId: org.id },
      select: { id: true, departmentId: true, managerId: true },
    });
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    // Validate leave type
    const leaveType = await prisma.leaveType.findFirst({
      where: { id: input.leaveTypeId, organizationId: org.id, isActive: true },
    });
    if (!leaveType) {
      return NextResponse.json({ success: false, error: 'Leave type not found or inactive' }, { status: 404 });
    }

    // Attachment required check
    if ((leaveType as any).requiresAttachment && !input.attachmentUrl) {
      return NextResponse.json({ success: false, error: `${leaveType.name} requires an attachment (e.g. medical certificate)` }, { status: 400 });
    }

    // Full validation (balance + overlap + dates)
    const validation = await validateLeaveRequest({
      employeeId: input.employeeId,
      organizationId: org.id,
      leaveTypeId: input.leaveTypeId,
      startDate: input.startDate,
      endDate: input.endDate,
      daysRequested: input.daysRequested,
      isHalfDay: input.isHalfDay,
    });

    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.error,
        balance: validation.balance,
      }, { status: 400 });
    }

    // Detect department overlap (informational, not blocking)
    const overlaps = await checkDepartmentOverlap(
      input.employeeId,
      employee.departmentId,
      input.startDate,
      input.endDate,
    );

    const created = await (prisma.leaveRequest as any).create({
      data: {
        employeeId: input.employeeId,
        leaveTypeId: input.leaveTypeId,
        startDate: input.startDate,
        endDate: input.endDate,
        daysRequested: input.daysRequested,
        isHalfDay: input.isHalfDay,
        halfDayPeriod: input.isHalfDay ? input.halfDayPeriod : null,
        reason: input.reason,
        attachmentUrl: input.attachmentUrl,
        status: leaveType.requiresApproval ? 'PENDING' : 'APPROVED',
        approvedAt: !leaveType.requiresApproval ? new Date() : null,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'CREATE',
        entityType: 'LEAVE_REQUEST',
        entityId: created.id,
        changes: {
          leaveType: leaveType.name,
          startDate: input.startDate,
          endDate: input.endDate,
          daysRequested: input.daysRequested,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: created.id },
      balance: validation.balance,
      overlaps: overlaps.length > 0 ? overlaps : undefined,
      autoApproved: !leaveType.requiresApproval,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating leave request:', error);
    return NextResponse.json({ success: false, error: 'Failed to create leave request' }, { status: 500 });
  }
}
