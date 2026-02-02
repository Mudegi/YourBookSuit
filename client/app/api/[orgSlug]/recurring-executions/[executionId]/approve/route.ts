import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { executePendingExecution } from '@/lib/recurring';

export async function POST(_: Request, { params }: { params: { orgSlug: string; executionId: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const exec = await prisma.recurringExecution.findUnique({ where: { id: params.executionId } });
    if (!exec || exec.organizationId !== org.id) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    const template = await prisma.recurringTemplate.findUnique({ where: { id: exec.templateId } });
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    if (!template.approvalRequired) {
      return NextResponse.json({ error: 'Approval not required for this template' }, { status: 400 });
    }
    if (exec.status !== 'PENDING') {
      return NextResponse.json({ error: 'Execution is not pending' }, { status: 400 });
    }

    const updated = await executePendingExecution({ executionId: exec.id, approverUserId: user.id });

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        entityType: 'RecurringExecution',
        entityId: exec.id,
        action: 'APPROVE',
        changes: { status: 'SUCCESS' },
      },
    });

    return NextResponse.json({ ok: true, execution: updated });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
