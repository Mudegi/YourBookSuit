'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, Building2, User, Target, Calendar, DollarSign, Briefcase } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';

type Stage = 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

interface CompanyOption { id: string; name: string }
interface ContactOption { id: string; firstName: string; lastName: string; email: string | null }
interface BranchOption { id: string; name: string; code: string }
interface UserOption { id: string; firstName: string; lastName: string }

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

const INPUT_CLS = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
const LABEL_CLS = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider';

export default function NewOpportunityPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgSlug = params?.orgSlug as string;
  const { currency: orgCurrency } = useOrganization();

  // Pre-fill from URL params (e.g. from Company Profile)
  const preCompanyId = searchParams?.get('companyId') || '';

  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    companyId: preCompanyId,
    contactId: '',
    value: '',
    currency: '',
    stage: 'QUALIFICATION' as Stage,
    probability: 10,
    expectedCloseDate: '',
    source: '',
    branchId: '',
    assignedTo: '',
  });

  // Set org currency when loaded
  useEffect(() => {
    if (orgCurrency) setForm((p) => ({ ...p, currency: p.currency || orgCurrency }));
  }, [orgCurrency]);

  // Load reference data
  const loadRef = useCallback(async () => {
    setLoadingRef(true);
    try {
      const [compRes, contactRes, branchRes, userRes] = await Promise.all([
        fetch(`/api/${orgSlug}/crm/companies`),
        fetch(`/api/${orgSlug}/crm/contacts`),
        fetch(`/api/${orgSlug}/branches`).catch(() => null),
        fetch(`/api/${orgSlug}/users`).catch(() => null),
      ]);

      if (compRes.ok) {
        const j = await compRes.json();
        setCompanies(j.companies || j.data || []);
      }
      if (contactRes.ok) {
        const j = await contactRes.json();
        setContacts(j.contacts || j.data || []);
      }
      if (branchRes?.ok) {
        const j = await branchRes.json();
        setBranches(j.branches || j.data || []);
      }
      if (userRes?.ok) {
        const j = await userRes.json();
        setUsers(j.users || j.data || j.members || []);
      }
    } catch { /* best effort */ } finally { setLoadingRef(false); }
  }, [orgSlug]);

  useEffect(() => { loadRef(); }, [loadRef]);

  function handleStageChange(stage: Stage) {
    setForm((p) => ({ ...p, stage, probability: STAGE_PROBABILITY[stage] ?? p.probability }));
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        name: form.name,
        description: form.description || undefined,
        companyId: form.companyId || undefined,
        contactId: form.contactId || undefined,
        value: form.value ? Number(form.value) : undefined,
        currency: form.currency,
        stage: form.stage,
        probability: form.probability,
        expectedCloseDate: form.expectedCloseDate || undefined,
        source: form.source || undefined,
        branchId: form.branchId || undefined,
        assignedTo: form.assignedTo || undefined,
      };
      const res = await fetch(`/api/${orgSlug}/crm/opportunities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create opportunity');
      router.push(`/${orgSlug}/crm/opportunities/${json.opportunity?.id || json.data?.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create opportunity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/${orgSlug}/crm/opportunities`)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Opportunity</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create a new deal and add it to your pipeline</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        <form onSubmit={submit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" /> Deal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={LABEL_CLS}>Deal Name *</label>
                <input type="text" required placeholder="e.g. Annual contract — Acme Corp"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={INPUT_CLS} />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL_CLS}>Description</label>
                <textarea rows={3} placeholder="Brief description of this opportunity..."
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Source</label>
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className={INPUT_CLS}>
                  <option value="">Select source...</option>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Expected Close Date</label>
                <input type="date" value={form.expectedCloseDate}
                  onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })}
                  className={INPUT_CLS} />
              </div>
            </div>
          </div>

          {/* Value & Stage */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" /> Value & Pipeline Stage
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Deal Value</label>
                <input type="number" step="0.01" min={0} placeholder="0.00"
                  value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })}
                  className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Currency</label>
                <input type="text" maxLength={3} placeholder="USD"
                  value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                  className={INPUT_CLS} />
                <p className="text-[10px] text-gray-400 mt-1">ISO 4217 code (auto-filled from org settings)</p>
              </div>
              <div>
                <label className={LABEL_CLS}>Stage</label>
                <select value={form.stage} onChange={(e) => handleStageChange(e.target.value as Stage)}
                  className={INPUT_CLS}>
                  {STAGES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Probability (%)</label>
                <input type="number" min={0} max={100}
                  value={form.probability} onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })}
                  className={INPUT_CLS} />
                <p className="text-[10px] text-gray-400 mt-1">Auto-adjusts when you change stage</p>
              </div>
            </div>
          </div>

          {/* Relationships */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-500" /> Relationships
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Company</label>
                <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                  className={INPUT_CLS}>
                  <option value="">{loadingRef ? 'Loading...' : 'Select company'}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Contact</label>
                <select value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}
                  className={INPUT_CLS}>
                  <option value="">Select contact...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.email ? ` (${c.email})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Assigned To</label>
                <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                  className={INPUT_CLS}>
                  <option value="">Auto-assign to me</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
              </div>
              {branches.length > 0 && (
                <div>
                  <label className={LABEL_CLS}>Branch</label>
                  <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    className={INPUT_CLS}>
                    <option value="">Select branch...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-60 font-semibold text-sm">
              <Plus className="w-4 h-4" /> {saving ? 'Creating...' : 'Create Opportunity'}
            </button>
            <button type="button" onClick={() => router.push(`/${orgSlug}/crm/opportunities`)}
              className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
