"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function BudgetsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const [budgets, setBudgets] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/${orgSlug}/budgets`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load budgets');
        setBudgets(data.budgets);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    if (orgSlug) load();
  }, [orgSlug]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      accountId: fd.get('accountId'),
      fiscalYear: fd.get('fiscalYear'),
      month: fd.get('month'),
      budgetAmount: fd.get('budgetAmount'),
    };
    const res = await fetch(`/api/${orgSlug}/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Create failed');
    } else {
      setBudgets((b) => [data.budget, ...b]);
      setError(null);
      e.currentTarget.reset();
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Budgets</h1>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded border">
        <input name="accountId" placeholder="Account ID" className="border rounded p-2" required />
        <input name="fiscalYear" placeholder="Fiscal Year" type="number" className="border rounded p-2" required />
        <input name="month" placeholder="Month (1-12) optional" type="number" className="border rounded p-2" />
        <input name="budgetAmount" placeholder="Budget Amount" type="number" step="0.01" className="border rounded p-2" required />
        <div className="md:col-span-4 flex gap-2">
          <button type="submit" className="border rounded px-4 py-2">Add Budget</button>
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>
      </form>

      {loading && <div>Loading budgets…</div>}
      {!loading && budgets.length === 0 && <div>No budgets yet.</div>}
      {!loading && budgets.length > 0 && (
        <table className="min-w-full bg-white border rounded">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-2">Account</th>
              <th className="p-2">Fiscal Year</th>
              <th className="p-2">Month</th>
              <th className="p-2">Budget</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-2">{b.accountId}</td>
                <td className="p-2">{b.fiscalYear}</td>
                <td className="p-2">{b.month ?? '-'}</td>
                <td className="p-2">{Number(b.budgetAmount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
