import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { DoubleEntryService } from '@/services/accounting/double-entry.service';

/**
 * POST /api/orgs/[orgSlug]/expenses/[id]/void
 * Void an expense by creating a reversing journal entry and marking as VOIDED
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { userId, organizationId } = await requireAuth(params.orgSlug);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Find the expense transaction
      const expense = await tx.transaction.findFirst({
        where: {
          id: params.id,
          organizationId,
          transactionType: 'JOURNAL_ENTRY',
          referenceType: 'EXPENSE',
        },
        include: {
          ledgerEntries: {
            include: {
              account: true,
            },
          },
        },
      });

      if (!expense) {
        throw new Error('Expense not found');
      }

      if (expense.status === 'VOIDED') {
        throw new Error('Expense is already voided');
      }

      if (expense.status === 'CANCELLED') {
        throw new Error('Expense is already cancelled');
      }

      if ((expense as any).isLocked) {
        throw new Error('Expense is locked and cannot be voided (it may be part of a finalized reconciliation)');
      }

      // 2. Create reversing journal entry (swap debits and credits)
      const reversingEntries = expense.ledgerEntries.map((entry) => ({
        accountId: entry.accountId,
        entryType: entry.entryType === 'DEBIT' ? ('CREDIT' as const) : ('DEBIT' as const),
        amount: parseFloat(entry.amount.toString()),
        currency: entry.currency,
        exchangeRate: parseFloat(entry.exchangeRate.toString()),
        description: `Reversal: ${entry.description || expense.description}`,
      }));

      // Use DoubleEntryService to create reversing transaction
      await DoubleEntryService.createTransaction(
        {
          organizationId,
          transactionDate: new Date(),
          transactionType: 'JOURNAL_ENTRY',
          description: `VOID: ${expense.description}`,
          referenceType: 'EXPENSE_VOID',
          referenceId: expense.referenceId || expense.id,
          createdById: userId,
          entries: reversingEntries,
          metadata: {
            voidedTransactionId: expense.id,
            voidedBy: userId,
            voidedAt: new Date().toISOString(),
            originalReferenceNumber: expense.referenceId,
          },
        },
        tx
      );

      // 3. Mark original transaction as VOIDED
      await tx.transaction.update({
        where: { id: expense.id },
        data: { status: 'VOIDED' },
      });

      // 4. If there's a bank account involved, reverse the balance impact
      const meta = (expense as any).metadata as any;
      if (meta?.paymentMethod && !meta?.isReimbursement) {
        // Find the credit entry to the bank/cash account
        const creditEntry = expense.ledgerEntries.find(
          (e) => e.entryType === 'CREDIT' && e.account.accountType === 'ASSET'
        );

        if (creditEntry) {
          // Find bank account linked to this GL account
          const bankAccount = await tx.bankAccount.findFirst({
            where: {
              organizationId,
              glAccountId: creditEntry.accountId,
            },
          });

          if (bankAccount) {
            // Reverse the decrement (add the amount back)
            await tx.bankAccount.update({
              where: { id: bankAccount.id },
              data: {
                currentBalance: {
                  increment: parseFloat(creditEntry.amount.toString()),
                },
              },
            });
          }
        }
      }

      return {
        success: true,
        message: `Expense ${expense.referenceId || expense.transactionNumber} has been voided`,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error voiding expense:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to void expense' },
      { status: 500 }
    );
  }
}
