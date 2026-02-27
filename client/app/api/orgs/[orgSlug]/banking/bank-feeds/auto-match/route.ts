import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BankFeedService } from '@/services/banking/bank-feed.service';

/**
 * POST /api/orgs/[orgSlug]/banking/bank-feeds/auto-match
 *   Run the rules engine + matching engine on all UNPROCESSED transactions
 *   ?bankAccountId=X (optional filter)
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const bankAccountId = body.bankAccountId || undefined;

    // 1. Apply rules first
    const rulesResult = await BankFeedService.applyRulesToUnprocessed(org.id, bankAccountId);

    // 2. Then get remaining UNPROCESSED and find matches
    const where: any = {
      organizationId: org.id,
      status: 'UNPROCESSED',
    };
    if (bankAccountId) where.bankFeed = { bankAccountId };

    const remaining = await prisma.bankTransaction.findMany({ where, take: 200 });

    let autoMatched = 0;
    for (const txn of remaining) {
      const suggestions = await BankFeedService.findSuggestedMatches(org.id, {
        id: txn.id,
        amount: Number(txn.amount),
        transactionDate: txn.transactionDate,
        description: txn.description,
        payee: txn.payee,
        referenceNo: txn.referenceNo,
      });

      // Auto-apply if top suggestion has confidence >= 85%
      const top = suggestions[0];
      if (top && top.confidenceScore >= 85) {
        const actionMap: Record<string, string> = {
          INVOICE: 'MATCH_INVOICE',
          BILL: 'MATCH_BILL',
          PAYMENT: 'MATCH_PAYMENT',
        };
        const actionType = actionMap[top.type];
        if (actionType) {
          await BankFeedService.applyAction(org.id, {
            bankTransactionId: txn.id,
            action: actionType as any,
            matchedId: top.id,
          });
          autoMatched++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      rulesCategorized: rulesResult.applied,
      rulesEvaluated: rulesResult.rules,
      autoMatched,
      totalProcessed: rulesResult.applied + autoMatched,
    });
  } catch (err: any) {
    console.error('Auto-match error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
