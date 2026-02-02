import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { Decimal } from 'decimal.js';
import { startOfMonth, subMonths, format } from 'date-fns';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgSlug: string }> | { orgSlug: string } }
) {
  // Handle params as either Promise or direct object (Next.js 15 compatibility)
  const params = 'then' in context.params ? await context.params : context.params;
  const orgSlug = params.orgSlug;
  
  console.log('[Financial Dashboard API] Request received for orgSlug:', orgSlug);
  
  try {
    const authResult = await verifyAuth(request);
    console.log('[Financial Dashboard API] Auth result:', { valid: authResult.valid, organizationId: authResult.organizationId });
    
    if (!authResult.valid || !authResult.organizationId) {
      console.log('[Financial Dashboard API] Unauthorized - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = authResult;

    // Verify orgSlug matches the authenticated organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { slug: true },
    });

    if (!organization || organization.slug !== orgSlug) {
      return NextResponse.json({ error: 'Organization mismatch' }, { status: 403 });
    }

    // Get current fiscal period dates
    const now = new Date();
    const fiscalYearStart = new Date(now.getFullYear(), 0, 1); // Jan 1st
    const currentMonthStart = startOfMonth(now);

    // Fetch all accounts for the organization
    const accounts = await prisma.chartOfAccount.findMany({
      where: { organizationId },
      select: {
        id: true,
        code: true,
        name: true,
        accountType: true,
        accountSubType: true,
        balance: true,
      },
    });

    // Create account lookup maps
    const accountMap = new Map(accounts.map(a => [a.id, a]));
    const accountsByType = accounts.reduce((acc, account) => {
      if (!acc[account.accountType]) acc[account.accountType] = [];
      acc[account.accountType].push(account);
      return acc;
    }, {} as Record<string, typeof accounts>);

    // Calculate KPIs from account balances
    const revenueAccounts = accountsByType['REVENUE'] || [];
    const expenseAccounts = accountsByType['EXPENSE'] || [];
    const assetAccounts = accountsByType['ASSET'] || [];

    // For revenue accounts (credit normal balance), positive balance = revenue
    const totalRevenue = revenueAccounts.reduce(
      (sum, acc) => sum.add(new Decimal(acc.balance || 0)),
      new Decimal(0)
    );

    // For expense accounts (debit normal balance), positive balance = expenses
    const totalExpenses = expenseAccounts.reduce(
      (sum, acc) => sum.add(new Decimal(acc.balance || 0)),
      new Decimal(0)
    );

    const netProfit = totalRevenue.minus(totalExpenses);

    // Cash balance - sum all cash/bank accounts (typically ASSET accounts with 'Cash' or 'Bank' in name)
    const cashAccounts = assetAccounts.filter(
      acc => acc.name.toLowerCase().includes('cash') || acc.name.toLowerCase().includes('bank')
    );
    const currentCashBalance = cashAccounts.reduce(
      (sum, acc) => sum.add(new Decimal(acc.balance || 0)),
      new Decimal(0)
    );

    // Fetch transactions for the last 12 months for trend analysis
    const twelveMonthsAgo = subMonths(now, 12);
    const transactions = await prisma.transaction.findMany({
      where: {
        organizationId,
        transactionDate: {
          gte: twelveMonthsAgo,
          lte: now,
        },
        status: 'POSTED',
      },
      include: {
        ledgerEntries: {
          include: {
            account: {
              select: {
                id: true,
                accountType: true,
                accountSubType: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { transactionDate: 'asc' },
    });

    // Build cash flow trend data (monthly income vs expenses)
    const monthlyData: Record<string, { income: Decimal; expenses: Decimal; month: string }> = {};

    for (let i = 0; i < 12; i++) {
      const monthDate = subMonths(now, 11 - i);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'MMM yyyy');
      
      monthlyData[monthKey] = {
        month: monthLabel,
        income: new Decimal(0),
        expenses: new Decimal(0),
      };
    }

    // Process transactions to calculate monthly income and expenses
    transactions.forEach(transaction => {
      const monthKey = format(new Date(transaction.transactionDate), 'yyyy-MM');
      
      if (monthlyData[monthKey]) {
        transaction.ledgerEntries.forEach(entry => {
          const amount = new Decimal(entry.amount || 0);
          
          if (entry.account.accountType === 'REVENUE') {
            // Credit increases revenue
            if (entry.entryType === 'CREDIT') {
              monthlyData[monthKey].income = monthlyData[monthKey].income.add(amount);
            } else {
              monthlyData[monthKey].income = monthlyData[monthKey].income.minus(amount);
            }
          } else if (entry.account.accountType === 'EXPENSE') {
            // Debit increases expenses
            if (entry.entryType === 'DEBIT') {
              monthlyData[monthKey].expenses = monthlyData[monthKey].expenses.add(amount);
            } else {
              monthlyData[monthKey].expenses = monthlyData[monthKey].expenses.minus(amount);
            }
          }
        });
      }
    });

    const cashFlowTrend = Object.values(monthlyData).map(data => ({
      month: data.month,
      income: parseFloat(data.income.toFixed(2)),
      expenses: parseFloat(data.expenses.toFixed(2)),
    }));

    // Build expense distribution by category
    const expenseByCategory: Record<string, Decimal> = {};
    
    transactions.forEach(transaction => {
      transaction.ledgerEntries.forEach(entry => {
        if (entry.account.accountType === 'EXPENSE' && entry.entryType === 'DEBIT') {
          const category = entry.account.accountSubType || 'Uncategorized';
          const amount = new Decimal(entry.amount || 0);
          
          if (!expenseByCategory[category]) {
            expenseByCategory[category] = new Decimal(0);
          }
          expenseByCategory[category] = expenseByCategory[category].add(amount);
        }
      });
    });

    const expenseDistribution = Object.entries(expenseByCategory).map(([category, amount]) => ({
      category,
      amount: parseFloat(amount.toFixed(2)),
      percentage: totalExpenses.isZero() 
        ? 0 
        : parseFloat(amount.dividedBy(totalExpenses).times(100).toFixed(2)),
    }));

    // Sort by amount descending
    expenseDistribution.sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalExpenses: parseFloat(totalExpenses.toFixed(2)),
          netProfit: parseFloat(netProfit.toFixed(2)),
          currentCashBalance: parseFloat(currentCashBalance.toFixed(2)),
        },
        cashFlowTrend,
        expenseDistribution,
        period: {
          fiscalYearStart: fiscalYearStart.toISOString(),
          currentDate: now.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Financial dashboard API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch financial data' },
      { status: 500 }
    );
  }
}
