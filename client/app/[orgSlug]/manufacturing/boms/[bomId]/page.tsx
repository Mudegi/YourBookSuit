'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Layers,
  Package,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Archive,
  RefreshCw,
  Calculator,
  GitBranch,
  Percent,
  X,
  Boxes,
  Settings2,
} from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetch-client';

/* ═══════════════ Types ═══════════════ */

interface BOMLine {
  id: string;
  componentId: string;
  componentSku: string;
  componentName: string;
  componentCategory: string | null;
  componentUOM: string | null;
  quantityPer: number;
  scrapPercent: number;
  effectiveQty: number;
  unitCost: number;
  extendedCost: number;
  backflush: boolean;
  operationSeq: number | null;
}

interface BOMDetail {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  productCategory: string | null;
  productUOM: string | null;
  name: string;
  version: string;
  status: string;
  isDefault: boolean;
  revisionNotes: string | null;
  yieldPercent: number;
  scrapPercent: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  lines: BOMLine[];
  createdAt: string;
  updatedAt: string;
}

interface CostTreeNode {
  bomLineId: string | null;
  productId: string;
  sku: string;
  name: string;
  unitOfMeasure: string | null;
  quantityPer: number;
  scrapPercent: number;
  effectiveQty: number;
  unitCost: number;
  extendedCost: number;
  isSubAssembly: boolean;
  depth: number;
  children: CostTreeNode[];
}

interface CostBreakdown {
  totalMaterialCost: number;
  scrapAllowanceCost: number;
  standardCost: number;
  tree: CostTreeNode[];
  calculatedAt: string;
}

interface ProductOption {
  id: string;
  sku: string;
  name: string;
}

interface EditLine {
  key: string; // temp key for React
  componentId: string;
  quantityPer: number;
  scrapPercent: number;
  backflush: boolean;
  operationSeq: number | null;
  // Display-only
  componentSku?: string;
  componentName?: string;
  componentUOM?: string | null;
}

/* ═══════════════ Helpers ═══════════════ */

function fmtCurrency(n: number) {
  return `UGX ${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtNum(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

let keyCounter = 0;
function nextKey() { return `line-${++keyCounter}`; }

const statusConfig: Record<string, { label: string; bg: string; icon: any }> = {
  DRAFT: { label: 'Draft', bg: 'bg-gray-100 text-gray-700', icon: FileText },
  ACTIVE: { label: 'Active', bg: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  ARCHIVED: { label: 'Archived', bg: 'bg-amber-100 text-amber-700', icon: Archive },
};

/* ═══════════════ Page ═══════════════ */

export default function BOMBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const bomId = params?.bomId as string;

  const [bom, setBom] = useState<BOMDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [costData, setCostData] = useState<CostBreakdown | null>(null);
  const [costLoading, setCostLoading] = useState(false);
  const [showCostTree, setShowCostTree] = useState(false);

  // Editable state
  const [editName, setEditName] = useState('');
  const [editVersion, setEditVersion] = useState('');
  const [editStatus, setEditStatus] = useState('DRAFT');
  const [editIsDefault, setEditIsDefault] = useState(false);
  const [editRevisionNotes, setEditRevisionNotes] = useState('');
  const [editYieldPercent, setEditYieldPercent] = useState(100);
  const [editScrapPercent, setEditScrapPercent] = useState(0);
  const [editLines, setEditLines] = useState<EditLine[]>([]);
  const [dirty, setDirty] = useState(false);

  const loadBOM = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/${orgSlug}/manufacturing/boms/${bomId}`);
      if (!res.ok) throw new Error('Failed to load BOM');
      const json = await res.json();
      const data = json.data as BOMDetail;
      setBom(data);
      setEditName(data.name);
      setEditVersion(data.version);
      setEditStatus(data.status);
      setEditIsDefault(data.isDefault);
      setEditRevisionNotes(data.revisionNotes || '');
      setEditYieldPercent(data.yieldPercent);
      setEditScrapPercent(data.scrapPercent);
      setEditLines(data.lines.map(l => ({
        key: nextKey(),
        componentId: l.componentId,
        quantityPer: l.quantityPer,
        scrapPercent: l.scrapPercent,
        backflush: l.backflush,
        operationSeq: l.operationSeq,
        componentSku: l.componentSku,
        componentName: l.componentName,
        componentUOM: l.componentUOM,
      })));
      setDirty(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load BOM');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, bomId]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/${orgSlug}/inventory/products`);
      if (!res.ok) return;
      const json = await res.json();
      setProducts((json.data || []).map((p: any) => ({ id: p.id, sku: p.sku, name: p.name })));
    } catch { /* ignore */ }
  }, [orgSlug]);

  const loadCost = useCallback(async () => {
    setCostLoading(true);
    try {
      const res = await fetchWithAuth(`/api/${orgSlug}/manufacturing/boms/${bomId}/cost`);
      if (!res.ok) throw new Error('Failed to calculate cost');
      const json = await res.json();
      setCostData(json.data);
      setShowCostTree(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate cost');
    } finally {
      setCostLoading(false);
    }
  }, [orgSlug, bomId]);

  useEffect(() => {
    if (orgSlug && bomId) {
      loadBOM();
      loadProducts();
    }
  }, [orgSlug, bomId, loadBOM, loadProducts]);

  /* ─── Line management ─── */
  const addLine = () => {
    setEditLines(prev => [...prev, {
      key: nextKey(),
      componentId: '',
      quantityPer: 1,
      scrapPercent: 0,
      backflush: true,
      operationSeq: null,
    }]);
    setDirty(true);
  };

  const removeLine = (key: string) => {
    setEditLines(prev => prev.filter(l => l.key !== key));
    setDirty(true);
  };

  const updateLine = (key: string, field: string, value: any) => {
    setEditLines(prev => prev.map(l => {
      if (l.key !== key) return l;
      const updated = { ...l, [field]: value };
      // If component changed, resolve display fields
      if (field === 'componentId') {
        const prod = products.find(p => p.id === value);
        updated.componentSku = prod?.sku;
        updated.componentName = prod?.name;
      }
      return updated;
    }));
    setDirty(true);
  };

  /* ─── Save ─── */
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: editName,
        version: editVersion,
        status: editStatus,
        isDefault: editIsDefault,
        revisionNotes: editRevisionNotes || undefined,
        yieldPercent: editYieldPercent,
        scrapPercent: editScrapPercent,
        lines: editLines
          .filter(l => l.componentId)
          .map(l => ({
            componentId: l.componentId,
            quantityPer: l.quantityPer,
            scrapPercent: l.scrapPercent,
            backflush: l.backflush,
            operationSeq: l.operationSeq,
          })),
      };
      const res = await fetchWithAuth(`/api/${orgSlug}/manufacturing/boms/${bomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save BOM');
      await loadBOM();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-4">Loading BOM…</p>
        </div>
      </div>
    );
  }

  if (!bom) {
    return (
      <div className="p-8 text-center">
        <Layers className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">{error || 'BOM not found.'}</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          Go Back
        </button>
      </div>
    );
  }

  const sc = statusConfig[bom.status] || statusConfig.DRAFT;
  const StatusIcon = sc.icon;

  // Calculate totals from current lines
  const totalEstCost = bom.lines.reduce((s, l) => s + l.extendedCost, 0);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* ═══ Top Bar ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${orgSlug}/manufacturing/boms`)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              {bom.name}
              <span className="text-sm font-mono text-gray-400 font-normal">v{bom.version}</span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Package className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-sm text-gray-500">{bom.productName}</span>
              <span className="text-xs font-mono text-gray-400">({bom.productSku})</span>
              {bom.productUOM && <span className="text-xs text-gray-400">· {bom.productUOM}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg}`}>
            <StatusIcon className="h-3 w-3" />
            {sc.label}
          </span>
          {bom.isDefault && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">Default</span>
          )}
          <button
            onClick={loadCost}
            disabled={costLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-purple-300 text-purple-700 rounded-lg text-sm hover:bg-purple-50 disabled:opacity-50"
          >
            <Calculator className={`h-4 w-4 ${costLoading ? 'animate-spin' : ''}`} />
            Calculate Cost
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shadow-sm"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ═══ Cost Rollup Summary ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <CostCard label="Material Cost" value={fmtCurrency(totalEstCost)} icon={DollarSign} color="green" />
        <CostCard label="Components" value={editLines.filter(l => l.componentId).length} icon={Boxes} color="blue" />
        <CostCard label="Yield" value={`${editYieldPercent}%`} icon={Percent} color="purple" />
        <CostCard label="BOM Scrap" value={`${editScrapPercent}%`} icon={AlertTriangle} color={editScrapPercent > 0 ? 'amber' : 'gray'} />
      </div>

      {/* ═══ BOM Header Edit ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-gray-500" />
          BOM Properties
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">BOM Name</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              value={editName}
              onChange={e => { setEditName(e.target.value); setDirty(true); }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Version</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              value={editVersion}
              onChange={e => { setEditVersion(e.target.value); setDirty(true); }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500"
              value={editStatus}
              onChange={e => { setEditStatus(e.target.value); setDirty(true); }}
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="block text-xs font-medium text-gray-500">Options</label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={editIsDefault}
                onChange={e => { setEditIsDefault(e.target.checked); setDirty(true); }}
                className="rounded border-gray-300 text-blue-600"
              />
              Default BOM
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Yield %</label>
            <input
              type="number" step="0.01" min="0" max="150"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              value={editYieldPercent}
              onChange={e => { setEditYieldPercent(Number(e.target.value)); setDirty(true); }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Scrap %</label>
            <input
              type="number" step="0.01" min="0" max="100"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              value={editScrapPercent}
              onChange={e => { setEditScrapPercent(Number(e.target.value)); setDirty(true); }}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Revision Notes</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              value={editRevisionNotes}
              onChange={e => { setEditRevisionNotes(e.target.value); setDirty(true); }}
              placeholder="What changed in this version?"
            />
          </div>
        </div>
      </div>

      {/* ═══ Recipe Grid (Component Lines) ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">Recipe Components</h2>
            <span className="px-2 py-0.5 bg-white/80 text-gray-700 rounded-full text-[10px] font-semibold border border-gray-200">
              {editLines.filter(l => l.componentId).length}
            </span>
          </div>
          <button
            onClick={addLine}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Component
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="text-left py-2.5 px-4 font-medium w-8">#</th>
                <th className="text-left py-2.5 px-4 font-medium">Component</th>
                <th className="text-left py-2.5 px-4 font-medium w-20">UOM</th>
                <th className="text-right py-2.5 px-4 font-medium w-28">Qty / Unit</th>
                <th className="text-right py-2.5 px-4 font-medium w-24">Scrap %</th>
                <th className="text-right py-2.5 px-4 font-medium w-28">Eff. Qty</th>
                <th className="text-right py-2.5 px-4 font-medium w-28">Unit Cost</th>
                <th className="text-right py-2.5 px-4 font-medium w-32">Ext. Cost</th>
                <th className="text-center py-2.5 px-4 font-medium w-20">Backflush</th>
                <th className="text-center py-2.5 px-4 font-medium w-20">Seq</th>
                <th className="text-center py-2.5 px-4 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {editLines.map((line, idx) => {
                const saved = bom.lines.find(l => l.componentId === line.componentId);
                const effQty = line.quantityPer * (1 + line.scrapPercent / 100);
                const unitCost = saved?.unitCost ?? 0;
                const extCost = effQty * unitCost;

                return (
                  <tr key={line.key} className="hover:bg-gray-50/50">
                    <td className="py-2 px-4 text-xs text-gray-400 font-mono">{idx + 1}</td>
                    <td className="py-2 px-4">
                      <select
                        value={line.componentId}
                        onChange={e => updateLine(line.key, 'componentId', e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white min-w-[200px]"
                      >
                        <option value="">Select component…</option>
                        {products
                          .filter(p => p.id !== bom.productId) // Can't add self
                          .map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                          ))}
                      </select>
                    </td>
                    <td className="py-2 px-4 text-xs text-gray-500">{line.componentUOM || '—'}</td>
                    <td className="py-2 px-4">
                      <input
                        type="number" step="0.0001" min="0"
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-blue-500"
                        value={line.quantityPer}
                        onChange={e => updateLine(line.key, 'quantityPer', Number(e.target.value))}
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number" step="0.01" min="0" max="100"
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-blue-500"
                        value={line.scrapPercent}
                        onChange={e => updateLine(line.key, 'scrapPercent', Number(e.target.value))}
                      />
                    </td>
                    <td className="py-2 px-4 text-right text-gray-700 font-mono text-xs">{fmtNum(effQty)}</td>
                    <td className="py-2 px-4 text-right text-gray-500 text-xs">{unitCost > 0 ? fmtCurrency(unitCost) : '—'}</td>
                    <td className="py-2 px-4 text-right font-semibold text-gray-900 text-xs">{extCost > 0 ? fmtCurrency(extCost) : '—'}</td>
                    <td className="py-2 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={line.backflush}
                        onChange={e => updateLine(line.key, 'backflush', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number" min="1"
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-500"
                        value={line.operationSeq ?? ''}
                        onChange={e => updateLine(line.key, 'operationSeq', e.target.value ? Number(e.target.value) : null)}
                        placeholder="—"
                      />
                    </td>
                    <td className="py-2 px-4 text-center">
                      <button
                        onClick={() => removeLine(line.key)}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {editLines.length === 0 && (
                <tr>
                  <td className="py-8 text-center text-gray-500" colSpan={11}>
                    <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm">No components yet. Click "Add Component" to start building your recipe.</p>
                  </td>
                </tr>
              )}
            </tbody>
            {editLines.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                  <td className="py-3 px-4" colSpan={7}>
                    <span className="text-xs font-semibold text-gray-500 uppercase">Total Estimated Cost</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-base font-bold text-gray-900">{fmtCurrency(totalEstCost)}</span>
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ═══ Cost Tree Explorer (shown after Calculate Cost) ═══ */}
      {showCostTree && costData && (
        <div className="bg-white rounded-xl border border-purple-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-purple-600" />
              <div>
                <h2 className="text-sm font-semibold text-gray-900">BOM Cost Explorer</h2>
                <p className="text-[10px] text-gray-500">Multi-level cost breakdown with sub-assembly resolution</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase">Standard Cost</p>
                <p className="text-lg font-bold text-purple-700">{fmtCurrency(costData.standardCost)}</p>
              </div>
              <button onClick={() => setShowCostTree(false)} className="p-1 rounded hover:bg-purple-100">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="p-4">
            {/* Cost summary row */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-500 uppercase">Material Cost</p>
                <p className="text-sm font-bold text-gray-900">{fmtCurrency(costData.totalMaterialCost)}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-[10px] text-amber-600 uppercase">Scrap Allowance</p>
                <p className="text-sm font-bold text-amber-700">{fmtCurrency(costData.scrapAllowanceCost)}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-[10px] text-purple-600 uppercase">Standard Cost</p>
                <p className="text-sm font-bold text-purple-700">{fmtCurrency(costData.standardCost)}</p>
              </div>
            </div>

            {/* Tree view */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="text-xs text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100 grid grid-cols-12 py-2 px-3 font-medium">
                <div className="col-span-5">Component</div>
                <div className="col-span-1 text-right">Qty</div>
                <div className="col-span-1 text-right">Scrap%</div>
                <div className="col-span-1 text-right">Eff.Qty</div>
                <div className="col-span-2 text-right">Unit Cost</div>
                <div className="col-span-2 text-right">Extended</div>
              </div>
              <div className="divide-y divide-gray-50">
                {costData.tree.map((node, i) => (
                  <TreeNodeRow key={i} node={node} />
                ))}
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              Calculated at {new Date(costData.calculatedAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ Sub-Components ═══════════════ */

function TreeNodeRow({ node }: { node: CostTreeNode }) {
  const [expanded, setExpanded] = useState(true);
  const indent = node.depth * 20;

  return (
    <>
      <div className={`grid grid-cols-12 py-2 px-3 text-sm hover:bg-gray-50 ${node.isSubAssembly ? 'bg-blue-50/30' : ''}`}>
        <div className="col-span-5 flex items-center gap-1" style={{ paddingLeft: indent }}>
          {node.isSubAssembly ? (
            <button onClick={() => setExpanded(!expanded)} className="p-0.5">
              {expanded ? <ChevronDown className="h-3.5 w-3.5 text-blue-500" /> : <ChevronRight className="h-3.5 w-3.5 text-blue-500" />}
            </button>
          ) : (
            <span className="w-4.5" />
          )}
          {node.isSubAssembly ? (
            <Layers className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 ml-0.5" />
          ) : (
            <Package className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 ml-0.5" />
          )}
          <span className={`font-medium truncate ${node.isSubAssembly ? 'text-blue-700' : 'text-gray-900'}`}>
            {node.name}
          </span>
          <span className="text-[10px] font-mono text-gray-400 ml-1">{node.sku}</span>
          {node.unitOfMeasure && <span className="text-[10px] text-gray-400 ml-1">({node.unitOfMeasure})</span>}
        </div>
        <div className="col-span-1 text-right font-mono text-gray-700">{fmtNum(node.quantityPer)}</div>
        <div className="col-span-1 text-right text-gray-500">{node.scrapPercent > 0 ? `${node.scrapPercent}%` : '—'}</div>
        <div className="col-span-1 text-right font-mono text-gray-700">{fmtNum(node.effectiveQty)}</div>
        <div className="col-span-2 text-right text-gray-600">{fmtCurrency(node.unitCost)}</div>
        <div className="col-span-2 text-right font-semibold text-gray-900">{fmtCurrency(node.extendedCost)}</div>
      </div>
      {node.isSubAssembly && expanded && node.children.map((child, i) => (
        <TreeNodeRow key={i} node={child} />
      ))}
    </>
  );
}

function CostCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: any; color: string;
}) {
  const colorMap: Record<string, { bg: string; icon: string }> = {
    green: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600' },
    gray: { bg: 'bg-gray-100', icon: 'text-gray-500' },
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
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
