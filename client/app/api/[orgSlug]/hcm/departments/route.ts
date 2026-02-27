import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// GET /api/[orgSlug]/hcm/departments
export async function GET(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'read');

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: any = { organizationId: org.id };
    if (!includeInactive) where.isActive = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const departments = await prisma.department.findMany({
      where,
      include: {
        parent: { select: { id: true, code: true, name: true } },
        _count: {
          select: {
            employees: true,
            positions: true,
            children: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: departments.map((d) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        description: d.description,
        parentId: d.parentId,
        parent: d.parent,
        managerId: d.managerId,
        costCenterId: d.costCenterId,
        isActive: d.isActive,
        employeeCount: d._count.employees,
        positionCount: d._count.positions,
        childCount: d._count.children,
      })),
    });
  } catch (error) {
    console.error('Error listing departments:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch departments' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/hcm/departments
export async function POST(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'create');

    const body = await req.json();
    const schema = z.object({
      code: z.string().min(1, 'Code is required'),
      name: z.string().min(1, 'Name is required'),
      description: z.string().optional(),
      parentId: z.string().optional(),
      managerId: z.string().optional(),
      costCenterId: z.string().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    // Check for duplicate code
    const existing = await prisma.department.findFirst({
      where: { organizationId: org.id, code: input.code },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Department code already exists' }, { status: 400 });
    }

    // Verify parent if provided
    if (input.parentId) {
      const parent = await prisma.department.findFirst({
        where: { id: input.parentId, organizationId: org.id },
      });
      if (!parent) return NextResponse.json({ success: false, error: 'Parent department not found' }, { status: 400 });
    }

    const created = await prisma.department.create({
      data: {
        organizationId: org.id,
        code: input.code,
        name: input.name,
        description: input.description,
        parentId: input.parentId || null,
        managerId: input.managerId || null,
        costCenterId: input.costCenterId || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'CREATE',
        entityType: 'DEPARTMENT',
        entityId: created.id,
        changes: { code: input.code, name: input.name },
      },
    });

    return NextResponse.json({ success: true, data: { id: created.id } }, { status: 201 });
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json({ success: false, error: 'Failed to create department' }, { status: 500 });
  }
}
