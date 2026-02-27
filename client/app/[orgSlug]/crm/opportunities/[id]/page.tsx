'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Building2, User, Calendar, DollarSign,
  TrendingUp, AlertTriangle, Trophy, XCircle, Edit3, X,
  Phone, Mail, FileText, ArrowRight, Clock, CheckCircle2,
  Target, Briefcase, MessageSquare, BarChart3, Trash2,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';

/* ───── Types ───── */
type Stage = 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

interface Opportunity {
  id: string;
  name: string;
  description: string | null;
  value: number | null;
  currency: string;
  stage: Stage;
  probability: number;
  expectedCloseDate: string | null;
  source: string | null;
  reasonLost: string | null;
  wonDate: string | null;
  lostDate: string | null;
  closedDate: string | null;
  convertedEstimateId: string | null;
  convertedInvoiceId: string | null;
  weightedValue: number;
  createdAt: string;
  updatedAt: string;
  company: { id: string; name: string; type: string; lifecycleStage: string } | null;
  contact: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; whatsapp: string | null } | null;
  assignedUser: { id: string; firstName: string; lastName: string; email: string | null } | null;
  branch: { id: string; name: string; code: string } | null;
}

interface Activity {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  createdAt: string;
  createdByUser: { firstName: string; lastName: string };
}

/* ───── Constants ───── */
const STAGES: { value: Stage; label: string }[] = [
  { value: 'QUALIFICATION', label: 'Qualification' },
  { value: 'PROPOSAL', label: 'Proposal' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
];

const STAGE_PROBABILITY: Record<string, number> = {
  QUALIFICATION: 10, PROPOSAL: 50, NEGOTIATION: 70, WON: 100, LOST: 0,
};

const SOURCES = ['REFERRAL', 'WEBSITE', 'TRADE_SHOW', 'COLD_CALL', 'INBOUND', 'PARTNER', 'OTHER'];

const STAGE_COLORS: Record<string, string> = {
  QUALIFICATION: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  PROPOSAL: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  NEGOTIATION: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  WON: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  LOST: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
};

/* ───── Helpers ───── */
function formatValue(n: number, currency?: string) {
  if (!n) return '—';
  const fmt = new Intl.NumberFormat(undefined, {
    style: 'currency', currency: currency || 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
  try { return fmt.format(n); } catch { return `${currency || ''} ${n.toLocaleString()}`; }
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function isOverdue(opp: Opportunity) {
  if (!opp.expectedCloseDate || opp.stage === 'WON' || opp.stage === 'LOST') return false;
  return new Date(opp.expectedCloseDate) < new Date();
}

/* ═══════════ MAIN ═══════════ */
export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const id = params?.id as string;
  const { currency: orgCurrency } = useOrganization();

  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<'details' | 'activity'>('details');

  // Edit form
  const [form, setForm] = useState({
    name: '', description: '', value: '', currency: '', stage: 'QUALIFICATION' as Stage,
    probability: 10, expectedCloseDate: '', source: '', reason: '', reasonLost: '',
  });

  // Conversion state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [converting, setConverting] = useState(false);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadOpp = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${orgSlug}/crm/opportunities/${id}`);
      if (!res.ok) throw new Error('Failed to load opportunity');
      const data = await res.json();
      setOpp(data.data);
      setActivities(data.activities || []);
      populateForm(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, id]);

  function populateForm(o: Opportunity) {
    setForm({
      name: o.name || '',
      description: o.description || '',
      value: o.value != null ? String(o.value) : '',
      currency: o.currency || orgCurrency || 'USD',
      stage: o.stage,
      probability: Number(o.probability) ?? 50,
      expectedCloseDate: o.expectedCloseDate ? new Date(o.expectedCloseDate).toISOString().slice(0, 10) : '',
      source: o.source || '',
      reason: o.reasonLost || '',
      reasonLost: o.reasonLost || '',
    });
  }

  useEffect(() => { loadOpp(); }, [loadOpp]);

  async function handleSave() {
    if (!opp) return;
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        name: form.name,
        description: form.description || null,
        value: form.value ? Number(form.value) : undefined,
        currency: form.currency,
        stage: form.stage,
        probability: form.probability,
        expectedCloseDate: form.expectedCloseDate || null,
        source: form.source || null,
      };
      if (form.stage === 'LOST') {
        payload.reasonLost = form.reasonLost || form.reason;
      }
      const res = await fetch(`/api/${orgSlug}/crm/opportunities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }
      setEditing(false);
      loadOpp();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/${orgSlug}/crm/opportunities/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      router.push(`/${orgSlug}/crm/opportunities`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleConvert(type: 'ESTIMATE' | 'INVOICE') {
    setConverting(true);
    try {
      const res = await fetch(`/api/${orgSlug}/crm/opportunities/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Conversion failed');
      }
      const { prefill } = await res.json();
      setShowConvertModal(false);
      // Navigate to the creation page with pre-fill params
      if (type === 'ESTIMATE') {
        router.push(`/${orgSlug}/estimates/new?opportunityId=${id}&companyName=${encodeURIComponent(prefill.companyName || '')}&currency=${prefill.currency}&value=${prefill.value}`);
      } else {
        router.push(`/${orgSlug}/invoices/new?opportunityId=${id}&companyName=${encodeURIComponent(prefill.companyName || '')}&currency=${prefill.currency}&value=${prefill.value}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setConverting(false);
    }
  }

  // Stage change handler with auto-probability
  function handleStageChange(newStage: Stage) {
    setForm((prev) => ({
      ...prev,
      stage: newStage,
      probability: STAGE_PROBABILITY[newStage] ?? prev.probability,
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!opp) {
    return (
      <div className="p-6">
        <button onClick={() => router.push(`/${orgSlug}/crm/opportunities`)}
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to pipeline
        </button>
        <p className="text-gray-500 dark:text-gray-400">Opportunity not found.</p>
      </div>
    );
  }

  const overdue = isOverdue(opp);
  const isWon = opp.stage === 'WON';
  const isLost = opp.stage === 'LOST';
  const isClosed = isWon || isLost;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ─── Header ─── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/${orgSlug}/crm/opportunities`)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{opp.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STAGE_COLORS[opp.stage]}`}>
                  {opp.stage}
                </span>
                {overdue && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold">
                    <AlertTriangle className="w-3 h-3" /> OVERDUE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                {opp.company && (
                  <button onClick={() => router.push(`/${orgSlug}/crm/companies/${opp.company!.id}`)} className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400">
                    <Building2 className="w-3.5 h-3.5" /> {opp.company.name}
                  </button>
                )}
                {opp.assignedUser && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> {opp.assignedUser.firstName} {opp.assignedUser.lastName}
                  </span>
                )}
                {opp.source && (
                  <span className="flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" /> {opp.source.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Convert button (WON only) */}
            {isWon && !opp.convertedInvoiceId && !opp.convertedEstimateId && (
              <button onClick={() => setShowConvertModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold animate-pulse hover:animate-none">
                <ArrowRight className="w-4 h-4" /> Convert to Invoice / Estimate
              </button>
            )}
            {isWon && (opp.convertedInvoiceId || opp.convertedEstimateId) && (
              <span className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium border border-green-200 dark:border-green-800">
                <CheckCircle2 className="w-4 h-4 inline mr-1" /> Converted
              </span>
            )}
            <button onClick={() => { setEditing(!editing); if (!editing) populateForm(opp); }}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              {editing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              {editing ? 'Cancel' : 'Edit'}
            </button>
            <button onClick={() => setShowDeleteConfirm(true)}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 hover:text-red-500 hover:border-red-300 dark:hover:border-red-700">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stage Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center gap-1">
            {STAGES.filter((s) => s.value !== 'LOST').map((s, i) => {
              const stageIdx = STAGES.findIndex((x) => x.value === opp.stage);
              const thisIdx = i;
              const isActive = opp.stage === s.value;
              const isPast = thisIdx < stageIdx && opp.stage !== 'LOST';
              return (
                <div key={s.value} className="flex-1">
                  <div className={`h-2 rounded-full transition-all ${
                    isActive ? 'bg-blue-600 dark:bg-blue-500' : isPast ? 'bg-green-500 dark:bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                  <p className={`text-[10px] mt-1 text-center ${
                    isActive ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                  }`}>{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* ─── Content ─── */}
      <div className="px-6 py-6">
        <div className="flex gap-6">
          {/* Main Column */}
          <div className="flex-1 space-y-6">
            {/* Value Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <ValueCard icon={<DollarSign className="w-5 h-5" />} label="Deal Value"
                value={opp.value ? formatValue(Number(opp.value), opp.currency) : '—'}
                sub={opp.currency} color="blue" />
              <ValueCard icon={<TrendingUp className="w-5 h-5" />} label="Weighted Value"
                value={formatValue(opp.weightedValue, opp.currency)}
                sub={`${Number(opp.probability)}% probability`} color="purple" />
              <ValueCard icon={<Calendar className="w-5 h-5" />} label="Expected Close"
                value={fmtDate(opp.expectedCloseDate)}
                sub={overdue ? 'Overdue!' : ''}
                color={overdue ? 'red' : 'gray'} />
            </div>

            {/* Lost Reason Banner */}
            {isLost && opp.reasonLost && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="font-semibold text-sm text-red-700 dark:text-red-400">Reason Lost</span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-300">{opp.reasonLost}</p>
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 flex gap-4">
              {(['details', 'activity'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    tab === t
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}>
                  {t === 'details' ? 'Deal Details' : 'Activity Timeline'}
                </button>
              ))}
            </div>

            {/* Edit Form */}
            {editing && tab === 'details' && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Deal Name</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                    <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Value</label>
                    <input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Currency</label>
                    <input type="text" maxLength={3} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                      placeholder="USD"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Stage</label>
                    <select value={form.stage} onChange={(e) => handleStageChange(e.target.value as Stage)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm">
                      {STAGES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Probability (%)</label>
                    <input type="number" min={0} max={100} value={form.probability}
                      onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Expected Close Date</label>
                    <input type="date" value={form.expectedCloseDate} onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Source</label>
                    <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm">
                      <option value="">Select source...</option>
                      {SOURCES.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  {form.stage === 'LOST' && (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-red-500 mb-1">Reason Lost *</label>
                      <textarea rows={2} value={form.reasonLost}
                        onChange={(e) => setForm({ ...form, reasonLost: e.target.value })}
                        placeholder="Why was this deal lost?"
                        className="w-full px-3 py-2 border border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Read-only Details */}
            {!editing && tab === 'details' && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Deal Information</h3>
                {opp.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 whitespace-pre-line">{opp.description}</p>
                )}
                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                  <InfoRow label="Value" value={opp.value ? `${formatValue(Number(opp.value), opp.currency)}` : '—'} />
                  <InfoRow label="Weighted Value" value={formatValue(opp.weightedValue, opp.currency)} />
                  <InfoRow label="Probability" value={`${Number(opp.probability)}%`} />
                  <InfoRow label="Currency" value={opp.currency} />
                  <InfoRow label="Expected Close" value={fmtDate(opp.expectedCloseDate)} />
                  <InfoRow label="Source" value={opp.source?.replace(/_/g, ' ') || '—'} />
                  <InfoRow label="Created" value={fmtDate(opp.createdAt)} />
                  <InfoRow label="Last Updated" value={fmtDate(opp.updatedAt)} />
                  {opp.wonDate && <InfoRow label="Won Date" value={fmtDate(opp.wonDate)} />}
                  {opp.lostDate && <InfoRow label="Lost Date" value={fmtDate(opp.lostDate)} />}
                </div>
              </div>
            )}

            {/* Activity Timeline */}
            {tab === 'activity' && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Activity Timeline</h3>
                {activities.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No activities recorded yet</p>
                ) : (
                  <div className="space-y-4">
                    {activities.map((a) => (
                      <div key={a.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs ${
                            a.type === 'SYSTEM' ? 'bg-gray-400 dark:bg-gray-600' :
                            a.type === 'CALL' ? 'bg-green-500' :
                            a.type === 'EMAIL' ? 'bg-blue-500' :
                            a.type === 'MEETING' ? 'bg-purple-500' :
                            'bg-amber-500'
                          }`}>
                            {a.type === 'CALL' ? <Phone className="w-3.5 h-3.5" /> :
                             a.type === 'EMAIL' ? <Mail className="w-3.5 h-3.5" /> :
                             a.type === 'MEETING' ? <Calendar className="w-3.5 h-3.5" /> :
                             a.type === 'SYSTEM' ? <BarChart3 className="w-3.5 h-3.5" /> :
                             <MessageSquare className="w-3.5 h-3.5" />}
                          </div>
                          <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 min-h-[20px]" />
                        </div>
                        <div className="pb-4 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{a.subject}</p>
                          {a.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{a.description}</p>
                          )}
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                            {a.createdByUser.firstName} {a.createdByUser.lastName} · {fmtDate(a.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Sidebar ─── */}
          <div className="w-80 space-y-4 shrink-0">
            {/* Contact Card */}
            {opp.contact && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Primary Contact</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                    {opp.contact.firstName[0]}{opp.contact.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {opp.contact.firstName} {opp.contact.lastName}
                    </p>
                    {opp.contact.email && (
                      <a href={`mailto:${opp.contact.email}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">{opp.contact.email}</a>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {opp.contact.phone && (
                    <a href={`tel:${opp.contact.phone}`}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                      <Phone className="w-3 h-3" /> Call
                    </a>
                  )}
                  {opp.contact.whatsapp && (
                    <a href={`https://wa.me/${opp.contact.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30">
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </a>
                  )}
                  {opp.contact.email && (
                    <a href={`mailto:${opp.contact.email}`}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                      <Mail className="w-3 h-3" /> Email
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Company Card */}
            {opp.company && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Company</h4>
                <button onClick={() => router.push(`/${orgSlug}/crm/companies/${opp.company!.id}`)}
                  className="flex items-center gap-3 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-2 -m-2">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{opp.company.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{opp.company.type} · {opp.company.lifecycleStage}</p>
                  </div>
                </button>
              </div>
            )}

            {/* Branch + Assigned */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Assignment</h4>
              {opp.assignedUser && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">{opp.assignedUser.firstName} {opp.assignedUser.lastName}</span>
                </div>
              )}
              {opp.branch && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">{opp.branch.name} ({opp.branch.code})</span>
                </div>
              )}
              {!opp.assignedUser && !opp.branch && (
                <p className="text-xs text-gray-400">No assignment info</p>
              )}
            </div>

            {/* Record Info */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Record Info</h4>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Created</span>
                <span className="text-gray-600 dark:text-gray-300">{fmtDate(opp.createdAt)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Updated</span>
                <span className="text-gray-600 dark:text-gray-300">{fmtDate(opp.updatedAt)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">ID</span>
                <span className="text-gray-400 font-mono text-[10px]">{opp.id.slice(0, 12)}...</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Convert Modal ─── */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Convert Won Deal</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              This deal has been won! Choose how to proceed:
            </p>
            <div className="space-y-3">
              <button onClick={() => handleConvert('ESTIMATE')} disabled={converting}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">Create Estimate</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Generate a detailed quote for the client</p>
                </div>
              </button>
              <button onClick={() => handleConvert('INVOICE')} disabled={converting}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300 dark:hover:border-green-700 transition-all text-left">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">Create Invoice</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Bill the client directly</p>
                </div>
              </button>
            </div>
            <button onClick={() => setShowConvertModal(false)} disabled={converting}
              className="w-full mt-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm Modal ─── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6 mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Opportunity?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              This will permanently remove "{opp.name}" and cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── Sub-components ───── */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">{label}</p>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">{value}</p>
    </div>
  );
}

function ValueCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
    gray: 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-medium opacity-70">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
      {sub && <p className={`text-[10px] mt-0.5 ${color === 'red' ? 'font-bold' : 'opacity-60'}`}>{sub}</p>}
    </div>
  );
}
