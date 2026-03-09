'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  FileText,
  CheckCircle2,
  Archive,
  Layers,
  DollarSign,
  ChevronRight,
  Trash2,
  Edit3,
  Copy,
  RefreshCw,
  AlertTriangle,
  X,
} from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetch-client';

/* ═══════════════ Types ═══════════════ */

interface BOMListItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  productCategory: string | null;
  name: string;
  version: string;
  status: string;
  isDefault: boolean;
  yieldPercent: number;
  scrapPercent: number;
  componentCount: number;
  estimatedCost: number | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProductOption {
  id: string;
  sku: string;
  name: string;
}

/* ═══════════════ Helpers ═══════════════ */

function fmtCurrency(n: number | null) {
  if (n === null || n === undefined) return '—';
  return `UGX ${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const statusConfig: Record<string, { label: string; bg: string; icon: any }> = {
  DRAFT: { label: 'Draft', bg: 'bg-gray-100 text-gray-700', icon: FileText },
  ACTIVE: { label: 'Active', bg: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  ARCHIVED: { label: 'Archived', bg: 'bg-amber-100 text-amber-700', icon: Archive },
};

/* ═══════════════ Component ═══════════════ */

export default function BomsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;

  const [boms, setBoms] = useState<BOMListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    productId: '',
    name: '',
    version: '1.0',
    status: 'DRAFT' as string,
    isDefault: false,
    yieldPercent: 100,
    scrapPercent: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const loadBOMs = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/${orgSlug}/manufacturing/boms`);
      if (!res.ok) throw new Error('Failed to load BOMs');
      const json = await res.json();
      setBoms(json.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load BOMs');
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/${orgSlug}/inventory/products`);
      if (!res.ok) return;
      const json = await res.json();
      setProducts((json.data || []).map((p: any) => ({ id: p.id, sku: p.sku, name: p.name })));
    } catch { /* ignore */ }
  }, [orgSlug]);

  useEffect(() => {
    if (orgSlug) {
      loadBOMs();
      loadProducts();
    }
  }, [orgSlug, loadBOMs, loadProducts]);

  const handleCreate = async () => {
    if (!createForm.productId || !createForm.name) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/${orgSlug}/manufacturing/boms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          lines: [{ componentId: createForm.productId, quantityPer: 1, scrapPercent: 0, backflush: true }],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create BOM');
      setShowCreate(false);
      setCreateForm({ productId: '', name: '', version: '1.0', status: 'DRAFT', isDefault: false, yieldPercent: 100, scrapPercent: 0 });
      // Navigate to edit the new BOM
      router.push(`/${orgSlug}/manufacturing/boms/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create BOM');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (bomId: string) => {
    if (!confirm('Delete this BOM? This cannot be undone.')) return;
    try {
      const res = await fetchWithAuth(`/api/${orgSlug}/manufacturing/boms/${bomId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete');
      await loadBOMs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete BOM');
    }
  };

  // Filtering
  const filtered = boms.filter(b => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        b.name.toLowerCase().includes(q) ||
        b.productName.toLowerCase().includes(q) ||
        b.productSku.toLowerCase().includes(q) ||
        b.version.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Stats
  const activeCount = boms.filter(b => b.status === 'ACTIVE').length;
  const draftCount = boms.filter(b => b.status === 'DRAFT').length;
  const totalEstCost = boms
    .filter(b => b.status === 'ACTIVE' && b.estimatedCost)
    .reduce((s, b) => s + (b.estimatedCost ?? 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-4">Loading Bills of Material…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${orgSlug}`)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="h-7 w-7 text-blue-600" />
              Bills of Material
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Define product recipes, manage versions, and track component costs.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New BOM
        </button>
      </div>

      {/* ═══ Summary KPIs ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPIStat label="Total BOMs" value={boms.length} icon={Layers} color="blue" />
        <KPIStat label="Active" value={activeCount} icon={CheckCircle2} color="green" />
        <KPIStat label="Draft" value={draftCount} icon={FileText} color="gray" />
        <KPIStat label="Active Cost (Est.)" value={fmtCurrency(totalEstCost)} icon={DollarSign} color="purple" isText />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ═══ Filters ═══ */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Search by name, product, SKU, or version…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <button
          onClick={loadBOMs}
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50" title="Refresh"
        >
          <RefreshCw className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* ═══ BOM Table ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                <th className="text-left py-3 px-4 font-medium">Finished Product</th>
                <th className="text-left py-3 px-4 font-medium">BOM Name</th>
                <th className="text-left py-3 px-4 font-medium">Version</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-right py-3 px-4 font-medium">Components</th>
                <th className="text-right py-3 px-4 font-medium">Est. Cost</th>
                <th className="text-left py-3 px-4 font-medium">Effective</th>
                <th className="text-right py-3 px-4 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(bom => {
                const sc = statusConfig[bom.status] || statusConfig.DRAFT;
                const StatusIcon = sc.icon;
                return (
                  <tr
                    key={bom.id}
                    className="hover:bg-blue-50/30 cursor-pointer group"
                    onClick={() => router.push(`/${orgSlug}/manufacturing/boms/${bom.id}`)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">{bom.productName}</p>
                          <p className="text-xs text-gray-500 font-mono">{bom.productSku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-900">{bom.name}</p>
                      {bom.isDefault && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">Default</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-gray-700">v{bom.version}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg}`}>
                        <StatusIcon className="h-3 w-3" />
                        {sc.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-700">{bom.componentCount}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-gray-900">{fmtCurrency(bom.estimatedCost)}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {bom.effectiveFrom ? fmtDate(bom.effectiveFrom) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right relative" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setMenuOpen(menuOpen === bom.id ? null : bom.id)}
                        className="p-1 rounded hover:bg-gray-100"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </button>
                      {menuOpen === bom.id && (
                        <div className="absolute right-4 top-10 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-40">
                          <button
                            onClick={() => { setMenuOpen(null); router.push(`/${orgSlug}/manufacturing/boms/${bom.id}`); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => { setMenuOpen(null); handleDelete(bom.id); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td className="py-12 text-center text-gray-500" colSpan={8}>
                    <Layers className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="font-medium">No BOMs found</p>
                    <p className="text-xs mt-1">Create your first Bill of Materials to define product recipes.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ Create BOM Modal ═══ */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">New Bill of Materials</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Finished Product */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Finished Product *</label>
                <select
                  value={createForm.productId}
                  onChange={e => {
                    const prod = products.find(p => p.id === e.target.value);
                    setCreateForm({
                      ...createForm,
                      productId: e.target.value,
                      name: prod ? `${prod.name} Recipe` : createForm.name,
                    });
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a product…</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              {/* BOM Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">BOM Name *</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g., Standard Chair Assembly"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Version */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    value={createForm.version}
                    onChange={e => setCreateForm({ ...createForm, version: e.target.value })}
                  />
                </div>
                {/* Default */}
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.isDefault}
                      onChange={e => setCreateForm({ ...createForm, isDefault: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Set as default BOM
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting || !createForm.productId || !createForm.name}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {submitting ? 'Creating…' : 'Create & Open Builder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ Sub-Components ═══════════════ */

function KPIStat({ label, value, icon: Icon, color, isText }: {
  label: string; value: number | string; icon: any; color: string; isText?: boolean;
}) {
  const colorMap: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
    green: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
    gray: { bg: 'bg-gray-100', icon: 'text-gray-500' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${c.bg}`}>
          <Icon className={`h-4 w-4 ${c.icon}`} />
        </div>
        <div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">{label}</p>
          <p className={`font-bold text-gray-900 ${isText ? 'text-base' : 'text-xl'}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
