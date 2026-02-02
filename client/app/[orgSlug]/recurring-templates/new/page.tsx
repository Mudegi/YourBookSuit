"use client";
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function NewRecurringTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;

  const [form, setForm] = useState<any>({
    name: '',
    templateType: 'JOURNAL_ENTRY',
    frequency: 'MONTHLY',
    timezone: 'UTC',
    startDate: new Date().toISOString().slice(0, 10),
    payload: {},
    dayOfMonth: 1,
    status: 'ACTIVE',
    approvalRequired: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/${orgSlug}/recurring-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSubmitting(false);
    if (json.success) {
      router.push(`/${orgSlug}/recurring-templates/${json.data.id}`);
    } else {
      setError(json.error || 'Failed to create');
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">New Recurring Template</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input className="mt-1 w-full border px-3 py-2 rounded" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Type</label>
            <select className="mt-1 w-full border px-3 py-2 rounded" value={form.templateType} onChange={(e) => setForm({ ...form, templateType: e.target.value })}>
              <option value="JOURNAL_ENTRY">Journal Entry</option>
              <option value="INVOICE">Invoice</option>
              <option value="BILL">Bill</option>
              <option value="PAYMENT">Payment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Frequency</label>
            <select className="mt-1 w-full border px-3 py-2 rounded" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Yearly</option>
              <option value="CUSTOM_CRON">Custom Cron</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Timezone</label>
            <input className="mt-1 w-full border px-3 py-2 rounded" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium">Start Date</label>
            <input type="date" className="mt-1 w-full border px-3 py-2 rounded" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
        </div>
        {form.frequency === 'MONTHLY' && (
          <div>
            <label className="block text-sm font-medium">Day of Month</label>
            <input type="number" min={1} max={28} className="mt-1 w-full border px-3 py-2 rounded" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: Number(e.target.value) })} />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium">Approval Required</label>
          <input type="checkbox" className="mt-1" checked={form.approvalRequired} onChange={(e) => setForm({ ...form, approvalRequired: e.target.checked })} />
        </div>
        <div>
          <label className="block text-sm font-medium">Payload (JSON)</label>
          <textarea className="mt-1 w-full border px-3 py-2 rounded font-mono h-40" value={JSON.stringify(form.payload, null, 2)} onChange={(e) => {
            try { setForm({ ...form, payload: JSON.parse(e.target.value) }); } catch { /* ignore */ }
          }} />
        </div>
        {error && <div className="text-red-600">{error}</div>}
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={submitting}>{submitting ? 'Creating...' : 'Create Template'}</button>
      </form>
    </div>
  );
}
