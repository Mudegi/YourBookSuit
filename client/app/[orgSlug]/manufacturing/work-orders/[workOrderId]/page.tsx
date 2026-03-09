'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Factory,
  Package,
  Layers,
  Clock,
  CheckCircle2,
  ClipboardList,
  PauseCircle,
  XCircle,
  Lock,
  AlertTriangle,
  Play,
  Square,
  Pause,
  RotateCcw,
  ChevronRight,
  Boxes,
  DollarSign,
  Target,
  Percent,
  X,
  CalendarDays,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetch-client';

/* ═══ Types ═══ */

interface Material {
  id: string;
  componentId: string;
  componentSku: string;
  componentName: string;
  componentUOM: string | null;
  requiredQuantity: number;
  issuedQuantity: number;
  scrapPercent: number;
  backflush: boolean;
  available: number;
  unitCost: number;
}

interface Operation {
  id: string;
  sequence: number;
  status: string;
  setupTimeMins: number;
  runTimeMins: number;
  laborTimeMins: number;
  startedAt: string | null;
  completedAt: string | null;
}

interface WODetail {
  id: string;
  workOrderNumber: string;
  productId: string;
  productSku: string;
  productName: string;
  productUOM: string | null;
  bomId: string | null;
  bomName: string | null;
  bomStatus: string | null;
  branchId: string | null;
  branchName: string | null;
  status: string;
  priority: number;
  quantityPlanned: number;
  quantityCompleted: number;
  quantityScrapped: number;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  materials: Material[];
  operations: Operation[];
}

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

const priorityLabels: Record<number, string> = { 1: 'Low', 2: 'Normal', 3: 'Medium', 4: 'High', 5: 'Urgent' };

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtCurrency(n: number) {
  return `UGX ${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/* ═══ Page ═══ */

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const workOrderId = params?.workOrderId as string;

  const [wo, setWo] = useState<WODetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Completion form
  const [showComplete, setShowComplete] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    actualProduced: 0,
    actualScrapped: 0,
    laborCost: 0,
    overheadCost: 0,
    notes: '',
  });

  const loadWO = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/${orgSlug}/manufacturing/work-orders/${workOrderId}`);
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setWo(json.data);
      setCompleteForm(prev => ({
        ...prev,
        actualProduced: json.data.quantityPlanned - json.data.quantityCompleted,
      }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load work order');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, workOrderId]);

  useEffect(() => { if (orgSlug && workOrderId) loadWO(); }, [orgSlug, workOrderId, loadWO]);

  const doAction = async (action: string, payload: any = {}) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/${orgSlug}/manufacturing/work-orders/${workOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Failed to ${action}`);
      setShowComplete(false);
      await loadWO();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-4">Loading work order…</p>
        </div>
      </div>
    );
  }

  if (!wo) {
    return (
      <div className="p-8 text-center">
        <Factory className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">{error || 'Work order not found.'}</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Go Back</button>
      </div>
    );
  }

  const sc = statusCfg[wo.status] || statusCfg.PLANNED;
  const StatusIcon = sc.icon;
  const outputProgress = wo.quantityPlanned > 0
    ? Math.min(100, Math.round((wo.quantityCompleted / wo.quantityPlanned) * 100))
    : 0;
  const yieldPct = wo.quantityPlanned > 0 && wo.quantityCompleted > 0
    ? Math.round((wo.quantityCompleted / wo.quantityPlanned) * 100)
    : null;
  const totalMaterialRequired = wo.materials.reduce((s, m) => s + m.requiredQuantity, 0);
  const totalMaterialIssued = wo.materials.reduce((s, m) => s + m.issuedQuantity, 0);
  const materialProgress = totalMaterialRequired > 0
    ? Math.min(100, Math.round((totalMaterialIssued / totalMaterialRequired) * 100))
    : 0;
  const estMaterialCost = wo.materials.reduce((s, m) => s + m.requiredQuantity * m.unitCost, 0);
  const isDue = wo.dueDate && new Date(wo.dueDate) < new Date() && !['COMPLETED','CLOSED','CANCELLED'].includes(wo.status);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* ═══ Top Bar ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/${orgSlug}/manufacturing/work-orders`)} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Factory className="h-5 w-5 text-blue-600" />
              {wo.workOrderNumber}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Package className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-sm text-gray-500">{wo.productName}</span>
              <span className="text-xs font-mono text-gray-400">({wo.productSku})</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg}`}>
            <StatusIcon className="h-3 w-3" />{sc.label}
          </span>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
            Priority: {priorityLabels[wo.priority] || wo.priority}
          </span>

          {/* Action Buttons based on status */}
          {wo.status === 'PLANNED' && (
            <button onClick={() => doAction('release')} disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" />Release
            </button>
          )}
          {wo.status === 'RELEASED' && (
            <button onClick={() => doAction('start')} disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              <Play className="h-4 w-4" />Start Production
            </button>
          )}
          {wo.status === 'IN_PROGRESS' && (
            <>
              <button onClick={() => doAction('hold')} disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-orange-300 text-orange-700 rounded-lg text-sm hover:bg-orange-50 disabled:opacity-50">
                <Pause className="h-4 w-4" />Hold
              </button>
              <button onClick={() => setShowComplete(true)} disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                <Square className="h-4 w-4" />Complete
              </button>
            </>
          )}
          {wo.status === 'HOLD' && (
            <button onClick={() => doAction('resume')} disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              <RotateCcw className="h-4 w-4" />Resume
            </button>
          )}
          {wo.status === 'COMPLETED' && (
            <button onClick={() => doAction('close')} disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-purple-300 text-purple-700 rounded-lg text-sm hover:bg-purple-50 disabled:opacity-50">
              <Lock className="h-4 w-4" />Close
            </button>
          )}
          {!['COMPLETED','CLOSED','CANCELLED'].includes(wo.status) && (
            <button
              onClick={() => { if (confirm('Cancel this work order?')) doAction('cancel'); }}
              disabled={actionLoading}
              className="inline-flex items-center gap-1 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />Cancel
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ═══ KPI Cards ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <KpiCard label="Planned" value={wo.quantityPlanned} icon={Target} color="blue" />
        <KpiCard label="Produced" value={wo.quantityCompleted} icon={CheckCircle2} color="green" />
        <KpiCard label="Scrapped" value={wo.quantityScrapped} icon={AlertTriangle} color={wo.quantityScrapped > 0 ? 'red' : 'gray'} />
        <KpiCard label="Yield" value={yieldPct !== null ? `${yieldPct}%` : '—'} icon={TrendingUp} color={yieldPct !== null && yieldPct >= 95 ? 'green' : yieldPct !== null && yieldPct >= 80 ? 'amber' : 'gray'} />
        <KpiCard label="Components" value={wo.materials.length} icon={Boxes} color="purple" />
        <KpiCard label="Est. Material Cost" value={fmtCurrency(estMaterialCost)} icon={DollarSign} color="green" small />
      </div>

      {/* ═══ Order Info Bar ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
          <InfoItem label="BOM" value={wo.bomName || '—'} />
          <InfoItem label="Branch" value={wo.branchName || '—'} />
          <InfoItem label="Start Date" value={fmtDate(wo.startDate)} />
          <InfoItem label="Due Date" value={fmtDate(wo.dueDate)} highlight={!!isDue} />
          <InfoItem label="Completed" value={fmtDate(wo.completedAt)} />
          <InfoItem label="Created" value={fmtDate(wo.createdAt)} />
        </div>
        {wo.notes && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-1">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{wo.notes}</p>
          </div>
        )}
      </div>

      {/* ═══ Output Progress ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-500" />
          Production Progress
        </h2>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Output: {wo.quantityCompleted} / {wo.quantityPlanned} {wo.productUOM || 'units'}</span>
              <span className="font-semibold">{outputProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${outputProgress >= 100 ? 'bg-emerald-500' : outputProgress > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                style={{ width: `${outputProgress}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Material Consumption</span>
              <span className="font-semibold">{materialProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${materialProgress >= 100 ? 'bg-emerald-400' : materialProgress > 0 ? 'bg-amber-400' : 'bg-gray-300'}`}
                style={{ width: `${materialProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Material Checklist (Pick List) ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <Boxes className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-gray-900">Material Checklist (Pick List)</h2>
          <span className="px-2 py-0.5 bg-white/80 text-gray-700 rounded-full text-[10px] font-semibold border border-gray-200">
            {wo.materials.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="text-left py-2.5 px-4 font-medium">#</th>
                <th className="text-left py-2.5 px-4 font-medium">Component</th>
                <th className="text-left py-2.5 px-4 font-medium">UOM</th>
                <th className="text-right py-2.5 px-4 font-medium">Required</th>
                <th className="text-right py-2.5 px-4 font-medium">Issued</th>
                <th className="text-right py-2.5 px-4 font-medium">Remaining</th>
                <th className="text-right py-2.5 px-4 font-medium">Available</th>
                <th className="text-right py-2.5 px-4 font-medium">Unit Cost</th>
                <th className="text-right py-2.5 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {wo.materials.map((m, i) => {
                const remaining = m.requiredQuantity - m.issuedQuantity;
                const fulfilled = remaining <= 0;
                const shortage = !fulfilled && m.available < remaining;

                return (
                  <tr key={m.id} className="hover:bg-gray-50/50">
                    <td className="py-2 px-4 text-xs text-gray-400 font-mono">{i + 1}</td>
                    <td className="py-2 px-4">
                      <p className="font-medium text-gray-900">{m.componentName}</p>
                      <p className="text-[10px] font-mono text-gray-400">{m.componentSku}</p>
                    </td>
                    <td className="py-2 px-4 text-xs text-gray-500">{m.componentUOM || '—'}</td>
                    <td className="py-2 px-4 text-right font-mono">{m.requiredQuantity.toLocaleString()}</td>
                    <td className="py-2 px-4 text-right font-mono text-blue-700">{m.issuedQuantity.toLocaleString()}</td>
                    <td className={`py-2 px-4 text-right font-mono ${remaining > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                      {remaining > 0 ? remaining.toLocaleString() : '✓'}
                    </td>
                    <td className={`py-2 px-4 text-right font-mono ${shortage ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                      {m.available.toLocaleString()}
                      {shortage && <AlertTriangle className="h-3 w-3 inline ml-1 text-red-500" />}
                    </td>
                    <td className="py-2 px-4 text-right text-xs text-gray-500">{fmtCurrency(m.unitCost)}</td>
                    <td className="py-2 px-4 text-right">
                      {fulfilled ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-medium">
                          <CheckCircle2 className="h-2.5 w-2.5" />Fulfilled
                        </span>
                      ) : shortage ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-medium">
                          <AlertTriangle className="h-2.5 w-2.5" />Shortage
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-medium">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {wo.materials.length === 0 && (
                <tr>
                  <td className="py-8 text-center text-gray-500" colSpan={9}>
                    <Boxes className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm">No materials linked to this work order.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ Completion Modal ═══ */}
      {showComplete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowComplete(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Complete Work Order
            </h2>
            <p className="text-sm text-gray-500">
              Record output and costs. This will issue remaining raw materials, receive finished goods, and post GL entries.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Quantity Produced *</label>
                <input
                  type="number" min="0" step="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={completeForm.actualProduced}
                  onChange={e => setCompleteForm(p => ({ ...p, actualProduced: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Scrapped</label>
                <input
                  type="number" min="0" step="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={completeForm.actualScrapped}
                  onChange={e => setCompleteForm(p => ({ ...p, actualScrapped: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Labor Cost</label>
                <input
                  type="number" min="0" step="100"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={completeForm.laborCost}
                  onChange={e => setCompleteForm(p => ({ ...p, laborCost: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Overhead Cost</label>
                <input
                  type="number" min="0" step="100"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={completeForm.overheadCost}
                  onChange={e => setCompleteForm(p => ({ ...p, overheadCost: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={completeForm.notes}
                onChange={e => setCompleteForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Optional completion notes"
              />
            </div>

            {/* Yield preview */}
            {wo.quantityPlanned > 0 && completeForm.actualProduced > 0 && (
              <div className={`rounded-lg p-3 text-sm ${
                (completeForm.actualProduced / wo.quantityPlanned) >= 0.95
                  ? 'bg-emerald-50 text-emerald-700'
                  : (completeForm.actualProduced / wo.quantityPlanned) >= 0.8
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-red-50 text-red-700'
              }`}>
                <span className="font-semibold">Yield Preview: </span>
                {Math.round((completeForm.actualProduced / wo.quantityPlanned) * 100)}%
                ({completeForm.actualProduced} of {wo.quantityPlanned} planned)
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowComplete(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button
                onClick={() => doAction('complete', completeForm)}
                disabled={actionLoading || completeForm.actualProduced <= 0}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing…' : 'Complete Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ Sub-components ═══ */

function KpiCard({ label, value, icon: Icon, color, small }: {
  label: string; value: string | number; icon: any; color: string; small?: boolean;
}) {
  const colors: Record<string, { bg: string; ic: string }> = {
    blue:   { bg: 'bg-blue-50', ic: 'text-blue-600' },
    green:  { bg: 'bg-emerald-50', ic: 'text-emerald-600' },
    amber:  { bg: 'bg-amber-50', ic: 'text-amber-600' },
    red:    { bg: 'bg-red-50', ic: 'text-red-600' },
    purple: { bg: 'bg-purple-50', ic: 'text-purple-600' },
    gray:   { bg: 'bg-gray-100', ic: 'text-gray-500' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${c.bg}`}><Icon className={`h-3.5 w-3.5 ${c.ic}`} /></div>
        <div className="min-w-0">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium truncate">{label}</p>
          <p className={`font-bold text-gray-900 truncate ${small ? 'text-sm' : 'text-lg'}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-red-600' : 'text-gray-900'}`}>
        {highlight && <AlertTriangle className="h-3 w-3 inline mr-1" />}
        {value}
      </p>
    </div>
  );
}
