import Decimal from 'decimal.js';
import TrialBalanceService, {
  TrialBalanceParams,
  TrialBalanceEntry,
  ComparisonParams,
  AccountType,
} from './trial-balance.service';

export interface ReportSection {
  title: string;
  accounts: TrialBalanceEntry[];
  subtotal: Decimal;
  children?: ReportSection[];
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
   * Generate Profit & Loss Statement (Income Statement)
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

    // Filter accounts by type
    const incomeAccounts = trialBalance.filter((a) => a.accountType === 'REVENUE');
    const expenseAccounts = trialBalance.filter((a) => a.accountType === 'EXPENSE');

    // Group income accounts
    const revenueAccounts = incomeAccounts.filter(
      (a) => !a.accountSubType || a.accountSubType === 'REVENUE'
    );
    const otherIncomeAccounts = incomeAccounts.filter(
      (a) => a.accountSubType === 'OTHER_INCOME'
    );

    // Group expense accounts
    const cogsAccounts = expenseAccounts.filter(
      (a) => a.accountSubType === 'COST_OF_GOODS_SOLD' || a.accountSubType === 'Cost of Goods Sold'
    );
    const operatingExpenseAccounts = expenseAccounts.filter(
      (a) =>
        !a.accountSubType ||
        a.accountSubType === 'OPERATING_EXPENSE' ||
        a.accountSubType === 'Operating Expenses' ||
        a.accountSubType === 'ADMINISTRATIVE' ||
        a.accountSubType === 'SELLING'
    );
    const otherExpenseAccounts = expenseAccounts.filter(
      (a) => a.accountSubType === 'OTHER_EXPENSE' || a.accountSubType === 'Other Expenses' || a.accountSubType === 'INTEREST' || a.accountSubType === 'Financial Expenses'
    );

    // Calculate sections
    const revenue: ReportSection = {
      title: 'Revenue',
      accounts: revenueAccounts,
      subtotal: revenueAccounts.reduce(
        (sum, acc) => sum.plus(acc.balance),
        new Decimal(0)
      ),
    };

    const costOfGoodsSold: ReportSection = {
      title: 'Cost of Goods Sold',
      accounts: cogsAccounts,
      subtotal: cogsAccounts.reduce(
        (sum, acc) => sum.plus(acc.balance),
        new Decimal(0)
      ),
    };

    const grossProfit = revenue.subtotal.minus(costOfGoodsSold.subtotal);

    const operatingExpenses: ReportSection = {
      title: 'Operating Expenses',
      accounts: operatingExpenseAccounts,
      subtotal: operatingExpenseAccounts.reduce(
        (sum, acc) => sum.plus(acc.balance),
        new Decimal(0)
      ),
    };

    const operatingIncome = grossProfit.minus(operatingExpenses.subtotal);

    const otherIncome: ReportSection = {
      title: 'Other Income',
      accounts: otherIncomeAccounts,
      subtotal: otherIncomeAccounts.reduce(
        (sum, acc) => sum.plus(acc.balance),
        new Decimal(0)
      ),
    };

    const otherExpenses: ReportSection = {
      title: 'Other Expenses',
      accounts: otherExpenseAccounts,
      subtotal: otherExpenseAccounts.reduce(
        (sum, acc) => sum.plus(acc.balance),
        new Decimal(0)
      ),
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

    // Add comparison if requested
    if (includeComparison && params.startDate && params.endDate) {
      // Calculate prior period dates
      const periodLength =
        params.endDate.getTime() - params.startDate.getTime();
      const compareEndDate = new Date(params.startDate.getTime() - 1);
      const compareStartDate = new Date(
        compareEndDate.getTime() - periodLength
      );

      const priorReport = await this.generateProfitLoss({
        ...params,
        startDate: compareStartDate,
        endDate: compareEndDate,
      });

      report.priorPeriodNetIncome = priorReport.netIncome;
      report.variance = netIncome.minus(priorReport.netIncome);
      report.variancePercent = priorReport.netIncome.isZero()
        ? new Decimal(0)
        : report.variance
            .dividedBy(priorReport.netIncome.abs())
            .times(100);
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
