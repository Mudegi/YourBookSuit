import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { executeTemplate } from '@/lib/recurring';

export async function POST(request: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
    if (!org) return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });

    const execution = await executeTemplate({ orgId: org.id, templateId: params.id, userId: user.id });
    return NextResponse.json({ success: true, data: execution, message: 'Recurring template executed' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to execute template' }, { status: 500 });
  }
}
