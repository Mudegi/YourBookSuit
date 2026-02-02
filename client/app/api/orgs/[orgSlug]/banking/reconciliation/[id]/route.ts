import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { ReconciliationService } from '@/services/banking/reconciliation.service';
import prisma from '@/lib/prisma';

/**
 * GET /api/orgs/[orgSlug]/banking/reconciliation/[id]
 * Get reconciliation details with unreconciled items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const reconciliation = await prisma.bankReconciliation.findUnique({
      where: {
        id: params.id,
      },
      include: {
        bankAccount: true,
        bankTransactions: {
          include: {
            bankFeed: {
              select: {
                feedName: true,
              },
            },
          },
        },
      },
    });

    if (!reconciliation) {
      return NextResponse.json(
        { success: false, error: 'Reconciliation not found' },
        { status: 404 }
      );
    }

    // Get unreconciled items
    const unreconciledItems = await ReconciliationService.getUnreconciledItems(
      organizationId,
      reconciliation.bankAccountId,
      reconciliation.statementDate
    );

    // Get match suggestions
    const matchSuggestions = await ReconciliationService.findMatches(
      organizationId,
      reconciliation.bankAccountId,
      reconciliation.statementDate
    );

    // Get summary
    const summary = await ReconciliationService.calculateSummary(
      organizationId,
      reconciliation.bankAccountId,
      reconciliation.statementDate,
      parseFloat(reconciliation.statementBalance.toString())
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
          statementBalance: parseFloat(reconciliation.statementBalance.toString()),
          bookBalance: parseFloat(reconciliation.bookBalance.toString()),
          difference: parseFloat(reconciliation.difference.toString()),
          status: reconciliation.status,
          notes: reconciliation.notes,
        },
        unreconciledPayments: unreconciledItems.payments,
        unreconciledBankTransactions: unreconciledItems.bankTransactions,
        matchSuggestions,
        summary,
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
