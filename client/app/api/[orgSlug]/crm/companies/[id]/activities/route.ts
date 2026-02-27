import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';

// GET /api/[orgSlug]/crm/companies/[id]/activities — Activity timeline
export async function GET(
  req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = { companyId: params.id, organizationId: org.id };
    if (type) where.type = type;

    const activities = await prisma.activity.findMany({
      where,
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ success: true, data: activities });
  } catch (error) {
    console.error('Get activities error:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/crm/companies/[id]/activities — Log new activity
export async function POST(
  req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    // Validate company exists
    const company = await prisma.company.findFirst({
      where: { id: params.id, organizationId: org.id },
    });
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const body = await req.json();
    const { type, subject, description, contactId, dueDate } = body;

    if (!type || !subject) {
      return NextResponse.json({ error: 'Type and subject are required' }, { status: 400 });
    }

    const activity = await prisma.activity.create({
      data: {
        organizationId: org.id,
        companyId: params.id,
        contactId: contactId || null,
        type,
        subject,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdBy: user.id,
      },
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Update last contacted date
    await prisma.company.update({
      where: { id: params.id },
      data: { lastContactedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: activity }, { status: 201 });
  } catch (error) {
    console.error('Create activity error:', error);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}
