'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowDownLeft,
  ArrowUpRight,
  MoreHorizontal,
  Eye,
  Ban,
  Zap,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Filter,
  Smartphone,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';

// ──────────── Types ────────────

interface Payment {
  id: string;
  paymentNumber: string;
  paymentType: string;
  status: string;
  allocationStatus: string;
  paymentDate: string;
  amount: number;
  allocatedAmount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  mobileMoneyProvider: string | null;
  mobileMoneyTxnId: string | null;
  customer: { id: string; name: string } | null;
  vendor: { id: string; name: string } | null;
  bankAccount: { id: string; code: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  allocations: any[];
}

interface Stats {
  total: number;
  customerPaymentCount: number;
  customerPaymentAmount: number;
  vendorPaymentCount: number;
  vendorPaymentAmount: number;
  netCashFlow: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ──────────── Constants ────────────

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CHECK: 'Check',
  BANK_TRANSFER: 'Bank Transfer',
  CREDIT_CARD: 'Credit Card',
  DEBIT_CARD: 'Debit Card',
  MOBILE_MONEY: 'Mobile Money',
  ONLINE_PAYMENT: 'Online',
  OTHER: 'Other',
  // Legacy
  CARD: 'Card',
  ACH: 'ACH',
  WIRE: 'Wire',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  DRAFT: { label: 'Draft', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', icon: Clock },
  POSTED: { label: 'Posted', bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', icon: CheckCircle2 },
  CLEARED: { label: 'Cleared', bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', icon: CheckCircle2 },
  VOIDED: { label: 'Voided', bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', icon: XCircle },
};

const ALLOCATION_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  FULLY_APPLIED: { label: 'Fully Applied', bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300' },
  PARTIALLY_APPLIED: { label: 'Partial', bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300' },
  UNAPPLIED: { label: 'Unapplied', bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
};

// ──────────── Component ────────────

export default function PaymentsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const { currency } = useOrganization();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('paymentDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  // Action menu
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '25');
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      if (typeFilter !== 'all') params.append('paymentType', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (debouncedSearch) params.append('search', debouncedSearch);

      const response = await fetch(`/api/orgs/${orgSlug}/payments?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch payments');
      const data = await response.json();
      setPayments(data.payments || []);
      setStats(data.stats || null);
      setPagination(data.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 });
    } catch (err) {
      setError('Failed to load payments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, typeFilter, statusFilter, debouncedSearch, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [typeFilter, statusFilter, debouncedSearch]);

  // Sort toggle
  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  }

  // Void payment
  async function handleVoid(paymentId: string) {
    if (!confirm('Are you sure you want to void this payment? This will reverse the GL entries and remove all allocations.')) return;
    try {
      setVoidingId(paymentId);
      const response = await fetch(`/api/orgs/${orgSlug}/payments/${paymentId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Voided from payments list' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to void payment');
      }

      await fetchPayments();
    } catch (err: any) {
      alert(err.message || 'Failed to void payment');
    } finally {
      setVoidingId(null);
      setActiveMenu(null);
    }
  }

  // Auto-allocate
  async function handleAutoAllocate(paymentId: string) {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/payments/${paymentId}/auto-allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to auto-allocate');
      }
      const data = await response.json();
      alert(`Successfully allocated ${formatCurrency(data.allocated, currency)} across ${data.allocations.length} document(s).`);
      await fetchPayments();
    } catch (err: any) {
      alert(err.message || 'Failed to auto-allocate');
    } finally {
      setActiveMenu(null);
    }
  }

  // CSV export
  function exportCSV() {
    const headers = ['Date', 'Payment #', 'Direction', 'Customer/Vendor', 'Method', 'Reference', 'Status', 'Allocation', 'Amount'];
    const rows = payments.map((p) => [
      new Date(p.paymentDate).toLocaleDateString(),
      p.paymentNumber,
      p.paymentType === 'RECEIPT' ? 'Money In' : 'Money Out',
      p.customer?.name || p.vendor?.name || '',
      PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod,
      p.referenceNumber || '',
      p.status,
      p.allocationStatus,
      Number(p.amount).toFixed(2),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Close menu on outside click
  useEffect(() => {
    function handleClick() { setActiveMenu(null); }
    if (activeMenu) document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [activeMenu]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Customer receipts &amp; vendor payments</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${orgSlug}/payments/customer`}>
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium">
              <ArrowDownLeft className="w-4 h-4" /> Money In
            </button>
          </Link>
          <Link href={`/${orgSlug}/payments/vendor`}>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              <ArrowUpRight className="w-4 h-4" /> Money Out
            </button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                <ArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Money In</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(stats.customerPaymentAmount, currency)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats.customerPaymentCount} receipt{stats.customerPaymentCount !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <ArrowUpRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Money Out</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(stats.vendorPaymentAmount, currency)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats.vendorPaymentCount} payment{stats.vendorPaymentCount !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${stats.netCashFlow >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                {stats.netCashFlow >= 0
                  ? <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  : <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />}
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Cash Flow</span>
            </div>
            <p className={`text-2xl font-bold ${stats.netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(stats.netCashFlow, currency)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats.total} total payment{stats.total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Filters & Actions Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search payments, references, customers, vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Types</option>
            <option value="RECEIPT">Money In (Receipts)</option>
            <option value="PAYMENT">Money Out (Payments)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="POSTED">Posted</option>
            <option value="CLEARED">Cleared</option>
            <option value="VOIDED">Voided</option>
          </select>

          {/* Export */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-16">
            <DollarSign className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No payments found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              {search || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Record your first payment to get started'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button onClick={() => toggleSort('paymentDate')} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">
                        Date {sortBy === 'paymentDate' && <ArrowUpDown className="w-3 h-3" />}
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button onClick={() => toggleSort('paymentNumber')} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">
                        Payment # {sortBy === 'paymentNumber' && <ArrowUpDown className="w-3 h-3" />}
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Direction</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer / Vendor</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Allocation</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button onClick={() => toggleSort('amount')} className="flex items-center gap-1 ml-auto hover:text-gray-700 dark:hover:text-gray-200">
                        Amount {sortBy === 'amount' && <ArrowUpDown className="w-3 h-3" />}
                      </button>
                    </th>
                    <th className="py-3 px-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {payments.map((payment) => {
                    const isReceipt = payment.paymentType === 'RECEIPT';
                    const statusCfg = STATUS_CONFIG[payment.status] || STATUS_CONFIG.POSTED;
                    const allocCfg = ALLOCATION_CONFIG[payment.allocationStatus] || ALLOCATION_CONFIG.UNAPPLIED;
                    const StatusIcon = statusCfg.icon;
                    const isVoided = payment.status === 'VOIDED';

                    return (
                      <tr
                        key={payment.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${isVoided ? 'opacity-60' : ''}`}
                        onClick={() => router.push(`/${orgSlug}/payments/${payment.id}`)}
                      >
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-mono text-gray-900 dark:text-white">{payment.paymentNumber}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            isReceipt
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                              : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                          }`}>
                            {isReceipt ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {isReceipt ? 'Money In' : 'Money Out'}
                          </span>
                        </td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          {payment.customer ? (
                            <Link
                              href={`/${orgSlug}/accounts-receivable/customers/${payment.customer.id}`}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                              {payment.customer.name}
                            </Link>
                          ) : payment.vendor ? (
                            <Link
                              href={`/${orgSlug}/accounts-payable/vendors/${payment.vendor.id}`}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                              {payment.vendor.name}
                            </Link>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {payment.paymentMethod === 'MOBILE_MONEY' && (
                              <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                            )}
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod}
                            </span>
                          </div>
                          {payment.referenceNumber && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Ref: {payment.referenceNumber}</p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {!isVoided && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${allocCfg.bg} ${allocCfg.text}`}>
                              {allocCfg.label}
                            </span>
                          )}
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold text-sm ${
                          isVoided
                            ? 'text-gray-400 dark:text-gray-500 line-through'
                            : isReceipt
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-blue-600 dark:text-blue-400'
                        }`}>
                          {isReceipt ? '+' : '-'}{formatCurrency(payment.amount, currency)}
                        </td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenu(activeMenu === payment.id ? null : payment.id);
                              }}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4 text-gray-400" />
                            </button>
                            {activeMenu === payment.id && (
                              <div className="absolute right-0 top-8 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 w-48">
                                <button
                                  onClick={() => { router.push(`/${orgSlug}/payments/${payment.id}`); setActiveMenu(null); }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <Eye className="w-4 h-4" /> View Details
                                </button>
                                {!isVoided && payment.allocationStatus !== 'FULLY_APPLIED' && (
                                  <button
                                    onClick={() => handleAutoAllocate(payment.id)}
                                    className="w-full text-left px-4 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                  >
                                    <Zap className="w-4 h-4" /> Auto-Allocate (FIFO)
                                  </button>
                                )}
                                {!isVoided && !payment.isLocked && (
                                  <button
                                    onClick={() => handleVoid(payment.id)}
                                    disabled={voidingId === payment.id}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                  >
                                    <Ban className="w-4 h-4" />
                                    {voidingId === payment.id ? 'Voiding...' : 'Void Payment'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                    className="p-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
