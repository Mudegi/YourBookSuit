import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const accountSchema = z.object({
  accountName: z.string().min(1, 'Account name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  currency: z.string().length(3).optional(),
  accountType: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'LINE_OF_CREDIT', 'MONEY_MARKET']).default('CHECKING'),
  openingBalance: z.number().default(0),
});

// GET /api/[orgSlug]/banking/accounts
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const accounts = await prisma.bankAccount.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const data = accounts.map((a) => ({
      id: a.id,
      accountName: a.accountName,
      accountNumber: a.accountNumber,
      bankName: a.bankName,
      currency: a.currency,
      currentBalance: Number(a.currentBalance),
      openingBalance: Number(a.openingBalance),
      accountType: a.accountType,
      isActive: a.isActive,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch bank accounts' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/banking/accounts
export async function POST(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const body = await req.json();
    const parsed = accountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    const account = await prisma.bankAccount.create({
      data: {
        organizationId: org.id,
        accountName: input.accountName,
        accountNumber: input.accountNumber,
        bankName: input.bankName,
        currency: input.currency || org.baseCurrency || 'USD',
        accountType: input.accountType,
        openingBalance: input.openingBalance,
        currentBalance: input.openingBalance,
      },
    });

    return NextResponse.json({ success: true, data: { id: account.id } }, { status: 201 });
  } catch (error) {
    console.error('Error creating bank account:', error);
    return NextResponse.json({ success: false, error: 'Failed to create bank account' }, { status: 500 });
  }
}
