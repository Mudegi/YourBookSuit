import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';

/* ═══════════ TYPES ═══════════ */

export interface ImportFeedInput {
  organizationId: string;
  bankAccountId: string;
  feedName: string;
  feedType: 'CSV' | 'OFX' | 'API';
  transactions: ParsedTransaction[];
  metadata?: Record<string, any>;
}

export interface ParsedTransaction {
  transactionDate: Date;
  amount: number; // Positive=Credit, Negative=Debit
  description: string;
  payee?: string;
  referenceNo?: string;
  externalId?: string;
}

export interface SuggestedMatch {
  type: 'INVOICE' | 'BILL' | 'PAYMENT' | 'TRANSFER';
  id: string;
  reference: string;
  amount: number;
  date: string;
  counterparty: string;
  confidenceScore: number;
  matchReasons: string[];
}

export interface MatchAction {
  bankTransactionId: string;
  action: 'MATCH_INVOICE' | 'MATCH_BILL' | 'MATCH_PAYMENT' | 'CREATE_EXPENSE' | 'TRANSFER' | 'IGNORE';
  matchedId?: string;
  categoryAccountId?: string;
  taxRateId?: string;
  notes?: string;
}

export interface BankRuleInput {
  organizationId: string;
  ruleName: string;
  description?: string;
  priority?: number;
  conditionField: string;
  conditionOperator: string;
  conditionValue: string;
  categoryAccountId?: string;
  taxRateId?: string;
  payee?: string;
}

export interface FeedTransactionWithMatches {
  id: string;
  transactionDate: string;
  amount: number;
  description: string;
  rawDescription: string | null;
  payee: string | null;
  referenceNo: string | null;
  transactionType: string;
  status: string;
  confidenceScore: number | null;
  matchedPaymentId: string | null;
  matchedInvoiceId: string | null;
  matchedBillId: string | null;
  categoryAccountId: string | null;
  appliedRuleId: string | null;
  isReconciled: boolean;
  suggestedMatches: SuggestedMatch[];
  appliedRuleName: string | null;
  categoryAccountName: string | null;
}

/* ═══════════ HELPERS ═══════════ */

function generateDuplicateHash(date: Date, amount: number, description: string): string {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const raw = `${dateStr}|${amount.toFixed(4)}|${description.trim().toLowerCase()}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function levenshteinDistance(a: string, b: string): number {
  const la = a.length, lb = b.length;
  const dp: number[][] = Array.from({ length: la + 1 }, () => Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[la][lb];
}

function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const al = a.toLowerCase(), bl = b.toLowerCase();
  if (al === bl) return 100;
  const dist = levenshteinDistance(al, bl);
  return Math.max(0, (1 - dist / Math.max(al.length, bl.length)) * 100);
}

function matchesCondition(value: string, operator: string, pattern: string): boolean {
  const v = (value || '').toLowerCase();
  const p = pattern.toLowerCase();
  switch (operator) {
    case 'contains': return v.includes(p);
    case 'equals': return v === p;
    case 'startsWith': return v.startsWith(p);
    case 'endsWith': return v.endsWith(p);
    case 'regex':
      try { return new RegExp(pattern, 'i').test(value || ''); }
      catch { return false; }
    default: return false;
  }
}

/* ═══════════ SERVICE ═══════════ */

export class BankFeedService {

  /* ─── Import & Dedup ─── */

  /**
   * Import a feed, create a BankFeed record → deduplicated BankTransactions.
   * Returns count of imported (new) vs skipped (duplicate).
   */
  static async importFeed(input: ImportFeedInput) {
    const { organizationId, bankAccountId, feedName, feedType, transactions, metadata } = input;

    // Verify bank account
    const bankAcct = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (!bankAcct) throw new Error('Bank account not found');
    if (bankAcct.organizationId !== organizationId) throw new Error('Bank account does not belong to this organization');

    // Create feed record
    const feed = await prisma.bankFeed.create({
      data: {
        organizationId,
        bankAccountId,
        feedName,
        feedType,
        status: 'ACTIVE',
        lastSyncAt: new Date(),
        metadata: metadata ?? { importedAt: new Date().toISOString(), transactionCount: transactions.length },
      },
    });

    let imported = 0;
    let skipped = 0;

    for (const txn of transactions) {
      const hash = generateDuplicateHash(txn.transactionDate, txn.amount, txn.description);

      // Check if duplicate hash already exists for this org
      let isDuplicate = false;
      try {
        const existing = await (prisma.bankTransaction as any).findFirst({
          where: { organizationId, duplicateHash: hash },
        });
        isDuplicate = !!existing;
      } catch {
        // duplicateHash column may not exist yet — fall back to date+amount+desc check
        const existing = await prisma.bankTransaction.findFirst({
          where: {
            organizationId,
            bankFeedId: feed.id,
            transactionDate: txn.transactionDate,
            amount: txn.amount,
            description: txn.description,
          },
        });
        isDuplicate = !!existing;
      }

      if (isDuplicate) {
        skipped++;
        continue;
      }

      try {
        await prisma.bankTransaction.create({
          data: {
            organizationId,
            bankFeedId: feed.id,
            externalId: txn.externalId || null,
            transactionDate: txn.transactionDate,
            amount: txn.amount,
            description: txn.description,
            rawDescription: txn.description,
            payee: txn.payee || null,
            referenceNo: txn.referenceNo || null,
            transactionType: txn.amount >= 0 ? 'CREDIT' : 'DEBIT',
            status: 'UNPROCESSED',
            duplicateHash: hash,
            confidenceScore: 0,
          } as any,
        });
      } catch {
        // New columns may not exist yet — create with base fields only
        await prisma.bankTransaction.create({
          data: {
            organizationId,
            bankFeedId: feed.id,
            externalId: txn.externalId || null,
            transactionDate: txn.transactionDate,
            amount: txn.amount,
            description: txn.description,
            payee: txn.payee || null,
            referenceNo: txn.referenceNo || null,
            transactionType: txn.amount >= 0 ? 'CREDIT' : 'DEBIT',
            status: 'UNPROCESSED',
            confidenceScore: 0,
          },
        });
      }
      imported++;
    }

    return { feed, imported, skipped, total: transactions.length };
  }

  /* ─── Fetch Transactions with Suggestions ─── */

  /**
   * Get bank feed transactions for the reconciliation inbox.
   * Optionally includes auto-generated match suggestions.
   */
  static async getFeedTransactions(
    organizationId: string,
    opts: {
      bankAccountId?: string;
      feedId?: string;
      status?: string;
      limit?: number;
      offset?: number;
      includeSuggestions?: boolean;
    } = {}
  ): Promise<{ transactions: FeedTransactionWithMatches[]; total: number; stats: any }> {
    const where: any = { organizationId };
    if (opts.feedId) where.bankFeedId = opts.feedId;
    if (opts.status) where.status = opts.status;
    if (opts.bankAccountId) {
      where.bankFeed = { bankAccountId: opts.bankAccountId };
    }

    // Build include — appliedRule may not exist until migration runs
    let includeObj: any = {
      bankFeed: { select: { id: true, feedName: true, bankAccountId: true, bankAccount: { select: { id: true, accountName: true, bankName: true, currency: true } } } },
    };
    try {
      // Attempt to include appliedRule if the relation exists
      const testInclude = { ...includeObj, appliedRule: { select: { id: true, ruleName: true } } };
      includeObj = testInclude;
    } catch { /* relation may not exist yet */ }

    let rows: any[] = [];
    let totalVal = 0;
    try {
      [rows, totalVal] = await Promise.all([
        (prisma.bankTransaction.findMany as any)({
          where,
          include: includeObj,
          orderBy: [{ status: 'asc' }, { transactionDate: 'desc' }],
          take: opts.limit || 200,
          skip: opts.offset || 0,
        }),
        prisma.bankTransaction.count({ where }),
      ]);
    } catch (queryErr: any) {
      // If the include fails at runtime (unknown field), retry without appliedRule
      if (queryErr.message?.includes('appliedRule') || queryErr.code === 'P2009') {
        [rows, totalVal] = await Promise.all([
          prisma.bankTransaction.findMany({
            where,
            include: {
              bankFeed: { select: { id: true, feedName: true, bankAccountId: true, bankAccount: { select: { id: true, accountName: true, bankName: true, currency: true } } } },
            },
            orderBy: [{ status: 'asc' }, { transactionDate: 'desc' }],
            take: opts.limit || 200,
            skip: opts.offset || 0,
          }),
          prisma.bankTransaction.count({ where }),
        ]);
      } else {
        throw queryErr;
      }
    }
    const total = totalVal;

    // Lookup GL account names for categoryAccountId (field may not exist yet)
    const catIds = rows.map((r: any) => r.categoryAccountId).filter(Boolean) as string[];
    const catAccounts = catIds.length > 0
      ? await prisma.chartOfAccount.findMany({ where: { id: { in: catIds } }, select: { id: true, code: true, name: true } })
      : [];
    const catMap = new Map(catAccounts.map(c => [c.id, `${c.code} - ${c.name}`]));

    // Build suggestions if requested (for UNPROCESSED only)
    const unprocessed = opts.includeSuggestions
      ? rows.filter((r: any) => r.status === 'UNPROCESSED')
      : [];
    const suggestionsMap = new Map<string, SuggestedMatch[]>();

    if (unprocessed.length > 0) {
      const suggestions = await BankFeedService.findSuggestedMatchesBatch(organizationId, unprocessed as any);
      for (const [id, matches] of Object.entries(suggestions)) {
        suggestionsMap.set(id, matches);
      }
    }

    const transactions: FeedTransactionWithMatches[] = rows.map((r: any) => ({
      id: r.id,
      transactionDate: r.transactionDate.toISOString(),
      amount: Number(r.amount),
      description: r.description,
      rawDescription: r.rawDescription ?? null,
      payee: r.payee,
      referenceNo: r.referenceNo,
      transactionType: r.transactionType,
      status: r.status,
      confidenceScore: r.confidenceScore ? Number(r.confidenceScore) : null,
      matchedPaymentId: r.matchedPaymentId,
      matchedInvoiceId: r.matchedInvoiceId ?? null,
      matchedBillId: r.matchedBillId ?? null,
      categoryAccountId: r.categoryAccountId ?? null,
      appliedRuleId: r.appliedRuleId ?? null,
      isReconciled: r.isReconciled,
      suggestedMatches: suggestionsMap.get(r.id) || [],
      appliedRuleName: r.appliedRule?.ruleName ?? null,
      categoryAccountName: r.categoryAccountId ? (catMap.get(r.categoryAccountId) ?? null) : null,
      bankFeed: r.bankFeed,
    }));

    // Stats — groupBy doesn't support relation filters, so use a separate approach
    let stats: Record<string, { count: number; total: number }> = {};
    try {
      // If filtering by bankAccount, we need to get bankFeed IDs first
      let statsWhere: any = { organizationId };
      if (opts.bankAccountId) {
        const feedIds = await prisma.bankFeed.findMany({
          where: { organizationId, bankAccountId: opts.bankAccountId },
          select: { id: true },
        });
        statsWhere.bankFeedId = { in: feedIds.map(f => f.id) };
      }

      const allForStats = await prisma.bankTransaction.groupBy({
        by: ['status'],
        where: statsWhere,
        _count: true,
        _sum: { amount: true },
      });

      for (const g of allForStats) {
        stats[g.status] = { count: g._count, total: Number(g._sum.amount ?? 0) };
      }
    } catch {
      // If groupBy fails, compute stats manually
      const allTxns = await prisma.bankTransaction.findMany({
        where: { organizationId },
        select: { status: true, amount: true },
      });
      for (const t of allTxns) {
        const s = t.status;
        if (!stats[s]) stats[s] = { count: 0, total: 0 };
        stats[s].count++;
        stats[s].total += Number(t.amount);
      }
    }

    return { transactions, total, stats };
  }

  /* ─── Matching Engine ─── */

  /**
   * Find suggested matches for a single feed transaction.
   * Searches invoices, bills, and payments within a ±5-day window.
   */
  static async findSuggestedMatches(
    organizationId: string,
    txn: { id: string; amount: number; transactionDate: Date; description: string; payee?: string | null; referenceNo?: string | null }
  ): Promise<SuggestedMatch[]> {
    const suggestions: SuggestedMatch[] = [];
    const txnAmount = Math.abs(txn.amount);
    const txnDate = new Date(txn.transactionDate);
    const dateMin = new Date(txnDate); dateMin.setDate(dateMin.getDate() - 5);
    const dateMax = new Date(txnDate); dateMax.setDate(dateMax.getDate() + 5);
    const isCredit = txn.amount >= 0; // Positive = money in

    if (isCredit) {
      // Credits → match open Invoices (money coming in)
      const invoices = await prisma.invoice.findMany({
        where: {
          organizationId,
          status: { in: ['SENT', 'VIEWED', 'OVERDUE', 'PARTIALLY_PAID'] },
          invoiceDate: { gte: dateMin, lte: dateMax },
        },
        include: { customer: { select: { firstName: true, lastName: true, companyName: true } } },
        take: 10,
      });

      for (const inv of invoices) {
        const amountDue = Number(inv.amountDue);
        const reasons: string[] = [];
        let score = 0;

        // Amount match
        const pctDiff = Math.abs(txnAmount - amountDue) / Math.max(amountDue, 1) * 100;
        if (pctDiff === 0) { score += 50; reasons.push('Exact amount match'); }
        else if (pctDiff <= 1) { score += 40; reasons.push('Amount within 1%'); }
        else if (pctDiff <= 5) { score += 20; reasons.push('Amount within 5%'); }
        else continue; // Skip if amount is off by more than 5%

        // Date proximity
        const daysDiff = Math.abs((txnDate.getTime() - inv.invoiceDate.getTime()) / 86400000);
        if (daysDiff <= 1) { score += 25; reasons.push('Same day'); }
        else if (daysDiff <= 3) { score += 15; reasons.push('Within 3 days'); }
        else { score += 5; reasons.push('Within 5 days'); }

        // Reference match
        if (txn.referenceNo && inv.invoiceNumber) {
          if (txn.referenceNo.includes(inv.invoiceNumber) || inv.invoiceNumber.includes(txn.referenceNo)) {
            score += 25; reasons.push('Reference number match');
          }
        }

        // Payee/description match
        const custName = [inv.customer?.companyName, inv.customer?.firstName, inv.customer?.lastName].filter(Boolean).join(' ');
        if (custName) {
          const sim = stringSimilarity(txn.payee || txn.description, custName);
          if (sim > 60) { score += Math.round(sim / 5); reasons.push('Payee name match'); }
        }

        suggestions.push({
          type: 'INVOICE',
          id: inv.id,
          reference: inv.invoiceNumber,
          amount: amountDue,
          date: inv.invoiceDate.toISOString(),
          counterparty: custName || 'Unknown',
          confidenceScore: Math.min(score, 100),
          matchReasons: reasons,
        });
      }
    } else {
      // Debits → match open Bills (money going out)
      const bills = await prisma.bill.findMany({
        where: {
          organizationId,
          status: { in: ['SUBMITTED', 'APPROVED', 'PARTIALLY_PAID'] },
          billDate: { gte: dateMin, lte: dateMax },
        },
        include: { vendor: { select: { companyName: true, contactName: true } } },
        take: 10,
      });

      for (const bill of bills) {
        const amountDue = Number(bill.amountDue);
        const reasons: string[] = [];
        let score = 0;

        const pctDiff = Math.abs(txnAmount - amountDue) / Math.max(amountDue, 1) * 100;
        if (pctDiff === 0) { score += 50; reasons.push('Exact amount match'); }
        else if (pctDiff <= 1) { score += 40; reasons.push('Amount within 1%'); }
        else if (pctDiff <= 5) { score += 20; reasons.push('Amount within 5%'); }
        else continue;

        const daysDiff = Math.abs((txnDate.getTime() - bill.billDate.getTime()) / 86400000);
        if (daysDiff <= 1) { score += 25; reasons.push('Same day'); }
        else if (daysDiff <= 3) { score += 15; reasons.push('Within 3 days'); }
        else { score += 5; reasons.push('Within 5 days'); }

        if (txn.referenceNo && bill.billNumber) {
          if (txn.referenceNo.includes(bill.billNumber) || bill.billNumber.includes(txn.referenceNo)) {
            score += 25; reasons.push('Reference number match');
          }
        }

        const vendorName = [bill.vendor?.companyName, bill.vendor?.contactName].filter(Boolean).join(' ');
        if (vendorName) {
          const sim = stringSimilarity(txn.payee || txn.description, vendorName);
          if (sim > 60) { score += Math.round(sim / 5); reasons.push('Vendor name match'); }
        }

        suggestions.push({
          type: 'BILL',
          id: bill.id,
          reference: bill.billNumber,
          amount: amountDue,
          date: bill.billDate.toISOString(),
          counterparty: vendorName || 'Unknown',
          confidenceScore: Math.min(score, 100),
          matchReasons: reasons,
        });
      }
    }

    // Also look for uncleared Payments of the same amount
    const payments = await prisma.payment.findMany({
      where: {
        organizationId,
        isReconciled: false,
        paymentDate: { gte: dateMin, lte: dateMax },
      },
      include: {
        customer: { select: { firstName: true, lastName: true, companyName: true } },
        vendor: { select: { companyName: true, contactName: true } },
      },
      take: 10,
    });

    for (const pmt of payments) {
      const pmtAmount = Number(pmt.amount);
      const pctDiff = Math.abs(txnAmount - pmtAmount) / Math.max(pmtAmount, 1) * 100;
      if (pctDiff > 5) continue;

      const reasons: string[] = [];
      let score = 0;
      if (pctDiff === 0) { score += 50; reasons.push('Exact amount match'); }
      else if (pctDiff <= 1) { score += 40; reasons.push('Amount within 1%'); }
      else { score += 20; reasons.push('Amount within 5%'); }

      const daysDiff = Math.abs((txnDate.getTime() - pmt.paymentDate.getTime()) / 86400000);
      if (daysDiff <= 1) { score += 25; reasons.push('Same day'); }
      else if (daysDiff <= 3) { score += 15; reasons.push('Within 3 days'); }

      if (txn.referenceNo && pmt.referenceNumber) {
        if (txn.referenceNo === pmt.referenceNumber) { score += 25; reasons.push('Reference match'); }
      }

      const party = pmt.customer
        ? [pmt.customer.companyName, pmt.customer.firstName, pmt.customer.lastName].filter(Boolean).join(' ')
        : pmt.vendor
          ? [pmt.vendor.companyName, pmt.vendor.contactName].filter(Boolean).join(' ')
          : '';

      suggestions.push({
        type: 'PAYMENT',
        id: pmt.id,
        reference: pmt.paymentNumber,
        amount: pmtAmount,
        date: pmt.paymentDate.toISOString(),
        counterparty: party || 'Unknown',
        confidenceScore: Math.min(score, 100),
        matchReasons: reasons,
      });
    }

    // Sort by confidence desc
    suggestions.sort((a, b) => b.confidenceScore - a.confidenceScore);
    return suggestions.slice(0, 5); // Top 5
  }

  /**
   * Batch version — runs for multiple transactions at once.
   */
  static async findSuggestedMatchesBatch(
    organizationId: string,
    transactions: Array<{ id: string; amount: any; transactionDate: Date; description: string; payee?: string | null; referenceNo?: string | null }>
  ): Promise<Record<string, SuggestedMatch[]>> {
    const result: Record<string, SuggestedMatch[]> = {};
    // Process in parallel (limit concurrency to 10)
    const batches = [];
    for (let i = 0; i < transactions.length; i += 10) {
      batches.push(transactions.slice(i, i + 10));
    }
    for (const batch of batches) {
      const promises = batch.map(async (txn) => {
        const matches = await BankFeedService.findSuggestedMatches(organizationId, {
          ...txn,
          amount: Number(txn.amount),
        });
        result[txn.id] = matches;
      });
      await Promise.all(promises);
    }
    return result;
  }

  /* ─── Apply Action ─── */

  /**
   * Apply a user action to a bank feed transaction.
   */
  static async applyAction(organizationId: string, action: MatchAction) {
    const txn = await prisma.bankTransaction.findUnique({ where: { id: action.bankTransactionId } });
    if (!txn) throw new Error('Bank transaction not found');
    if (txn.organizationId !== organizationId) throw new Error('Transaction does not belong to this organization');

    const updateData: any = {};

    switch (action.action) {
      case 'MATCH_INVOICE':
        if (!action.matchedId) throw new Error('Invoice ID required');
        const inv = await prisma.invoice.findUnique({ where: { id: action.matchedId } });
        if (!inv || inv.organizationId !== organizationId) throw new Error('Invoice not found');
        updateData.matchedInvoiceId = action.matchedId;
        updateData.status = 'MATCHED';
        updateData.confidenceScore = 100;
        break;

      case 'MATCH_BILL':
        if (!action.matchedId) throw new Error('Bill ID required');
        const bill = await prisma.bill.findUnique({ where: { id: action.matchedId } });
        if (!bill || bill.organizationId !== organizationId) throw new Error('Bill not found');
        updateData.matchedBillId = action.matchedId;
        updateData.status = 'MATCHED';
        updateData.confidenceScore = 100;
        break;

      case 'MATCH_PAYMENT':
        if (!action.matchedId) throw new Error('Payment ID required');
        updateData.matchedPaymentId = action.matchedId;
        updateData.status = 'MATCHED';
        updateData.confidenceScore = 100;
        break;

      case 'CREATE_EXPENSE':
        if (!action.categoryAccountId) throw new Error('Category GL account required');
        updateData.categoryAccountId = action.categoryAccountId;
        updateData.status = 'CREATED';
        break;

      case 'TRANSFER':
        updateData.status = 'MATCHED';
        updateData.matchedTransactionId = action.matchedId || null;
        break;

      case 'IGNORE':
        updateData.status = 'IGNORED';
        break;

      default:
        throw new Error(`Unknown action: ${action.action}`);
    }

    try {
      const updated = await prisma.bankTransaction.update({
        where: { id: action.bankTransactionId },
        data: updateData as any,
      });
      return updated;
    } catch (updateErr: any) {
      // If new columns don't exist yet, fall back to only updating status + known fields
      const fallbackData: any = { status: updateData.status || 'MATCHED' };
      if (updateData.matchedPaymentId !== undefined) fallbackData.matchedPaymentId = updateData.matchedPaymentId;
      if (updateData.confidenceScore !== undefined) fallbackData.confidenceScore = updateData.confidenceScore;
      return prisma.bankTransaction.update({
        where: { id: action.bankTransactionId },
        data: fallbackData,
      });
    }
  }

  /**
   * Batch approve — apply the same action to multiple transactions.
   */
  static async batchApprove(organizationId: string, transactionIds: string[], categoryAccountId: string) {
    const results = { approved: 0, errors: 0 };
    for (const id of transactionIds) {
      try {
        await BankFeedService.applyAction(organizationId, {
          bankTransactionId: id,
          action: 'CREATE_EXPENSE',
          categoryAccountId,
        });
        results.approved++;
      } catch {
        results.errors++;
      }
    }
    return results;
  }

  /**
   * Undo a previously matched/created action — reset to UNPROCESSED.
   */
  static async undoAction(organizationId: string, bankTransactionId: string) {
    const txn = await prisma.bankTransaction.findUnique({ where: { id: bankTransactionId } });
    if (!txn) throw new Error('Bank transaction not found');
    if (txn.organizationId !== organizationId) throw new Error('Not authorized');
    if (txn.isReconciled) throw new Error('Cannot undo reconciled transaction');

    // Reset to UNPROCESSED — new fields may not exist before migration
    const resetData: any = {
      status: 'UNPROCESSED',
      matchedPaymentId: null,
      confidenceScore: 0,
    };
    // Conditionally add new fields if they exist in schema
    try {
      return await prisma.bankTransaction.update({
        where: { id: bankTransactionId },
        data: {
          ...resetData,
          matchedInvoiceId: null,
          matchedBillId: null,
          categoryAccountId: null,
          appliedRuleId: null,
        } as any,
      });
    } catch {
      // Fallback — only reset known fields
      return prisma.bankTransaction.update({
        where: { id: bankTransactionId },
        data: resetData,
      });
    }
  }

  /* ─── Bank Rules Engine ─── */

  /**
   * Get all rules for an organization, ordered by priority desc.
   */
  static async getRules(organizationId: string, includeInactive = false) {
    try {
      const bankRuleModel = (prisma as any).bankRule;
      if (!bankRuleModel) return [];

      const where: any = { organizationId };
      if (!includeInactive) where.isActive = true;

      return await bankRuleModel.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      });
    } catch (err: any) {
      // BankRule model may not exist until migration runs
      console.warn('[BankFeedService] bankRule model not available:', err.message);
      return [];
    }
  }

  static async createRule(input: BankRuleInput) {
    const bankRuleModel = (prisma as any).bankRule;
    if (!bankRuleModel) throw new Error('Bank Rules not available — please run database migration first');

    return bankRuleModel.create({
      data: {
        organizationId: input.organizationId,
        ruleName: input.ruleName,
        description: input.description,
        priority: input.priority ?? 0,
        conditionField: input.conditionField,
        conditionOperator: input.conditionOperator,
        conditionValue: input.conditionValue,
        categoryAccountId: input.categoryAccountId,
        taxRateId: input.taxRateId,
        payee: input.payee,
      },
    });
  }

  static async updateRule(id: string, organizationId: string, input: Partial<BankRuleInput>) {
    const bankRuleModel = (prisma as any).bankRule;
    if (!bankRuleModel) throw new Error('Bank Rules not available — please run database migration first');

    const rule = await bankRuleModel.findUnique({ where: { id } });
    if (!rule) throw new Error('Rule not found');
    if (rule.organizationId !== organizationId) throw new Error('Not authorized');

    return bankRuleModel.update({
      where: { id },
      data: {
        ...(input.ruleName && { ruleName: input.ruleName }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.conditionField && { conditionField: input.conditionField }),
        ...(input.conditionOperator && { conditionOperator: input.conditionOperator }),
        ...(input.conditionValue && { conditionValue: input.conditionValue }),
        ...(input.categoryAccountId !== undefined && { categoryAccountId: input.categoryAccountId }),
        ...(input.taxRateId !== undefined && { taxRateId: input.taxRateId }),
        ...(input.payee !== undefined && { payee: input.payee }),
      },
    });
  }

  static async deleteRule(id: string, organizationId: string) {
    const bankRuleModel = (prisma as any).bankRule;
    if (!bankRuleModel) throw new Error('Bank Rules not available — please run database migration first');

    const rule = await bankRuleModel.findUnique({ where: { id } });
    if (!rule) throw new Error('Rule not found');
    if (rule.organizationId !== organizationId) throw new Error('Not authorized');

    return bankRuleModel.delete({ where: { id } });
  }

  /**
   * Apply all active rules to UNPROCESSED transactions.
   * Returns the count of transactions that were auto-categorized.
   */
  static async applyRulesToUnprocessed(organizationId: string, bankAccountId?: string) {
    let rules: any[] = [];
    try {
      rules = await BankFeedService.getRules(organizationId) as any[];
    } catch { /* bankRule model not ready */ }
    if (rules.length === 0) return { applied: 0, rules: 0 };

    const where: any = {
      organizationId,
      status: 'UNPROCESSED',
    };
    if (bankAccountId) {
      where.bankFeed = { bankAccountId };
    }

    const unprocessed = await prisma.bankTransaction.findMany({ where });
    let applied = 0;

    for (const txn of unprocessed) {
      for (const rule of rules) {
        let fieldValue = '';
        switch (rule.conditionField) {
          case 'description': fieldValue = txn.description; break;
          case 'payee': fieldValue = txn.payee || ''; break;
          case 'referenceNo': fieldValue = txn.referenceNo || ''; break;
          case 'amount': fieldValue = String(Number(txn.amount)); break;
          default: fieldValue = txn.description;
        }

        if (matchesCondition(fieldValue, rule.conditionOperator, rule.conditionValue)) {
          try {
            await prisma.bankTransaction.update({
              where: { id: txn.id },
              data: {
                categoryAccountId: rule.categoryAccountId || undefined,
                appliedRuleId: rule.id,
                payee: rule.payee || txn.payee,
                status: 'CREATED',
                confidenceScore: 90,
              } as any,
            });
          } catch {
            // New columns may not exist — only update status + payee
            await prisma.bankTransaction.update({
              where: { id: txn.id },
              data: {
                payee: rule.payee || txn.payee,
                status: 'CREATED',
                confidenceScore: 90,
              } as any,
            });
          }

          // Increment rule usage
          try {
            const bankRuleModel = (prisma as any).bankRule;
            if (bankRuleModel) {
              await bankRuleModel.update({
                where: { id: rule.id },
                data: {
                  timesApplied: { increment: 1 },
                  lastAppliedAt: new Date(),
                },
              });
            }
          } catch { /* rule model may not be ready */ }

          applied++;
          break; // First matching rule wins (they're ordered by priority)
        }
      }
    }

    return { applied, rules: rules.length };
  }

  /* ─── Feed Management ─── */

  static async getFeeds(organizationId: string) {
    return prisma.bankFeed.findMany({
      where: { organizationId },
      include: {
        bankAccount: { select: { id: true, accountName: true, bankName: true, currency: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async deleteFeed(id: string, organizationId: string) {
    const feed = await prisma.bankFeed.findUnique({ where: { id } });
    if (!feed) throw new Error('Feed not found');
    if (feed.organizationId !== organizationId) throw new Error('Not authorized');

    // Check if any transactions are reconciled
    const reconciled = await prisma.bankTransaction.count({
      where: { bankFeedId: id, isReconciled: true },
    });
    if (reconciled > 0) throw new Error('Cannot delete feed with reconciled transactions');

    // Delete through cascade
    await prisma.bankFeed.delete({ where: { id } });
    return { success: true };
  }
}
