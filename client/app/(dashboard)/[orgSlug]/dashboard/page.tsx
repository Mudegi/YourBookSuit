"use client";

import { useEffect, useState } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, FileText, Package, 
  ArrowRight, Clock, CheckCircle2, AlertCircle, ShoppingCart, 
  CreditCard, Banknote, BarChart3, PieChart, Calendar, Target,
  AlertTriangle, ChevronUp, ChevronDown, Repeat, Building2
} from 'lucide-react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';
import { fetchWithAuth } from '@/lib/fetch-client';
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

// ── Types ────────────────────────────────────────────────────────────────
interface DashboardData {
  kpis: {
    revenue: number;
    revenueChange: number;
    receivable: number;
    receivableCount: number;
    payables: number;
    payablesCount: number;
    cashBalance: number;
    customers: number;
    vendors: number;
    paymentsReceived: number;
    paymentsCount: number;
  };
  invoiceStatusData: { name: string; value: number; color: string }[];
  revenueData: { month: string; revenue: number; expenses: number }[];
  cashFlowData: { day: string; inflow: number; outflow: number }[];
  topCustomers: { name: string; revenue: number }[];
  recentInvoices: { id: string; customer: string; amount: number; status: string }[];
  alerts: { type: string; title: string; detail: number }[];
}

export default function DashboardPage() {
  const onboardingCheck = useOnboardingGuard();
  const { currency } = useOrganization();
  
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetchWithAuth(`/api/${orgSlug}/dashboard/kpis?range=${timeRange}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load dashboard');
        setData(json);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    if (orgSlug) load();
  }, [orgSlug, timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const revenueData = data?.revenueData || [];
  const invoiceStatusData = data?.invoiceStatusData || [];
  const cashFlowData = data?.cashFlowData || [];
  const topCustomersData = data?.topCustomers || [];
  const recentInvoices = data?.recentInvoices || [];
  const alerts = data?.alerts || [];
  const maxCustomerRevenue = topCustomersData.length > 0 ? topCustomersData[0].revenue : 1;

  const statusIconMap: Record<string, any> = { Paid: CheckCircle2, Overdue: AlertCircle, Pending: Clock };
  const statusColorMap: Record<string, string> = { Paid: 'green', Overdue: 'red', Pending: 'yellow' };

  return (
    <div className="space-y-6 pb-8">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here&apos;s your business overview</p>
        </div>
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <DollarSign className="h-6 w-6" />
            </div>
            {(kpis?.revenueChange ?? 0) !== 0 && (
              <div className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded-full">
                {(kpis?.revenueChange ?? 0) >= 0 ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span>{Math.abs(kpis?.revenueChange ?? 0).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-blue-100 text-sm font-medium mb-1">Total Revenue</p>
            <p className="text-xl font-bold break-words">{formatCurrency(kpis?.revenue || 0, currency)}</p>
            <p className="text-blue-100 text-xs mt-2">
              {(kpis?.revenueChange ?? 0) >= 0 ? '+' : ''}{(kpis?.revenueChange ?? 0).toFixed(1)}% from previous period
            </p>
          </div>
        </div>

        {/* Accounts Receivable */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-gray-600 text-sm font-medium mb-1">Accounts Receivable</p>
            <p className="text-xl font-bold text-gray-900 break-words">{formatCurrency(kpis?.receivable || 0, currency)}</p>
            <p className="text-gray-500 text-xs mt-2">{kpis?.receivableCount || 0} outstanding invoice{(kpis?.receivableCount || 0) !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Accounts Payable */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div>
            <p className="text-gray-600 text-sm font-medium mb-1">Accounts Payable</p>
            <p className="text-xl font-bold text-gray-900 break-words">{formatCurrency(kpis?.payables || 0, currency)}</p>
            <p className="text-gray-500 text-xs mt-2">{kpis?.payablesCount || 0} unpaid bill{(kpis?.payablesCount || 0) !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Cash Balance */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Banknote className="h-6 w-6" />
            </div>
          </div>
          <div>
            <p className="text-green-100 text-sm font-medium mb-1">Cash Balance</p>
            <p className="text-xl font-bold break-words">{formatCurrency(kpis?.cashBalance || 0, currency)}</p>
            <p className="text-green-100 text-xs mt-2">Across all bank accounts</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Revenue &amp; Expenses</h2>
              <p className="text-sm text-gray-500">Last 6 months</p>
            </div>
          </div>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number) => formatCurrency(value, currency)}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  fill="url(#colorRevenue)" 
                  strokeWidth={2}
                  name="Revenue"
                />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#ef4444" 
                  fill="url(#colorExpenses)" 
                  strokeWidth={2}
                  name="Expenses"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
              No revenue/expense data for this period
            </div>
          )}
        </div>

        {/* Invoice Status Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Invoice Status</h2>
            <p className="text-sm text-gray-500">Current breakdown</p>
          </div>
          {invoiceStatusData.some(s => s.value > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <RePieChart>
                  <Pie
                    data={invoiceStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {invoiceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value}%`} />
                </RePieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {invoiceStatusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
              No invoices found
            </div>
          )}
        </div>
      </div>

      {/* Second Row of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Cash Flow (Last 7 Days)</h2>
            <p className="text-sm text-gray-500">Payments received vs sent</p>
          </div>
          {cashFlowData.some(d => d.inflow > 0 || d.outflow > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => formatCurrency(value, currency)}
                />
                <Legend />
                <Bar dataKey="inflow" fill="#10b981" radius={[8, 8, 0, 0]} name="Inflow" />
                <Bar dataKey="outflow" fill="#ef4444" radius={[8, 8, 0, 0]} name="Outflow" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
              No payment activity in the last 7 days
            </div>
          )}
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Top Customers</h2>
            <p className="text-sm text-gray-500">By invoiced revenue this period</p>
          </div>
          {topCustomersData.length > 0 ? (
            <div className="space-y-4">
              {topCustomersData.map((customer, index) => (
                <div key={customer.name} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{customer.name}</p>
                    <div className="mt-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all"
                        style={{ width: `${(customer.revenue / maxCustomerRevenue) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    {formatCurrency(customer.revenue, currency)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
              No customer revenue data for this period
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section - Recent Activity & Quick Actions & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Recent Invoices
            </h2>
            <Link 
              href={`/${orgSlug}/accounts-receivable/invoices`}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {recentInvoices.length > 0 ? recentInvoices.map((invoice) => {
              const StatusIcon = statusIconMap[invoice.status] || Clock;
              const sColor = statusColorMap[invoice.status] || 'gray';
              return (
                <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 bg-${sColor}-100 rounded-lg flex items-center justify-center`}>
                      <StatusIcon className={`h-4 w-4 text-${sColor}-600`} />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-900">{invoice.id}</div>
                      <div className="text-xs text-gray-600">{invoice.customer}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-gray-900">{formatCurrency(invoice.amount, currency)}</div>
                    <div className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block ${
                      invoice.status === 'Paid' ? 'bg-green-100 text-green-700' :
                      invoice.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {invoice.status}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-8 text-gray-400 text-sm">No invoices yet</div>
            )}
          </div>
        </div>

        {/* Business Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              Business Overview
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {/* Net Position */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Repeat className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Net Position</p>
                  <p className="text-xs text-gray-400">Receivable − Payable</p>
                </div>
              </div>
              <span className={`text-sm font-bold ${((kpis?.receivable || 0) - (kpis?.payables || 0)) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency((kpis?.receivable || 0) - (kpis?.payables || 0), currency)}
              </span>
            </div>

            {/* Payments Received */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                  <Banknote className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Payments Received</p>
                  <p className="text-xs text-gray-400">{kpis?.paymentsCount || 0} payment{(kpis?.paymentsCount || 0) !== 1 ? 's' : ''} this period</p>
                </div>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(kpis?.paymentsReceived || 0, currency)}
              </span>
            </div>

            {/* Customers */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Active Customers</p>
                </div>
              </div>
              <span className="text-sm font-bold text-gray-900">{kpis?.customers || 0}</span>
            </div>

            {/* Vendors */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Active Vendors</p>
                </div>
              </div>
              <span className="text-sm font-bold text-gray-900">{kpis?.vendors || 0}</span>
            </div>

            {/* Outstanding Invoices + Bills summary */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Open Documents</p>
                  <p className="text-xs text-gray-400">{kpis?.receivableCount || 0} invoices · {kpis?.payablesCount || 0} bills</p>
                </div>
              </div>
              <span className="text-sm font-bold text-gray-900">{(kpis?.receivableCount || 0) + (kpis?.payablesCount || 0)}</span>
            </div>
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Alerts
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {alerts.length > 0 ? alerts.map((alert, idx) => {
              const isOverdue = alert.type === 'danger';
              const isWarning = alert.type === 'warning';
              const isInfo = alert.type === 'info';
              const bgCls = isOverdue ? 'bg-red-50 border-red-200' : isWarning ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200';
              const iconCls = isOverdue ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-blue-600';
              const titleCls = isOverdue ? 'text-red-900' : isWarning ? 'text-yellow-900' : 'text-blue-900';
              const detailCls = isOverdue ? 'text-red-700' : isWarning ? 'text-yellow-700' : 'text-blue-700';
              const AlertIcon = isOverdue ? AlertCircle : isWarning ? Clock : Target;
              return (
                <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${bgCls}`}>
                  <AlertIcon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconCls}`} />
                  <div>
                    <p className={`text-sm font-semibold ${titleCls}`}>{alert.title}</p>
                    <p className={`text-xs mt-1 ${detailCls}`}>
                      {isInfo ? `${alert.detail}% of previous period` : `Total: ${formatCurrency(alert.detail, currency)}`}
                    </p>
                  </div>
                </div>
              );
            }) : (
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900">All Clear</p>
                  <p className="text-xs text-green-700 mt-1">No urgent alerts at this time</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
