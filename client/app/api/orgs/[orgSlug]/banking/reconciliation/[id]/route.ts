import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { ReconciliationService } from '@/services/banking/reconciliation.service';
import prisma from '@/lib/prisma';

/**
 * GET /api/orgs/[orgSlug]/banking/reconciliation/[id]
 * Get reconciliation details with clearable items and real-time gap
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const reconciliation = await prisma.bankReconciliation.findUnique({
      where: { id: params.id },
      include: {
        bankAccount: true,
        bankTransactions: {
          include: { bankFeed: { select: { feedName: true } } },
        },
      },
    });

    if (!reconciliation) {
      return NextResponse.json(
        { success: false, error: 'Reconciliation not found' },
        { status: 404 }
      );
    }

    // Get clearable items (payments + bank transactions eligible for ticking)
    const clearableItems = await ReconciliationService.getClearableItems(
      organizationId,
      reconciliation.bankAccountId,
      reconciliation.statementDate,
      reconciliation.id
    );

    // Build set of already-cleared IDs
    const clearedIds = new Set([
      ...(reconciliation.clearedPaymentIds || []),
      ...(reconciliation.clearedTransactionIds || []),
    ]);

    // Determine opening balance
    const openingBalance = reconciliation.openingBalance
      ? parseFloat(reconciliation.openingBalance.toString())
      : parseFloat(
          reconciliation.bankAccount.lastReconciledBalance?.toString() ||
            reconciliation.bankAccount.openingBalance.toString()
        );

    // Calculate the reconciliation gap in real time
    const statementBalance = parseFloat(reconciliation.statementBalance.toString());
    const gap = ReconciliationService.calculateReconciliationGap(
      openingBalance,
      statementBalance,
      clearableItems,
      clearedIds
    );

    // Get match suggestions
    const matchSuggestions = await ReconciliationService.findMatches(
      organizationId,
      reconciliation.bankAccountId,
      reconciliation.statementDate
    );

    return NextResponse.json({
      success: true,
      data: {
        reconciliation: {
          id: reconciliation.id,
          bankAccountId: reconciliation.bankAccountId,
          bankAccountName: reconciliation.bankAccount.accountName,
          accountNumber: reconciliation.bankAccount.accountNumber,
          currency: reconciliation.bankAccount.currency,
          statementDate: reconciliation.statementDate,
          statementBalance,
          bookBalance: parseFloat(reconciliation.bookBalance.toString()),
          openingBalance,
          status: reconciliation.status,
          notes: reconciliation.notes,
          clearedPaymentIds: reconciliation.clearedPaymentIds || [],
          clearedTransactionIds: reconciliation.clearedTransactionIds || [],
          adjustmentEntries: reconciliation.adjustmentEntries || [],
        },
        clearableItems,
        gap,
        matchSuggestions,
      },
    });
  } catch (error) {
    console.error('Error fetching reconciliation details:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reconciliation',
      },
      { status: 500 }
    );
  }
}
