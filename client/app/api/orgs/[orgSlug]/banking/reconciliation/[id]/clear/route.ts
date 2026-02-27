import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { ReconciliationService } from '@/services/banking/reconciliation.service';

/**
 * POST /api/orgs/[orgSlug]/banking/reconciliation/[id]/clear
 * Toggle cleared state of a payment or bank transaction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);
    const body = await request.json();

    const { itemId, itemType, isCleared } = body;

    if (!itemId || !itemType || isCleared === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: itemId, itemType, isCleared' },
        { status: 400 }
      );
    }

    // Map client types to service types
    const typeMap: Record<string, 'PAYMENT' | 'BANK_TXN'> = {
      payment: 'PAYMENT',
      bankTransaction: 'BANK_TXN',
      PAYMENT: 'PAYMENT',
      BANK_TXN: 'BANK_TXN',
    };
    const mappedType = typeMap[itemType];
    if (!mappedType) {
      return NextResponse.json(
        { success: false, error: 'itemType must be "payment" or "bankTransaction"' },
        { status: 400 }
      );
    }

    const result = await ReconciliationService.toggleClear(
      params.id,
      itemId,
      mappedType,
      isCleared
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: `Item ${isCleared ? 'cleared' : 'uncleared'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling clear status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle clear status',
      },
      { status: 400 }
    );
  }
}
