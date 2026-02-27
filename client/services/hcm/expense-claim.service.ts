/**
 * Expense Claim Service
 * Bridges HCM and Accounting — handles claim validation,
 * duplicate detection, policy enforcement, journal entry creation,
 * VAT extraction, and reimbursement tracking.
 */

import { Decimal } from 'decimal.js';
import prisma from '@/lib/prisma';
import { DoubleEntryService } from '@/services/accounting/double-entry.service';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

export interface ExpenseItemInput {
  expenseDate: string | Date;
  categoryId?: string;      // GL Account ID
  category: string;         // Display name
  description: string;
  amount: number;
  taxInclusive?: boolean;
  taxRate?: number;          // e.g. 18 for 18%
  receiptUrl?: string;
  receiptName?: string;
  merchantName?: string;
  notes?: string;
}

export interface CreateClaimInput {
  organizationId: string;
  employeeId: string;
  claimDate: string | Date;
  currency: string;
  exchangeRate?: number;
  paymentMethod?: string;
  merchantName?: string;
  projectId?: string;
  purpose?: string;
  notes?: string;
  items: ExpenseItemInput[];
  userId: string;          // The user submitting (for audit)
  submitImmediately?: boolean;
}

export interface ApproveClaimInput {
  organizationId: string;
  claimId: string;
  userId: string;
}

export interface RejectClaimInput {
  organizationId: string;
  claimId: string;
  userId: string;
  reason: string;
}

export interface PolicyViolation {
  itemIndex?: number;
  rule: string;
  message: string;
  severity: 'WARNING' | 'BLOCK';
}

/* ═══════════════════════════════════════════
   SERVICE
   ═══════════════════════════════════════════ */

export class ExpenseClaimService {

  /* ────────────────────────────────────────
     CLAIM NUMBER GENERATION
     ──────────────────────────────────────── */

  static async generateClaimNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `EXP-${year}-`;

    const last = await prisma.expenseClaim.findFirst({
      where: { organizationId, claimNumber: { startsWith: prefix } },
      orderBy: { claimNumber: 'desc' },
      select: { claimNumber: true },
    });

    let seq = 1;
    if (last) {
      const parts = last.claimNumber.split('-');
      seq = parseInt(parts[parts.length - 1], 10) + 1;
    }
    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  /* ────────────────────────────────────────
     DUPLICATE DETECTION
     ──────────────────────────────────────── */

  static async checkDuplicate(
    organizationId: string,
    employeeId: string,
    claimDate: Date,
    totalAmount: number
  ): Promise<{ isDuplicate: boolean; existingClaimNumber?: string }> {
    // Check for same employee, same date, same amount within last 30 days
    const startRange = new Date(claimDate);
    startRange.setDate(startRange.getDate() - 1);
    const endRange = new Date(claimDate);
    endRange.setDate(endRange.getDate() + 1);

    const existing = await prisma.expenseClaim.findFirst({
      where: {
        organizationId,
        employeeId,
        claimDate: { gte: startRange, lte: endRange },
        totalAmount: { equals: totalAmount },
        status: { notIn: ['REJECTED', 'DRAFT'] },
      },
      select: { claimNumber: true },
    });

    return existing
      ? { isDuplicate: true, existingClaimNumber: existing.claimNumber }
      : { isDuplicate: false };
  }

  /* ────────────────────────────────────────
     EXPENSE POLICY VALIDATION
     ──────────────────────────────────────── */

  static async validatePolicies(
    organizationId: string,
    employeeId: string,
    items: ExpenseItemInput[],
    currency: string
  ): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];

    const policies = await prisma.expensePolicy.findMany({
      where: { organizationId, isActive: true },
    });

    if (policies.length === 0) return violations;

    for (const policy of policies) {
      // Per-item checks
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Match by category pattern if specified
        if (policy.categoryPattern && item.categoryId) {
          const account = await prisma.chartOfAccount.findUnique({
            where: { id: item.categoryId },
            select: { code: true },
          });
          if (account && !account.code.startsWith(policy.categoryPattern)) continue;
        }

        if (policy.maxAmountPerItem) {
          const max = Number(policy.maxAmountPerItem);
          if (item.amount > max) {
            violations.push({
              itemIndex: i,
              rule: policy.name,
              message: `Item "${item.description}" (${currency} ${item.amount.toLocaleString()}) exceeds the ${currency} ${max.toLocaleString()} per-item limit`,
              severity: 'WARNING',
            });
          }
        }

        // Receipt requirement
        if (policy.requiresReceipt && !item.receiptUrl) {
          violations.push({
            itemIndex: i,
            rule: policy.name,
            message: `Receipt required for "${item.description}" per policy "${policy.name}"`,
            severity: 'BLOCK',
          });
        }
      }

      // Daily total check
      if (policy.maxDailyTotal) {
        const dailyGroups = new Map<string, number>();
        for (const item of items) {
          const key = new Date(item.expenseDate).toISOString().slice(0, 10);
          dailyGroups.set(key, (dailyGroups.get(key) || 0) + item.amount);
        }
        const max = Number(policy.maxDailyTotal);
        for (const [date, total] of dailyGroups) {
          if (total > max) {
            violations.push({
              rule: policy.name,
              message: `Daily total on ${date} (${currency} ${total.toLocaleString()}) exceeds ${currency} ${max.toLocaleString()} limit`,
              severity: 'WARNING',
            });
          }
        }
      }

      // Monthly total check
      if (policy.maxMonthlyTotal) {
        const max = Number(policy.maxMonthlyTotal);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const monthlyTotal = await prisma.expenseClaim.aggregate({
          where: {
            organizationId,
            employeeId,
            claimDate: { gte: monthStart, lte: monthEnd },
            status: { notIn: ['REJECTED', 'DRAFT'] },
          },
          _sum: { totalAmount: true },
        });

        const existing = Number(monthlyTotal._sum.totalAmount || 0);
        const newTotal = items.reduce((s, i) => s + i.amount, 0);
        if (existing + newTotal > max) {
          violations.push({
            rule: policy.name,
            message: `Monthly expense total would reach ${currency} ${(existing + newTotal).toLocaleString()}, exceeding the ${currency} ${max.toLocaleString()} monthly limit`,
            severity: 'WARNING',
          });
        }
      }
    }

    return violations;
  }

  /* ────────────────────────────────────────
     CALCULATE ITEM TAX
     ──────────────────────────────────────── */

  static calculateItemTax(item: ExpenseItemInput): { netAmount: number; taxAmount: number } {
    const rate = new Decimal(item.taxRate || 0).div(100);
    const gross = new Decimal(item.amount);

    if (item.taxInclusive && rate.greaterThan(0)) {
      // VAT-inclusive: extract tax from gross
      const net = gross.div(rate.plus(1));
      const tax = gross.minus(net);
      return { netAmount: parseFloat(net.toFixed(4)), taxAmount: parseFloat(tax.toFixed(4)) };
    } else if (rate.greaterThan(0)) {
      // Tax-exclusive: amount IS the net, tax on top
      const tax = gross.times(rate);
      return { netAmount: parseFloat(gross.toFixed(4)), taxAmount: parseFloat(tax.toFixed(4)) };
    }
    return { netAmount: parseFloat(gross.toFixed(4)), taxAmount: 0 };
  }

  /* ────────────────────────────────────────
     CREATE CLAIM
     ──────────────────────────────────────── */

  static async createClaim(input: CreateClaimInput) {
    const claimNumber = await this.generateClaimNumber(input.organizationId);

    // Process items — calculate tax per line
    let totalAmount = new Decimal(0);
    let totalTax = new Decimal(0);
    let netAmount = new Decimal(0);

    const processedItems = input.items.map((item) => {
      const { netAmount: lineNet, taxAmount: lineTax } = this.calculateItemTax(item);
      const lineTotal = new Decimal(item.amount);
      totalAmount = totalAmount.plus(lineTotal);
      totalTax = totalTax.plus(lineTax);
      netAmount = netAmount.plus(lineNet);

      return {
        expenseDate: new Date(item.expenseDate),
        categoryId: item.categoryId || null,
        category: item.category,
        description: item.description,
        amount: lineTotal.toNumber(),
        taxInclusive: item.taxInclusive || false,
        taxRate: item.taxRate || 0,
        taxAmount: lineTax,
        netAmount: lineNet,
        receiptUrl: item.receiptUrl || null,
        receiptName: item.receiptName || null,
        merchantName: item.merchantName || null,
        notes: item.notes || null,
      };
    });

    const exchRate = new Decimal(input.exchangeRate || 1);
    const amountInBase = totalAmount.times(exchRate);

    const claim = await prisma.expenseClaim.create({
      data: {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        claimNumber,
        claimDate: new Date(input.claimDate),
        totalAmount: totalAmount.toNumber(),
        totalTax: totalTax.toNumber(),
        netAmount: netAmount.toNumber(),
        currency: input.currency,
        exchangeRate: exchRate.toNumber(),
        amountInBase: amountInBase.toNumber(),
        paymentMethod: input.paymentMethod || null,
        merchantName: input.merchantName || null,
        projectId: input.projectId || null,
        purpose: input.purpose || null,
        notes: input.notes || null,
        status: input.submitImmediately ? 'SUBMITTED' : 'DRAFT',
        submittedAt: input.submitImmediately ? new Date() : null,
        items: { create: processedItems },
      },
      include: { items: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        action: 'CREATE',
        entityType: 'EXPENSE_CLAIM',
        entityId: claim.id,
        changes: { description: `Created expense claim ${claimNumber} for ${input.currency} ${totalAmount.toFixed(2)}`, claimNumber, totalAmount: totalAmount.toNumber(), status: claim.status },
      },
    });

    return claim;
  }

  /* ────────────────────────────────────────
     SUBMIT CLAIM
     ──────────────────────────────────────── */

  static async submitClaim(organizationId: string, claimId: string, userId: string) {
    const claim = await prisma.expenseClaim.findFirst({
      where: { id: claimId, organizationId },
      include: { items: true, employee: { select: { managerId: true, firstName: true, lastName: true } } },
    });

    if (!claim) throw new Error('Claim not found');
    if (claim.status !== 'DRAFT') throw new Error('Only DRAFT claims can be submitted');

    // Duplicate check
    const dupe = await this.checkDuplicate(
      organizationId, claim.employeeId,
      claim.claimDate, Number(claim.totalAmount)
    );
    if (dupe.isDuplicate) {
      throw new Error(`Potential duplicate: matches existing claim ${dupe.existingClaimNumber}`);
    }

    const updated = await prisma.expenseClaim.update({
      where: { id: claimId },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'UPDATE',
        entityType: 'EXPENSE_CLAIM',
        entityId: claimId,
        changes: { description: `Submitted expense claim ${claim.claimNumber}`, status: 'SUBMITTED' },
      },
    });

    return updated;
  }

  /* ────────────────────────────────────────
     APPROVE CLAIM  → creates Journal Entry
     ──────────────────────────────────────── */

  static async approveClaim(input: ApproveClaimInput) {
    return prisma.$transaction(async (tx) => {
      const claim = await tx.expenseClaim.findFirst({
        where: { id: input.claimId, organizationId: input.organizationId },
        include: {
          items: true,
          employee: { select: { firstName: true, lastName: true, employeeNumber: true, departmentId: true } },
        },
      });

      if (!claim) throw new Error('Claim not found');
      if (claim.status !== 'SUBMITTED') throw new Error('Only SUBMITTED claims can be approved');

      // ═══ Build Journal Entry Lines ═══
      const journalLines: { accountId: string; entryType: 'DEBIT' | 'CREDIT'; amount: number; description: string }[] = [];

      // DR: Expense accounts (by category GL account or fallback)
      for (const item of claim.items) {
        let accountId = (item as any).categoryId;
        if (!accountId) {
          // Fallback: find a general expense account
          const generalExp = await tx.chartOfAccount.findFirst({
            where: { organizationId: input.organizationId, accountType: 'EXPENSE', isActive: true },
            orderBy: { code: 'asc' },
          });
          if (!generalExp) throw new Error('No expense account found in Chart of Accounts');
          accountId = generalExp.id;
        }

        journalLines.push({
          accountId,
          entryType: 'DEBIT',
          amount: Number((item as any).netAmount || item.amount),
          description: `${item.description} — ${claim.employee.firstName} ${claim.employee.lastName}`,
        });
      }

      // DR: Input VAT (if any tax extracted)
      const totalTax = Number(claim.totalTax);
      if (totalTax > 0) {
        const vatAccount = await tx.chartOfAccount.findFirst({
          where: {
            organizationId: input.organizationId,
            code: { startsWith: '1600' },
            accountType: 'ASSET',
            isActive: true,
          },
        });
        if (vatAccount) {
          journalLines.push({
            accountId: vatAccount.id,
            entryType: 'DEBIT',
            amount: totalTax,
            description: `Input VAT on expense claim ${claim.claimNumber}`,
          });
        }
      }

      // CR: Employee Reimbursements Payable (Liability)
      const payableAccount = await tx.chartOfAccount.findFirst({
        where: {
          organizationId: input.organizationId,
          code: { startsWith: '2300' },
          accountType: 'LIABILITY',
          isActive: true,
        },
      });
      if (!payableAccount) {
        throw new Error(
          'Employee Reimbursements Payable account not found (code 2300*). Please configure your Chart of Accounts.'
        );
      }

      journalLines.push({
        accountId: payableAccount.id,
        entryType: 'CREDIT',
        amount: Number(claim.totalAmount),
        description: `Reimbursement payable to ${claim.employee.firstName} ${claim.employee.lastName} (${claim.claimNumber})`,
      });

      // ═══ Create Transaction via DoubleEntryService ═══
      const transaction = await DoubleEntryService.createTransaction(
        {
          organizationId: input.organizationId,
          transactionDate: claim.claimDate,
          transactionType: 'JOURNAL_ENTRY' as any,
          description: `Expense Claim ${claim.claimNumber} — ${claim.employee.firstName} ${claim.employee.lastName}`,
          referenceType: 'EXPENSE_CLAIM',
          referenceId: claim.claimNumber,
          createdById: input.userId,
          entries: journalLines.map((l) => ({
            accountId: l.accountId,
            entryType: l.entryType as any,
            amount: l.amount,
            currency: claim.currency,
            exchangeRate: Number(claim.exchangeRate),
            description: l.description,
          })),
        },
        tx
      );

      // Post the transaction
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'POSTED' },
      });

      // Update claim
      const updated = await tx.expenseClaim.update({
        where: { id: claim.id },
        data: {
          status: 'APPROVED',
          approvedBy: input.userId,
          approvedAt: new Date(),
          transactionId: transaction.id,
        },
        include: { items: true, employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      });

      // Audit
      await tx.auditLog.create({
        data: {
          organizationId: input.organizationId,
          userId: input.userId,
          action: 'APPROVE',
          entityType: 'EXPENSE_CLAIM',
          entityId: claim.id,
          changes: { description: `Approved expense claim ${claim.claimNumber}. Journal entry ${transaction.transactionNumber} posted.`, status: 'APPROVED', transactionId: transaction.id },
        },
      });

      return { claim: updated, transactionId: transaction.id, transactionNumber: transaction.transactionNumber };
    });
  }

  /* ────────────────────────────────────────
     REJECT CLAIM
     ──────────────────────────────────────── */

  static async rejectClaim(input: RejectClaimInput) {
    const claim = await prisma.expenseClaim.findFirst({
      where: { id: input.claimId, organizationId: input.organizationId },
    });
    if (!claim) throw new Error('Claim not found');
    if (!['SUBMITTED', 'ACCOUNTING_REVIEW'].includes(claim.status)) {
      throw new Error('Only SUBMITTED or ACCOUNTING_REVIEW claims can be rejected');
    }

    const updated = await prisma.expenseClaim.update({
      where: { id: claim.id },
      data: { status: 'REJECTED', rejectionReason: input.reason },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        action: 'UPDATE',
        entityType: 'EXPENSE_CLAIM',
        entityId: claim.id,
        changes: { description: `Rejected expense claim ${claim.claimNumber}: ${input.reason}`, status: 'REJECTED', rejectionReason: input.reason },
      },
    });

    return updated;
  }

  /* ────────────────────────────────────────
     QUERY CLAIM (Request Clarification)
     ──────────────────────────────────────── */

  static async queryClaim(organizationId: string, claimId: string, userId: string, queryNotes: string) {
    const claim = await prisma.expenseClaim.findFirst({
      where: { id: claimId, organizationId },
    });
    if (!claim) throw new Error('Claim not found');

    const updated = await prisma.expenseClaim.update({
      where: { id: claim.id },
      data: { status: 'QUERIED', notes: `[QUERY] ${queryNotes}\n\n${claim.notes || ''}` },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'UPDATE',
        entityType: 'EXPENSE_CLAIM',
        entityId: claim.id,
        changes: { description: `Queried expense claim ${claim.claimNumber}: ${queryNotes}`, status: 'QUERIED' },
      },
    });

    return updated;
  }

  /* ────────────────────────────────────────
     MARK PAID
     ──────────────────────────────────────── */

  static async markPaid(
    organizationId: string,
    claimId: string,
    userId: string,
    paidViaPayroll: boolean = false
  ) {
    const claim = await prisma.expenseClaim.findFirst({
      where: { id: claimId, organizationId },
    });
    if (!claim) throw new Error('Claim not found');
    if (claim.status !== 'APPROVED') throw new Error('Only APPROVED claims can be marked as paid');

    const updated = await prisma.expenseClaim.update({
      where: { id: claim.id },
      data: {
        status: 'PAID',
        paidBy: userId,
        paidAt: new Date(),
        paidViaPayroll,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'UPDATE',
        entityType: 'EXPENSE_CLAIM',
        entityId: claim.id,
        changes: { description: `Marked expense claim ${claim.claimNumber} as PAID${paidViaPayroll ? ' (via payroll)' : ' (bank transfer)'}`, status: 'PAID', paidViaPayroll },
      },
    });

    return updated;
  }

  /* ────────────────────────────────────────
     GET CLAIM DETAIL (with audit trail)
     ──────────────────────────────────────── */

  static async getClaimDetail(organizationId: string, claimId: string) {
    const claim = await prisma.expenseClaim.findFirst({
      where: { id: claimId, organizationId },
      include: {
        items: {
          include: { glAccount: { select: { id: true, code: true, name: true } } },
          orderBy: { expenseDate: 'asc' },
        },
        employee: {
          select: {
            id: true, firstName: true, lastName: true, employeeNumber: true,
            email: true, phone: true,
            department: { select: { name: true } },
            manager: { select: { id: true, firstName: true, lastName: true, user: { select: { id: true } } } },
          },
        },
        approver: { select: { id: true, firstName: true, lastName: true } },
        payer: { select: { id: true, firstName: true, lastName: true } },
        transaction: { select: { id: true, transactionNumber: true, status: true } },
      },
    });

    if (!claim) return null;

    // Get audit trail
    const auditTrail = await prisma.auditLog.findMany({
      where: { entityType: 'EXPENSE_CLAIM', entityId: claimId },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { timestamp: 'asc' },
    });

    return { ...claim, auditTrail };
  }

  /* ────────────────────────────────────────
     GET METRICS
     ──────────────────────────────────────── */

  static async getMetrics(organizationId: string) {
    const [total, draft, submitted, approved, rejected, paid, queried] = await Promise.all([
      prisma.expenseClaim.count({ where: { organizationId } }),
      prisma.expenseClaim.count({ where: { organizationId, status: 'DRAFT' } }),
      prisma.expenseClaim.count({ where: { organizationId, status: 'SUBMITTED' } }),
      prisma.expenseClaim.count({ where: { organizationId, status: 'APPROVED' } }),
      prisma.expenseClaim.count({ where: { organizationId, status: 'REJECTED' } }),
      prisma.expenseClaim.count({ where: { organizationId, status: 'PAID' } }),
      prisma.expenseClaim.count({ where: { organizationId, status: 'QUERIED' } }),
    ]);

    const pendingAmount = await prisma.expenseClaim.aggregate({
      where: { organizationId, status: { in: ['SUBMITTED', 'APPROVED'] } },
      _sum: { amountInBase: true },
    });

    const paidAmount = await prisma.expenseClaim.aggregate({
      where: { organizationId, status: 'PAID' },
      _sum: { amountInBase: true },
    });

    return {
      total, draft, submitted, approved, rejected, paid, queried,
      pendingReimbursement: submitted + approved,
      pendingAmount: Number((pendingAmount._sum as any)?.amountInBase || 0),
      paidAmount: Number((paidAmount._sum as any)?.amountInBase || 0),
    };
  }
}
