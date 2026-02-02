import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ReportDateRange {
  startDate: Date;
  endDate: Date;
}

export interface BalanceSheetAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  balance: number;
}

export interface BalanceSheetData {
  asOfDate: Date;
  assets: {
    currentAssets: BalanceSheetAccount[];
    fixedAssets: BalanceSheetAccount[];
    otherAssets: BalanceSheetAccount[];
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: BalanceSheetAccount[];
    longTermLiabilities: BalanceSheetAccount[];
    totalLiabilities: number;
  };
  equity: {
    equityAccounts: BalanceSheetAccount[];
    retainedEarnings: number;
    totalEquity: number;
  };
  isBalanced: boolean;
}

export interface ProfitLossAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  amount: number;
}

export interface ProfitLossData {
  startDate: Date;
  endDate: Date;
  revenue: {
    accounts: ProfitLossAccount[];
    totalRevenue: number;
  };
  costOfGoodsSold: {
    accounts: ProfitLossAccount[];
    totalCOGS: number;
  };
  grossProfit: number;
  expenses: {
    operatingExpenses: ProfitLossAccount[];
    totalExpenses: number;
  };
  netIncome: number;
}

export interface CashFlowData {
  startDate: Date;
  endDate: Date;
  operatingActivities: {
    netIncome: number;
    adjustments: { description: string; amount: number }[];
    totalOperating: number;
  };
  investingActivities: {
    activities: { description: string; amount: number }[];
    totalInvesting: number;
  };
  financingActivities: {
    activities: { description: string; amount: number }[];
    totalFinancing: number;
  };
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
}

export class ReportingService {
  /**
   * Generate Balance Sheet as of a specific date
   */
  async generateBalanceSheet(
    organizationId: string,
    asOfDate: Date
  ): Promise<BalanceSheetData> {
    // Get all accounts for the organization
    const accounts = await prisma.account.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: [{ code: 'asc' }],
    });

    // Calculate balance for each account as of the specified date
    const accountsWithBalances = await Promise.all(
      accounts.map(async (account) => {
        const balance = await this.getAccountBalance(account.id, asOfDate);
        return {
          id: account.id,
          code: account.code,
          name: account.name,
          accountType: account.accountType,
          balance,
        };
      })
    );

    // Categorize accounts
    const assets = accountsWithBalances.filter((a) => a.accountType === 'ASSET');
    const liabilities = accountsWithBalances.filter((a) => a.accountType === 'LIABILITY');
    const equity = accountsWithBalances.filter((a) => a.accountType === 'EQUITY');

    // Further categorize assets
    const currentAssets = assets.filter((a) => 
      a.code.startsWith('1') && !a.code.startsWith('15') && !a.code.startsWith('16') && !a.code.startsWith('17')
    );
    const fixedAssets = assets.filter((a) => 
      a.code.startsWith('15') || a.code.startsWith('16') || a.code.startsWith('17')
    );
    const otherAssets = assets.filter((a) => 
      !currentAssets.includes(a) && !fixedAssets.includes(a)
    );

    // Categorize liabilities
    const currentLiabilities = liabilities.filter((a) => a.code.startsWith('20'));
    const longTermLiabilities = liabilities.filter((a) => !a.code.startsWith('20'));

    // Calculate totals
    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
    
    // Calculate retained earnings (Net Income from beginning to asOfDate)
    const retainedEarnings = await this.calculateRetainedEarnings(
      organizationId,
      asOfDate
    );
    
    const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0) + retainedEarnings;

    // Check if balanced (Assets = Liabilities + Equity)
    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

    return {
      asOfDate,
      assets: {
        currentAssets,
        fixedAssets,
        otherAssets,
        totalAssets,
      },
      liabilities: {
        currentLiabilities,
        longTermLiabilities,
        totalLiabilities,
      },
      equity: {
        equityAccounts: equity,
        retainedEarnings,
        totalEquity,
      },
      isBalanced,
    };
  }

  /**
   * Generate Profit & Loss Statement for a date range
   */
  async generateProfitLoss(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ProfitLossData> {
    // Get all revenue and expense accounts
    const accounts = await prisma.account.findMany({
      where: {
        organizationId,
        isActive: true,
        accountType: {
          in: ['REVENUE', 'EXPENSE'],
        },
      },
      orderBy: [{ code: 'asc' }],
    });

    // Calculate activity for each account within the date range
    const accountsWithAmounts = await Promise.all(
      accounts.map(async (account) => {
        const amount = await this.getAccountActivity(account.id, startDate, endDate);
        return {
          id: account.id,
          code: account.code,
          name: account.name,
          accountType: account.accountType,
          amount: Math.abs(amount), // Show as positive for display
        };
      })
    );

    // Categorize accounts
    const revenueAccounts = accountsWithAmounts.filter((a) => a.accountType === 'REVENUE');
    const expenseAccounts = accountsWithAmounts.filter((a) => a.accountType === 'EXPENSE');

    // Separate COGS from operating expenses (COGS typically starts with 5)
    const cogsAccounts = expenseAccounts.filter((a) => a.code.startsWith('5'));
    const operatingExpenses = expenseAccounts.filter((a) => !a.code.startsWith('5'));

    // Calculate totals
    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + a.amount, 0);
    const totalCOGS = cogsAccounts.reduce((sum, a) => sum + a.amount, 0);
    const totalExpenses = operatingExpenses.reduce((sum, a) => sum + a.amount, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const netIncome = grossProfit - totalExpenses;

    return {
      startDate,
      endDate,
      revenue: {
        accounts: revenueAccounts,
        totalRevenue,
      },
      costOfGoodsSold: {
        accounts: cogsAccounts,
        totalCOGS,
      },
      grossProfit,
      expenses: {
        operatingExpenses,
        totalExpenses,
      },
      netIncome,
    };
  }

  /**
   * Generate Cash Flow Statement for a date range
   */
  async generateCashFlow(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CashFlowData> {
    // Get net income from P&L
    const pl = await this.generateProfitLoss(organizationId, startDate, endDate);
    const netIncome = pl.netIncome;

    // Get cash accounts
    const cashAccounts = await prisma.account.findMany({
      where: {
        organizationId,
        accountType: 'ASSET',
        code: {
          startsWith: '10', // Cash and cash equivalents
        },
        isActive: true,
      },
    });

    // Calculate beginning and ending cash balances
    const beginningCash = await this.getTotalCashBalance(cashAccounts, startDate);
    const endingCash = await this.getTotalCashBalance(cashAccounts, endDate);

    // Get changes in working capital accounts for operating activities
    const arChange = await this.getAccountBalanceChange(
      organizationId,
      '12', // Accounts Receivable
      startDate,
      endDate
    );
    const apChange = await this.getAccountBalanceChange(
      organizationId,
      '20', // Accounts Payable
      startDate,
      endDate
    );

    const operatingAdjustments = [
      { description: 'Decrease (Increase) in Accounts Receivable', amount: -arChange },
      { description: 'Increase (Decrease) in Accounts Payable', amount: apChange },
    ];

    const totalOperating = netIncome + operatingAdjustments.reduce((sum, a) => sum + a.amount, 0);

    // For investing and financing, we'll use simplified placeholders
    // In a real system, you'd track these from specific account categories
    const investingActivities: { description: string; amount: number }[] = [];
    const financingActivities: { description: string; amount: number }[] = [];

    const totalInvesting = investingActivities.reduce((sum, a) => sum + a.amount, 0);
    const totalFinancing = financingActivities.reduce((sum, a) => sum + a.amount, 0);

    const netCashFlow = totalOperating + totalInvesting + totalFinancing;

    return {
      startDate,
      endDate,
      operatingActivities: {
        netIncome,
        adjustments: operatingAdjustments,
        totalOperating,
      },
      investingActivities: {
        activities: investingActivities,
        totalInvesting,
      },
      financingActivities: {
        activities: financingActivities,
        totalFinancing,
      },
      netCashFlow,
      beginningCash,
      endingCash,
    };
  }

  /**
   * Get account balance as of a specific date
   */
  private async getAccountBalance(accountId: string, asOfDate: Date): Promise<number> {
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        accountId,
        transaction: {
          transactionDate: {
            lte: asOfDate,
          },
          status: 'POSTED',
        },
      },
    });

    // Get account type to determine normal balance
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) return 0;

    // Calculate balance based on account type
    // Assets, Expenses: Debit increases (positive), Credit decreases (negative)
    // Liabilities, Equity, Revenue: Credit increases (positive), Debit decreases (negative)
    const balance = entries.reduce((sum, entry) => {
      if (account.accountType === 'ASSET' || account.accountType === 'EXPENSE') {
        return sum + entry.debit - entry.credit;
      } else {
        return sum + entry.credit - entry.debit;
      }
    }, 0);

    return balance;
  }

  /**
   * Get account activity (net change) for a date range
   */
  private async getAccountActivity(
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        accountId,
        transaction: {
          transactionDate: {
            gte: startDate,
            lte: endDate,
          },
          status: 'POSTED',
        },
      },
    });

    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) return 0;

    // For revenue and expense accounts, calculate activity
    const activity = entries.reduce((sum, entry) => {
      if (account.accountType === 'REVENUE') {
        return sum + entry.credit - entry.debit;
      } else if (account.accountType === 'EXPENSE') {
        return sum + entry.debit - entry.credit;
      }
      return sum;
    }, 0);

    return activity;
  }

  /**
   * Calculate retained earnings as of a date
   */
  private async calculateRetainedEarnings(
    organizationId: string,
    asOfDate: Date
  ): Promise<number> {
    // Get organization start date or earliest transaction
    const earliestTransaction = await prisma.transaction.findFirst({
      where: {
        organizationId,
        status: 'POSTED',
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });

    if (!earliestTransaction) return 0;

    // Calculate net income from beginning to asOfDate
    const pl = await this.generateProfitLoss(
      organizationId,
      earliestTransaction.transactionDate,
      asOfDate
    );

    return pl.netIncome;
  }

  /**
   * Get total cash balance for cash accounts
   */
  private async getTotalCashBalance(
    cashAccounts: any[],
    asOfDate: Date
  ): Promise<number> {
    const balances = await Promise.all(
      cashAccounts.map((account) => this.getAccountBalance(account.id, asOfDate))
    );
    return balances.reduce((sum, balance) => sum + balance, 0);
  }

  /**
   * Get the change in account balance between two dates
   */
  private async getAccountBalanceChange(
    organizationId: string,
    accountCodePrefix: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const accounts = await prisma.account.findMany({
      where: {
        organizationId,
        code: {
          startsWith: accountCodePrefix,
        },
        isActive: true,
      },
    });

    const startBalances = await Promise.all(
      accounts.map((account) => this.getAccountBalance(account.id, startDate))
    );
    const endBalances = await Promise.all(
      accounts.map((account) => this.getAccountBalance(account.id, endDate))
    );

    const startTotal = startBalances.reduce((sum, bal) => sum + bal, 0);
    const endTotal = endBalances.reduce((sum, bal) => sum + bal, 0);

    return endTotal - startTotal;
  }
}
