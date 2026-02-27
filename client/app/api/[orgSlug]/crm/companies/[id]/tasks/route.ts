import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';

// GET /api/[orgSlug]/crm/companies/[id]/tasks
export async function GET(
  req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: any = { companyId: params.id, organizationId: org.id };
    if (status) where.status = status;

    const tasks = await prisma.crmTask.findMany({
      where,
      include: {
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/crm/companies/[id]/tasks
export async function POST(
  req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const company = await prisma.company.findFirst({
      where: { id: params.id, organizationId: org.id },
    });
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const body = await req.json();
    const { title, description, dueDate, priority, assignedTo } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const task = await prisma.crmTask.create({
      data: {
        organizationId: org.id,
        companyId: params.id,
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'MEDIUM',
        assignedTo: assignedTo || null,
        createdBy: user.id,
      },
      include: {
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Log task creation as activity
    await prisma.activity.create({
      data: {
        organizationId: org.id,
        companyId: params.id,
        type: 'TASK',
        subject: `Task created: ${title}`,
        description: `Due: ${dueDate || 'No due date'}`,
        createdBy: user.id,
      },
    });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
