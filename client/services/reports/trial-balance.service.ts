import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';

const prisma = new PrismaClient();

export type ReportBasis = 'ACCRUAL' | 'CASH';
export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

export interface TrialBalanceParams {
  organizationId: string;
  startDate: Date;
  endDate: Date;
  basis?: ReportBasis;
  branchId?: string;
  departmentId?: string;
  projectId?: string;
}

export interface TrialBalanceEntry {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountSubType?: string;
  debit: Decimal;
  credit: Decimal;
  balance: Decimal;
  transactionCount: number;
}

export interface ComparisonParams extends TrialBalanceParams {
  compareStartDate: Date;
  compareEndDate: Date;
}

export interface ComparisonEntry extends TrialBalanceEntry {
  priorBalance: Decimal;
  variance: Decimal;
  variancePercent: Decimal;
}

export class TrialBalanceService {
  /**
   * Generate Trial Balance - the foundation for all financial reports
   */
  static async getTrialBalance(
    params: TrialBalanceParams
  ): Promise<TrialBalanceEntry[]> {
    const {
      organizationId,
      startDate,
      endDate,
      basis = 'ACCRUAL',
      branchId,
      departmentId,
      projectId,
    } = params;

    // Build the where clause for transactions
    const whereClause: any = {
      organizationId,
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
      status: 'POSTED',
    };

    // Cash basis: only include transactions with payment status
    if (basis === 'CASH') {
      whereClause.paymentStatus = 'PAID';
    }

    // Apply dimension filters
    if (branchId) {
      whereClause.branchId = branchId;
    }

    // Fetch all ledger entries for the period
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        transaction: whereClause,
      },
      include: {
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            accountType: true,
            accountSubType: true,
            isActive: true,
          },
        },
      },
    });

    // Group by account and aggregate
    const accountMap = new Map<string, TrialBalanceEntry>();

    for (const entry of ledgerEntries) {
      const account = entry.account;
      
      if (!accountMap.has(account.id)) {
        accountMap.set(account.id, {
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.accountType as AccountType,
          accountSubType: account.accountSubType || undefined,
          debit: new Decimal(0),
          credit: new Decimal(0),
          balance: new Decimal(0),
          transactionCount: 0,
        });
      }

      const trialEntry = accountMap.get(account.id)!;
      const amount = new Decimal(entry.amount.toString());

      if (entry.entryType === 'DEBIT') {
        trialEntry.debit = trialEntry.debit.plus(amount);
      } else {
        trialEntry.credit = trialEntry.credit.plus(amount);
      }

      trialEntry.transactionCount++;
    }

    // Calculate balances based on account type
    const entries = Array.from(accountMap.values());
    
    for (const entry of entries) {
      // For Asset and Expense accounts: Debit - Credit
      if (entry.accountType === 'ASSET' || entry.accountType === 'EXPENSE') {
        entry.balance = entry.debit.minus(entry.credit);
      }
      // For Liability, Equity, and Income accounts: Credit - Debit
      else {
        entry.balance = entry.credit.minus(entry.debit);
      }
    }

    return entries.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  }

  /**
   * Get Trial Balance with Period Comparison
   */
  static async getTrialBalanceWithComparison(
    params: ComparisonParams
  ): Promise<ComparisonEntry[]> {
    // Get current period trial balance
    const currentPeriod = await this.getTrialBalance(params);

    // Get comparison period trial balance
    const priorPeriod = await this.getTrialBalance({
      ...params,
      startDate: params.compareStartDate,
      endDate: params.compareEndDate,
    });

    // Create a map of prior period balances
    const priorMap = new Map<string, Decimal>();
    for (const entry of priorPeriod) {
      priorMap.set(entry.accountId, entry.balance);
    }

    // Build comparison entries
    const comparisonEntries: ComparisonEntry[] = currentPeriod.map((current) => {
      const priorBalance = priorMap.get(current.accountId) || new Decimal(0);
      const variance = current.balance.minus(priorBalance);
      
      let variancePercent = new Decimal(0);
      if (!priorBalance.isZero()) {
        variancePercent = variance.dividedBy(priorBalance.abs()).times(100);
      }

      return {
        ...current,
        priorBalance,
        variance,
        variancePercent,
      };
    });

    return comparisonEntries;
  }

  /**
   * Get Opening Balances (from beginning of time until startDate)
   */
  static async getOpeningBalances(
    organizationId: string,
    beforeDate: Date,
    basis: ReportBasis = 'ACCRUAL'
  ): Promise<Map<string, Decimal>> {
    const whereClause: any = {
      organizationId,
      transactionDate: {
        lt: beforeDate,
      },
      status: 'POSTED',
    };

    if (basis === 'CASH') {
      whereClause.paymentStatus = 'PAID';
    }

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        transaction: whereClause,
      },
      include: {
        account: {
          select: {
            id: true,
            accountType: true,
          },
        },
      },
    });

    const balanceMap = new Map<string, Decimal>();

    for (const entry of ledgerEntries) {
      const accountId = entry.accountId;
      const accountType = entry.account.accountType;
      
      if (!balanceMap.has(accountId)) {
        balanceMap.set(accountId, new Decimal(0));
      }

      const currentBalance = balanceMap.get(accountId)!;
      const amount = new Decimal(entry.amount.toString());

      // Calculate running balance based on account type
      if (entry.entryType === 'DEBIT') {
        if (accountType === 'ASSET' || accountType === 'EXPENSE') {
          balanceMap.set(accountId, currentBalance.plus(amount));
        } else {
          balanceMap.set(accountId, currentBalance.minus(amount));
        }
      } else {
        if (accountType === 'ASSET' || accountType === 'EXPENSE') {
          balanceMap.set(accountId, currentBalance.minus(amount));
        } else {
          balanceMap.set(accountId, currentBalance.plus(amount));
        }
      }
    }

    return balanceMap;
  }

  /**
   * Get cumulative balance for Balance Sheet accounts
   */
  static async getCumulativeBalances(
    organizationId: string,
    asOfDate: Date,
    accountTypes: AccountType[],
    basis: ReportBasis = 'ACCRUAL'
  ): Promise<TrialBalanceEntry[]> {
    const whereClause: any = {
      organizationId,
      transactionDate: {
        lte: asOfDate,
      },
      status: 'POSTED',
    };

    if (basis === 'CASH') {
      whereClause.paymentStatus = 'PAID';
    }

    // First get all accounts of the specified types
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        organizationId,
        accountType: {
          in: accountTypes,
        },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    const accountIds = accounts.map((a) => a.id);

    if (accountIds.length === 0) {
      return [];
    }

    // Then get ledger entries for those accounts
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        transaction: whereClause,
        accountId: {
          in: accountIds,
        },
      },
      include: {
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            accountType: true,
            accountSubType: true,
          },
        },
      },
    });

    // Group and aggregate
    const accountMap = new Map<string, TrialBalanceEntry>();

    for (const entry of ledgerEntries) {
      const account = entry.account;
      
      if (!accountMap.has(account.id)) {
        accountMap.set(account.id, {
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.accountType as AccountType,
          accountSubType: account.accountSubType || undefined,
          debit: new Decimal(0),
          credit: new Decimal(0),
          balance: new Decimal(0),
          transactionCount: 0,
        });
      }

      const trialEntry = accountMap.get(account.id)!;
      const amount = new Decimal(entry.amount.toString());

      if (entry.entryType === 'DEBIT') {
        trialEntry.debit = trialEntry.debit.plus(amount);
      } else {
        trialEntry.credit = trialEntry.credit.plus(amount);
      }

      trialEntry.transactionCount++;
    }

    // Calculate balances
    const entries = Array.from(accountMap.values());
    
    for (const entry of entries) {
      if (entry.accountType === 'ASSET') {
        entry.balance = entry.debit.minus(entry.credit);
      } else {
        entry.balance = entry.credit.minus(entry.debit);
      }
    }

    return entries.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  }
}

export default TrialBalanceService;
