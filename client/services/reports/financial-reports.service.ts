import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';
import TrialBalanceService, {
  TrialBalanceParams,
  TrialBalanceEntry,
  ComparisonParams,
  AccountType,
} from './trial-balance.service';

const prisma = new PrismaClient();

export interface ReportSection {
  title: string;
  accounts: TrialBalanceEntry[];
  subtotal: Decimal;
  children?: ReportSection[];
}

/** Full comparison data returned per-section */
export interface ComparisonSection {
  current: Decimal;
  prior: Decimal;
  variance: Decimal;
  variancePercent: Decimal;
}

export interface ProfitLossReport {
  organizationId: string;
  startDate: Date;
  endDate: Date;
  basis: 'ACCRUAL' | 'CASH';
  revenue: ReportSection;
  costOfGoodsSold: ReportSection;
  grossProfit: Decimal;
  operatingExpenses: ReportSection;
  operatingIncome: Decimal;
  otherIncome: ReportSection;
  otherExpenses: ReportSection;
  netIncome: Decimal;
  // Full comparison (per-section)
  comparison?: {
    startDate: Date;
    endDate: Date;
    revenue: ComparisonSection;
    costOfGoodsSold: ComparisonSection;
    grossProfit: ComparisonSection;
    operatingExpenses: ComparisonSection;
    operatingIncome: ComparisonSection;
    otherIncome: ComparisonSection;
    otherExpenses: ComparisonSection;
    netIncome: ComparisonSection;
  };
  // Legacy fields kept for backwards compat
  priorPeriodNetIncome?: Decimal;
  variance?: Decimal;
  variancePercent?: Decimal;
}

export interface BalanceSheetReport {
  organizationId: string;
  asOfDate: Date;
  basis: 'ACCRUAL' | 'CASH';
  assets: {
    currentAssets: ReportSection;
    fixedAssets: ReportSection;
    otherAssets: ReportSection;
    totalAssets: Decimal;
  };
  liabilities: {
    currentLiabilities: ReportSection;
    longTermLiabilities: ReportSection;
    totalLiabilities: Decimal;
  };
  equity: {
    retainedEarnings: Decimal;
    currentYearEarnings: Decimal;
    otherEquity: ReportSection;
    totalEquity: Decimal;
  };
  totalLiabilitiesAndEquity: Decimal;
}

export class FinancialReportsService {

  /**
   * Helper: build hierarchical children from a flat list using DB parent info
   */
  private static async groupAccountsHierarchically(
    organizationId: string,
    accounts: TrialBalanceEntry[]
  ): Promise<ReportSection[]> {
    if (accounts.length === 0) return [];

    const accountIds = accounts.map(a => a.accountId);
    // Fetch parent relationships for these accounts
    const dbAccounts = await prisma.chartOfAccount.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, parentId: true },
    });
    const parentMap = new Map(dbAccounts.map(a => [a.id, a.parentId]));

    // Find parent accounts that are not in our list but are parents of accounts in the list
    const parentIds = new Set<string>();
    for (const a of dbAccounts) {
      if (a.parentId && !accountIds.includes(a.parentId)) {
        parentIds.add(a.parentId);
      }
    }

    // Fetch parent names
    const parentAccounts = parentIds.size > 0
      ? await prisma.chartOfAccount.findMany({
          where: { id: { in: Array.from(parentIds) } },
          select: { id: true, code: true, name: true },
        })
      : [];
    const parentNameMap = new Map(parentAccounts.map(p => [p.id, `${p.name}`]));

    // Group: accounts with the same parentId go under one ReportSection
    const groups = new Map<string, TrialBalanceEntry[]>();
    const ungrouped: TrialBalanceEntry[] = [];

    for (const acct of accounts) {
      const pId = parentMap.get(acct.accountId);
      if (pId && parentNameMap.has(pId)) {
        if (!groups.has(pId)) groups.set(pId, []);
        groups.get(pId)!.push(acct);
      } else {
        ungrouped.push(acct);
      }
    }

    const children: ReportSection[] = [];

    // Add grouped sections
    for (const [pId, grpAccounts] of groups) {
      const subtotal = grpAccounts.reduce((s, a) => s.plus(a.balance), new Decimal(0));
      children.push({
        title: parentNameMap.get(pId) || 'Other',
        accounts: grpAccounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
        subtotal,
      });
    }

    // Add any ungrouped accounts as individual line items (no sub-header)
    if (ungrouped.length > 0) {
      // We don't wrap them in a child section; we leave them on the parent section's accounts array
      // Return them separately — handled by caller
    }

    return children;
  }

  private static makeComparison(current: Decimal, prior: Decimal): ComparisonSection {
    const variance = current.minus(prior);
    const variancePercent = prior.isZero()
      ? new Decimal(0)
      : variance.dividedBy(prior.abs()).times(100);
    return { current, prior, variance, variancePercent };
  }

  /**
   * Generate Profit & Loss Statement (Income Statement)
   * Supports hierarchical grouping and full per-section comparison
   */
  static async generateProfitLoss(
    params: TrialBalanceParams,
    includeComparison: boolean = false
  ): Promise<ProfitLossReport> {
    const { organizationId, startDate, endDate, basis = 'ACCRUAL' } = params;

    // Get trial balance for income and expense accounts
    const trialBalance = await TrialBalanceService.getTrialBalance({
      ...params,
    });

    // Also include COST_OF_SALES account type
    const incomeAccounts = trialBalance.filter((a) => a.accountType === 'REVENUE');
    const expenseAccounts = trialBalance.filter((a) => a.accountType === 'EXPENSE');
    const cosSalesAccounts = trialBalance.filter((a) => (a.accountType as string) === 'COST_OF_SALES');

    // Group income accounts
    const revenueAccounts = incomeAccounts.filter(
      (a) => !a.accountSubType || a.accountSubType === 'REVENUE'
    );
    const otherIncomeAccounts = incomeAccounts.filter(
      (a) => a.accountSubType === 'OTHER_INCOME'
    );

    // Group expense accounts — COGS from either the COST_OF_SALES type or EXPENSE subtypes
    const cogsAccounts = [
      ...cosSalesAccounts,
      ...expenseAccounts.filter(
        (a) => a.accountSubType === 'COST_OF_GOODS_SOLD' || a.accountSubType === 'Cost of Goods Sold'
      ),
    ];
    const operatingExpenseAccounts = expenseAccounts.filter(
      (a) =>
        a.accountSubType !== 'COST_OF_GOODS_SOLD' &&
        a.accountSubType !== 'Cost of Goods Sold' &&
        a.accountSubType !== 'OTHER_EXPENSE' &&
        a.accountSubType !== 'Other Expenses' &&
        a.accountSubType !== 'INTEREST' &&
        a.accountSubType !== 'Financial Expenses'
    );
    const otherExpenseAccounts = expenseAccounts.filter(
      (a) => a.accountSubType === 'OTHER_EXPENSE' || a.accountSubType === 'Other Expenses' || a.accountSubType === 'INTEREST' || a.accountSubType === 'Financial Expenses'
    );

    // Build sections with hierarchical children
    const [revChildren, cogsChildren, opexChildren, oiChildren, oeChildren] = await Promise.all([
      this.groupAccountsHierarchically(organizationId, revenueAccounts),
      this.groupAccountsHierarchically(organizationId, cogsAccounts),
      this.groupAccountsHierarchically(organizationId, operatingExpenseAccounts),
      this.groupAccountsHierarchically(organizationId, otherIncomeAccounts),
      this.groupAccountsHierarchically(organizationId, otherExpenseAccounts),
    ]);

    const revenue: ReportSection = {
      title: 'Revenue',
      accounts: revenueAccounts,
      subtotal: revenueAccounts.reduce((sum, acc) => sum.plus(acc.balance), new Decimal(0)),
      children: revChildren.length > 0 ? revChildren : undefined,
    };

    const costOfGoodsSold: ReportSection = {
      title: 'Cost of Goods Sold',
      accounts: cogsAccounts,
      subtotal: cogsAccounts.reduce((sum, acc) => sum.plus(acc.balance), new Decimal(0)),
      children: cogsChildren.length > 0 ? cogsChildren : undefined,
    };

    const grossProfit = revenue.subtotal.minus(costOfGoodsSold.subtotal);

    const operatingExpenses: ReportSection = {
      title: 'Operating Expenses',
      accounts: operatingExpenseAccounts,
      subtotal: operatingExpenseAccounts.reduce((sum, acc) => sum.plus(acc.balance), new Decimal(0)),
      children: opexChildren.length > 0 ? opexChildren : undefined,
    };

    const operatingIncome = grossProfit.minus(operatingExpenses.subtotal);

    const otherIncome: ReportSection = {
      title: 'Other Income',
      accounts: otherIncomeAccounts,
      subtotal: otherIncomeAccounts.reduce((sum, acc) => sum.plus(acc.balance), new Decimal(0)),
      children: oiChildren.length > 0 ? oiChildren : undefined,
    };

    const otherExpenses: ReportSection = {
      title: 'Other Expenses',
      accounts: otherExpenseAccounts,
      subtotal: otherExpenseAccounts.reduce((sum, acc) => sum.plus(acc.balance), new Decimal(0)),
      children: oeChildren.length > 0 ? oeChildren : undefined,
    };

    const netIncome = operatingIncome
      .plus(otherIncome.subtotal)
      .minus(otherExpenses.subtotal);

    const report: ProfitLossReport = {
      organizationId,
      startDate,
      endDate,
      basis,
      revenue,
      costOfGoodsSold,
      grossProfit,
      operatingExpenses,
      operatingIncome,
      otherIncome,
      otherExpenses,
      netIncome,
    };

    // Add full per-section comparison if requested
    if (includeComparison && params.startDate && params.endDate) {
      const periodLength = params.endDate.getTime() - params.startDate.getTime();
      const compareEndDate = new Date(params.startDate.getTime() - 1);
      const compareStartDate = new Date(compareEndDate.getTime() - periodLength);

      const priorReport = await this.generateProfitLoss({
        ...params,
        startDate: compareStartDate,
        endDate: compareEndDate,
      });

      report.comparison = {
        startDate: compareStartDate,
        endDate: compareEndDate,
        revenue: this.makeComparison(revenue.subtotal, priorReport.revenue.subtotal),
        costOfGoodsSold: this.makeComparison(costOfGoodsSold.subtotal, priorReport.costOfGoodsSold.subtotal),
        grossProfit: this.makeComparison(grossProfit, priorReport.grossProfit),
        operatingExpenses: this.makeComparison(operatingExpenses.subtotal, priorReport.operatingExpenses.subtotal),
        operatingIncome: this.makeComparison(operatingIncome, priorReport.operatingIncome),
        otherIncome: this.makeComparison(otherIncome.subtotal, priorReport.otherIncome.subtotal),
        otherExpenses: this.makeComparison(otherExpenses.subtotal, priorReport.otherExpenses.subtotal),
        netIncome: this.makeComparison(netIncome, priorReport.netIncome),
      };

      // Legacy compat
      report.priorPeriodNetIncome = priorReport.netIncome;
      report.variance = netIncome.minus(priorReport.netIncome);
      report.variancePercent = priorReport.netIncome.isZero()
        ? new Decimal(0)
        : report.variance.dividedBy(priorReport.netIncome.abs()).times(100);
    }

    return report;
  }

  /**
   * Generate Balance Sheet (Statement of Financial Position)
   */
  static async generateBalanceSheet(
    organizationId: string,
    asOfDate: Date,
    basis: 'ACCRUAL' | 'CASH' = 'ACCRUAL',
    fiscalYearStart?: Date
  ): Promise<BalanceSheetReport> {
    // Get cumulative balances for all balance sheet accounts
    const assetAccounts = await TrialBalanceService.getCumulativeBalances(
      organizationId,
      asOfDate,
      ['ASSET'],
      basis
    );

    const liabilityAccounts = await TrialBalanceService.getCumulativeBalances(
      organizationId,
      asOfDate,
      ['LIABILITY'],
      basis
    );

    const equityAccounts = await TrialBalanceService.getCumulativeBalances(
      organizationId,
      asOfDate,
      ['EQUITY'],
      basis
    );

    // Group assets
    const currentAssets = assetAccounts.filter(
      (a) => a.accountSubType === 'CURRENT_ASSET' || a.accountSubType === 'Current Assets' || a.accountSubType === 'BANK' || !a.accountSubType
    );
    const fixedAssets = assetAccounts.filter(
      (a) => a.accountSubType === 'FIXED_ASSET' || a.accountSubType === 'Fixed Assets'
    );
    const otherAssets = assetAccounts.filter(
      (a) => a.accountSubType === 'OTHER_ASSET' && a.accountSubType !== 'Current Assets' && a.accountSubType !== 'Fixed Assets' && a.accountSubType !== 'BANK'
    );

    // Group liabilities
    const currentLiabilities = liabilityAccounts.filter(
      (a) => a.accountSubType === 'CURRENT_LIABILITY' || a.accountSubType === 'Current Liabilities' || !a.accountSubType
    );
    const longTermLiabilities = liabilityAccounts.filter(
      (a) => a.accountSubType === 'LONG_TERM_LIABILITY' || a.accountSubType === 'Long-term Liabilities'
    );

    // Calculate retained earnings (prior year net income)
    const yearStartDate = fiscalYearStart || new Date(asOfDate.getFullYear(), 0, 1);
    const retainedEarnings = await this.getRetainedEarnings(
      organizationId,
      yearStartDate,
      basis
    );

    // Calculate current year earnings
    const currentYearEarnings = await this.getCurrentYearEarnings(
      organizationId,
      yearStartDate,
      asOfDate,
      basis
    );

    // Build sections
    const assets = {
      currentAssets: {
        title: 'Current Assets',
        accounts: currentAssets,
        subtotal: currentAssets.reduce(
          (sum, acc) => sum.plus(acc.balance),
          new Decimal(0)
        ),
      },
      fixedAssets: {
        title: 'Fixed Assets',
        accounts: fixedAssets,
        subtotal: fixedAssets.reduce(
          (sum, acc) => sum.plus(acc.balance),
          new Decimal(0)
        ),
      },
      otherAssets: {
        title: 'Other Assets',
        accounts: otherAssets,
        subtotal: otherAssets.reduce(
          (sum, acc) => sum.plus(acc.balance),
          new Decimal(0)
        ),
      },
      totalAssets: new Decimal(0),
    };

    assets.totalAssets = assets.currentAssets.subtotal
      .plus(assets.fixedAssets.subtotal)
      .plus(assets.otherAssets.subtotal);

    const liabilities = {
      currentLiabilities: {
        title: 'Current Liabilities',
        accounts: currentLiabilities,
        subtotal: currentLiabilities.reduce(
          (sum, acc) => sum.plus(acc.balance),
          new Decimal(0)
        ),
      },
      longTermLiabilities: {
        title: 'Long-term Liabilities',
        accounts: longTermLiabilities,
        subtotal: longTermLiabilities.reduce(
          (sum, acc) => sum.plus(acc.balance),
          new Decimal(0)
        ),
      },
      totalLiabilities: new Decimal(0),
    };

    liabilities.totalLiabilities = liabilities.currentLiabilities.subtotal.plus(
      liabilities.longTermLiabilities.subtotal
    );

    // Filter out retained earnings account from other equity
    const otherEquityAccounts = equityAccounts.filter(
      (a) =>
        !a.accountName.toLowerCase().includes('retained') &&
        !a.accountName.toLowerCase().includes('earnings')
    );

    const equity = {
      retainedEarnings,
      currentYearEarnings,
      otherEquity: {
        title: 'Other Equity',
        accounts: otherEquityAccounts,
        subtotal: otherEquityAccounts.reduce(
          (sum, acc) => sum.plus(acc.balance),
          new Decimal(0)
        ),
      },
      totalEquity: new Decimal(0),
    };

    equity.totalEquity = retainedEarnings
      .plus(currentYearEarnings)
      .plus(equity.otherEquity.subtotal);

    const totalLiabilitiesAndEquity =
      liabilities.totalLiabilities.plus(equity.totalEquity);

    return {
      organizationId,
      asOfDate,
      basis,
      assets,
      liabilities,
      equity,
      totalLiabilitiesAndEquity,
    };
  }

  /**
   * Calculate retained earnings (cumulative net income from prior years)
   */
  private static async getRetainedEarnings(
    organizationId: string,
    beforeDate: Date,
    basis: 'ACCRUAL' | 'CASH'
  ): Promise<Decimal> {
    // Get all income and expense from beginning of time until beforeDate
    const balances = await TrialBalanceService.getCumulativeBalances(
      organizationId,
      beforeDate,
      ['REVENUE', 'EXPENSE'],
      basis
    );

    const income = balances
      .filter((a) => a.accountType === 'REVENUE')
      .reduce((sum, acc) => sum.plus(acc.balance), new Decimal(0));

    const expenses = balances
      .filter((a) => a.accountType === 'EXPENSE')
      .reduce((sum, acc) => sum.plus(acc.balance), new Decimal(0));

    return income.minus(expenses);
  }

  /**
   * Calculate current year earnings (net income for current fiscal year)
   */
  private static async getCurrentYearEarnings(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    basis: 'ACCRUAL' | 'CASH'
  ): Promise<Decimal> {
    const pl = await this.generateProfitLoss({
      organizationId,
      startDate,
      endDate,
      basis,
    });

    return pl.netIncome;
  }

  /**
   * Get drill-down transaction IDs for a specific account
   */
  static async getDrillDownTransactions(
    accountId: string,
    startDate: Date,
    endDate: Date,
    organizationId: string
  ): Promise<string[]> {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        accountId,
        transaction: {
          organizationId,
          transactionDate: {
            gte: startDate,
            lte: endDate,
          },
          status: 'POSTED',
        },
      },
      select: {
        transactionId: true,
      },
    });

    await prisma.$disconnect();

    return [...new Set(ledgerEntries.map((e) => e.transactionId))];
  }
}

export default FinancialReportsService;
