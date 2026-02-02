import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';

// GET /api/[orgSlug]/banking/transactions
export async function GET(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const transactions = await prisma.bankTransaction.findMany({
      where: {
        organizationId: org.id,
        status: status || undefined,
      },
      include: {
        bankFeed: {
          include: {
            bankAccount: true,
          },
        },
      },
      orderBy: { transactionDate: 'desc' },
      take: 200,
    });

    const data = transactions.map((t) => ({
      id: t.id,
      bankFeedId: t.bankFeedId,
      transactionDate: t.transactionDate,
      amount: Number(t.amount),
      description: t.description,
      payee: t.payee,
      referenceNo: t.referenceNo,
      transactionType: t.transactionType,
      status: t.status,
      confidenceScore: t.confidenceScore ? Number(t.confidenceScore) : null,
      matchedPaymentId: t.matchedPaymentId,
      bankFeedName: t.bankFeed?.feedName,
      bankAccountName: t.bankFeed?.bankAccount?.accountName,
      accountNumber: t.bankFeed?.bankAccount?.accountNumber,
      currency: t.bankFeed?.bankAccount?.currency,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching bank transactions', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch bank transactions' }, { status: 500 });
  }
}
