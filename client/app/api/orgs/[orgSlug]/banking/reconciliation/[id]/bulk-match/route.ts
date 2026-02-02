import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { ReconciliationService } from '@/services/banking/reconciliation.service';

/**
 * POST /api/orgs/[orgSlug]/banking/reconciliation/[id]/bulk-match
 * Bulk match multiple transactions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { userId } = await requireAuth(params.orgSlug);
    const body = await request.json();

    if (!Array.isArray(body.matches)) {
      return NextResponse.json(
        { success: false, error: 'matches must be an array' },
        { status: 400 }
      );
    }

    const result = await ReconciliationService.bulkMatch(
      body.matches,
      params.id,
      userId
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: `Matched ${result.matched} transactions${result.errors.length > 0 ? ` with ${result.errors.length} errors` : ''}`,
    });
  } catch (error) {
    console.error('Error bulk matching:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bulk match',
      },
      { status: 500 }
    );
  }
}
