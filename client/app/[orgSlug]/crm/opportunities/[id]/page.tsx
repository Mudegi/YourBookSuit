'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';

type Stage = 'PROSPECT' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

interface Opportunity {
  id: string;
  name: string;
  value: number | null;
  currency: string;
  stage: Stage;
  probability: number;
  closedDate?: string | null;
  reason?: string | null;
  company?: { id: string; name: string };
  createdAt?: string;
  updatedAt?: string;
}

const stages: { value: Stage; label: string }[] = [
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'PROPOSAL', label: 'Proposal' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
];

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const id = params?.id as string;

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    value: '',
    currency: 'USD',
    stage: 'PROSPECT' as Stage,
    probability: 50,
    closedDate: '',
    reason: '',
  });

  useEffect(() => {
    loadOpportunity();
  }, [id, orgSlug]);

  const loadOpportunity = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/${orgSlug}/crm/opportunities/${id}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to load opportunity');
      }
      const data: Opportunity = json.data;
      setOpportunity(data);
      setForm({
        name: data.name || '',
        value: data.value !== null && data.value !== undefined ? String(data.value) : '',
        currency: data.currency || 'USD',
        stage: data.stage,
        probability: data.probability ?? 50,
        closedDate: data.closedDate ? new Date(data.closedDate).toISOString().slice(0, 10) : '',
        reason: data.reason || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load opportunity');
    } finally {
      setLoading(false);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'probability' ? Number(value) : value,
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        name: form.name,
        value: form.value ? Number(form.value) : undefined,
        currency: form.currency,
        stage: form.stage,
        probability: form.probability,
        closedDate: form.closedDate || undefined,
        reason: form.reason || undefined,
      };
      const res = await fetch(`/api/${orgSlug}/crm/opportunities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to update opportunity');
      }
      await loadOpportunity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update opportunity');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading opportunity...</div>;

  if (!opportunity) {
    return (
      <div className="p-6">
        <button
          onClick={() => router.push(`/${orgSlug}/crm/opportunities`)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to pipeline
        </button>
        <div className="text-sm text-gray-600">Opportunity not found.</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-3xl font-bold">{opportunity.name}</h1>
          <p className="text-gray-600">{opportunity.company?.name || 'Unassigned company'}</p>
        </div>
        <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
          {stages.find((s) => s.value === opportunity.stage)?.label || opportunity.stage}
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold">Snapshot</h2>
          <div className="flex items-center justify-between text-sm text-gray-700">
            <span>Company</span>
            <span className="font-semibold">{opportunity.company?.name || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-700">
            <span>Value</span>
            <span className="font-semibold">{form.value ? `${form.value} ${form.currency}` : '—'}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-700">
            <span>Probability</span>
            <span className="font-semibold">{form.probability}%</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-700">
            <span>Closed Date</span>
            <span className="font-semibold">{form.closedDate || '—'}</span>
          </div>
          <div className="text-sm text-gray-700">
            <p className="text-gray-600">Reason / Notes</p>
            <p className="font-semibold mt-1 whitespace-pre-line">{form.reason || '—'}</p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Update Opportunity</h2>
            <button
              form="opp-form"
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 disabled:opacity-60"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
          <form id="opp-form" onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                required
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Value</label>
              <input
                name="value"
                type="number"
                step="0.01"
                value={form.value}
                onChange={onChange}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Currency</label>
              <select
                name="currency"
                value={form.currency}
                onChange={onChange}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="UGX">UGX</option>
                <option value="KES">KES</option>
                <option value="TZS">TZS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Stage</label>
              <select
                name="stage"
                value={form.stage}
                onChange={onChange}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {stages.map((stage) => (
                  <option key={stage.value} value={stage.value}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Probability (%)</label>
              <input
                name="probability"
                type="number"
                min={0}
                max={100}
                value={form.probability}
                onChange={onChange}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Closed Date</label>
              <input
                name="closedDate"
                type="date"
                value={form.closedDate}
                onChange={onChange}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Reason / Notes</label>
              <textarea
                name="reason"
                value={form.reason}
                onChange={onChange}
                rows={3}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
