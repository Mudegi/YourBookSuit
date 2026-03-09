'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, RefreshCw, Package, TrendingUp, TrendingDown,
  ShoppingCart, ArrowUpRight, Wrench, Truck, Undo2, AlertTriangle,
  DollarSign, Box, Building2, ExternalLink, Calendar,
  ChevronDown, Layers, FileSpreadsheet,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';

/* ─────────── Types ─────────── */

interface StockCardMovement {
  id: string;
  movementDate: string;
  movementType: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  balanceAfter: number | null;
  referenceType: string | null;
  referenceId: string | null;
  referenceNumber: string | null;
  notes: string | null;
  performedById: string | null;
  branchName: string | null;
  warehouseLocation: string;
  transferGroupId: string | null;
}

interface ProductInfo {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  purchasePrice: number;
  sellingPrice: number;
  unit: string;
}

interface CurrentStock {
  quantityOnHand: number;
  quantityAvailable: number;
  averageCost: number;
  totalValue: number;
  warehouseLocation: string;
}

interface MovementSummary {
  movementType: string;
  totalQuantity: number;
  totalCost: number;
  count: number;
}

interface Branch {
  id: string;
  code: string;
  name: string;
}

/* ─────────── Type Config ─────────── */

const TYPE_CONFIG: Record<string, {
  label: string; icon: React.ElementType; color: string; bgColor: string;
}> = {
  PURCHASE:   { label: 'Purchase',   icon: ShoppingCart,  color: 'text-green-700 dark:text-green-400',   bgColor: 'bg-green-100 dark:bg-green-900/40'   },
  SALE:       { label: 'Sale',       icon: ArrowUpRight,  color: 'text-red-700 dark:text-red-400',       bgColor: 'bg-red-100 dark:bg-red-900/40'       },
  ADJUSTMENT: { label: 'Adjustment', icon: Wrench,        color: 'text-amber-700 dark:text-amber-400',   bgColor: 'bg-amber-100 dark:bg-amber-900/40'   },
  TRANSFER:   { label: 'Transfer',   icon: Truck,         color: 'text-blue-700 dark:text-blue-400',     bgColor: 'bg-blue-100 dark:bg-blue-900/40'     },
  RETURN:     { label: 'Return',     icon: Undo2,         color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/40' },
  WRITE_OFF:  { label: 'Write-Off',  icon: AlertTriangle, color: 'text-gray-700 dark:text-gray-400',     bgColor: 'bg-gray-100 dark:bg-gray-800'        },
};

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

export default function StockCardPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const productId = params.productId as string;
  const { currency: orgCurrency } = useOrganization();
  const baseCurrency = orgCurrency || 'UGX';

  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [currentStock, setCurrentStock] = useState<CurrentStock | null>(null);
  const [movements, setMovements] = useState<StockCardMovement[]>([]);
  const [summary, setSummary] = useState<MovementSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [branchId, setBranchId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Load branches
  useEffect(() => {
    fetch(`/api/${orgSlug}/branches`)
      .then((r) => r.json())
      .then((d) => { const list = d.branches || d.data || []; setBranches(Array.isArray(list) ? list : []); })
      .catch(() => {});
  }, [orgSlug]);

  // Fetch stock card
  const fetchStockCard = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const qs = new URLSearchParams({
        mode: 'stock-card',
        productId,
      });
      if (branchId) qs.set('branchId', branchId);
      if (startDate) qs.set('startDate', startDate);
      if (endDate) qs.set('endDate', endDate);

      const res = await fetch(`/api/orgs/${orgSlug}/inventory/movements?${qs}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load stock card');

      setProduct(data.product);
      setCurrentStock(data.currentStock);
      setMovements(data.movements || []);
      setSummary(data.summary || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, productId, branchId, startDate, endDate]);

  useEffect(() => { fetchStockCard(); }, [fetchStockCard]);

  // Export CSV
  const exportCSV = () => {
    if (!product) return;
    const header = ['Date', 'Type', 'Qty', 'Unit Cost', 'Total', 'Balance After', 'Location', 'Reference', 'Notes'];
    const rows = movements.map((m) => [
      new Date(m.movementDate).toLocaleString(),
      m.movementType,
      String(m.quantity),
      String(m.unitCost),
      String(m.totalCost),
      m.balanceAfter != null ? String(m.balanceAfter) : '',
      m.warehouseLocation,
      m.referenceNumber || '',
      m.notes || '',
    ]);
    const csv = [
      [`Stock Card: ${product.name} (${product.sku})`],
      header,
      ...rows,
    ].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-card-${product.sku}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ─────────── Render ─────────── */

  if (loading && !product) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading stock card...</span>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="max-w-3xl mx-auto mt-16 text-center">
        <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-blue-600 hover:underline">Go Back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${orgSlug}/inventory/movements`)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              Stock Card
            </h1>
            {product && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {product.name} <span className="font-mono text-xs">({product.sku})</span>
                {product.category && <span className="ml-2 text-gray-400 dark:text-gray-500">· {product.category}</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStockCard}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
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

      {/* ── Current Stock KPIs ── */}
      {currentStock && product && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">On Hand</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentStock.quantityOnHand.toLocaleString()}
              <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-1">{product.unit}</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Available</div>
            <div className={`text-2xl font-bold ${currentStock.quantityAvailable > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {currentStock.quantityAvailable.toLocaleString()}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">WAC (Avg. Cost)</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
              {formatCurrency(currentStock.averageCost, baseCurrency)}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Total Value</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 font-mono">
              {formatCurrency(currentStock.totalValue, baseCurrency)}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Total Movements</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {movements.length}
            </div>
          </div>
        </div>
      )}

      {/* ── Movement Summary by Type ── */}
      {summary.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4" /> Movement Summary
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {summary.map((s) => {
              const config = TYPE_CONFIG[s.movementType] || TYPE_CONFIG.ADJUSTMENT;
              const Icon = config.icon;
              return (
                <div key={s.movementType} className={`rounded-lg p-3 ${config.bgColor}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                  </div>
                  <div className={`text-lg font-bold font-mono ${config.color}`}>
                    {s.totalQuantity >= 0 ? '+' : ''}{s.totalQuantity.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">{s.count} txns · {formatCurrency(Math.abs(s.totalCost), baseCurrency)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition rounded-xl"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Calendar className="h-4 w-4" /> Filter by Date / Branch
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        {showFilters && (
          <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Branch</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Branches</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From Date</label>
              <input
                type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To Date</label>
              <input
                type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Chronological Movement Table ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Movement History <span className="text-gray-400 dark:text-gray-500 font-normal">(chronological)</span>
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-8">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">In</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Out</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Unit Cost</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {movements.map((m, idx) => {
                  const config = TYPE_CONFIG[m.movementType] || TYPE_CONFIG.ADJUSTMENT;
                  const Icon = config.icon;
                  const isIn = m.quantity > 0;
                  const refLink = getReferenceLink(orgSlug, m.referenceType, m.referenceId);

                  return (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                      <td className="px-4 py-2.5 text-xs text-gray-400 dark:text-gray-500 font-mono">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {new Date(m.movementDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">
                          {new Date(m.movementDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${config.bgColor} ${config.color}`}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </span>
                        {m.branchName && (
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            <Building2 className="h-2.5 w-2.5" /> {m.branchName}
                          </div>
                        )}
                      </td>
                      {/* Stock In */}
                      <td className="px-4 py-2.5 text-right">
                        {isIn ? (
                          <span className="text-sm font-bold font-mono text-green-700 dark:text-green-400">
                            +{Math.abs(m.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                      {/* Stock Out */}
                      <td className="px-4 py-2.5 text-right">
                        {!isIn ? (
                          <span className="text-sm font-bold font-mono text-red-700 dark:text-red-400">
                            -{Math.abs(m.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                      {/* Balance */}
                      <td className="px-4 py-2.5 text-right">
                        {m.balanceAfter != null ? (
                          <span className={`text-sm font-bold font-mono ${
                            m.balanceAfter > 0 ? 'text-gray-900 dark:text-white' : m.balanceAfter === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {m.balanceAfter.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      {/* Unit Cost */}
                      <td className="px-4 py-2.5 text-right text-sm font-mono text-gray-700 dark:text-gray-300">
                        {formatCurrency(m.unitCost, baseCurrency)}
                      </td>
                      {/* Value */}
                      <td className="px-4 py-2.5 text-right">
                        <span className={`text-sm font-mono ${m.totalCost >= 0 ? 'text-gray-700 dark:text-gray-300' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(Math.abs(m.totalCost), baseCurrency)}
                        </span>
                      </td>
                      {/* Reference */}
                      <td className="px-4 py-2.5">
                        {m.referenceNumber || m.referenceId ? (
                          refLink ? (
                            <Link href={refLink} className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono">
                              {m.referenceNumber || m.referenceId}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="text-xs text-gray-600 dark:text-gray-300 font-mono">{m.referenceNumber || m.referenceId}</span>
                          )
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
                        {m.notes && (
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[140px]" title={m.notes}>
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">No movements recorded for this item yet</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
