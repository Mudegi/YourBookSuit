import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { ReconciliationService } from '@/services/banking/reconciliation.service';

/**
 * POST /api/orgs/[orgSlug]/banking/reconciliation/[id]/match
 * Match a payment with a bank transaction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { userId } = await requireAuth(params.orgSlug);
    const body = await request.json();

    if (!body.paymentId || !body.bankTransactionId) {
      return NextResponse.json(
        { success: false, error: 'Missing paymentId or bankTransactionId' },
        { status: 400 }
      );
    }

    await ReconciliationService.matchTransaction(
      body.paymentId,
      body.bankTransactionId,
      params.id,
      userId
    );

    return NextResponse.json({
      success: true,
      message: 'Transaction matched successfully',
    });
  } catch (error) {
    console.error('Error matching transaction:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to match transaction',
      },
      { status: 500 }
    );
  }
}
