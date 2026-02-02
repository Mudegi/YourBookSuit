import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { ReconciliationService } from '@/services/banking/reconciliation.service';

/**
 * POST /api/orgs/[orgSlug]/banking/reconciliation/[id]/finalize
 * Finalize the reconciliation (audit lock)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { userId } = await requireAuth(params.orgSlug);

    await ReconciliationService.finalizeReconciliation(params.id, userId);

    return NextResponse.json({
      success: true,
      message: 'Reconciliation finalized successfully. All transactions are now locked.',
    });
  } catch (error) {
    console.error('Error finalizing reconciliation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to finalize reconciliation',
      },
      { status: 400 }
    );
  }
}
