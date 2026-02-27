/**
 * Bank Reconciliation Service
 * The "Final Audit" — proves that the ERP's System Balance matches
 * the Bank's Statement Balance as of a specific date.
 *
 * Core formula:
 *   Difference = (OpeningBalance + Sum(ClearedDeposits) − Sum(ClearedWithdrawals)) − StatementEndingBalance
 *
 * When Difference === 0.00 the user may "Finalize & Lock".
 */

import { Decimal } from 'decimal.js';
import prisma from '@/lib/prisma';
import { JournalEntryService } from '../accounting/journal-entry.service';

/* ═══════════ TYPES ═══════════ */

export interface ClearableTransaction {
  id: string;
  type: 'PAYMENT' | 'BANK_TXN';
  transactionDate: string;
  amount: number;           // positive = deposit, negative = withdrawal
  description: string;
  reference: string | null;
  payee: string | null;
  category: 'DEPOSIT' | 'WITHDRAWAL';
  isCleared: boolean;
  isLocked: boolean;
  paymentType?: string;
  paymentMethod?: string;
  customerName?: string;
  vendorName?: string;
  status?: string;
  bankFeedName?: string;
}

export interface ReconciliationGap {
  openingBalance: number;
  clearedDeposits: number;
  clearedWithdrawals: number;
  calculatedBalance: number;   // openingBalance + deposits − withdrawals
  statementBalance: number;
  difference: number;          // calculatedBalance − statementBalance
  isBalanced: boolean;         // |difference| < 0.01
  unclearedDeposits: number;
  unclearedWithdrawals: number;
  totalItems: number;
  clearedItems: number;
}

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

/* ═══════════ SERVICE ═══════════ */

export class ReconciliationService {

  /* ─────────── 1. Get clearable items ─────────── */

  /**
   * Retrieve all transactions eligible for clearing:
   *  • Payments (both customer & vendor) on this bank account up to statementDate
   *  • Bank feed transactions on this bank account up to statementDate
   * Already-cleared items for THIS reconciliation are included (with isCleared=true).
   */
  static async getClearableItems(
    organizationId: string,
    bankAccountId: string,
    statementDate: Date,
    reconciliationId: string,
  ): Promise<ClearableTransaction[]> {
    const items: ClearableTransaction[] = [];

    // ── Payments ──
    const payments = await prisma.payment.findMany({
      where: {
        organizationId,
        bankAccountId,
        paymentDate: { lte: statementDate },
        OR: [
          { isReconciled: false },
          { reconciliationId },               // already cleared in this reconciliation
        ],
      },
      include: {
        customer: { select: { name: true } },
        vendor: { select: { name: true } },
      },
      orderBy: { paymentDate: 'asc' },
    });

    for (const p of payments) {
      const amt = parseFloat(p.amount.toString());
      const isDeposit = p.paymentType === 'CUSTOMER_PAYMENT';
      items.push({
        id: p.id,
        type: 'PAYMENT',
        transactionDate: p.paymentDate.toISOString(),
        amount: isDeposit ? amt : -amt,
        description: p.notes || `Payment ${p.paymentNumber}`,
        reference: p.referenceNumber || p.paymentNumber,
        payee: p.customer?.name || p.vendor?.name || null,
        category: isDeposit ? 'DEPOSIT' : 'WITHDRAWAL',
        isCleared: p.reconciliationId === reconciliationId,
        isLocked: p.isLocked ?? false,
        paymentType: p.paymentType,
        paymentMethod: p.paymentMethod,
        customerName: p.customer?.name,
        vendorName: p.vendor?.name,
      });
    }

    // ── Bank feed transactions ──
    const bankTxns = await prisma.bankTransaction.findMany({
      where: {
        organizationId,
        transactionDate: { lte: statementDate },
        bankFeed: { bankAccountId },
        OR: [
          { isReconciled: false },
          { reconciliationId },
        ],
      },
      include: {
        bankFeed: { select: { feedName: true } },
      },
      orderBy: { transactionDate: 'asc' },
    });

    for (const t of bankTxns) {
      const amt = parseFloat(t.amount.toString());
      items.push({
        id: t.id,
        type: 'BANK_TXN',
        transactionDate: t.transactionDate.toISOString(),
        amount: amt,
        description: t.description,
        reference: t.referenceNo,
        payee: t.payee,
        category: amt >= 0 ? 'DEPOSIT' : 'WITHDRAWAL',
        isCleared: t.reconciliationId === reconciliationId,
        isLocked: t.isLocked ?? false,
        status: t.status,
        bankFeedName: t.bankFeed?.feedName,
      });
    }

    return items;
  }

  /* ─────────── 2. Calculation engine ─────────── */

  /**
   * calculateReconciliationGap(openingBalance, statementBalance, items, clearedIds)
   *
   * Formula:
   *   Difference = (OpeningBalance + Sum(ClearedDeposits) − Sum(ClearedWithdrawals))
   *                − StatementEndingBalance
   */
  static calculateReconciliationGap(
    openingBalance: number,
    statementBalance: number,
    items: ClearableTransaction[],
    clearedIds: Set<string>,
  ): ReconciliationGap {
    let clearedDeposits = 0;
    let clearedWithdrawals = 0;
    let unclearedDeposits = 0;
    let unclearedWithdrawals = 0;
    let clearedCount = 0;

    for (const item of items) {
      const isCleared = clearedIds.has(item.id);
      const absAmt = Math.abs(item.amount);

      if (item.category === 'DEPOSIT') {
        if (isCleared) { clearedDeposits += absAmt; clearedCount++; }
        else { unclearedDeposits += absAmt; }
      } else {
        if (isCleared) { clearedWithdrawals += absAmt; clearedCount++; }
        else { unclearedWithdrawals += absAmt; }
      }
    }

    const calculatedBalance = openingBalance + clearedDeposits - clearedWithdrawals;
    const difference = new Decimal(calculatedBalance).minus(statementBalance).toNumber();

    return {
      openingBalance,
      clearedDeposits,
      clearedWithdrawals,
      calculatedBalance,
      statementBalance,
      difference,
      isBalanced: Math.abs(difference) < 0.01,
      unclearedDeposits,
      unclearedWithdrawals,
      totalItems: items.length,
      clearedItems: clearedCount,
    };
  }

  /* ─────────── 3. Clear / unclear items ─────────── */

  /**
   * Toggle the "cleared" state of a transaction for a specific reconciliation.
   */
  static async toggleClear(
    reconciliationId: string,
    itemId: string,
    itemType: 'PAYMENT' | 'BANK_TXN',
    clear: boolean,
  ): Promise<void> {
    const recon = await prisma.bankReconciliation.findUnique({
      where: { id: reconciliationId },
      select: { status: true, clearedPaymentIds: true, clearedTransactionIds: true },
    });
    if (!recon) throw new Error('Reconciliation not found');
    if (recon.status === 'FINALIZED' || recon.status === 'COMPLETED') {
      throw new Error('Cannot modify a finalized reconciliation');
    }

    if (itemType === 'PAYMENT') {
      await prisma.payment.update({
        where: { id: itemId },
        data: {
          isReconciled: clear,
          reconciledDate: clear ? new Date() : null,
          reconciliationId: clear ? reconciliationId : null,
        },
      });
      const currentIds = new Set(recon.clearedPaymentIds || []);
      if (clear) currentIds.add(itemId); else currentIds.delete(itemId);
      await prisma.bankReconciliation.update({
        where: { id: reconciliationId },
        data: { clearedPaymentIds: Array.from(currentIds) },
      });
    } else {
      await prisma.bankTransaction.update({
        where: { id: itemId },
        data: {
          isReconciled: clear,
          clearedDate: clear ? new Date() : null,
          reconciliationId: clear ? reconciliationId : null,
          status: clear ? 'MATCHED' : 'UNPROCESSED',
        },
      });
      const currentIds = new Set(recon.clearedTransactionIds || []);
      if (clear) currentIds.add(itemId); else currentIds.delete(itemId);
      await prisma.bankReconciliation.update({
        where: { id: reconciliationId },
        data: { clearedTransactionIds: Array.from(currentIds) },
      });
    }
  }

  /**
   * Bulk toggle: clear multiple items at once.
   */
  static async bulkToggleClear(
    reconciliationId: string,
    items: Array<{ id: string; type: 'PAYMENT' | 'BANK_TXN' }>,
    clear: boolean,
  ): Promise<{ toggled: number }> {
    let count = 0;
    for (const item of items) {
      try { await this.toggleClear(reconciliationId, item.id, item.type, clear); count++; }
      catch { /* skip errors on individual items */ }
    }
    return { toggled: count };
  }

  /* ─────────── 4. Match suggestions ─────────── */

  static async findMatches(
    organizationId: string,
    bankAccountId: string,
    statementDate: Date,
  ): Promise<MatchSuggestion[]> {
    const payments = await prisma.payment.findMany({
      where: { organizationId, bankAccountId, isReconciled: false, paymentDate: { lte: statementDate } },
      include: { customer: true, vendor: true },
    });
    const bankTransactions = await prisma.bankTransaction.findMany({
      where: {
        organizationId, isReconciled: false, transactionDate: { lte: statementDate },
        bankFeed: { bankAccountId },
      },
    });

    const matches: MatchSuggestion[] = [];
    for (const payment of payments) {
      for (const transaction of bankTransactions) {
        const paymentAmount = new Decimal(payment.amount);
        const transactionAmount = new Decimal(Math.abs(parseFloat(transaction.amount.toString())));
        if (paymentAmount.minus(transactionAmount).abs().greaterThan(0.01)) continue;

        const daysDiff = Math.abs(
          (new Date(payment.paymentDate).getTime() - new Date(transaction.transactionDate).getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysDiff > 3) continue;

        let confidenceScore = 70;
        if (payment.referenceNumber && transaction.referenceNo &&
            payment.referenceNumber.toLowerCase() === transaction.referenceNo.toLowerCase()) confidenceScore += 20;
        if (daysDiff === 0) confidenceScore += 10;
        const payeeName = payment.customer?.name || payment.vendor?.name || '';
        if (payeeName && transaction.payee && transaction.payee.toLowerCase().includes(payeeName.toLowerCase())) confidenceScore += 10;

        let matchReason = 'Amount and date match';
        if (confidenceScore >= 90) matchReason = 'Exact match (amount, date, reference)';
        else if (confidenceScore >= 80) matchReason = 'High confidence match';

        matches.push({ paymentId: payment.id, bankTransactionId: transaction.id, confidenceScore: Math.min(confidenceScore, 100), matchReason });
      }
    }
    return matches.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /* ─────────── 5. Match / unmatch ─────────── */

  static async matchTransaction(paymentId: string, bankTransactionId: string, reconciliationId: string, userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: paymentId }, data: { isReconciled: true, reconciledDate: new Date(), reconciliationId, updatedById: userId } });
      await tx.bankTransaction.update({ where: { id: bankTransactionId }, data: { isReconciled: true, clearedDate: new Date(), reconciliationId, status: 'MATCHED', matchedPaymentId: paymentId } });
      const recon = await tx.bankReconciliation.findUnique({ where: { id: reconciliationId }, select: { clearedPaymentIds: true, clearedTransactionIds: true } });
      const pIds = new Set(recon?.clearedPaymentIds || []);
      const tIds = new Set(recon?.clearedTransactionIds || []);
      pIds.add(paymentId); tIds.add(bankTransactionId);
      await tx.bankReconciliation.update({ where: { id: reconciliationId }, data: { clearedPaymentIds: Array.from(pIds), clearedTransactionIds: Array.from(tIds) } });
    });
  }

  static async bulkMatch(
    matches: Array<{ paymentId: string; bankTransactionId: string }>,
    reconciliationId: string,
    userId: string,
  ): Promise<{ matched: number; errors: string[] }> {
    const errors: string[] = [];
    let matched = 0;
    for (const m of matches) {
      try { await this.matchTransaction(m.paymentId, m.bankTransactionId, reconciliationId, userId); matched++; }
      catch (e: any) { errors.push(e.message); }
    }
    return { matched, errors };
  }

  static async unmatchTransaction(paymentId: string, bankTransactionId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId }, select: { reconciliationId: true, isLocked: true } });
      if (payment?.isLocked) throw new Error('Cannot unmatch: Transaction is locked (Audit Lock)');
      if (payment?.reconciliationId) {
        const recon = await tx.bankReconciliation.findUnique({ where: { id: payment.reconciliationId }, select: { status: true } });
        if (recon?.status === 'FINALIZED') throw new Error('Cannot unmatch: Reconciliation is finalized');
      }
      await tx.payment.update({ where: { id: paymentId }, data: { isReconciled: false, reconciledDate: null, reconciliationId: null } });
      await tx.bankTransaction.update({ where: { id: bankTransactionId }, data: { isReconciled: false, clearedDate: null, reconciliationId: null, status: 'PENDING', matchedPaymentId: null } });
    });
  }

  /* ─────────── 6. Adjustment entries ─────────── */

  static async createAdjustmentEntry(
    organizationId: string,
    userId: string,
    bankAccountId: string,
    reconciliationId: string,
    adjustment: {
      transactionDate: Date;
      amount: number;
      description: string;
      accountId: string;
      adjustmentType: 'FEE' | 'INTEREST' | 'WHT' | 'OTHER';
    },
  ): Promise<any> {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
      select: { glAccountId: true, currency: true },
    });
    if (!bankAccount?.glAccountId) throw new Error('Bank account must be linked to a GL account');

    const isDebit = adjustment.adjustmentType === 'FEE' || adjustment.adjustmentType === 'WHT';
    const entries = [
      { accountId: isDebit ? adjustment.accountId : bankAccount.glAccountId, entryType: 'DEBIT' as const, amount: Math.abs(adjustment.amount), description: adjustment.description },
      { accountId: isDebit ? bankAccount.glAccountId : adjustment.accountId, entryType: 'CREDIT' as const, amount: Math.abs(adjustment.amount), description: adjustment.description },
    ];

    const result = await JournalEntryService.createJournalEntry({
      organizationId, userId,
      journalDate: adjustment.transactionDate,
      referenceNumber: await JournalEntryService.generateReferenceNumber(organizationId),
      journalType: 'Adjustment', currency: bankAccount.currency, exchangeRate: 1,
      description: `Bank Reconciliation Adjustment: ${adjustment.description}`,
      notes: `Reconciliation ID: ${reconciliationId}`,
      isReversal: false, reversalDate: null, entries,
    });

    const recon = await prisma.bankReconciliation.findUnique({ where: { id: reconciliationId }, select: { adjustmentEntries: true } });
    const existing = (recon?.adjustmentEntries as any[]) || [];
    existing.push({
      journalEntryId: result.id, transactionNumber: result.transactionNumber,
      date: adjustment.transactionDate, type: adjustment.adjustmentType,
      amount: adjustment.amount, description: adjustment.description,
      accountId: adjustment.accountId, createdAt: new Date(), createdBy: userId,
    });
    await prisma.bankReconciliation.update({ where: { id: reconciliationId }, data: { adjustmentEntries: existing } });

    return result;
  }

  /* ─────────── 7. Get unreconciled items (legacy) ─────────── */

  static async getUnreconciledItems(organizationId: string, bankAccountId: string, statementDate: Date) {
    const payments = await prisma.payment.findMany({
      where: { organizationId, bankAccountId, isReconciled: false, paymentDate: { lte: statementDate } },
      include: { customer: { select: { name: true } }, vendor: { select: { name: true } } },
      orderBy: { paymentDate: 'desc' },
    });
    const bankTransactions = await prisma.bankTransaction.findMany({
      where: { organizationId, isReconciled: false, transactionDate: { lte: statementDate }, bankFeed: { bankAccountId } },
      orderBy: { transactionDate: 'desc' },
    });

    return {
      payments: payments.map((p) => ({
        id: p.id, paymentNumber: p.paymentNumber, paymentDate: p.paymentDate,
        amount: parseFloat(p.amount.toString()), paymentType: p.paymentType,
        paymentMethod: p.paymentMethod, referenceNumber: p.referenceNumber || undefined,
        description: p.notes || `Payment ${p.paymentNumber}`,
        customerName: p.customer?.name, vendorName: p.vendor?.name,
      })),
      bankTransactions: bankTransactions.map((t) => ({
        id: t.id, transactionDate: t.transactionDate,
        amount: parseFloat(t.amount.toString()), description: t.description,
        payee: t.payee || undefined, referenceNo: t.referenceNo || undefined,
        transactionType: t.transactionType, status: t.status,
      })),
    };
  }

  /* ─────────── 8. Calculate summary (legacy) ─────────── */

  static async calculateSummary(
    organizationId: string,
    bankAccountId: string,
    statementDate: Date,
    statementBalance: number,
  ): Promise<ReconciliationSummary> {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
      select: { currentBalance: true },
    });
    const bookBalance = bankAccount ? parseFloat(bankAccount.currentBalance.toString()) : 0;

    const depositsInTransit = await prisma.payment.findMany({
      where: {
        organizationId, bankAccountId, isReconciled: false,
        paymentType: 'CUSTOMER_PAYMENT', paymentDate: { lte: statementDate }, amount: { gt: 0 },
      },
    });
    const depositsTotal = depositsInTransit.reduce((s, p) => s + parseFloat(p.amount.toString()), 0);

    const outstandingChecks = await prisma.payment.findMany({
      where: {
        organizationId, bankAccountId, isReconciled: false,
        paymentType: 'VENDOR_PAYMENT', paymentDate: { lte: statementDate }, amount: { gt: 0 },
      },
    });
    const checksTotal = outstandingChecks.reduce((s, p) => s + parseFloat(p.amount.toString()), 0);

    const adjustedBookBalance = bookBalance + depositsTotal - checksTotal;
    const difference = statementBalance - adjustedBookBalance;

    return {
      statementBalance, bookBalance,
      depositsInTransit: depositsTotal, outstandingChecks: checksTotal,
      adjustedBookBalance, difference, isBalanced: Math.abs(difference) < 0.01,
    };
  }

  /* ─────────── 9. Finalize — THE INTEGRITY LOCK ─────────── */

  /**
   * Finalize reconciliation:
   *  1. Verify difference is zero
   *  2. Set isLocked=true on ALL cleared payments, bank transactions, and their journal entries
   *  3. Update BankAccount.lastReconciledDate / lastReconciledBalance
   *  4. Generate audit report
   *  5. Mark status = FINALIZED
   */
  static async finalizeReconciliation(
    reconciliationId: string,
    userId: string,
  ): Promise<void> {
    const recon = await prisma.bankReconciliation.findUnique({
      where: { id: reconciliationId },
      include: { bankAccount: true },
    });
    if (!recon) throw new Error('Reconciliation not found');
    if (recon.status === 'FINALIZED') throw new Error('Already finalized');

    const items = await this.getClearableItems(
      recon.bankAccount.organizationId,
      recon.bankAccountId,
      recon.statementDate,
      reconciliationId,
    );

    const openingBalance = recon.openingBalance
      ? parseFloat(recon.openingBalance.toString())
      : parseFloat(recon.bankAccount.lastReconciledBalance?.toString() || recon.bankAccount.openingBalance.toString());

    const clearedIds = new Set([
      ...(recon.clearedPaymentIds || []),
      ...(recon.clearedTransactionIds || []),
    ]);
    const gap = this.calculateReconciliationGap(openingBalance, parseFloat(recon.statementBalance.toString()), items, clearedIds);

    if (!gap.isBalanced) {
      throw new Error(`Cannot finalize: Difference of ${gap.difference.toFixed(2)} must be zero`);
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // Lock all cleared payments
      if (recon.clearedPaymentIds?.length) {
        await tx.payment.updateMany({
          where: { id: { in: recon.clearedPaymentIds } },
          data: { isLocked: true, lockedAt: now },
        });
        // Lock associated journal entries
        const relatedTransactions = await tx.transaction.findMany({
          where: { organizationId: recon.bankAccount.organizationId, referenceType: 'PAYMENT', referenceId: { in: recon.clearedPaymentIds } },
          select: { id: true },
        });
        if (relatedTransactions.length > 0) {
          const txnIds = relatedTransactions.map((t) => t.id);
          await tx.transaction.updateMany({
            where: { id: { in: txnIds } },
            data: { isLocked: true, lockedAt: now, lockedByReconciliationId: reconciliationId },
          });
          await tx.ledgerEntry.updateMany({
            where: { transactionId: { in: txnIds } },
            data: { isLocked: true, lockedAt: now },
          });
        }
      }

      // Lock all cleared bank transactions
      if (recon.clearedTransactionIds?.length) {
        await tx.bankTransaction.updateMany({
          where: { id: { in: recon.clearedTransactionIds } },
          data: { isLocked: true, lockedAt: now },
        });
      }

      // Update bank account profile
      await tx.bankAccount.update({
        where: { id: recon.bankAccountId },
        data: { lastReconciledDate: recon.statementDate, lastReconciledBalance: recon.statementBalance },
      });

      // Generate report
      const report = await this.generateReconciliationReport(recon, gap, userId);

      // Finalize
      await tx.bankReconciliation.update({
        where: { id: reconciliationId },
        data: {
          status: 'FINALIZED', reconciledBy: userId, reconciledAt: now, finalizedAt: now,
          bookBalance: gap.calculatedBalance, difference: gap.difference,
          depositsInTransit: gap.unclearedDeposits, outstandingChecks: gap.unclearedWithdrawals,
          adjustedBookBalance: gap.calculatedBalance,
          reconciliationReport: JSON.stringify(report),
        },
      });
    });
  }

  /* ─────────── 10. Audit report ─────────── */

  private static async generateReconciliationReport(reconciliation: any, gap: ReconciliationGap, userId: string): Promise<any> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, email: true } });
    const adjustments = (reconciliation.adjustmentEntries as any[]) || [];
    return {
      reportId: `RECON-${reconciliation.id}`,
      generatedAt: new Date().toISOString(),
      generatedBy: { name: `${user?.firstName} ${user?.lastName}`, email: user?.email },
      bankAccount: { name: reconciliation.bankAccount?.accountName, number: reconciliation.bankAccount?.accountNumber, currency: reconciliation.bankAccount?.currency },
      period: { statementDate: reconciliation.statementDate, finalizedAt: new Date().toISOString() },
      balances: {
        openingBalance: gap.openingBalance, clearedDeposits: gap.clearedDeposits, clearedWithdrawals: gap.clearedWithdrawals,
        calculatedBalance: gap.calculatedBalance, statementBalance: gap.statementBalance,
        difference: gap.difference, isBalanced: gap.isBalanced,
        unclearedDeposits: gap.unclearedDeposits, unclearedWithdrawals: gap.unclearedWithdrawals,
      },
      summary: { totalItems: gap.totalItems, clearedItems: gap.clearedItems, adjustmentCount: adjustments.length, adjustmentTotal: adjustments.reduce((s: number, a: any) => s + a.amount, 0) },
      adjustments: adjustments.map((a: any) => ({ type: a.type, amount: a.amount, description: a.description, transactionNumber: a.transactionNumber, date: a.date })),
      auditTrail: {
        status: 'FINALIZED', locked: true,
        clearedPaymentIds: reconciliation.clearedPaymentIds || [],
        clearedTransactionIds: reconciliation.clearedTransactionIds || [],
        message: 'This reconciliation is finalized and locked. No further changes can be made to the cleared transactions.',
      },
    };
  }

  /* ─────────── 11. FX Gain/Loss ─────────── */

  static async calculateAndPostExchangeGainLoss(
    organizationId: string, userId: string,
    payment: { id: string; amount: number; currency: string; exchangeRate: number },
    bankTransaction: { id: string; amount: number; currency: string },
    reconciliationId: string,
  ): Promise<void> {
    if (payment.currency === bankTransaction.currency) return;
    const gainLoss = Math.abs(bankTransaction.amount) - payment.amount;
    if (Math.abs(gainLoss) < 0.01) return;

    const fxGainAccount = await prisma.chartOfAccount.findFirst({ where: { organizationId, accountName: { contains: 'Exchange Gain', mode: 'insensitive' }, accountType: 'REVENUE' } });
    const fxLossAccount = await prisma.chartOfAccount.findFirst({ where: { organizationId, accountName: { contains: 'Exchange Loss', mode: 'insensitive' }, accountType: 'EXPENSE' } });
    if (!fxGainAccount || !fxLossAccount) { console.warn('FX Gain/Loss accounts not found. Skipping.'); return; }

    const isGain = gainLoss > 0;
    const fxAmount = Math.abs(gainLoss);
    const fxAccountId = isGain ? fxGainAccount.id : fxLossAccount.id;
    const paymentRecord = await prisma.payment.findUnique({ where: { id: payment.id }, include: { bankAccount: { select: { glAccountId: true } } } });
    if (!paymentRecord?.bankAccount?.glAccountId) throw new Error('Bank account not linked to GL account');

    const bankGLAccountId = paymentRecord.bankAccount.glAccountId;
    const entries = [
      { accountId: isGain ? bankGLAccountId : fxAccountId, entryType: 'DEBIT' as const, amount: fxAmount, description: `Realized FX ${isGain ? 'Gain' : 'Loss'} on reconciliation` },
      { accountId: isGain ? fxAccountId : bankGLAccountId, entryType: 'CREDIT' as const, amount: fxAmount, description: `Realized FX ${isGain ? 'Gain' : 'Loss'} on reconciliation` },
    ];

    await JournalEntryService.createJournalEntry({
      organizationId, userId, journalDate: new Date(),
      referenceNumber: await JournalEntryService.generateReferenceNumber(organizationId),
      journalType: 'FX Adjustment', currency: payment.currency, exchangeRate: 1,
      description: `Realized Exchange ${isGain ? 'Gain' : 'Loss'} - Reconciliation ${reconciliationId}`,
      notes: `Payment ${payment.id} vs Bank Transaction ${bankTransaction.id}`,
      isReversal: false, reversalDate: null, entries,
    });
  }
}
