import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BankFeedService } from '@/services/banking/bank-feed.service';

/**
 * GET /api/orgs/[orgSlug]/banking/bank-feeds/transactions
 *   ?bankAccountId=X&status=UNPROCESSED&feedId=X&includeSuggestions=true&limit=200&offset=0
 *
 * POST /api/orgs/[orgSlug]/banking/bank-feeds/transactions
 *   Apply action: MATCH_INVOICE, MATCH_BILL, MATCH_PAYMENT, CREATE_EXPENSE, TRANSFER, IGNORE
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const sp = new URL(request.url).searchParams;

    const result = await BankFeedService.getFeedTransactions(org.id, {
      bankAccountId: sp.get('bankAccountId') || undefined,
      feedId: sp.get('feedId') || undefined,
      status: sp.get('status') || undefined,
      limit: sp.get('limit') ? parseInt(sp.get('limit')!) : 200,
      offset: sp.get('offset') ? parseInt(sp.get('offset')!) : 0,
      includeSuggestions: sp.get('includeSuggestions') === 'true',
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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

    const body = await request.json();

    // Batch approve
    if (body.batchApprove && Array.isArray(body.transactionIds)) {
      if (!body.categoryAccountId) {
        return NextResponse.json({ error: 'categoryAccountId required for batch approve' }, { status: 400 });
      }
      const result = await BankFeedService.batchApprove(org.id, body.transactionIds, body.categoryAccountId);
      return NextResponse.json({ success: true, ...result });
    }

    // Undo action
    if (body.undo && body.bankTransactionId) {
      const result = await BankFeedService.undoAction(org.id, body.bankTransactionId);
      return NextResponse.json({ success: true, transaction: result });
    }

    // Single action
    if (!body.bankTransactionId || !body.action) {
      return NextResponse.json({ error: 'bankTransactionId and action required' }, { status: 400 });
    }

    const result = await BankFeedService.applyAction(org.id, {
      bankTransactionId: body.bankTransactionId,
      action: body.action,
      matchedId: body.matchedId,
      categoryAccountId: body.categoryAccountId,
      taxRateId: body.taxRateId,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, transaction: result });
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
