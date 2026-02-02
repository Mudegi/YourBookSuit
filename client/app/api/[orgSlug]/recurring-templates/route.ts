import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { computeNextRunAt } from '@/lib/recurring';

export async function GET(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
    if (!org) return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const where: any = { organizationId: org.id };
    if (status) where.status = status;
    if (type) where.templateType = type;

    const templates = await prisma.recurringTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
    if (!org) return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });

    const body = await request.json();
    const data = body;

    const nextRunAt = computeNextRunAt(data);

    const created = await prisma.recurringTemplate.create({
      data: {
        organizationId: org.id,
        branchId: data.branchId ?? null,
        name: data.name,
        templateType: data.templateType,
        frequency: data.frequency,
        timezone: data.timezone ?? 'UTC',
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        dayOfMonth: data.dayOfMonth ?? null,
        weekday: data.weekday ?? null,
        cronExpression: data.cronExpression ?? null,
        nextRunAt,
        lastRunAt: null,
        payload: data.payload,
        status: data.status ?? 'ACTIVE',
        approvalRequired: Boolean(data.approvalRequired ?? false),
        maxExecutions: data.maxExecutions ?? null,
        executedCount: 0,
        notes: data.notes ?? null,
        createdById: user.id,
      },
    });

    return NextResponse.json({ success: true, data: created, message: 'Recurring template created' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to create template' }, { status: 500 });
  }
}
