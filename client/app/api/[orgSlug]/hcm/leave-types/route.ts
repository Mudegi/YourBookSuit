import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// GET /api/[orgSlug]/hcm/leave-types
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const leaveTypes = await prisma.leaveType.findMany({
      where: { organizationId: org.id },
      include: {
        _count: { select: { leaveRequests: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: leaveTypes.map((lt) => ({
        id: lt.id,
        code: lt.code,
        name: lt.name,
        description: lt.description,
        daysPerYear: lt.daysPerYear ? Number(lt.daysPerYear) : null,
        isPaid: lt.isPaid,
        requiresApproval: lt.requiresApproval,
        requiresAttachment: (lt as any).requiresAttachment ?? false,
        maxCarryForward: (lt as any).maxCarryForward ? Number((lt as any).maxCarryForward) : null,
        isActive: lt.isActive,
        requestCount: lt._count.leaveRequests,
      })),
    });
  } catch (error) {
    console.error('Error listing leave types:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch leave types' }, { status: 500 });
  }
}

const leaveTypeSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  daysPerYear: z.number().min(0).optional(),
  isPaid: z.boolean().default(true),
  requiresApproval: z.boolean().default(true),
  requiresAttachment: z.boolean().default(false),
  maxCarryForward: z.number().min(0).optional(),
});

// POST /api/[orgSlug]/hcm/leave-types
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'create');

    const body = await request.json();
    const parsed = leaveTypeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    // Check duplicate code
    const existing = await prisma.leaveType.findFirst({
      where: { organizationId: org.id, code: input.code },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Leave type code already exists' }, { status: 400 });
    }

    const created = await (prisma.leaveType as any).create({
      data: {
        organizationId: org.id,
        code: input.code,
        name: input.name,
        description: input.description,
        daysPerYear: input.daysPerYear,
        isPaid: input.isPaid,
        requiresApproval: input.requiresApproval,
        requiresAttachment: input.requiresAttachment,
        maxCarryForward: input.maxCarryForward,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'CREATE',
        entityType: 'LEAVE_TYPE',
        entityId: created.id,
        changes: { code: input.code, name: input.name },
      },
    });

    return NextResponse.json({ success: true, data: { id: created.id } }, { status: 201 });
  } catch (error) {
    console.error('Error creating leave type:', error);
    return NextResponse.json({ success: false, error: 'Failed to create leave type' }, { status: 500 });
  }
}
