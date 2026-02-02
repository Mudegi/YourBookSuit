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

type Kpis = {
  revenue: number;
  payables: number;
  payments: number;
  invoices: number;
  bills: number;
  paymentsCount: number;
  customers: number;
  vendors: number;
  cashBalance: number;
};

// Sample data for charts
const revenueData = [
  { month: 'Jan', revenue: 45000, expenses: 28000, profit: 17000 },
  { month: 'Feb', revenue: 52000, expenses: 31000, profit: 21000 },
  { month: 'Mar', revenue: 48000, expenses: 29000, profit: 19000 },
  { month: 'Apr', revenue: 61000, expenses: 35000, profit: 26000 },
  { month: 'May', revenue: 55000, expenses: 32000, profit: 23000 },
  { month: 'Jun', revenue: 67000, expenses: 38000, profit: 29000 },
];

const invoiceStatusData = [
  { name: 'Paid', value: 65, color: '#10b981' },
  { name: 'Pending', value: 25, color: '#f59e0b' },
  { name: 'Overdue', value: 10, color: '#ef4444' },
];

const topCustomersData = [
  { name: 'Acme Corp', revenue: 45200 },
  { name: 'TechStart Inc', revenue: 38900 },
  { name: 'Global Solutions', revenue: 32100 },
  { name: 'Design Studio', revenue: 28500 },
  { name: 'Innovation Labs', revenue: 24700 },
];

const cashFlowData = [
  { day: 'Mon', inflow: 12000, outflow: 8000 },
  { day: 'Tue', inflow: 15000, outflow: 9500 },
  { day: 'Wed', inflow: 10000, outflow: 11000 },
  { day: 'Thu', inflow: 18000, outflow: 10500 },
  { day: 'Fri', inflow: 14000, outflow: 9000 },
  { day: 'Sat', inflow: 8000, outflow: 5000 },
  { day: 'Sun', inflow: 6000, outflow: 4000 },
];

export default function DashboardPage() {
  const onboardingCheck = useOnboardingGuard();
  const { currency } = useOrganization();
  
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const [stats, setStats] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchWithAuth(`/api/${orgSlug}/dashboard/kpis`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load KPIs');
        setStats(data.kpis);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    if (orgSlug) load();
  }, [orgSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your business overview</p>
        </div>
        <div className="flex items-center gap-2">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range as any)}
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
            <div className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded-full">
              <ChevronUp className="h-4 w-4" />
              <span>12.5%</span>
            </div>
          </div>
          <div>
            <p className="text-blue-100 text-sm font-medium mb-1">Total Revenue</p>
            <p className="text-xl font-bold break-words">{formatCurrency(stats?.revenue || 0, currency)}</p>
            <p className="text-blue-100 text-xs mt-2">+{formatCurrency(5400, currency)} from last period</p>
          </div>
        </div>

        {/* Accounts Receivable */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <ChevronUp className="h-4 w-4" />
              <span>8.2%</span>
            </div>
          </div>
          <div>
            <p className="text-gray-600 text-sm font-medium mb-1">Accounts Receivable</p>
            <p className="text-xl font-bold text-gray-900 break-words">{formatCurrency(42300, currency)}</p>
            <p className="text-gray-500 text-xs mt-2">{stats?.invoices || 0} outstanding invoices</p>
          </div>
        </div>

        {/* Accounts Payable */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex items-center gap-1 text-sm text-red-600 bg-red-50 px-2 py-1 rounded-full">
              <ChevronDown className="h-4 w-4" />
              <span>3.1%</span>
            </div>
          </div>
          <div>
            <p className="text-gray-600 text-sm font-medium mb-1">Accounts Payable</p>
            <p className="text-xl font-bold text-gray-900 break-words">{formatCurrency(stats?.payables || 0, currency)}</p>
            <p className="text-gray-500 text-xs mt-2">{stats?.bills || 0} unpaid bills</p>
          </div>
        </div>

        {/* Cash Balance */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Banknote className="h-6 w-6" />
            </div>
            <div className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded-full">
              <ChevronUp className="h-4 w-4" />
              <span>15.3%</span>
            </div>
          </div>
          <div>
            <p className="text-green-100 text-sm font-medium mb-1">Cash Balance</p>
            <p className="text-xl font-bold break-words">{formatCurrency(stats?.cashBalance || 0, currency)}</p>
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
              <h2 className="text-lg font-bold text-gray-900">Revenue & Expenses</h2>
              <p className="text-sm text-gray-500">Monthly comparison</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-lg hover:bg-gray-50">
                Month
              </button>
              <button className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-lg hover:bg-gray-50">
                Quarter
              </button>
              <button className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-lg hover:bg-gray-50">
                Year
              </button>
            </div>
          </div>
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
        </div>

        {/* Invoice Status Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Invoice Status</h2>
            <p className="text-sm text-gray-500">Current period breakdown</p>
          </div>
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
              <Tooltip />
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
        </div>
      </div>

      {/* Second Row of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Cash Flow (Weekly)</h2>
            <p className="text-sm text-gray-500">Inflow vs Outflow</p>
          </div>
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
              />
              <Legend />
              <Bar dataKey="inflow" fill="#10b981" radius={[8, 8, 0, 0]} name="Inflow" />
              <Bar dataKey="outflow" fill="#ef4444" radius={[8, 8, 0, 0]} name="Outflow" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Top Customers</h2>
            <p className="text-sm text-gray-500">By revenue this period</p>
          </div>
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
                      style={{ width: `${(customer.revenue / 45200) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {formatCurrency(customer.revenue, currency)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section - Recent Activity & Quick Actions */}
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
            {[
              { id: 'INV-2026-0012', customer: 'Acme Corp', amount: 5200, status: 'Paid', icon: CheckCircle2, statusColor: 'green' },
              { id: 'INV-2026-0011', customer: 'Tech Solutions', amount: 3400, status: 'Pending', icon: Clock, statusColor: 'yellow' },
              { id: 'INV-2026-0010', customer: 'Design Co', amount: 1800, status: 'Overdue', icon: AlertCircle, statusColor: 'red' },
            ].map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 bg-${invoice.statusColor}-100 rounded-lg flex items-center justify-center`}>
                    <invoice.icon className={`h-4 w-4 text-${invoice.statusColor}-600`} />
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
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/${orgSlug}/accounts-receivable/invoices/new`}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg border border-blue-200 transition group"
            >
              <FileText className="h-8 w-8 text-blue-600 mb-2 group-hover:scale-110 transition" />
              <span className="text-sm font-semibold text-gray-900">New Invoice</span>
            </Link>
            <Link
              href={`/${orgSlug}/accounts-payable/bills/new`}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 rounded-lg border border-red-200 transition group"
            >
              <CreditCard className="h-8 w-8 text-red-600 mb-2 group-hover:scale-110 transition" />
              <span className="text-sm font-semibold text-gray-900">New Bill</span>
            </Link>
            <Link
              href={`/${orgSlug}/accounts-receivable/customers`}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-lg border border-purple-200 transition group"
            >
              <Users className="h-8 w-8 text-purple-600 mb-2 group-hover:scale-110 transition" />
              <span className="text-sm font-semibold text-gray-900">Add Customer</span>
            </Link>
            <Link
              href={`/${orgSlug}/reports`}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-lg border border-green-200 transition group"
            >
              <BarChart3 className="h-8 w-8 text-green-600 mb-2 group-hover:scale-110 transition" />
              <span className="text-sm font-semibold text-gray-900">View Reports</span>
            </Link>
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
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">5 Overdue Invoices</p>
                <p className="text-xs text-red-700 mt-1">Total: {formatCurrency(12400, currency)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-900">3 Bills Due Soon</p>
                <p className="text-xs text-yellow-700 mt-1">Due in next 7 days</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Target className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Revenue Goal</p>
                <p className="text-xs text-blue-700 mt-1">85% of monthly target achieved</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
