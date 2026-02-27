import { prisma } from '@/lib/prisma';
import { BankAccountType, Prisma } from '@prisma/client';

/* ═══════════ TYPES ═══════════ */

export interface CreateBankAccountInput {
  organizationId: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  currency: string;
  accountType: BankAccountType;
  glAccountId: string;
  openingBalance?: number;
  routingNumber?: string;
  swiftCode?: string;
  mobileMerchantId?: string;
  mobileShortcode?: string;
  description?: string;
  branchId?: string;
}

export interface UpdateBankAccountInput {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  currency?: string;
  accountType?: BankAccountType;
  routingNumber?: string;
  swiftCode?: string;
  mobileMerchantId?: string;
  mobileShortcode?: string;
  description?: string;
  isActive?: boolean;
}

export interface TransferFundsInput {
  organizationId: string;
  fromBankAccountId: string;
  toBankAccountId: string;
  amount: number;
  transferDate: Date;
  reference?: string;
  notes?: string;
  createdBy: string;
}

export interface BankAccountWithMeta {
  id: string;
  organizationId: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  currency: string;
  accountType: BankAccountType;
  openingBalance: number;
  currentBalance: number;
  statementBalance: number | null;
  reconciliationGap: number | null;
  glAccountId: string | null;
  glAccountCode: string | null;
  glAccountName: string | null;
  routingNumber: string | null;
  swiftCode: string | null;
  mobileMerchantId: string | null;
  mobileShortcode: string | null;
  lastReconciledDate: string | null;
  lastReconciledBalance: number | null;
  description: string | null;
  isActive: boolean;
  branchId: string | null;
  branchName: string | null;
  transactionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BankingOverviewStats {
  totalAccounts: number;
  activeAccounts: number;
  totalSystemBalance: number;
  totalStatementBalance: number;
  totalReconciliationGap: number;
  accountsByType: Record<string, { count: number; balance: number }>;
  currency: string;
}

/* ═══════════ SERVICE ═══════════ */

export class BankingService {
  /**
   * Get all bank accounts for an organization with enriched metadata
   */
  static async getBankAccounts(
    organizationId: string,
    opts: { includeInactive?: boolean; accountType?: BankAccountType } = {}
  ): Promise<{ accounts: BankAccountWithMeta[]; stats: BankingOverviewStats }> {
    const where: Prisma.BankAccountWhereInput = { organizationId };
    if (!opts.includeInactive) where.isActive = true;
    if (opts.accountType) where.accountType = opts.accountType;

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { baseCurrency: true },
    });

    const bankAccounts = await prisma.bankAccount.findMany({
      where,
      include: {
        Branch: { select: { id: true, name: true } },
        _count: { select: { payments: true, reconciliations: true } },
      },
      orderBy: [{ isActive: 'desc' }, { accountType: 'asc' }, { bankName: 'asc' }],
    });

    // Look up GL account info separately for those that have one
    const glIds = bankAccounts.map(a => a.glAccountId).filter(Boolean) as string[];
    const glAccounts = glIds.length > 0
      ? await prisma.chartOfAccount.findMany({
          where: { id: { in: glIds } },
          select: { id: true, code: true, name: true },
        })
      : [];
    const glMap = new Map(glAccounts.map(g => [g.id, g]));

    const accounts: BankAccountWithMeta[] = bankAccounts.map(ba => {
      const gl = ba.glAccountId ? glMap.get(ba.glAccountId) : null;
      const ext = ba as any; // New fields available after prisma generate
      const currentBalance = Number(ba.currentBalance);
      const statementBalance = ext.statementBalance ? Number(ext.statementBalance) : null;
      const reconciliationGap = statementBalance !== null ? statementBalance - currentBalance : null;

      return {
        id: ba.id,
        organizationId: ba.organizationId,
        accountName: ba.accountName,
        accountNumber: ba.accountNumber,
        bankName: ba.bankName,
        currency: ba.currency,
        accountType: ba.accountType,
        openingBalance: Number(ba.openingBalance),
        currentBalance,
        statementBalance,
        reconciliationGap,
        glAccountId: ba.glAccountId,
        glAccountCode: gl?.code ?? null,
        glAccountName: gl?.name ?? null,
        routingNumber: ext.routingNumber ?? null,
        swiftCode: ext.swiftCode ?? null,
        mobileMerchantId: ext.mobileMerchantId ?? null,
        mobileShortcode: ext.mobileShortcode ?? null,
        lastReconciledDate: ext.lastReconciledDate?.toISOString?.() ?? null,
        lastReconciledBalance: ext.lastReconciledBalance ? Number(ext.lastReconciledBalance) : null,
        description: ext.description ?? null,
        isActive: ba.isActive,
        branchId: ba.branchId,
        branchName: ba.Branch?.name ?? null,
        transactionCount: ba._count.payments,
        createdAt: ba.createdAt.toISOString(),
        updatedAt: ba.updatedAt.toISOString(),
      };
    });

    // Statistics
    const active = accounts.filter(a => a.isActive);
    const byType: Record<string, { count: number; balance: number }> = {};
    for (const a of active) {
      const t = a.accountType;
      if (!byType[t]) byType[t] = { count: 0, balance: 0 };
      byType[t].count++;
      byType[t].balance += a.currentBalance;
    }

    const stats: BankingOverviewStats = {
      totalAccounts: accounts.length,
      activeAccounts: active.length,
      totalSystemBalance: active.reduce((s, a) => s + a.currentBalance, 0),
      totalStatementBalance: active.reduce((s, a) => s + (a.statementBalance ?? a.currentBalance), 0),
      totalReconciliationGap: active.reduce((s, a) => s + (a.reconciliationGap ?? 0), 0),
      accountsByType: byType,
      currency: org?.baseCurrency || 'USD',
    };

    return { accounts, stats };
  }

  /**
   * Get a single bank account by ID
   */
  static async getBankAccountById(
    id: string,
    organizationId: string
  ): Promise<BankAccountWithMeta> {
    const ba = await prisma.bankAccount.findUnique({
      where: { id },
      include: {
        Branch: { select: { id: true, name: true } },
        _count: { select: { payments: true, reconciliations: true } },
      },
    });

    if (!ba) throw new Error('Bank account not found');
    if (ba.organizationId !== organizationId) throw new Error('Bank account does not belong to this organization');

    let gl: { id: string; code: string; name: string } | null = null;
    if (ba.glAccountId) {
      gl = await prisma.chartOfAccount.findUnique({
        where: { id: ba.glAccountId },
        select: { id: true, code: true, name: true },
      });
    }

    const ext = ba as any; // New fields available after prisma generate
    const currentBalance = Number(ba.currentBalance);
    const statementBalance = ext.statementBalance ? Number(ext.statementBalance) : null;

    return {
      id: ba.id,
      organizationId: ba.organizationId,
      accountName: ba.accountName,
      accountNumber: ba.accountNumber,
      bankName: ba.bankName,
      currency: ba.currency,
      accountType: ba.accountType,
      openingBalance: Number(ba.openingBalance),
      currentBalance,
      statementBalance,
      reconciliationGap: statementBalance !== null ? statementBalance - currentBalance : null,
      glAccountId: ba.glAccountId,
      glAccountCode: gl?.code ?? null,
      glAccountName: gl?.name ?? null,
      routingNumber: ext.routingNumber ?? null,
      swiftCode: ext.swiftCode ?? null,
      mobileMerchantId: ext.mobileMerchantId ?? null,
      mobileShortcode: ext.mobileShortcode ?? null,
      lastReconciledDate: ext.lastReconciledDate?.toISOString?.() ?? null,
      lastReconciledBalance: ext.lastReconciledBalance ? Number(ext.lastReconciledBalance) : null,
      description: ext.description ?? null,
      isActive: ba.isActive,
      branchId: ba.branchId,
      branchName: ba.Branch?.name ?? null,
      transactionCount: ba._count.payments,
      createdAt: ba.createdAt.toISOString(),
      updatedAt: ba.updatedAt.toISOString(),
    };
  }

  /**
   * Create a new bank account with GL validation
   */
  static async createBankAccount(input: CreateBankAccountInput) {
    // 1. Validate GL account is ASSET type
    const glAccount = await prisma.chartOfAccount.findUnique({
      where: { id: input.glAccountId },
    });
    if (!glAccount) throw new Error('Chart of Accounts entry not found');
    if (glAccount.organizationId !== input.organizationId) throw new Error('GL account does not belong to this organization');
    if (glAccount.accountType !== 'ASSET') throw new Error('Bank account must be linked to an ASSET-type GL account');

    // 2. Prevent duplicate GL mapping
    const existingGLLink = await prisma.bankAccount.findFirst({
      where: {
        organizationId: input.organizationId,
        glAccountId: input.glAccountId,
      },
    });
    if (existingGLLink) throw new Error('This GL account is already linked to another bank account. Each bank account must map to a unique GL code.');

    // 3. Prevent duplicate account number at same bank
    const duplicateAccNum = await prisma.bankAccount.findFirst({
      where: {
        organizationId: input.organizationId,
        accountNumber: input.accountNumber,
        bankName: input.bankName,
      },
    });
    if (duplicateAccNum) throw new Error('A bank account with this account number already exists at this bank');

    // 4. Create
    const bankAccount = await prisma.bankAccount.create({
      data: {
        organizationId: input.organizationId,
        accountName: input.accountName,
        accountNumber: input.accountNumber,
        bankName: input.bankName,
        currency: input.currency,
        accountType: input.accountType,
        glAccountId: input.glAccountId,
        openingBalance: input.openingBalance ?? 0,
        currentBalance: input.openingBalance ?? 0,
        ...(input.routingNumber && { routingNumber: input.routingNumber }),
        ...(input.swiftCode && { swiftCode: input.swiftCode }),
        ...(input.mobileMerchantId && { mobileMerchantId: input.mobileMerchantId }),
        ...(input.mobileShortcode && { mobileShortcode: input.mobileShortcode }),
        ...(input.description && { description: input.description }),
        branchId: input.branchId,
      },
    });

    return bankAccount;
  }

  /**
   * Update a bank account
   */
  static async updateBankAccount(id: string, organizationId: string, input: UpdateBankAccountInput) {
    const ba = await prisma.bankAccount.findUnique({ where: { id } });
    if (!ba) throw new Error('Bank account not found');
    if (ba.organizationId !== organizationId) throw new Error('Bank account does not belong to this organization');

    // Duplicate account number check
    if (input.accountNumber || input.bankName) {
      const dup = await prisma.bankAccount.findFirst({
        where: {
          organizationId,
          accountNumber: input.accountNumber ?? ba.accountNumber,
          bankName: input.bankName ?? ba.bankName,
          id: { not: id },
        },
      });
      if (dup) throw new Error('A bank account with this account number already exists at this bank');
    }

    return prisma.bankAccount.update({
      where: { id },
      data: input,
    });
  }

  /**
   * Delete (soft: deactivate) or hard-delete if no transactions
   */
  static async deleteBankAccount(id: string, organizationId: string) {
    const ba = await prisma.bankAccount.findUnique({
      where: { id },
      include: { _count: { select: { payments: true, reconciliations: true } } },
    });
    if (!ba) throw new Error('Bank account not found');
    if (ba.organizationId !== organizationId) throw new Error('Bank account does not belong to this organization');

    if (ba._count.payments > 0 || ba._count.reconciliations > 0) {
      // Soft delete — mark inactive
      await prisma.bankAccount.update({
        where: { id },
        data: { isActive: false },
      });
      return { success: true, softDeleted: true };
    }

    await prisma.bankAccount.delete({ where: { id } });
    return { success: true, softDeleted: false };
  }

  /**
   * Inter-account transfer — atomic debit+credit as a journal entry
   */
  static async transferFunds(input: TransferFundsInput) {
    const from = await prisma.bankAccount.findUnique({ where: { id: input.fromBankAccountId } });
    const to = await prisma.bankAccount.findUnique({ where: { id: input.toBankAccountId } });

    if (!from) throw new Error('Source bank account not found');
    if (!to) throw new Error('Destination bank account not found');
    if (from.organizationId !== input.organizationId) throw new Error('Source account does not belong to this organization');
    if (to.organizationId !== input.organizationId) throw new Error('Destination account does not belong to this organization');
    if (!from.isActive) throw new Error('Source bank account is inactive');
    if (!to.isActive) throw new Error('Destination bank account is inactive');
    if (input.fromBankAccountId === input.toBankAccountId) throw new Error('Cannot transfer to the same account');
    if (input.amount <= 0) throw new Error('Transfer amount must be positive');
    if (!from.glAccountId || !to.glAccountId) throw new Error('Both bank accounts must be linked to GL accounts for transfers');

    // Balance check
    const currentFromBalance = Number(from.currentBalance);
    if (currentFromBalance < input.amount) {
      throw new Error(`Insufficient funds. Available: ${currentFromBalance.toFixed(2)}, Required: ${input.amount.toFixed(2)}`);
    }

    const ref = input.reference || `TRF-${Date.now()}`;
    const description = input.notes || `Transfer: ${from.bankName} (${from.accountNumber}) → ${to.bankName} (${to.accountNumber})`;

    // Atomic transaction: create journal + update balances
    const result = await prisma.$transaction(async (tx) => {
      // Create a journal transaction (BANK_TRANSFER type)
      const txn = await tx.transaction.create({
        data: {
          organizationId: input.organizationId,
          transactionNumber: ref,
          transactionDate: input.transferDate,
          transactionType: 'BANK_TRANSFER',
          description,
          notes: input.notes || null,
          status: 'POSTED',
          createdById: input.createdBy,
          ledgerEntries: {
            create: [
              {
                accountId: to.glAccountId!,
                entryType: 'DEBIT',
                amount: input.amount,
                currency: to.currency,
                exchangeRate: 1,
                amountInBase: input.amount,
                description: `Transfer from ${from.bankName}`,
              },
              {
                accountId: from.glAccountId!,
                entryType: 'CREDIT',
                amount: input.amount,
                currency: from.currency,
                exchangeRate: 1,
                amountInBase: input.amount,
                description: `Transfer to ${to.bankName}`,
              },
            ],
          },
        },
      });

      // Update balances
      await tx.bankAccount.update({
        where: { id: from.id },
        data: { currentBalance: { decrement: input.amount } },
      });
      await tx.bankAccount.update({
        where: { id: to.id },
        data: { currentBalance: { increment: input.amount } },
      });

      return txn;
    });

    return {
      success: true,
      transactionId: result.id,
      reference: ref,
      description,
    };
  }

  /**
   * Get transactions for a specific bank account via its GL account
   */
  static async getAccountTransactions(
    bankAccountId: string,
    organizationId: string,
    opts: { limit?: number; startDate?: string; endDate?: string } = {}
  ) {
    const ba = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (!ba) throw new Error('Bank account not found');
    if (ba.organizationId !== organizationId) throw new Error('Bank account does not belong to this organization');
    if (!ba.glAccountId) return [];

    const where: any = {
      accountId: ba.glAccountId,
      transaction: { status: 'POSTED' },
    };
    if (opts.startDate || opts.endDate) {
      where.transaction.transactionDate = {};
      if (opts.startDate) where.transaction.transactionDate.gte = new Date(opts.startDate);
      if (opts.endDate) where.transaction.transactionDate.lte = new Date(opts.endDate);
    }

    const entries = await prisma.ledgerEntry.findMany({
      where,
      include: {
        transaction: true,
        account: { select: { id: true, code: true, name: true } },
      },
      orderBy: { transaction: { transactionDate: 'desc' } },
      take: opts.limit || 100,
    });

    let runningBalance = Number(ba.currentBalance);
    return entries.map(e => {
      const isDebit = e.entryType === 'DEBIT';
      const amount = Number(e.amount);
      const debit = isDebit ? amount : 0;
      const credit = isDebit ? 0 : amount;
      const entry = {
        id: e.id,
        transactionId: e.transactionId,
        transactionNumber: e.transaction.transactionNumber,
        transactionDate: e.transaction.transactionDate.toISOString(),
        description: e.description || e.transaction.description,
        reference: e.transaction.transactionNumber,
        debit,
        credit,
        runningBalance,
        status: e.transaction.status,
        isReconciled: e.reconciled,
      };
      runningBalance -= (debit - credit);
      return entry;
    });
  }
}
