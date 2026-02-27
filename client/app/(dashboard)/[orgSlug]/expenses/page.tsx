'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Plus,
  Receipt,
  Filter,
  DollarSign,
  TrendingUp,
  Wallet,
  Eye,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  XCircle,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Ban,
  MoreHorizontal,
  ArrowUpDown,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';

// ──────────── Types ────────────
interface Expense {
  id: string;
  transactionNumber: string;
  transactionDate: string;
  description: string;
  status: 'DRAFT' | 'POSTED' | 'VOIDED' | 'CANCELLED';
  referenceId?: string;
  metadata?: {
    payeeName?: string;
    payeeVendorId?: string;
    paymentMethod?: string;
    mobileMoneyProvider?: string;
    mobileMoneyTransactionId?: string;
    isReimbursement?: boolean;
    totalGross?: number;
    totalTax?: number;
    whtAmount?: number;
    referenceNumber?: string;
    receiptAttachmentId?: string;
  };
  calculatedTotal: number;
  ledgerEntries?: any[];
  createdBy?: { firstName?: string; lastName?: string; email: string };
}

type SortField = 'date' | 'amount' | 'payee' | 'reference';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 25;

// ──────────── Status helpers ────────────
const statusConfig: Record<string, { label: string; colors: string; icon: any }> = {
  DRAFT: { label: 'Draft', colors: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  POSTED: { label: 'Posted', colors: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  VOIDED: { label: 'Voided', colors: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: Ban },
  CANCELLED: { label: 'Cancelled', colors: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.DRAFT;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.colors}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function PaymentMethodBadge({ method, provider }: { method?: string; provider?: string }) {
  if (!method) return <span className="text-gray-400 dark:text-gray-500">—</span>;
  const label = method.replace(/_/g, ' ');
  return (
    <span className="inline-flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
      <Wallet className="h-3.5 w-3.5" />
      {label}
      {provider && <span className="text-xs text-gray-500 dark:text-gray-400">({provider})</span>}
    </span>
  );
}

// ──────────── Main Page ────────────
export default function ExpenseListPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const { organization } = useOrganization();
  const currency = organization?.baseCurrency || 'UGX';

  // Data
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState(''); // reimbursement filter

  // Pagination & sort
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // UI
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // ── Load data ──
  useEffect(() => {
    loadExpenses();
    loadSummary();
  }, [orgSlug, startDate, endDate, paymentMethod, statusFilter, typeFilter]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const qp = new URLSearchParams();
      if (startDate) qp.append('startDate', startDate);
      if (endDate) qp.append('endDate', endDate);
      if (paymentMethod) qp.append('paymentMethod', paymentMethod);
      if (typeFilter) qp.append('isReimbursement', typeFilter);

      const res = await fetch(`/api/orgs/${orgSlug}/expenses?${qp}`);
      const data = await res.json();
      if (data.success) setExpenses(data.expenses || []);
    } catch (e) {
      console.error('Error loading expenses:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const qp = new URLSearchParams({ startDate, endDate, groupBy: 'CATEGORY' });
      const res = await fetch(`/api/orgs/${orgSlug}/expenses/summary?${qp}`);
      const data = await res.json();
      if (data.success) setSummary(data.summary || []);
    } catch (e) {
      console.error('Error loading summary:', e);
    }
  };

  // ── Derived/computed ──
  const activeExpenses = useMemo(() => expenses.filter(e => e.status !== 'VOIDED' && e.status !== 'CANCELLED'), [expenses]);

  const totalExpenses = useMemo(
    () => activeExpenses.reduce((s, e) => s + (parseFloat(String(e.calculatedTotal)) || 0), 0),
    [activeExpenses]
  );

  const reimbursementCount = useMemo(
    () => activeExpenses.filter(e => e.metadata?.isReimbursement).length,
    [activeExpenses]
  );

  const reimbursementTotal = useMemo(
    () => activeExpenses.filter(e => e.metadata?.isReimbursement)
      .reduce((s, e) => s + (parseFloat(String(e.calculatedTotal)) || 0), 0),
    [activeExpenses]
  );

  // Sort + search + status filter
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    // Status filter
    if (statusFilter) result = result.filter(e => e.status === statusFilter);

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        (e.metadata?.payeeName || e.description || '').toLowerCase().includes(q) ||
        (e.referenceId || e.metadata?.referenceNumber || e.transactionNumber || '').toLowerCase().includes(q) ||
        String(e.calculatedTotal).includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date':
          cmp = new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
          break;
        case 'amount':
          cmp = (parseFloat(String(a.calculatedTotal)) || 0) - (parseFloat(String(b.calculatedTotal)) || 0);
          break;
        case 'payee':
          cmp = (a.metadata?.payeeName || a.description || '').localeCompare(b.metadata?.payeeName || b.description || '');
          break;
        case 'reference':
          cmp = (a.referenceId || a.transactionNumber || '').localeCompare(b.referenceId || b.transactionNumber || '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [expenses, search, statusFilter, sortField, sortDir]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));
  const paginatedExpenses = useMemo(
    () => filteredExpenses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredExpenses, page]
  );

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter, sortField, sortDir]);

  // ── Sort toggle ──
  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  }, [sortField]);

  // ── Void expense ──
  const handleVoid = async (expenseId: string) => {
    if (!confirm('Are you sure you want to void this expense? This will reverse the GL entries.')) return;
    setVoidingId(expenseId);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/expenses/${expenseId}/void`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await loadExpenses();
      } else {
        alert(data.error || 'Failed to void expense');
      }
    } catch (e) {
      alert('Failed to void expense');
    } finally {
      setVoidingId(null);
      setActionMenuId(null);
    }
  };

  // ── Export CSV ──
  const exportCSV = useCallback(() => {
    const rows = filteredExpenses.map(e => ({
      Date: new Date(e.transactionDate).toLocaleDateString(),
      Reference: e.referenceId || e.metadata?.referenceNumber || e.transactionNumber,
      Payee: e.metadata?.payeeName || e.description,
      'Payment Method': e.metadata?.paymentMethod?.replace(/_/g, ' ') || '',
      Status: e.status,
      Type: e.metadata?.isReimbursement ? 'Reimbursement' : 'Direct Payment',
      Amount: parseFloat(String(e.calculatedTotal || 0)).toFixed(2),
      Tax: (e.metadata?.totalTax || 0).toFixed(2),
    }));
    const header = Object.keys(rows[0] || {}).join(',');
    const csv = [header, ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredExpenses, startDate, endDate]);

  // ── SortableHeader component ──
  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      onClick={() => toggleSort(field)}
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown className={`h-3 w-3 ${sortField === field ? 'text-blue-500' : 'text-gray-400'}`} />
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Operational expenditure tracking & management</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={filteredExpenses.length === 0}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => router.push(`/${orgSlug}/expenses/new`)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 font-medium"
          >
            <Plus className="h-4 w-4" />
            Record Expense
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Expenses</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(totalExpenses, currency)}
              </p>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Count */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Transactions</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{activeExpenses.length}</p>
            </div>
            <div className="p-2.5 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Average */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Average</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(activeExpenses.length > 0 ? totalExpenses / activeExpenses.length : 0, currency)}
              </p>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Pending Reimbursements */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reimbursements</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {reimbursementCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {formatCurrency(reimbursementTotal, currency)}
              </p>
            </div>
            <div className="p-2.5 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
              <RotateCcw className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Search + Filter Bar ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by payee, reference, amount..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Quick status pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['', 'POSTED', 'VOIDED'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {s === '' ? 'All' : statusConfig[s]?.label || s}
              </button>
            ))}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition-colors ${
                showFilters
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Filter className="h-3 w-3" />
              Filters
            </button>
          </div>
        </div>

        {/* Extended filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
              <input
                type="date"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End Date</label>
              <input
                type="date"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Payment Method</label>
              <select
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="">All Methods</option>
                <option value="CASH">Cash</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="PETTY_CASH">Petty Cash</option>
                <option value="DIRECTORS_LOAN">Directors Loan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
              <select
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="true">Reimbursements</option>
                <option value="false">Direct Payments</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Table ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Table header bar */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} found
            {search && <span className="ml-1 text-blue-600 dark:text-blue-400">matching &ldquo;{search}&rdquo;</span>}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Loading expenses...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">No expenses found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {search ? 'Try adjusting your search or filters' : 'Record your first expense to get started'}
            </p>
            {!search && (
              <button
                onClick={() => router.push(`/${orgSlug}/expenses/new`)}
                className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Record Expense
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <SortHeader field="date">Date</SortHeader>
                    <SortHeader field="reference">Reference</SortHeader>
                    <SortHeader field="payee">Payee</SortHeader>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                    <SortHeader field="amount">Amount</SortHeader>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {paginatedExpenses.map((expense) => {
                    const isVoided = expense.status === 'VOIDED' || expense.status === 'CANCELLED';
                    return (
                      <tr
                        key={expense.id}
                        className={`transition-colors ${
                          isVoided
                            ? 'bg-gray-50/50 dark:bg-gray-900/20 opacity-60'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {new Date(expense.transactionDate).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => router.push(`/${orgSlug}/expenses/${expense.id}`)}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {expense.referenceId || expense.metadata?.referenceNumber || expense.transactionNumber}
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 max-w-[200px] truncate">
                          {expense.metadata?.payeeName || expense.description}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <PaymentMethodBadge
                            method={expense.metadata?.paymentMethod}
                            provider={expense.metadata?.mobileMoneyProvider}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={expense.status} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {expense.metadata?.isReimbursement ? (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-full text-xs font-medium">
                              Reimbursement
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                              Direct
                            </span>
                          )}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold ${isVoided ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                          {formatCurrency(expense.calculatedTotal, currency)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center relative">
                          <button
                            onClick={() => setActionMenuId(actionMenuId === expense.id ? null : expense.id)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {actionMenuId === expense.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
                              <div className="absolute right-4 top-full mt-1 z-20 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1">
                                <button
                                  onClick={() => { setActionMenuId(null); router.push(`/${orgSlug}/expenses/${expense.id}`); }}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <Eye className="h-3.5 w-3.5" /> View Details
                                </button>
                                {expense.status === 'POSTED' && (
                                  <button
                                    onClick={() => handleVoid(expense.id)}
                                    disabled={voidingId === expense.id}
                                    className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                  >
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    {voidingId === expense.id ? 'Voiding...' : 'Void Expense'}
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filteredExpenses.length)} of {filteredExpenses.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-600 dark:text-gray-400"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (page <= 3) pageNum = i + 1;
                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = page - 2 + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-2.5 py-1 rounded text-xs font-medium ${
                          page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-600 dark:text-gray-400"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Top Categories Breakdown ── */}
      {summary && summary.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Expense by Category</h2>
          <div className="space-y-3">
            {summary.slice(0, 5).map((item: any) => {
              const pct = totalExpenses > 0 ? (item.total / totalExpenses) * 100 : 0;
              return (
                <div key={item.key}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(item.total, currency)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
