'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Search,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PauseCircle,
  XCircle,
  Lock,
  Package,
  MoreVertical,
  Layers,
  CalendarDays,
  X,
  ChevronRight,
  Factory,
} from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetch-client';

/* ═══ Types ═══ */

interface WOListItem {
  id: string;
  workOrderNumber: string;
  productId: string;
  productSku: string;
  productName: string;
  bomName: string | null;
  bomId: string | null;
  branchName: string | null;
  status: string;
  priority: number;
  quantityPlanned: number;
  quantityCompleted: number;
  quantityScrapped: number;
  outputProgress: number;
  materialProgress: number;
  materialCount: number;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface ProductOption { id: string; sku: string; name: string; }
interface BOMOption { id: string; name: string; version: string; productId: string; }

/* ═══ Config ═══ */

const statusCfg: Record<string, { label: string; bg: string; icon: any }> = {
  PLANNED:     { label: 'Planned',      bg: 'bg-gray-100 text-gray-700',    icon: ClipboardList },
  RELEASED:    { label: 'Released',     bg: 'bg-blue-100 text-blue-700',    icon: CheckCircle2 },
  IN_PROGRESS: { label: 'In Progress',  bg: 'bg-amber-100 text-amber-700',  icon: Clock },
  HOLD:        { label: 'On Hold',      bg: 'bg-orange-100 text-orange-700', icon: PauseCircle },
  COMPLETED:   { label: 'Completed',    bg: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  CLOSED:      { label: 'Closed',       bg: 'bg-purple-100 text-purple-700', icon: Lock },
  CANCELLED:   { label: 'Cancelled',    bg: 'bg-red-100 text-red-700',       icon: XCircle },
};

const priorityCfg: Record<number, { label: string; dot: string }> = {
  1: { label: 'Low',    dot: 'bg-gray-400' },
  2: { label: 'Normal', dot: 'bg-blue-400' },
  3: { label: 'Medium', dot: 'bg-yellow-400' },
  4: { label: 'High',   dot: 'bg-orange-500' },
  5: { label: 'Urgent', dot: 'bg-red-500' },
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ═══ Page ═══ */

export default function WorkOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;

  const [orders, setOrders] = useState<WOListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [boms, setBoms] = useState<BOMOption[]>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    productId: '',
    bomId: '',
    quantityPlanned: 1,
    dueDate: '',
    priority: 3,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/${orgSlug}/manufacturing/work-orders`);
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setOrders(json.data || []);
      setError(null);
    } catch { setError('Failed to load work orders'); }
    finally { setLoading(false); }
  }, [orgSlug]);

  const loadLookups = useCallback(async () => {
    try {
      const [pRes, bRes] = await Promise.all([
        fetchWithAuth(`/api/${orgSlug}/inventory/products`),
        fetchWithAuth(`/api/${orgSlug}/manufacturing/boms`),
      ]);
      if (pRes.ok) { const j = await pRes.json(); setProducts((j.data || []).map((p: any) => ({ id: p.id, sku: p.sku, name: p.name }))); }
      if (bRes.ok) { const j = await bRes.json(); setBoms((j.data || []).map((b: any) => ({ id: b.id, name: b.name || b.productName, version: b.version, productId: b.productId }))); }
    } catch { /* ignore */ }
  }, [orgSlug]);

  useEffect(() => { if (orgSlug) { load(); loadLookups(); } }, [orgSlug, load, loadLookups]);

  const handleCreate = async () => {
    if (!createForm.productId || !createForm.bomId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/${orgSlug}/manufacturing/work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: createForm.productId,
          bomId: createForm.bomId,
          quantityPlanned: createForm.quantityPlanned,
          dueDate: createForm.dueDate || undefined,
          priority: createForm.priority,
          notes: createForm.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create');
      setShowCreate(false);
      setCreateForm({ productId: '', bomId: '', quantityPlanned: 1, dueDate: '', priority: 3, notes: '' });
      router.push(`/${orgSlug}/manufacturing/work-orders/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setSubmitting(false); }
  };

  // When product changes, auto-select first matching BOM
  const onProductChange = (productId: string) => {
    setCreateForm(prev => {
      const matchingBom = boms.find(b => b.productId === productId);
      return { ...prev, productId, bomId: matchingBom?.id || '' };
    });
  };

  const filtered = orders.filter(o => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return o.workOrderNumber.toLowerCase().includes(q)
        || o.productName.toLowerCase().includes(q)
        || o.productSku.toLowerCase().includes(q);
    }
    return true;
  });

  // Stats
  const planned = orders.filter(o => o.status === 'PLANNED').length;
  const inProgress = orders.filter(o => o.status === 'IN_PROGRESS').length;
  const completed = orders.filter(o => o.status === 'COMPLETED' || o.status === 'CLOSED').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-4">Loading work orders…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/${orgSlug}`)} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Factory className="h-7 w-7 text-blue-600" />
              Work Orders
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Plan, execute, and track production runs.</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Work Order
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={orders.length} icon={ClipboardList} color="blue" />
        <StatCard label="Planned" value={planned} icon={CalendarDays} color="gray" />
        <StatCard label="In Progress" value={inProgress} icon={Clock} color="amber" />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} color="green" />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            placeholder="Search by WO number, product…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[150px]"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {Object.entries(statusCfg).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                <th className="text-left py-3 px-4 font-medium">WO Number</th>
                <th className="text-left py-3 px-4 font-medium">Product</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-center py-3 px-4 font-medium">Priority</th>
                <th className="text-right py-3 px-4 font-medium">Progress</th>
                <th className="text-left py-3 px-4 font-medium">BOM</th>
                <th className="text-left py-3 px-4 font-medium">Due Date</th>
                <th className="text-center py-3 px-4 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(wo => {
                const sc = statusCfg[wo.status] || statusCfg.PLANNED;
                const StatusIcon = sc.icon;
                const pc = priorityCfg[wo.priority] || priorityCfg[3];
                const isDue = wo.dueDate && new Date(wo.dueDate) < new Date() && !['COMPLETED','CLOSED','CANCELLED'].includes(wo.status);

                return (
                  <tr
                    key={wo.id}
                    className="hover:bg-blue-50/30 cursor-pointer"
                    onClick={() => router.push(`/${orgSlug}/manufacturing/work-orders/${wo.id}`)}
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm font-semibold text-gray-900">{wo.workOrderNumber}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{wo.productName}</p>
                          <p className="text-[10px] font-mono text-gray-400">{wo.productSku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg}`}>
                        <StatusIcon className="h-3 w-3" />{sc.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-700">
                        <span className={`h-2 w-2 rounded-full ${pc.dot}`} />{pc.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${wo.outputProgress >= 100 ? 'bg-emerald-500' : wo.outputProgress > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                            style={{ width: `${Math.min(100, wo.outputProgress)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-gray-600 w-14 text-right">
                          {wo.quantityCompleted}/{wo.quantityPlanned}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 truncate max-w-[140px]">{wo.bomName || '—'}</td>
                    <td className={`py-3 px-4 text-sm ${isDue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                      {isDue && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                      {fmtDate(wo.dueDate)}
                    </td>
                    <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td className="py-10 text-center text-gray-500" colSpan={8}>
                    <Factory className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm">{orders.length === 0 ? 'No work orders yet.' : 'No matching orders.'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900">New Work Order</h2>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Finished Product *</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                value={createForm.productId}
                onChange={e => onProductChange(e.target.value)}
              >
                <option value="">Select product…</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bill of Materials *</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                value={createForm.bomId}
                onChange={e => setCreateForm(prev => ({ ...prev, bomId: e.target.value }))}
              >
                <option value="">Select BOM…</option>
                {boms
                  .filter(b => !createForm.productId || b.productId === createForm.productId)
                  .map(b => <option key={b.id} value={b.id}>{b.name} v{b.version}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Quantity to Produce *</label>
                <input
                  type="number" min="1" step="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={createForm.quantityPlanned}
                  onChange={e => setCreateForm(prev => ({ ...prev, quantityPlanned: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={createForm.dueDate}
                  onChange={e => setCreateForm(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                value={createForm.priority}
                onChange={e => setCreateForm(prev => ({ ...prev, priority: Number(e.target.value) }))}
              >
                <option value={1}>Low</option>
                <option value={2}>Normal</option>
                <option value={3}>Medium</option>
                <option value={4}>High</option>
                <option value={5}>Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={createForm.notes}
                onChange={e => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={submitting || !createForm.productId || !createForm.bomId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Creating…' : 'Create Work Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ Sub-components ═══ */

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: any; color: string;
}) {
  const colors: Record<string, { bg: string; ic: string }> = {
    blue:  { bg: 'bg-blue-50', ic: 'text-blue-600' },
    gray:  { bg: 'bg-gray-100', ic: 'text-gray-500' },
    amber: { bg: 'bg-amber-50', ic: 'text-amber-600' },
    green: { bg: 'bg-emerald-50', ic: 'text-emerald-600' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${c.bg}`}><Icon className={`h-4 w-4 ${c.ic}`} /></div>
        <div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
