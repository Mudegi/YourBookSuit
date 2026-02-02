import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
    if (!org) return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = { organizationId: org.id };
    if (templateId) where.templateId = templateId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.runAt = {};
      if (startDate) where.runAt.gte = new Date(startDate);
      if (endDate) where.runAt.lte = new Date(endDate);
    }

    const executions = await prisma.recurringExecution.findMany({
      where,
      orderBy: { runAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: executions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch executions' }, { status: 500 });
  }
}
