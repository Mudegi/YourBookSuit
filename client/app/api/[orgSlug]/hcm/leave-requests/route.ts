import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { Permission } from '@/lib/permissions';
import { z } from 'zod';

const leaveRequestSchema = z.object({
  employeeId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  daysRequested: z.number().positive(),
  reason: z.string().optional(),
});

// GET /api/[orgSlug]/hcm/leave-requests
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.VIEW_LEAVE);

    const requests = await prisma.leaveRequest.findMany({
      where: { employee: { organizationId: org.id } },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        leaveType: { select: { id: true, name: true, code: true, isPaid: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const data = requests.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
      employeeNumber: r.employee.employeeNumber,
      leaveTypeName: r.leaveType.name,
      startDate: r.startDate,
      endDate: r.endDate,
      daysRequested: Number(r.daysRequested),
      reason: r.reason,
      status: r.status,
      approvedBy: r.approver ? `${r.approver.firstName} ${r.approver.lastName}` : null,
      approvedAt: r.approvedAt,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({ success: true, data });
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

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.SUBMIT_LEAVE);

    const body = await request.json();
    const parsed = leaveRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    // Validate employee belongs to org
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, organizationId: org.id },
    });

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    // Validate leave type
    const leaveType = await prisma.leaveType.findFirst({
      where: { id: input.leaveTypeId, organizationId: org.id },
    });

    if (!leaveType) {
      return NextResponse.json({ success: false, error: 'Leave type not found' }, { status: 404 });
    }

    if (input.endDate < input.startDate) {
      return NextResponse.json({ success: false, error: 'End date must be after start date' }, { status: 400 });
    }

    const created = await prisma.leaveRequest.create({
      data: {
        employeeId: input.employeeId,
        leaveTypeId: input.leaveTypeId,
        startDate: input.startDate,
        endDate: input.endDate,
        daysRequested: input.daysRequested,
        reason: input.reason,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ success: true, data: { id: created.id } }, { status: 201 });
  } catch (error) {
    console.error('Error creating leave request:', error);
    return NextResponse.json({ success: false, error: 'Failed to create leave request' }, { status: 500 });
  }
}
