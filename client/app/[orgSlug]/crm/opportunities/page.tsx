'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, Search, Filter, TrendingUp, DollarSign,
  AlertTriangle, Trophy, XCircle, GripVertical, Calendar,
  Building2, User, BarChart3, ChevronDown, Clock, ArrowRight,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';

/* ───── Types ───── */
interface Opportunity {
  id: string;
  name: string;
  description: string | null;
  value: number | null;
  currency: string;
  stage: string;
  probability: number;
  expectedCloseDate: string | null;
  source: string | null;
  reasonLost: string | null;
  wonDate: string | null;
  lostDate: string | null;
  createdAt: string;
  updatedAt: string;
  company: { id: string; name: string; type: string } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
  assignedUser: { id: string; firstName: string; lastName: string } | null;
  branch: { id: string; name: string; code: string } | null;
}

interface Metrics {
  totalActive: number;
  totalValue: number;
  weightedValue: number;
  wonCount: number;
  wonValue: number;
  lostCount: number;
  overdueCount: number;
  byStage: { stage: string; count: number; value: number; weighted: number }[];
}

interface BranchOption { id: string; name: string; code: string }

/* ───── Constants ───── */
const STAGES = ['QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const;
const ACTIVE_STAGES = ['QUALIFICATION', 'PROPOSAL', 'NEGOTIATION'];

const STAGE_META: Record<string, { label: string; color: string; icon: React.ReactNode; headerBg: string }> = {
  QUALIFICATION: {
    label: 'Qualification',
    color: 'text-blue-600 dark:text-blue-400',
    icon: <Search className="w-4 h-4" />,
    headerBg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  },
  PROPOSAL: {
    label: 'Proposal',
    color: 'text-amber-600 dark:text-amber-400',
    icon: <BarChart3 className="w-4 h-4" />,
    headerBg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  },
  NEGOTIATION: {
    label: 'Negotiation',
    color: 'text-purple-600 dark:text-purple-400',
    icon: <TrendingUp className="w-4 h-4" />,
    headerBg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  },
  WON: {
    label: 'Closed Won',
    color: 'text-green-600 dark:text-green-400',
    icon: <Trophy className="w-4 h-4" />,
    headerBg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  },
  LOST: {
    label: 'Closed Lost',
    color: 'text-red-500 dark:text-red-400',
    icon: <XCircle className="w-4 h-4" />,
    headerBg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  },
};

const SOURCES = ['REFERRAL', 'WEBSITE', 'TRADE_SHOW', 'COLD_CALL', 'INBOUND', 'PARTNER', 'OTHER'];

/* ───── Helpers ───── */
function formatValue(n: number, currency?: string) {
  if (!n) return '—';
  const fmt = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  try { return fmt.format(n); } catch { return `${currency || ''} ${n.toLocaleString()}`; }
}

function isOverdue(opp: Opportunity) {
  if (!opp.expectedCloseDate) return false;
  if (opp.stage === 'WON' || opp.stage === 'LOST') return false;
  return new Date(opp.expectedCloseDate) < new Date();
}

function daysUntilClose(dateStr: string | null) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return diff;
}

/* ═══════════ MAIN COMPONENT ═══════════ */
export default function OpportunitiesPipelinePage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const router = useRouter();
  const { currency: orgCurrency } = useOrganization();

  const [pipeline, setPipeline] = useState<Record<string, Opportunity[]>>({});
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Lost reason modal
  const [lostModal, setLostModal] = useState<{ oppId: string; stage: string } | null>(null);
  const [lostReason, setLostReason] = useState('');

  const loadPipeline = useCallback(async () => {
    try {
      const url = new URL(`/api/${orgSlug}/crm/opportunities`, window.location.origin);
      if (search) url.searchParams.set('search', search);
      if (branchFilter) url.searchParams.set('branchId', branchFilter);
      if (sourceFilter) url.searchParams.set('source', sourceFilter);
      if (showClosed) url.searchParams.set('includeClosed', 'true');

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to load pipeline');
      const data = await res.json();
      setPipeline(data.pipeline || {});
      setMetrics(data.metrics || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load error');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, search, branchFilter, sourceFilter, showClosed]);

  const loadBranches = useCallback(async () => {
    try {
      const res = await fetch(`/api/${orgSlug}/branches`);
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || data.data || []);
      }
    } catch {}
  }, [orgSlug]);

  useEffect(() => { loadPipeline(); }, [loadPipeline]);
  useEffect(() => { loadBranches(); }, [loadBranches]);

  /* ───── Drag & Drop handlers ───── */
  async function handleDrop(targetStage: string) {
    if (!draggingId || !targetStage) return;

    // Find the dragged opp
    let draggedOpp: Opportunity | null = null;
    for (const opps of Object.values(pipeline)) {
      const found = opps.find((o) => o.id === draggingId);
      if (found) { draggedOpp = found; break; }
    }
    if (!draggedOpp || draggedOpp.stage === targetStage) {
      setDraggingId(null);
      setDragOverStage(null);
      return;
    }

    // If moving to LOST, show reason modal
    if (targetStage === 'LOST') {
      setLostModal({ oppId: draggingId, stage: targetStage });
      setDraggingId(null);
      setDragOverStage(null);
      return;
    }

    // Optimistic update
    const oldPipeline = { ...pipeline };
    const newPipeline = { ...pipeline };
    newPipeline[draggedOpp.stage] = (newPipeline[draggedOpp.stage] || []).filter((o) => o.id !== draggingId);
    const updatedOpp = { ...draggedOpp, stage: targetStage };
    newPipeline[targetStage] = [...(newPipeline[targetStage] || []), updatedOpp];
    setPipeline(newPipeline);

    setDraggingId(null);
    setDragOverStage(null);

    try {
      const res = await fetch(`/api/${orgSlug}/crm/opportunities/${draggingId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: targetStage }),
      });
      if (!res.ok) {
        setPipeline(oldPipeline);
        const data = await res.json();
        setError(data.error || 'Failed to move');
      } else {
        loadPipeline(); // Refresh for accurate metrics
      }
    } catch {
      setPipeline(oldPipeline);
    }
  }

  async function handleLostSubmit() {
    if (!lostModal || !lostReason.trim()) return;
    try {
      const res = await fetch(`/api/${orgSlug}/crm/opportunities/${lostModal.oppId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'LOST', reasonLost: lostReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed');
      }
      setLostModal(null);
      setLostReason('');
      loadPipeline();
    } catch {}
  }

  /* ───── Render ───── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ─── Header ─── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/${orgSlug}/dashboard`)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Pipeline</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Drag deals between stages to update their status
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Filter className="w-4 h-4" /> Filters
              {(branchFilter || sourceFilter) && (
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>
            <button onClick={() => router.push(`/${orgSlug}/crm/opportunities/new`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> New Deal
            </button>
          </div>
        </div>

        {/* ─── Search + Filters panel ─── */}
        <div className="mt-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search deals or companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(e) => setShowClosed(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            Show closed deals
          </label>
        </div>

        {showFilters && (
          <div className="mt-3 pb-1 flex items-center gap-3 flex-wrap">
            {branches.length > 0 && (
              <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm">
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm">
              <option value="">All Sources</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            {(branchFilter || sourceFilter) && (
              <button onClick={() => { setBranchFilter(''); setSourceFilter(''); }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* ─── Metrics Bar ─── */}
      {metrics && (
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard icon={<BarChart3 className="w-5 h-5" />} label="Active Deals" value={String(metrics.totalActive)} color="blue" />
            <MetricCard icon={<DollarSign className="w-5 h-5" />} label="Pipeline Value" value={formatValue(metrics.totalValue, orgCurrency)} color="green" />
            <MetricCard icon={<TrendingUp className="w-5 h-5" />} label="Weighted Forecast" value={formatValue(metrics.weightedValue, orgCurrency)} color="purple" />
            <MetricCard
              icon={<AlertTriangle className="w-5 h-5" />}
              label="Overdue Deals"
              value={String(metrics.overdueCount)}
              color={metrics.overdueCount > 0 ? 'red' : 'gray'}
            />
          </div>
        </div>
      )}

      {/* ─── Kanban Board ─── */}
      <div className="px-6 pb-8 overflow-x-auto">
        <div className="flex gap-4" style={{ minWidth: `${(showClosed ? 5 : 3) * 320}px` }}>
          {(showClosed ? STAGES : ACTIVE_STAGES).map((stage) => {
            const meta = STAGE_META[stage];
            const opps = pipeline[stage] || [];
            const stageMetric = metrics?.byStage.find((s) => s.stage === stage);
            const isDragOver = dragOverStage === stage;

            return (
              <div
                key={stage}
                className={`flex-1 min-w-[280px] max-w-[360px] flex flex-col rounded-xl border transition-all ${
                  isDragOver
                    ? 'border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage); }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop(stage); }}
              >
                {/* Column Header */}
                <div className={`px-4 py-3 rounded-t-xl border-b ${meta.headerBg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={meta.color}>{meta.icon}</span>
                      <h3 className={`font-semibold text-sm ${meta.color}`}>{meta.label}</h3>
                      <span className="px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-bold text-gray-600 dark:text-gray-300">
                        {opps.length}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      {formatValue(stageMetric?.value || 0, orgCurrency)}
                    </span>
                  </div>
                  {ACTIVE_STAGES.includes(stage) && stageMetric && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                      Weighted: {formatValue(stageMetric.weighted, orgCurrency)}
                    </p>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-380px)]">
                  {opps.length === 0 && (
                    <div className="py-8 text-center text-xs text-gray-400 dark:text-gray-600">
                      No deals
                    </div>
                  )}

                  {opps.map((opp) => {
                    const overdue = isOverdue(opp);
                    const days = daysUntilClose(opp.expectedCloseDate);

                    return (
                      <div
                        key={opp.id}
                        draggable
                        onDragStart={() => setDraggingId(opp.id)}
                        onDragEnd={() => { setDraggingId(null); setDragOverStage(null); }}
                        onClick={() => router.push(`/${orgSlug}/crm/opportunities/${opp.id}`)}
                        className={`group relative p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                          draggingId === opp.id
                            ? 'opacity-50 border-blue-300 dark:border-blue-600'
                            : overdue
                            ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {/* Drag handle */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                        </div>

                        {/* Overdue badge */}
                        {overdue && (
                          <div className="flex items-center gap-1 mb-1.5">
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                            <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">OVERDUE</span>
                          </div>
                        )}

                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate pr-6">
                          {opp.name}
                        </p>

                        {opp.company && (
                          <div className="flex items-center gap-1 mt-1">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{opp.company.name}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {opp.value ? formatValue(Number(opp.value), opp.currency) : '—'}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            Number(opp.probability) >= 70
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : Number(opp.probability) >= 40
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}>
                            {Number(opp.probability)}%
                          </span>
                        </div>

                        {/* Footer: close date + assignee */}
                        <div className="flex items-center justify-between mt-1.5">
                          {opp.expectedCloseDate ? (
                            <div className={`flex items-center gap-1 ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                              <Calendar className="w-3 h-3" />
                              <span className="text-[10px]">
                                {days !== null && days >= 0 ? `${days}d left` : days !== null ? `${Math.abs(days)}d ago` : ''}
                              </span>
                            </div>
                          ) : (
                            <span />
                          )}
                          {opp.assignedUser && (
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[8px] font-bold">
                                {opp.assignedUser.firstName[0]}{opp.assignedUser.lastName[0]}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Lost Reason Modal ─── */}
      {lostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Mark as Lost</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Please provide a reason for losing this deal. This helps improve future sales strategies.
            </p>
            <textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              rows={3}
              placeholder="e.g., Lost to competitor on price, Budget cut, Timing not right..."
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setLostModal(null); setLostReason(''); }}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button
                onClick={handleLostSubmit}
                disabled={!lostReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                Mark as Lost
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── Metric Card ───── */
function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
    gray: 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.gray}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-medium opacity-70">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
