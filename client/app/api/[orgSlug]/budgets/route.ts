import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { org } = await requireOrgMembership(user.id, params.orgSlug);
    const budgets = await prisma.budget.findMany({
      where: { account: { organizationId: org.id } },
      include: { account: true },
      orderBy: [{ fiscalYear: 'desc' }, { month: 'desc' }],
    });
    return NextResponse.json({ budgets });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to load budgets' }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { org } = await requireOrgMembership(user.id, params.orgSlug);
    const body = await req.json();
    const created = await prisma.budget.create({
      data: {
        accountId: body.accountId,
        fiscalYear: Number(body.fiscalYear),
        month: body.month ? Number(body.month) : null,
        budgetAmount: Number(body.budgetAmount),
        actualAmount: Number(body.actualAmount ?? 0),
        variance: Number(body.variance ?? 0),
      },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        entityType: 'Budget',
        entityId: created.id,
        action: 'CREATE',
        changes: body,
      },
    });
    return NextResponse.json({ budget: created });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create budget' }, { status: 400 });
  }
}
