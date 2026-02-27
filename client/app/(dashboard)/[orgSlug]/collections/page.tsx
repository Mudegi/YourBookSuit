'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';
import {
  ArrowLeft, AlertTriangle, TrendingDown, Users, DollarSign, FileText,
  Search, RefreshCw, Download, Mail, Phone, ChevronDown, ChevronUp,
  Eye, CreditCard, Clock, BarChart3, Shield, X, ExternalLink,
  Plus, CheckCircle2, MessageSquare, Calendar, Banknote,
} from 'lucide-react';
import Link from 'next/link';

/* ═══════════ TYPES ═══════════ */
interface AgingBucket {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  total: number;
}

interface CustomerAging extends AgingBucket {
  customerId: string;
  customerNumber: string;
  customerName: string;
  customerEmail: string | null;
  company: string | null;
  currency: string;
  creditLimit: number | null;
  invoiceCount: number;
}

interface AgingSummary extends AgingBucket {
  totalCustomers: number;
  atRiskCustomers: number;
  totalInvoices: number;
  overdueInvoices: number;
}

interface AgingData {
  summary: AgingSummary;
  customers: CustomerAging[];
}

/* ═══════════ CONSTANTS ═══════════ */
const BUCKET_CFG = [
  { key: 'current'  as const, label: 'Current',   field: 'current'   as const, color: 'green',  ring: 'ring-green-500',  bg: 'bg-green-50 dark:bg-green-900/20',  border: 'border-green-500',  text: 'text-green-700 dark:text-green-400'  },
  { key: '1-30'     as const, label: '1–30 Days',  field: 'days1to30' as const, color: 'yellow', ring: 'ring-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-500', text: 'text-yellow-700 dark:text-yellow-400' },
  { key: '31-60'    as const, label: '31–60 Days', field: 'days31to60' as const, color: 'orange', ring: 'ring-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-500', text: 'text-orange-700 dark:text-orange-400' },
  { key: '61-90'    as const, label: '61–90 Days', field: 'days61to90' as const, color: 'red',    ring: 'ring-red-500',    bg: 'bg-red-50 dark:bg-red-900/20',       border: 'border-red-500',    text: 'text-red-700 dark:text-red-400'       },
  { key: '90+'      as const, label: '90+ Days',   field: 'days90plus' as const, color: 'purple', ring: 'ring-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-500', text: 'text-purple-700 dark:text-purple-400' },
] as const;

type BucketKey = 'all' | 'current' | '1-30' | '31-60' | '61-90' | '90+';

const INPUT_CLS = 'px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

/* ═══════════ HELPER ═══════════ */
function getAmountTextSize(amount: number, cur: string): string {
  const formatted = formatCurrency(amount, cur);
  if (formatted.length > 15) return 'text-base';
  if (formatted.length > 12) return 'text-lg';
  if (formatted.length > 9) return 'text-xl';
  return 'text-2xl';
}

function pct(part: number, total: number): string {
  if (total === 0) return '0';
  return ((part / total) * 100).toFixed(1);
}

/* ═══════════ MAIN PAGE ═══════════ */
export default function CollectionsDashboard() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const { organization } = useOrganization();
  const baseCurrency = organization?.baseCurrency || 'USD';

  const [data, setData] = useState<AgingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBucket, setSelectedBucket] = useState<BucketKey>('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'name' | 'total' | '90+'>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  /* ── Fetch ── */
  const fetchAgingData = useCallback(async () => {
    if (!orgSlug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/collections/aging?asOfDate=${asOfDate}`);
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      if (json.success) setData(json.data);
      else throw new Error(json.error || 'Unknown error');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, asOfDate]);

  useEffect(() => { fetchAgingData(); }, [fetchAgingData]);

  /* ── Derived Data ── */
  const filteredCustomers = useMemo(() => {
    if (!data) return [];
    let list = data.customers;

    // Bucket filter
    if (selectedBucket !== 'all') {
      const cfg = BUCKET_CFG.find(b => b.key === selectedBucket);
      if (cfg) list = list.filter(c => c[cfg.field] > 0);
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.customerName.toLowerCase().includes(q) ||
        c.customerNumber.toLowerCase().includes(q) ||
        (c.customerEmail || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q)
      );
    }

    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.customerName.localeCompare(b.customerName);
      else if (sortField === 'total') cmp = a.total - b.total;
      else if (sortField === '90+') cmp = a.days90plus - b.days90plus;
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [data, selectedBucket, search, sortField, sortDir]);

  const dso = useMemo(() => {
    if (!data || data.summary.total === 0) return 0;
    // Weighted DSO = sum of (bucket_midpoint * bucket_amount) / total
    const s = data.summary;
    const weighted =
      (s.current * 0) +
      (s.days1to30 * 15) +
      (s.days31to60 * 45) +
      (s.days61to90 * 75) +
      (s.days90plus * 120);
    return Math.round(weighted / s.total);
  }, [data]);

  const overdueTotal = useMemo(() => {
    if (!data) return 0;
    const s = data.summary;
    return s.days1to30 + s.days31to60 + s.days61to90 + s.days90plus;
  }, [data]);

  /* ── Handlers ── */
  const handleViewStatement = (customerId: string) => {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 3);
    window.open(
      `/api/orgs/${orgSlug}/customers/${customerId}/statement?fromDate=${fromDate.toISOString().split('T')[0]}&toDate=${toDate.toISOString().split('T')[0]}`,
      '_blank'
    );
  };

  const handleExportCSV = () => {
    if (!filteredCustomers.length) return;
    const headers = ['Customer', 'Number', 'Current', '1-30', '31-60', '61-90', '90+', 'Total', 'Invoices'];
    const rows = filteredCustomers.map(c => [
      c.customerName, c.customerNumber,
      c.current.toFixed(2), c.days1to30.toFixed(2), c.days31to60.toFixed(2),
      c.days61to90.toFixed(2), c.days90plus.toFixed(2), c.total.toFixed(2),
      c.invoiceCount.toString(),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aged-receivables-${asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3 inline" /> : <ChevronUp className="w-3 h-3 inline" />) : null;

  /* ── Loading / Error ── */
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading collections data...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-16 space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
        <button onClick={fetchAgingData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const s = data.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Collections Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Aged receivables &amp; cash recovery tracking — as of {new Date(asOfDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)}
            className={INPUT_CLS} />
          <button onClick={handleExportCSV} title="Export CSV"
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={fetchAgingData} title="Refresh"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Outstanding</p>
              <p className={`${getAmountTextSize(s.total, baseCurrency)} font-bold text-gray-900 dark:text-white mt-1`}>
                {formatCurrency(s.total, baseCurrency)}
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Overdue Amount</p>
              <p className={`${getAmountTextSize(overdueTotal, baseCurrency)} font-bold text-red-600 dark:text-red-400 mt-1`}>
                {formatCurrency(overdueTotal, baseCurrency)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{s.overdueInvoices} invoices</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">DSO (Days Sales Outstanding)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{dso} days</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.totalCustomers} customers</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">At Risk Customers</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{s.atRiskCustomers}</p>
              <p className="text-xs text-gray-400 mt-0.5">of {s.totalCustomers} total</p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
              <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Aging Breakdown with Bar Chart */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" /> Aging Breakdown
          </h2>
          <button onClick={() => setSelectedBucket('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedBucket === 'all'
                ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}>
            Show All
          </button>
        </div>

        {/* Stacked Bar Visualization */}
        {s.total > 0 && (
          <div className="mb-5">
            <div className="flex h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
              {BUCKET_CFG.map(b => {
                const val = s[b.field];
                const width = (val / s.total) * 100;
                if (width < 0.5) return null;
                const colors: Record<string, string> = {
                  green: 'bg-green-500', yellow: 'bg-yellow-500', orange: 'bg-orange-500',
                  red: 'bg-red-500', purple: 'bg-purple-500',
                };
                return (
                  <button key={b.key} onClick={() => setSelectedBucket(selectedBucket === b.key ? 'all' : b.key)}
                    className={`${colors[b.color]} hover:opacity-80 transition-opacity relative group`}
                    style={{ width: `${width}%` }} title={`${b.label}: ${formatCurrency(val, baseCurrency)} (${pct(val, s.total)}%)`}>
                    {width > 8 && (
                      <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold">
                        {pct(val, s.total)}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 flex-wrap">
              {BUCKET_CFG.map(b => (
                <div key={b.key} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <div className={`w-2.5 h-2.5 rounded-full bg-${b.color}-500`} />
                  {b.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bucket Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {BUCKET_CFG.map(b => {
            const val = s[b.field];
            const active = selectedBucket === b.key;
            return (
              <button key={b.key}
                onClick={() => setSelectedBucket(active ? 'all' : b.key)}
                className={`p-4 border-2 rounded-xl transition-all text-left ${
                  active ? `${b.border} ${b.bg} ${b.ring} ring-1` : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                } bg-white dark:bg-gray-900`}>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{b.label}</p>
                <p className={`${getAmountTextSize(val, baseCurrency)} font-bold ${b.text} mt-1`}>
                  {formatCurrency(val, baseCurrency)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{pct(val, s.total)}% of total</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Customer Aging Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Customer Aging ({filteredCustomers.length})
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search customers..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className={`${INPUT_CLS} pl-10 w-64`} />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => toggleSort('name')}>
                  Customer <SortIcon field="name" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Current</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">1–30</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">31–60</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">61–90</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => toggleSort('90+')}>
                  90+ <SortIcon field="90+" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => toggleSort('total')}>
                  Total <SortIcon field="total" />
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredCustomers.map((customer) => {
                const overdueAmt = customer.days1to30 + customer.days31to60 + customer.days61to90 + customer.days90plus;
                const isAtRisk = customer.days90plus > 0;
                const creditUsed = customer.creditLimit ? (customer.total / customer.creditLimit) * 100 : null;
                const isExpanded = expandedCustomer === customer.customerId;

                return (
                  <tr key={customer.customerId}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                      isAtRisk ? 'bg-red-50/30 dark:bg-red-900/5' : ''
                    }`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <Link href={`/${orgSlug}/accounts-receivable/customers/${customer.customerId}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm">
                            {customer.customerName}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 dark:text-gray-400">{customer.customerNumber}</span>
                            <span className="text-xs text-gray-400">&bull; {customer.invoiceCount} inv.</span>
                            {creditUsed !== null && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                creditUsed > 90 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                  : creditUsed > 70 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                              }`}>
                                {creditUsed.toFixed(0)}% credit
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-gray-200">
                      {customer.current > 0 ? formatCurrency(customer.current, baseCurrency) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-yellow-700 dark:text-yellow-400">
                      {customer.days1to30 > 0 ? formatCurrency(customer.days1to30, baseCurrency) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-orange-700 dark:text-orange-400">
                      {customer.days31to60 > 0 ? formatCurrency(customer.days31to60, baseCurrency) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-red-700 dark:text-red-400">
                      {customer.days61to90 > 0 ? formatCurrency(customer.days61to90, baseCurrency) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-purple-700 dark:text-purple-400">
                      {customer.days90plus > 0 ? formatCurrency(customer.days90plus, baseCurrency) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(customer.total, baseCurrency)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleViewStatement(customer.customerId)}
                          title="View Statement"
                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <Link href={`/${orgSlug}/payments?customerId=${customer.customerId}`}
                          title="Record Payment"
                          className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
                          <Banknote className="w-3.5 h-3.5" />
                        </Link>
                        {customer.customerEmail && (
                          <a href={`mailto:${customer.customerEmail}?subject=Payment Reminder&body=Dear ${customer.customerName},%0A%0AThis is a gentle reminder regarding your outstanding balance of ${formatCurrency(customer.total, baseCurrency)}.%0A%0APlease arrange payment at your earliest convenience.%0A%0AThank you.`}
                            title="Send Reminder Email"
                            className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <Link href={`/${orgSlug}/accounts-receivable/customers/${customer.customerId}`}
                          title="View Customer Profile"
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    {search ? (
                      <div className="text-gray-500 dark:text-gray-400">
                        <Search className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm">No customers match &ldquo;{search}&rdquo;</p>
                      </div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-400" />
                        <p className="font-medium">All clear!</p>
                        <p className="text-sm mt-1">No outstanding receivables in this bucket.</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>

            {/* Table Footer Totals */}
            {filteredCustomers.length > 0 && (
              <tfoot className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <tr className="font-semibold text-sm">
                  <td className="px-4 py-3 text-gray-900 dark:text-white">
                    Totals ({filteredCustomers.length} customers)
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-200">
                    {formatCurrency(filteredCustomers.reduce((s, c) => s + c.current, 0), baseCurrency)}
                  </td>
                  <td className="px-4 py-3 text-right text-yellow-700 dark:text-yellow-400">
                    {formatCurrency(filteredCustomers.reduce((s, c) => s + c.days1to30, 0), baseCurrency)}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-700 dark:text-orange-400">
                    {formatCurrency(filteredCustomers.reduce((s, c) => s + c.days31to60, 0), baseCurrency)}
                  </td>
                  <td className="px-4 py-3 text-right text-red-700 dark:text-red-400">
                    {formatCurrency(filteredCustomers.reduce((s, c) => s + c.days61to90, 0), baseCurrency)}
                  </td>
                  <td className="px-4 py-3 text-right text-purple-700 dark:text-purple-400">
                    {formatCurrency(filteredCustomers.reduce((s, c) => s + c.days90plus, 0), baseCurrency)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                    {formatCurrency(filteredCustomers.reduce((s, c) => s + c.total, 0), baseCurrency)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href={`/${orgSlug}/accounts-receivable/invoices?status=OVERDUE`}
          className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg group-hover:bg-red-100 dark:group-hover:bg-red-900/30">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Overdue Invoices</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{s.overdueInvoices} invoices need attention</div>
          </div>
        </Link>

        <Link href={`/${orgSlug}/payments`}
          className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-green-300 dark:hover:border-green-700 transition-colors group">
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg group-hover:bg-green-100 dark:group-hover:bg-green-900/30">
            <Banknote className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Record Payment</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Apply customer payments to invoices</div>
          </div>
        </Link>

        <Link href={`/${orgSlug}/accounts-receivable/statements/new`}
          className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Generate Statements</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Send account statements to customers</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
