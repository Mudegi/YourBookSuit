/**
 * Bank Reconciliation Service
 * The "Truth Filter" - Matches what you think happened (books) with what actually happened (bank statement)
 */

import { Decimal } from 'decimal.js';
import prisma from '@/lib/prisma';
import { JournalEntryService } from '../accounting/journal-entry.service';

export interface UnreconciledPayment {
  id: string;
  paymentNumber: string;
  paymentDate: Date;
  amount: number;
  paymentType: 'CUSTOMER_PAYMENT' | 'VENDOR_PAYMENT';
  paymentMethod: string;
  referenceNumber?: string;
  description: string;
  customerName?: string;
  vendorName?: string;
}

export interface UnreconciledBankTransaction {
  id: string;
  transactionDate: Date;
  amount: number;
  description: string;
  payee?: string;
  referenceNo?: string;
  transactionType: string;
  status: string;
}

export interface MatchSuggestion {
  paymentId: string;
  bankTransactionId: string;
  confidenceScore: number;
  matchReason: string;
}

export interface ReconciliationSummary {
  statementBalance: number;
  bookBalance: number;
  depositsInTransit: number;
  outstandingChecks: number;
  adjustedBookBalance: number;
  difference: number;
  isBalanced: boolean;
}

export class ReconciliationService {
  /**
   * Matching Engine: Automatically suggest matches based on amount, date, and reference
   */
  static async findMatches(
    organizationId: string,
    bankAccountId: string,
    statementDate: Date
  ): Promise<MatchSuggestion[]> {
    // Get unreconciled payments for this bank account
    const payments = await prisma.payment.findMany({
      where: {
        organizationId,
        bankAccountId,
        isReconciled: false,
        paymentDate: {
          lte: statementDate,
        },
      },
      include: {
        customer: true,
        vendor: true,
      },
    });

    // Get unmatched bank transactions
    const bankTransactions = await prisma.bankTransaction.findMany({
      where: {
        organizationId,
        isReconciled: false,
        transactionDate: {
          lte: statementDate,
        },
        bankFeed: {
          bankAccountId,
        },
      },
    });

    const matches: MatchSuggestion[] = [];

    // Matching algorithm with 3-day window
    for (const payment of payments) {
      for (const transaction of bankTransactions) {
        const paymentAmount = new Decimal(payment.amount);
        const transactionAmount = new Decimal(Math.abs(parseFloat(transaction.amount.toString())));
        
        // Amount must match exactly (or within 0.01 tolerance)
        const amountDiff = paymentAmount.minus(transactionAmount).abs();
        if (amountDiff.greaterThan(0.01)) continue;

        // Date must be within 3-day window
        const paymentDate = new Date(payment.paymentDate);
        const transactionDate = new Date(transaction.transactionDate);
        const daysDiff = Math.abs(
          (paymentDate.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff > 3) continue;

        // Calculate confidence score
        let confidenceScore = 70; // Base score for amount + date match

        // Bonus for reference number match
        if (
          payment.referenceNumber &&
          transaction.referenceNo &&
          payment.referenceNumber.toLowerCase() === transaction.referenceNo.toLowerCase()
        ) {
          confidenceScore += 20;
        }

        // Bonus for exact date match
        if (daysDiff === 0) {
          confidenceScore += 10;
        }

        // Bonus for payee match
        const payeeName = payment.customer?.name || payment.vendor?.name || '';
        if (
          payeeName &&
          transaction.payee &&
          transaction.payee.toLowerCase().includes(payeeName.toLowerCase())
        ) {
          confidenceScore += 10;
        }

        let matchReason = 'Amount and date match';
        if (confidenceScore >= 90) matchReason = 'Exact match (amount, date, reference)';
        else if (confidenceScore >= 80) matchReason = 'High confidence match';

        matches.push({
          paymentId: payment.id,
          bankTransactionId: transaction.id,
          confidenceScore: Math.min(confidenceScore, 100),
          matchReason,
        });
      }
    }

    // Sort by confidence score (highest first)
    return matches.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * Get unreconciled items for reconciliation worksheet
   */
  static async getUnreconciledItems(
    organizationId: string,
    bankAccountId: string,
    statementDate: Date
  ) {
    // Payments in books not yet reconciled
    const payments = await prisma.payment.findMany({
      where: {
        organizationId,
        bankAccountId,
        isReconciled: false,
        paymentDate: {
          lte: statementDate,
        },
      },
      include: {
        customer: {
          select: { name: true },
        },
        vendor: {
          select: { name: true },
        },
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    // Bank transactions not yet matched
    const bankTransactions = await prisma.bankTransaction.findMany({
      where: {
        organizationId,
        isReconciled: false,
        transactionDate: {
          lte: statementDate,
        },
        bankFeed: {
          bankAccountId,
        },
      },
      orderBy: {
        transactionDate: 'desc',
      },
    });

    // Format payments for UI
    const unreconciledPayments: UnreconciledPayment[] = payments.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      paymentDate: p.paymentDate,
      amount: parseFloat(p.amount.toString()),
      paymentType: p.paymentType,
      paymentMethod: p.paymentMethod,
      referenceNumber: p.referenceNumber || undefined,
      description: p.notes || `Payment ${p.paymentNumber}`,
      customerName: p.customer?.name,
      vendorName: p.vendor?.name,
    }));

    // Format bank transactions for UI
    const unreconciledBankTransactions: UnreconciledBankTransaction[] = bankTransactions.map((t) => ({
      id: t.id,
      transactionDate: t.transactionDate,
      amount: parseFloat(t.amount.toString()),
      description: t.description,
      payee: t.payee || undefined,
      referenceNo: t.referenceNo || undefined,
      transactionType: t.transactionType,
      status: t.status,
    }));

    return {
      payments: unreconciledPayments,
      bankTransactions: unreconciledBankTransactions,
    };
  }

  /**
   * Match a payment with a bank transaction
   */
  static async matchTransaction(
    paymentId: string,
    bankTransactionId: string,
    reconciliationId: string,
    userId: string
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Update payment
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          isReconciled: true,
          reconciledDate: new Date(),
          reconciliationId,
          updatedById: userId,
        },
      });

      // Update bank transaction
      await tx.bankTransaction.update({
        where: { id: bankTransactionId },
        data: {
          isReconciled: true,
          clearedDate: new Date(),
          reconciliationId,
          status: 'MATCHED',
          matchedPaymentId: paymentId,
        },
      });
    });
  }

  /**
   * Bulk match multiple transactions
   */
  static async bulkMatch(
    matches: Array<{ paymentId: string; bankTransactionId: string }>,
    reconciliationId: string,
    userId: string
  ): Promise<{ matched: number; errors: string[] }> {
    const errors: string[] = [];
    let matched = 0;

    for (const match of matches) {
      try {
        await this.matchTransaction(
          match.paymentId,
          match.bankTransactionId,
          reconciliationId,
          userId
        );
        matched++;
      } catch (error) {
        errors.push(
          `Failed to match payment ${match.paymentId} with transaction ${match.bankTransactionId}`
        );
      }
    }

    return { matched, errors };
  }

  /**
   * Create adjustment entry for bank fees, interest, etc.
   */
  static async createAdjustmentEntry(
    organizationId: string,
    userId: string,
    bankAccountId: string,
    reconciliationId: string,
    adjustment: {
      transactionDate: Date;
      amount: number;
      description: string;
      accountId: string; // e.g., Bank Charges expense account
      adjustmentType: 'FEE' | 'INTEREST' | 'WHT' | 'OTHER';
    }
  ): Promise<any> {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
      select: { glAccountId: true, currency: true },
    });

    if (!bankAccount?.glAccountId) {
      throw new Error('Bank account must be linked to a GL account');
    }

    // Determine debit/credit based on adjustment type
    const isDebit = adjustment.adjustmentType === 'FEE' || adjustment.adjustmentType === 'WHT';
    
    const entries = [
      {
        accountId: isDebit ? adjustment.accountId : bankAccount.glAccountId,
        entryType: 'DEBIT' as const,
        amount: Math.abs(adjustment.amount),
        description: adjustment.description,
      },
      {
        accountId: isDebit ? bankAccount.glAccountId : adjustment.accountId,
        entryType: 'CREDIT' as const,
        amount: Math.abs(adjustment.amount),
        description: adjustment.description,
      },
    ];

    // Create journal entry using JournalEntryService
    const result = await JournalEntryService.createJournalEntry({
      organizationId,
      userId,
      journalDate: adjustment.transactionDate,
      referenceNumber: await JournalEntryService.generateReferenceNumber(organizationId),
      journalType: 'Adjustment',
      currency: bankAccount.currency,
      exchangeRate: 1,
      description: `Bank Reconciliation Adjustment: ${adjustment.description}`,
      notes: `Reconciliation ID: ${reconciliationId}`,
      isReversal: false,
      reversalDate: null,
      entries,
    });

    // Track the adjustment in the reconciliation record
    const reconciliation = await prisma.bankReconciliation.findUnique({
      where: { id: reconciliationId },
      select: { adjustmentEntries: true },
    });

    const existingAdjustments = (reconciliation?.adjustmentEntries as any[]) || [];
    const newAdjustment = {
      journalEntryId: result.id,
      transactionNumber: result.transactionNumber,
      date: adjustment.transactionDate,
      type: adjustment.adjustmentType,
      amount: adjustment.amount,
      description: adjustment.description,
      accountId: adjustment.accountId,
      createdAt: new Date(),
      createdBy: userId,
    };

    await prisma.bankReconciliation.update({
      where: { id: reconciliationId },
      data: {
        adjustmentEntries: [...existingAdjustments, newAdjustment],
      },
    });

    return result;
  }

  /**
   * Calculate reconciliation summary
   */
  static async calculateSummary(
    organizationId: string,
    bankAccountId: string,
    statementDate: Date,
    statementBalance: number
  ): Promise<ReconciliationSummary> {
    // Get bank account current balance (from books)
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
      select: { currentBalance: true },
    });

    const bookBalance = bankAccount ? parseFloat(bankAccount.currentBalance.toString()) : 0;

    // Get deposits in transit (payments recorded but not cleared)
    // Include all incoming payments (customer payments, refunds, etc.)
    const depositsInTransit = await prisma.payment.findMany({
      where: {
        organizationId,
        bankAccountId,
        isReconciled: false,
        paymentType: 'CUSTOMER_PAYMENT',
        paymentDate: {
          lte: statementDate,
        },
        amount: {
          gt: 0, // Only positive amounts (deposits)
        },
      },
    });

    const depositsTotal = depositsInTransit.reduce(
      (sum, p) => sum + parseFloat(p.amount.toString()),
      0
    );

    // Get outstanding checks (payments recorded but not cleared)
    // Include all outgoing payments (vendor payments, withdrawals, etc.)
    const outstandingChecks = await prisma.payment.findMany({
      where: {
        organizationId,
        bankAccountId,
        isReconciled: false,
        paymentType: 'VENDOR_PAYMENT',
        paymentDate: {
          lte: statementDate,
        },
        amount: {
          gt: 0, // Positive amounts represent outgoing funds
        },
      },
    });

    const checksTotal = outstandingChecks.reduce(
      (sum, p) => sum + parseFloat(p.amount.toString()),
      0
    );

    // Calculate adjusted book balance
    // Correct Formula: Book Balance + Deposits in Transit - Outstanding Checks = Adjusted Book Balance
    // This represents what the book balance SHOULD be once all outstanding items clear
    const adjustedBookBalance = bookBalance + depositsTotal - checksTotal;

    // Difference is what needs adjustment (should match statement balance when reconciled)
    const difference = statementBalance - adjustedBookBalance;

    return {
      statementBalance,
      bookBalance,
      depositsInTransit: depositsTotal,
      outstandingChecks: checksTotal,
      adjustedBookBalance,
      difference,
      isBalanced: Math.abs(difference) < 0.01,
    };
  }

  /**
   * Finalize reconciliation - locks all cleared transactions
   */
  static async finalizeReconciliation(
    reconciliationId: string,
    userId: string
  ): Promise<void> {
    const reconciliation = await prisma.bankReconciliation.findUnique({
      where: { id: reconciliationId },
      include: {
        bankAccount: true,
        bankTransactions: true,
      },
    });

    if (!reconciliation) {
      throw new Error('Reconciliation not found');
    }

    if (reconciliation.status === 'FINALIZED') {
      throw new Error('Reconciliation is already finalized');
    }

    // Check if balanced
    const summary = await this.calculateSummary(
      reconciliation.bankAccount.organizationId,
      reconciliation.bankAccountId,
      reconciliation.statementDate,
      parseFloat(reconciliation.statementBalance.toString())
    );

    if (!summary.isBalanced) {
      throw new Error(
        `Cannot finalize: Difference of ${summary.difference.toFixed(2)} must be zero`
      );
    }

    // Generate static reconciliation report for auditors
    const report = await this.generateReconciliationReport(
      reconciliation,
      summary,
      userId
    );

    // Update reconciliation status with report
    await prisma.bankReconciliation.update({
      where: { id: reconciliationId },
      data: {
        status: 'FINALIZED',
        reconciledBy: userId,
        reconciledAt: new Date(),
        finalizedAt: new Date(),
        depositsInTransit: summary.depositsInTransit,
        outstandingChecks: summary.outstandingChecks,
        adjustedBookBalance: summary.adjustedBookBalance,
        difference: summary.difference,
        reconciliationReport: JSON.stringify(report),
      },
    });
  }

  /**
   * Generate comprehensive reconciliation report for audit trail
   */
  private static async generateReconciliationReport(
    reconciliation: any,
    summary: ReconciliationSummary,
    userId: string
  ): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    });

    const clearedTransactions = await prisma.bankTransaction.findMany({
      where: { reconciliationId: reconciliation.id },
      select: {
        id: true,
        transactionDate: true,
        amount: true,
        description: true,
        referenceNo: true,
        clearedDate: true,
      },
    });

    const clearedPayments = await prisma.payment.findMany({
      where: { reconciliationId: reconciliation.id },
      select: {
        id: true,
        paymentNumber: true,
        paymentDate: true,
        amount: true,
        paymentType: true,
        referenceNumber: true,
        reconciledDate: true,
      },
    });

    const adjustments = (reconciliation.adjustmentEntries as any[]) || [];

    return {
      reportId: `RECON-${reconciliation.id}`,
      generatedAt: new Date().toISOString(),
      generatedBy: {
        name: `${user?.firstName} ${user?.lastName}`,
        email: user?.email,
      },
      bankAccount: {
        name: reconciliation.bankAccount.accountName,
        number: reconciliation.bankAccount.accountNumber,
        currency: reconciliation.bankAccount.currency,
      },
      period: {
        statementDate: reconciliation.statementDate,
        finalizedAt: new Date().toISOString(),
      },
      balances: {
        statementBalance: summary.statementBalance,
        bookBalance: summary.bookBalance,
        depositsInTransit: summary.depositsInTransit,
        outstandingChecks: summary.outstandingChecks,
        adjustedBookBalance: summary.adjustedBookBalance,
        difference: summary.difference,
        isBalanced: summary.isBalanced,
      },
      clearedItems: {
        transactions: clearedTransactions.length,
        payments: clearedPayments.length,
        totalTransactionAmount: clearedTransactions.reduce(
          (sum, t) => sum + parseFloat(t.amount.toString()),
          0
        ),
        totalPaymentAmount: clearedPayments.reduce(
          (sum, p) => sum + parseFloat(p.amount.toString()),
          0
        ),
      },
      adjustments: {
        count: adjustments.length,
        totalAmount: adjustments.reduce((sum, a) => sum + a.amount, 0),
        entries: adjustments.map((a) => ({
          type: a.type,
          amount: a.amount,
          description: a.description,
          transactionNumber: a.transactionNumber,
          date: a.date,
        })),
      },
      auditTrail: {
        status: 'FINALIZED',
        locked: true,
        message:
          'This reconciliation is finalized and locked. No further changes can be made to the cleared transactions.',
      },
    };
  }

  /**
   * Unmatch a transaction (only if reconciliation not finalized)
   */
  static async unmatchTransaction(
    paymentId: string,
    bankTransactionId: string
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Check if reconciliation is finalized
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: { reconciliationId: true },
      });

      if (payment?.reconciliationId) {
        const reconciliation = await tx.bankReconciliation.findUnique({
          where: { id: payment.reconciliationId },
          select: { status: true },
        });

        if (reconciliation?.status === 'FINALIZED') {
          throw new Error('Cannot unmatch: Reconciliation is finalized (Audit Lock)');
        }
      }

      // Unmatch
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          isReconciled: false,
          reconciledDate: null,
          reconciliationId: null,
        },
      });

      await tx.bankTransaction.update({
        where: { id: bankTransactionId },
        data: {
          isReconciled: false,
          clearedDate: null,
          reconciliationId: null,
          status: 'PENDING',
          matchedPaymentId: null,
        },
      });
    });
  }

  /**
   * Calculate and post realized exchange gain/loss for cross-currency reconciliation
   * This is called when matching a payment in one currency with a bank transaction in another
   */
  static async calculateAndPostExchangeGainLoss(
    organizationId: string,
    userId: string,
    payment: {
      id: string;
      amount: number;
      currency: string;
      exchangeRate: number;
    },
    bankTransaction: {
      id: string;
      amount: number;
      currency: string;
    },
    reconciliationId: string
  ): Promise<void> {
    // Only process if currencies differ
    if (payment.currency === bankTransaction.currency) {
      return;
    }

    // Calculate amounts in base currency (payment's original currency)
    const paymentBaseAmount = payment.amount; // Already in base currency
    const bankActualAmount = Math.abs(bankTransaction.amount);

    // If payment was in foreign currency, convert it to what it SHOULD have been
    // based on the actual bank transaction amount
    const expectedBaseAmount = paymentBaseAmount;
    const actualBaseAmount = bankActualAmount;

    // Calculate realized gain/loss
    const gainLoss = actualBaseAmount - expectedBaseAmount;

    // Skip if difference is negligible (less than 0.01)
    if (Math.abs(gainLoss) < 0.01) {
      return;
    }

    // Get FX gain/loss accounts from chart of accounts
    // Look for accounts with names containing "Exchange Gain" or "Exchange Loss"
    const fxGainAccount = await prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        accountName: { contains: 'Exchange Gain', mode: 'insensitive' },
        accountType: 'REVENUE',
      },
    });

    const fxLossAccount = await prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        accountName: { contains: 'Exchange Loss', mode: 'insensitive' },
        accountType: 'EXPENSE',
      },
    });

    if (!fxGainAccount || !fxLossAccount) {
      console.warn(
        'FX Gain/Loss accounts not found in chart of accounts. Please create accounts named "Exchange Gain" (Revenue) and "Exchange Loss" (Expense). Skipping exchange difference posting.'
      );
      return;
    }

    // Determine if it's a gain or loss
    const isGain = gainLoss > 0;
    const fxAmount = Math.abs(gainLoss);
    const fxAccountId = isGain ? fxGainAccount.id : fxLossAccount.id;

    // Get bank account's GL account for the offsetting entry
    const payment_record = await prisma.payment.findUnique({
      where: { id: payment.id },
      include: {
        bankAccount: {
          select: { glAccountId: true },
        },
      },
    });

    if (!payment_record?.bankAccount?.glAccountId) {
      throw new Error('Bank account not linked to GL account');
    }

    const bankGLAccountId = payment_record.bankAccount.glAccountId;

    // Create journal entry for realized FX gain/loss
    const entries = [
      {
        accountId: isGain ? bankGLAccountId : fxAccountId,
        entryType: 'DEBIT' as const,
        amount: fxAmount,
        description: `Realized FX ${isGain ? 'Gain' : 'Loss'} on reconciliation`,
      },
      {
        accountId: isGain ? fxAccountId : bankGLAccountId,
        entryType: 'CREDIT' as const,
        amount: fxAmount,
        description: `Realized FX ${isGain ? 'Gain' : 'Loss'} on reconciliation`,
      },
    ];

    await JournalEntryService.createJournalEntry({
      organizationId,
      userId,
      journalDate: new Date(),
      referenceNumber: await JournalEntryService.generateReferenceNumber(organizationId),
      journalType: 'FX Adjustment',
      currency: payment.currency,
      exchangeRate: 1,
      description: `Realized Exchange ${isGain ? 'Gain' : 'Loss'} - Reconciliation ${reconciliationId}`,
      notes: `Payment ${payment.id} vs Bank Transaction ${bankTransaction.id}. Expected: ${expectedBaseAmount}, Actual: ${actualBaseAmount}, Difference: ${gainLoss}`,
      isReversal: false,
      reversalDate: null,
      entries,
    });
  }
}
