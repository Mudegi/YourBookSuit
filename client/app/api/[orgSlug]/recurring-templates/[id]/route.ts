import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { computeNextRunAt } from '@/lib/recurring';

export async function GET(request: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
    if (!org) return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });

    const template = await prisma.recurringTemplate.findFirst({ where: { id: params.id, organizationId: org.id } });
    if (!template) return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: template });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch template' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
    if (!org) return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });

    const body = await request.json();
    const data = body;

    const nextRunAt = computeNextRunAt(data);

    const updated = await prisma.recurringTemplate.update({
      where: { id: params.id },
      data: {
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
        payload: data.payload,
        status: data.status,
        approvalRequired: Boolean(data.approvalRequired ?? false),
        maxExecutions: data.maxExecutions ?? null,
        notes: data.notes ?? null,
      },
    });

    return NextResponse.json({ success: true, data: updated, message: 'Recurring template updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
    if (!org) return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });

    await prisma.recurringTemplate.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, message: 'Recurring template deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete template' }, { status: 500 });
  }
}
