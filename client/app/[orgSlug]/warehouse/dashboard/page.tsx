'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Warehouse as WarehouseIcon,
  DollarSign,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Building2,
  BarChart3,
  ArrowRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  PackageX,
  ClipboardList,
  Filter,
  RefreshCw,
  MapPin,
  ShoppingCart,
  FileText,
  Flame,
  Archive,
  ChevronRight,
} from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetch-client';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

/* ═══════════════ Types ═══════════════ */

interface WarehouseKPIs {
  totalStockValue: number;
  totalSKUs: number;
  lowStockAlerts: number;
  pendingReceives: number;
  pendingShipments: number;
}

interface WarehouseSummary {
  id: string; code: string; name: string; type: string;
  branchName?: string; city?: string; country?: string;
  stockValue: number; skuCount: number; capacityPct: number | null;
}

interface StockByCategoryItem { category: string; value: number; quantity: number; }
interface TopMoverItem { productId: string; sku: string; name: string; category: string | null; totalQty: number; }
interface DeadStockItem { productId: string; sku: string; name: string; category: string | null; quantityOnHand: number; value: number; lastMovementDate: string | null; warehouseName: string; }
interface LowStockAlertItem { productId: string; sku: string; name: string; warehouseId: string; warehouseCode: string; warehouseName: string; available: number; reorderLevel: number; deficit: number; }
interface RecentAdjustment { id: string; productName: string; productSku: string; movementType: string; quantity: number; notes: string | null; movementDate: string; warehouseName?: string; }
interface PendingInboundOrder { id: string; poNumber: string; vendorName: string; expectedDate: string | null; total: number; status: string; warehouseName?: string; }
interface PendingOutboundOrder { id: string; invoiceNumber: string; customerName: string; dueDate: string; total: number; status: string; warehouseName?: string; }

interface DashboardData {
  kpis: WarehouseKPIs;
  warehouses: WarehouseSummary[];
  stockByCategory: StockByCategoryItem[];
  topMovers: TopMoverItem[];
  deadStock: DeadStockItem[];
  lowStockAlerts: LowStockAlertItem[];
  recentAdjustments: RecentAdjustment[];
  pendingInbound: PendingInboundOrder[];
  pendingOutbound: PendingOutboundOrder[];
  stockDistribution: { name: string; value: number }[];
}

/* ═══════════════ Helpers ═══════════════ */

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtNum(n: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysAgo(d: string | null) {
  if (!d) return null;
  const diff = Date.now() - new Date(d).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const statusBadge: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-indigo-100 text-indigo-700',
  PARTIALLY_RECEIVED: 'bg-amber-100 text-amber-700',
  VIEWED: 'bg-sky-100 text-sky-700',
  PARTIALLY_PAID: 'bg-orange-100 text-orange-700',
};

const warehouseTypeColor: Record<string, string> = {
  GENERAL: 'bg-blue-500',
  MANUFACTURING: 'bg-purple-500',
  RECEIVING: 'bg-green-500',
  SHIPPING: 'bg-orange-500',
  QA_HOLD: 'bg-yellow-500',
  THIRD_PARTY: 'bg-gray-500',
  TRANSIT: 'bg-cyan-500',
  DAMAGED: 'bg-red-500',
  QUARANTINE: 'bg-amber-500',
};

/* ═══════════════ Component ═══════════════ */

export default function WarehouseDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (whId?: string) => {
    try {
      setRefreshing(true);
      const qs = whId ? `?warehouseId=${whId}` : '';
      const res = await fetchWithAuth(`/api/${orgSlug}/warehouse/dashboard${qs}`);
      if (!res.ok) throw new Error('Failed to load dashboard');
      const json = await res.json();
      setData(json.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    if (orgSlug) loadDashboard(selectedWarehouse || undefined);
  }, [orgSlug, selectedWarehouse, loadDashboard]);

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-4">Loading warehouse dashboard…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center">
        <PackageX className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">{error || 'No data available.'}</p>
        <button onClick={() => { setLoading(true); loadDashboard(); }} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          Retry
        </button>
      </div>
    );
  }

  const { kpis } = data;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

      {/* ═══ Header + Warehouse Switcher ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-blue-600" />
            Warehouse Command Center
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time operational intelligence for stock management
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Warehouse Switcher */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={selectedWarehouse}
              onChange={e => setSelectedWarehouse(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="">All Warehouses</option>
              {data.warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => loadDashboard(selectedWarehouse || undefined)}
            disabled={refreshing}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ═══ Big Four KPIs ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard icon={DollarSign} label="Total Stock Value" value={`UGX ${fmtCurrency(kpis.totalStockValue)}`} color="green" />
        <KPICard icon={Package} label="Total SKUs Tracked" value={fmtNum(kpis.totalSKUs)} color="blue" />
        <KPICard icon={AlertTriangle} label="Low Stock Alerts" value={fmtNum(kpis.lowStockAlerts)} color={kpis.lowStockAlerts > 0 ? 'red' : 'green'} />
        <KPICard icon={ArrowDownToLine} label="Pending Receives" value={fmtNum(kpis.pendingReceives)} color="purple" subtitle="inbound POs" />
        <KPICard icon={ArrowUpFromLine} label="Pending Shipments" value={fmtNum(kpis.pendingShipments)} color="orange" subtitle="orders to ship" />
      </div>

      {/* ═══ Charts Row ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Stock Distribution by Warehouse (Pie) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <WarehouseIcon className="h-4 w-4 text-blue-600" />
            Stock Distribution by Warehouse
          </h2>
          {data.stockDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.stockDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.stockDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => `UGX ${fmtCurrency(val)}`} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="No stock data to display" />
          )}
        </div>

        {/* Stock Value by Category (Bar) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-600" />
            Stock Value by Category
          </h2>
          {data.stockByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.stockByCategory.slice(0, 8)} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={v => fmtCurrency(v)} />
                <YAxis type="category" dataKey="category" width={75} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(val: number) => `UGX ${val.toLocaleString()}`} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="No category data" />
          )}
        </div>
      </div>

      {/* ═══ Warehouse Cards ═══ */}
      {data.warehouses.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-600" />
            Warehouse Locations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.warehouses.map(w => (
              <div
                key={w.id}
                onClick={() => router.push(`/${orgSlug}/warehouse/warehouses/${w.id}`)}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{w.name}</h3>
                    <p className="text-xs font-mono text-gray-400">{w.code}</p>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${warehouseTypeColor[w.type] || 'bg-gray-400'}`} title={w.type} />
                </div>
                {(w.city || w.branchName) && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                    <MapPin className="h-3 w-3" />
                    {[w.branchName, w.city, w.country].filter(Boolean).join(' · ')}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                  <MiniStat label="Value" value={`UGX ${fmtCurrency(w.stockValue)}`} />
                  <MiniStat label="SKUs" value={fmtNum(w.skuCount)} />
                  <MiniStat label="Capacity" value={w.capacityPct !== null ? `${w.capacityPct}%` : '—'} warn={w.capacityPct !== null && w.capacityPct > 90} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Action Lists ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pending Inbound (POs to receive) */}
        <ActionPanel
          title="Pending Inbound"
          subtitle="Purchase Orders arriving"
          icon={<ArrowDownToLine className="h-4 w-4 text-indigo-600" />}
          headerColor="indigo"
          count={data.pendingInbound.length}
          emptyText="No pending purchase orders"
        >
          {data.pendingInbound.map(po => (
            <div key={po.id} className="flex items-center justify-between py-2.5 px-1 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{po.poNumber}</p>
                <p className="text-xs text-gray-500 truncate">{po.vendorName}{po.warehouseName ? ` → ${po.warehouseName}` : ''}</p>
              </div>
              <div className="text-right ml-3 shrink-0">
                <p className="text-sm font-semibold text-gray-900">UGX {fmtCurrency(po.total)}</p>
                <p className="text-xs text-gray-500">{po.expectedDate ? `ETA ${fmtDate(po.expectedDate)}` : 'No ETA'}</p>
              </div>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge[po.status] || 'bg-gray-100 text-gray-600'}`}>
                {po.status.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </ActionPanel>

        {/* Pending Outbound (ship/pack) */}
        <ActionPanel
          title="Pending Shipments"
          subtitle="Orders ready for packing"
          icon={<ArrowUpFromLine className="h-4 w-4 text-orange-600" />}
          headerColor="orange"
          count={data.pendingOutbound.length}
          emptyText="No pending shipments"
        >
          {data.pendingOutbound.map(inv => (
            <div key={inv.id} className="flex items-center justify-between py-2.5 px-1 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{inv.invoiceNumber}</p>
                <p className="text-xs text-gray-500 truncate">{inv.customerName}{inv.warehouseName ? ` · ${inv.warehouseName}` : ''}</p>
              </div>
              <div className="text-right ml-3 shrink-0">
                <p className="text-sm font-semibold text-gray-900">UGX {fmtCurrency(inv.total)}</p>
                <p className="text-xs text-gray-500">Due {fmtDate(inv.dueDate)}</p>
              </div>
            </div>
          ))}
        </ActionPanel>
      </div>

      {/* ═══ Movers & Dead Stock ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Movers */}
        <ActionPanel
          title="Fast Movers"
          subtitle="Top selling in last 30 days"
          icon={<Flame className="h-4 w-4 text-emerald-600" />}
          headerColor="emerald"
          count={data.topMovers.length}
          emptyText="No sales movements recorded"
        >
          {data.topMovers.map((item, i) => (
            <div key={item.productId} className="flex items-center justify-between py-2.5 px-1 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.sku}{item.category ? ` · ${item.category}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 ml-3 shrink-0">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-sm font-semibold text-gray-900">{fmtNum(item.totalQty)}</span>
                <span className="text-xs text-gray-500">sold</span>
              </div>
            </div>
          ))}
        </ActionPanel>

        {/* Dead Stock */}
        <ActionPanel
          title="Dead Stock"
          subtitle="No sales in 90+ days"
          icon={<Archive className="h-4 w-4 text-red-600" />}
          headerColor="red"
          count={data.deadStock.length}
          emptyText="No dead stock detected — great!"
        >
          {data.deadStock.slice(0, 10).map(item => {
            const days = daysAgo(item.lastMovementDate);
            return (
              <div key={`${item.productId}-${item.warehouseName}`} className="flex items-center justify-between py-2.5 px-1 border-b border-gray-50 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.sku} · {item.warehouseName}{item.category ? ` · ${item.category}` : ''}</p>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <p className="text-sm font-semibold text-gray-900">UGX {fmtCurrency(item.value)}</p>
                  <p className="text-xs text-gray-500">
                    {fmtNum(item.quantityOnHand)} units
                    {days !== null && <span className="text-red-500 ml-1">({days}d idle)</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </ActionPanel>
      </div>

      {/* ═══ Low Stock Alerts ═══ */}
      {data.lowStockAlerts.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-red-50 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h2 className="text-sm font-semibold text-red-800">Low Stock Alerts</h2>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-medium">{data.lowStockAlerts.length}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left py-2.5 px-4 font-medium">Product</th>
                  <th className="text-left py-2.5 px-4 font-medium">Warehouse</th>
                  <th className="text-right py-2.5 px-4 font-medium">Available</th>
                  <th className="text-right py-2.5 px-4 font-medium">Reorder Level</th>
                  <th className="text-right py-2.5 px-4 font-medium">Deficit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.lowStockAlerts.slice(0, 15).map((a, i) => (
                  <tr key={i} className="hover:bg-red-50/30">
                    <td className="py-2.5 px-4">
                      <p className="font-medium text-gray-900">{a.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{a.sku}</p>
                    </td>
                    <td className="py-2.5 px-4 text-gray-600">{a.warehouseName}</td>
                    <td className="py-2.5 px-4 text-right font-semibold text-red-600">{fmtNum(a.available)}</td>
                    <td className="py-2.5 px-4 text-right text-gray-500">{fmtNum(a.reorderLevel)}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">-{fmtNum(a.deficit)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ Recent Adjustments ═══ */}
      {data.recentAdjustments.length > 0 && (
        <ActionPanel
          title="Recent Adjustments"
          subtitle="Manual stock fixes — monitor for anomalies"
          icon={<ClipboardList className="h-4 w-4 text-amber-600" />}
          headerColor="amber"
          count={data.recentAdjustments.length}
          emptyText="No recent adjustments"
        >
          {data.recentAdjustments.map(adj => (
            <div key={adj.id} className="flex items-center justify-between py-2.5 px-1 border-b border-gray-50 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{adj.productName}</p>
                <p className="text-xs text-gray-500">
                  {adj.productSku}{adj.warehouseName ? ` · ${adj.warehouseName}` : ''}
                  {adj.notes ? ` — ${adj.notes}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-3 shrink-0">
                <span className={`text-sm font-semibold ${adj.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {adj.quantity > 0 ? '+' : ''}{fmtNum(adj.quantity)}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  adj.movementType === 'WRITE_OFF' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {adj.movementType.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-gray-400">{fmtDate(adj.movementDate)}</span>
              </div>
            </div>
          ))}
        </ActionPanel>
      )}
    </div>
  );
}

/* ═══════════════ Sub-Components ═══════════════ */

function KPICard({ icon: Icon, label, value, color, subtitle }: {
  icon: any; label: string; value: string; color: string; subtitle?: string;
}) {
  const colorMap: Record<string, { bg: string; icon: string }> = {
    green: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
    red: { bg: 'bg-red-50', icon: 'text-red-600' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${c.bg}`}>
          <Icon className={`h-5 w-5 ${c.icon}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">{label}</p>
          <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
          {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function ActionPanel({ title, subtitle, icon, headerColor, count, emptyText, children }: {
  title: string; subtitle: string; icon: React.ReactNode; headerColor: string;
  count: number; emptyText: string; children: React.ReactNode;
}) {
  const borderMap: Record<string, string> = {
    indigo: 'border-indigo-100', orange: 'border-orange-100', emerald: 'border-emerald-100',
    red: 'border-red-100', amber: 'border-amber-100',
  };
  const bgMap: Record<string, string> = {
    indigo: 'bg-indigo-50', orange: 'bg-orange-50', emerald: 'bg-emerald-50',
    red: 'bg-red-50', amber: 'bg-amber-50',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className={`px-5 py-3.5 ${bgMap[headerColor] || 'bg-gray-50'} border-b ${borderMap[headerColor] || 'border-gray-100'} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            <p className="text-[10px] text-gray-500">{subtitle}</p>
          </div>
        </div>
        {count > 0 && (
          <span className="px-2 py-0.5 bg-white/80 text-gray-700 rounded-full text-[10px] font-semibold border border-gray-200">{count}</span>
        )}
      </div>
      <div className="p-4 max-h-[360px] overflow-y-auto">
        {count > 0 ? children : <EmptyState text={emptyText} />}
      </div>
    </div>
  );
}

function MiniStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
      <p className={`text-sm font-semibold ${warn ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
      <Package className="h-8 w-8 mb-2" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
