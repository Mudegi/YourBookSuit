'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrganization } from '@/hooks/useOrganization';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  BarChart3,
  PieChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface KPIs {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  currentCashBalance: number;
}

interface CashFlowData {
  month: string;
  income: number;
  expenses: number;
}

interface ExpenseData {
  category: string;
  amount: number;
  percentage: number;
}

interface FinancialData {
  kpis: KPIs;
  cashFlowTrend: CashFlowData[];
  expenseDistribution: ExpenseData[];
  period: {
    fiscalYearStart: string;
    currentDate: string;
  };
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#6366f1'];

export default function FinancialDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const { currency: orgCurrency } = useOrganization();

  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFinancialData();
  }, [orgSlug]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate orgSlug exists
      if (!orgSlug || orgSlug === '{orgSlug}') {
        throw new Error('Invalid organization. Please log in and select an organization.');
      }

      const response = await fetch(`/api/${orgSlug}/dashboard/financial`);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Authentication required. Please log in.');
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch financial data');
      }

      setData(result.data);
    } catch (err) {
      console.error('Financial data fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: orgCurrency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleKPIClick = (type: 'revenue' | 'expenses' | 'profit' | 'cash') => {
    // Drill-down: Navigate to filtered general ledger or transactions
    const routes = {
      revenue: `/${orgSlug}/general-ledger/chart-of-accounts?type=REVENUE`,
      expenses: `/${orgSlug}/general-ledger/chart-of-accounts?type=EXPENSE`,
      profit: `/${orgSlug}/reports/profit-loss`,
      cash: `/${orgSlug}/general-ledger/chart-of-accounts?type=ASSET&search=cash`,
    };
    router.push(routes[type]);
  };

  const handleExpenseCategoryClick = (category: string) => {
    router.push(`/${orgSlug}/general-ledger/chart-of-accounts?category=${encodeURIComponent(category)}`);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error.includes('Authentication') || error.includes('Invalid organization');
    
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 font-medium mb-2">Error loading financial data</p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            {isAuthError ? (
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Go to Login
              </button>
            ) : (
              <button
                onClick={fetchFinancialData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Retry
              </button>
            )}
            <button
              onClick={() => router.push(`/${orgSlug}/dashboard`)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Financial Data Available</h3>
          <p className="text-gray-600 mb-6">
            Start by posting journal entries or creating invoices to see your financial overview.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push(`/${orgSlug}/general-ledger/journal-entries`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Journal Entry
            </button>
            <button
              onClick={() => router.push(`/${orgSlug}/accounts-receivable/invoices/new`)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Create Invoice
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { kpis, cashFlowTrend, expenseDistribution } = data;
  const hasData = cashFlowTrend.length > 0 || expenseDistribution.length > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
          <p className="text-gray-600 mt-1">Executive overview of your financial performance</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>Fiscal Year 2024</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <button
          onClick={() => handleKPIClick('revenue')}
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.totalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-2">Click to view revenue accounts</p>
        </button>

        {/* Total Expenses */}
        <button
          onClick={() => handleKPIClick('expenses')}
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.totalExpenses)}</p>
          <p className="text-xs text-gray-500 mt-2">Click to view expense accounts</p>
        </button>

        {/* Net Profit */}
        <button
          onClick={() => handleKPIClick('profit')}
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              kpis.netProfit >= 0 ? 'bg-blue-100' : 'bg-orange-100'
            }`}>
              <DollarSign className={`w-6 h-6 ${
                kpis.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`} />
            </div>
            <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Net Profit</p>
          <p className={`text-2xl font-bold ${
            kpis.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(kpis.netProfit)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Click to view P&L statement</p>
        </button>

        {/* Current Cash Balance */}
        <button
          onClick={() => handleKPIClick('cash')}
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-indigo-600" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Cash Balance</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.currentCashBalance)}</p>
          <p className="text-xs text-gray-500 mt-2">Click to view cash accounts</p>
        </button>
      </div>

      {/* Cash Flow Trend Chart */}
      {cashFlowTrend.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Cash Flow Trend</h2>
              <p className="text-sm text-gray-600">Monthly income vs expenses over the last 12 months</p>
            </div>
            <BarChart3 className="w-6 h-6 text-gray-400" />
          </div>
          
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={cashFlowTrend}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                stroke="#6b7280" 
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#6b7280" 
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="income" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorIncome)"
                name="Income"
              />
              <Area 
                type="monotone" 
                dataKey="expenses" 
                stroke="#ef4444" 
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorExpenses)"
                name="Expenses"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expense Distribution Pie Chart */}
      {expenseDistribution.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Expense Distribution</h2>
                <p className="text-sm text-gray-600">Breakdown by account category</p>
              </div>
              <PieChart className="w-6 h-6 text-gray-400" />
            </div>
            
            <ResponsiveContainer width="100%" height={350}>
              <RechartsPieChart>
                <Pie
                  data={expenseDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {expenseDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleExpenseCategoryClick(entry.category)}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          {/* Expense Category List */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Expense Categories</h3>
            <div className="space-y-3">
              {expenseDistribution.slice(0, 8).map((item, index) => (
                <button
                  key={item.category}
                  onClick={() => handleExpenseCategoryClick(item.category)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{item.category}</p>
                      <p className="text-xs text-gray-500">{item.percentage.toFixed(1)}% of total</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.amount)}</p>
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State for Charts */}
      {!hasData && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <PieChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transaction History Yet</h3>
          <p className="text-gray-600 mb-6">
            Post journal entries to see cash flow trends and expense distributions.
          </p>
          <button
            onClick={() => router.push(`/${orgSlug}/general-ledger/journal-entries`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Journal Entry
          </button>
        </div>
      )}
    </div>
  );
}
