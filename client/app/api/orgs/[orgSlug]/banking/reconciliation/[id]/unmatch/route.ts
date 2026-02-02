import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { ReconciliationService } from '@/services/banking/reconciliation.service';

/**
 * POST /api/orgs/[orgSlug]/banking/reconciliation/[id]/unmatch
 * Unmatch a transaction (only if not finalized)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    await requireAuth(params.orgSlug);
    const body = await request.json();

    if (!body.paymentId || !body.bankTransactionId) {
      return NextResponse.json(
        { success: false, error: 'Missing paymentId or bankTransactionId' },
        { status: 400 }
      );
    }

    await ReconciliationService.unmatchTransaction(
      body.paymentId,
      body.bankTransactionId
    );

    return NextResponse.json({
      success: true,
      message: 'Transaction unmatched successfully',
    });
  } catch (error) {
    console.error('Error unmatching transaction:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unmatch transaction',
      },
      { status: 400 }
    );
  }
}
