'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Search, Filter, ChevronDown, ChevronLeft, ChevronRight,
  RefreshCw, FileSpreadsheet, Package, ArrowUpRight, ArrowDownRight,
  Truck, RotateCcw, Wrench, AlertTriangle, ShoppingCart, Undo2,
  Box, Building2, Calendar, User, ExternalLink, Minus, TrendingUp,
  TrendingDown, Activity, ClipboardList,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';

/* ─────────── Types ─────────── */

interface Movement {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  unitAbbreviation: string;
  movementType: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  balanceAfter: number | null;
  warehouseLocation: string;
  branchId: string | null;
  branchName: string | null;
  branchCode: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  performedById: string | null;
  referenceType: string | null;
  referenceId: string | null;
  referenceNumber: string | null;
  notes: string | null;
  movementDate: string;
  transferGroupId: string | null;
  createdAt: string;
}

interface Branch {
  id: string;
  code: string;
  name: string;
}

interface Stats {
  byType: Record<string, { count: number; quantity: number; value: number }>;
  totalMovements: number;
  recentMovements: number;
  totalStockIn: number;
  totalStockOut: number;
}

/* ─────────── Movement Type Config ─────────── */

const TYPE_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  bgColor: string;
  textColor: string;
  direction: 'in' | 'out' | 'both';
}> = {
  PURCHASE:   { label: 'Purchase',   icon: ShoppingCart,   bgColor: 'bg-green-100 dark:bg-green-900/40',   textColor: 'text-green-700 dark:text-green-400',   direction: 'in'  },
  SALE:       { label: 'Sale',       icon: ArrowUpRight,   bgColor: 'bg-red-100 dark:bg-red-900/40',       textColor: 'text-red-700 dark:text-red-400',       direction: 'out' },
  ADJUSTMENT: { label: 'Adjustment', icon: Wrench,         bgColor: 'bg-amber-100 dark:bg-amber-900/40',   textColor: 'text-amber-700 dark:text-amber-400',   direction: 'both'},
  TRANSFER:   { label: 'Transfer',   icon: Truck,          bgColor: 'bg-blue-100 dark:bg-blue-900/40',     textColor: 'text-blue-700 dark:text-blue-400',     direction: 'both'},
  RETURN:     { label: 'Return',     icon: Undo2,          bgColor: 'bg-purple-100 dark:bg-purple-900/40', textColor: 'text-purple-700 dark:text-purple-400', direction: 'in'  },
  WRITE_OFF:  { label: 'Write-Off',  icon: AlertTriangle,  bgColor: 'bg-gray-100 dark:bg-gray-800',        textColor: 'text-gray-700 dark:text-gray-400',     direction: 'out' },
};

/* ─────────── Reference Link Helper ─────────── */

function getReferenceLink(orgSlug: string, type: string | null, id: string | null): string | null {
  if (!type || !id) return null;
  const map: Record<string, string> = {
    INVOICE: `/${orgSlug}/sales/invoices/${id}`,
    BILL: `/${orgSlug}/purchases/bills/${id}`,
    GRN: `/${orgSlug}/inventory/goods-receipts/${id}`,
    PURCHASE_ORDER: `/${orgSlug}/purchases/purchase-orders/${id}`,
    CREDIT_NOTE: `/${orgSlug}/sales/credit-notes/${id}`,
    TRANSFER: `/${orgSlug}/inventory/inter-branch-transfers`,
  };
  return map[type] || null;
}

/* ─────────── Component ─────────── */

export default function StockMovementsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const { currency: orgCurrency } = useOrganization();
  const baseCurrency = orgCurrency || 'UGX';

  // ── State ──
  const [movements, setMovements] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);

  // ── Load branches ──
  useEffect(() => {
    fetch(`/api/${orgSlug}/branches`)
      .then((r) => r.json())
      .then((d) => {
        const list = d.branches || d.data || [];
        setBranches(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, [orgSlug]);

  // ── Load stats ──
  useEffect(() => {
    fetch(`/api/orgs/${orgSlug}/inventory/movements?mode=stats`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setStats(d.stats); })
      .catch(() => {});
  }, [orgSlug]);

  // ── Load movements ──
  const fetchMovements = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const qs = new URLSearchParams({ page: String(page), limit: '50' });
      if (search) qs.set('search', search);
      if (typeFilter) qs.set('movementType', typeFilter);
      if (branchFilter) qs.set('branchId', branchFilter);
      if (startDate) qs.set('startDate', startDate);
      if (endDate) qs.set('endDate', endDate);

      const res = await fetch(`/api/orgs/${orgSlug}/inventory/movements?${qs}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load');

      setMovements(data.movements || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, page, search, typeFilter, branchFilter, startDate, endDate]);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  // ── Export CSV ──
  const exportCSV = () => {
    const header = ['Date', 'Product', 'SKU', 'Type', 'Qty', 'Unit Cost', 'Total', 'Balance', 'Branch', 'Location', 'Reference', 'Notes'];
    const rows = movements.map((m) => [
      new Date(m.movementDate).toLocaleString(),
      m.productName,
      m.productSku,
      m.movementType,
      String(m.quantity),
      String(m.unitCost),
      String(m.totalCost),
      m.balanceAfter != null ? String(m.balanceAfter) : '',
      m.branchName || '',
      m.warehouseLocation,
      m.referenceNumber || '',
      m.notes || '',
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-movements-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ─────────── Render ─────────── */

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${orgSlug}/inventory/products`)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              Stock Movements
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Immutable audit trail of every inventory change
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchMovements}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Movements</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalMovements.toLocaleString()}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">{stats.recentMovements} in last 24h</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stock In</span>
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">+{stats.totalStockIn.toLocaleString()}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">{stats.byType.PURCHASE?.count || 0} purchases</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stock Out</span>
            </div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">-{stats.totalStockOut.toLocaleString()}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">{stats.byType.SALE?.count || 0} sales</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Adjustments</span>
            </div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.byType.ADJUSTMENT?.count || 0}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">manual corrections</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Transfers</span>
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.byType.TRANSFER?.count || 0}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">inter-branch moves</div>
          </div>
        </div>
      )}

      {/* ── Search & Filters ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name, SKU, or reference..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition ${
              showFilters || typeFilter || branchFilter || startDate || endDate
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {(typeFilter || branchFilter || startDate || endDate) && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                {[typeFilter, branchFilter, startDate, endDate].filter(Boolean).length}
              </span>
            )}
            <ChevronDown className={`h-3 w-3 transition ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Movement Type</label>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Types</option>
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Branch</label>
              <select
                value={branchFilter}
                onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>

            {/* Clear all */}
            {(typeFilter || branchFilter || startDate || endDate) && (
              <div className="sm:col-span-2 lg:col-span-4">
                <button
                  onClick={() => { setTypeFilter(''); setBranchFilter(''); setStartDate(''); setEndDate(''); setPage(1); }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" />
          </div>
        )}

        {/* ── Movement Table ── */}
        {!loading && (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Qty Change</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Unit Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {movements.map((m) => {
                  const config = TYPE_CONFIG[m.movementType] || TYPE_CONFIG.ADJUSTMENT;
                  const Icon = config.icon;
                  const isPositive = m.quantity > 0;
                  const refLink = getReferenceLink(orgSlug, m.referenceType, m.referenceId);

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition group"
                    >
                      {/* Date */}
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {new Date(m.movementDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(m.movementDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/${orgSlug}/inventory/movements/${m.productId}`}
                          className="group/link"
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover/link:text-blue-600 dark:group-hover/link:text-blue-400 transition">
                            {m.productName}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">{m.productSku}</div>
                        </Link>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-bold font-mono ${
                          isPositive
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}>
                          {isPositive ? '+' : ''}{m.quantity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </span>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">{m.unitAbbreviation}</div>
                      </td>

                      {/* Running Balance */}
                      <td className="px-4 py-3 text-right">
                        {m.balanceAfter != null ? (
                          <span className="text-sm font-mono text-gray-800 dark:text-gray-200">
                            {m.balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>

                      {/* Unit Cost */}
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                          {formatCurrency(m.unitCost, baseCurrency)}
                        </span>
                      </td>

                      {/* Total Cost */}
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-mono font-medium ${
                          m.totalCost >= 0
                            ? 'text-gray-800 dark:text-gray-200'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(Math.abs(m.totalCost), baseCurrency)}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3">
                        {m.branchName && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                            <Building2 className="h-3 w-3" />
                            {m.branchName}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                          <Box className="h-3 w-3" />
                          {m.warehouseName || m.warehouseLocation}
                        </div>
                      </td>

                      {/* Reference */}
                      <td className="px-4 py-3">
                        {m.referenceNumber || m.referenceId ? (
                          refLink ? (
                            <Link
                              href={refLink}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono"
                            >
                              {m.referenceNumber || m.referenceId}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="text-xs text-gray-600 dark:text-gray-300 font-mono">
                              {m.referenceNumber || m.referenceId}
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
                        {m.notes && (
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[120px]" title={m.notes}>
                            {m.notes}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {movements.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <Package className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No stock movements found</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Stock movements are recorded automatically from purchases, sales, and adjustments
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, total)} of {total.toLocaleString()} movements
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = page - 2 + i;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
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
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition"
              >
                <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
