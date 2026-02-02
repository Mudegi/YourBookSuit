import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';

const reconciliationSchema = z.object({
  bankAccountId: z.string().min(1, 'Bank account is required'),
  statementDate: z.coerce.date(),
  statementBalance: z.number(),
  notes: z.string().optional(),
});

// GET /api/[orgSlug]/banking/reconciliation
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const reconciliations = await prisma.bankReconciliation.findMany({
      where: { bankAccount: { organizationId: org.id } },
      include: {
        bankAccount: { select: { id: true, accountName: true, accountNumber: true, currency: true } },
      },
      orderBy: { statementDate: 'desc' },
      take: 50,
    });

    const data = reconciliations.map((r) => ({
      id: r.id,
      bankAccountId: r.bankAccountId,
      bankAccountName: r.bankAccount?.accountName,
      accountNumber: r.bankAccount?.accountNumber,
      currency: r.bankAccount?.currency,
      statementDate: r.statementDate,
      statementBalance: Number(r.statementBalance),
      bookBalance: Number(r.bookBalance),
      difference: Number(r.difference),
      status: r.status,
      notes: r.notes,
      updatedAt: r.updatedAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching reconciliations:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch reconciliations' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/banking/reconciliation
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);
    const body = await request.json();
    const parsed = reconciliationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id: input.bankAccountId, organizationId: org.id },
    });

    if (!bankAccount) {
      return NextResponse.json({ success: false, error: 'Bank account not found' }, { status: 404 });
    }

    const bookBalance = Number(bankAccount.currentBalance);
    const difference = input.statementBalance - bookBalance;

    const reconciliation = await prisma.bankReconciliation.create({
      data: {
        bankAccountId: bankAccount.id,
        statementDate: input.statementDate,
        statementBalance: input.statementBalance,
        bookBalance,
        difference,
        status: 'IN_PROGRESS',
        notes: input.notes,
      },
    });

    return NextResponse.json({ success: true, data: { id: reconciliation.id } }, { status: 201 });
  } catch (error) {
    console.error('Error creating reconciliation:', error);
    return NextResponse.json({ success: false, error: 'Failed to start reconciliation' }, { status: 500 });
  }
}
