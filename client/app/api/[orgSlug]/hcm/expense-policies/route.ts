import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const policySchema = z.object({
  name: z.string().min(1),
  categoryPattern: z.string().optional(),
  maxAmountPerItem: z.number().positive().optional(),
  maxDailyTotal: z.number().positive().optional(),
  maxMonthlyTotal: z.number().positive().optional(),
  requiresReceipt: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  autoApproveBelow: z.number().positive().optional(),
  currency: z.string().optional(),
});

// GET /api/[orgSlug]/hcm/expense-policies
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'read');

    const policies = await prisma.expensePolicy.findMany({
      where: { organizationId: org.id },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: policies.map((p) => ({
        ...p,
        maxAmountPerItem: p.maxAmountPerItem ? Number(p.maxAmountPerItem) : null,
        maxDailyTotal: p.maxDailyTotal ? Number(p.maxDailyTotal) : null,
        maxMonthlyTotal: p.maxMonthlyTotal ? Number(p.maxMonthlyTotal) : null,
        autoApproveBelow: p.autoApproveBelow ? Number(p.autoApproveBelow) : null,
      })),
    });
  } catch (error) {
    console.error('Error listing expense policies:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch policies' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/hcm/expense-policies
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'create');

    const body = await request.json();
    const parsed = policySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    const policy = await prisma.expensePolicy.create({
      data: {
        organizationId: org.id,
        name: input.name,
        categoryPattern: input.categoryPattern,
        maxAmountPerItem: input.maxAmountPerItem,
        maxDailyTotal: input.maxDailyTotal,
        maxMonthlyTotal: input.maxMonthlyTotal,
        requiresReceipt: input.requiresReceipt ?? true,
        requiresApproval: input.requiresApproval ?? true,
        autoApproveBelow: input.autoApproveBelow,
        currency: input.currency || org.baseCurrency,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'CREATE',
        entityType: 'EXPENSE_POLICY',
        entityId: policy.id,
        description: `Created expense policy "${input.name}"`,
      },
    });

    return NextResponse.json({ success: true, data: policy }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating expense policy:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'A policy with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: 'Failed to create policy' }, { status: 500 });
  }
}
