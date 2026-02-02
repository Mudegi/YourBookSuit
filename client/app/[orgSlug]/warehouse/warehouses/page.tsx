'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  type: string;
  isDefault: boolean;
  isActive: boolean;
  branchId?: string | null;
  branchCode?: string | null;
  branchName?: string | null;
  bins: number;
  createdAt: string;
}

const warehouseTypes = ['GENERAL', 'MANUFACTURING', 'RECEIVING', 'SHIPPING', 'QA_HOLD', 'THIRD_PARTY'];

export default function WarehousesPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'GENERAL',
    isDefault: false,
    branchId: '',
    address: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${orgSlug}/warehouse/warehouses`);
      if (!res.ok) throw new Error('Failed to load warehouses');
      const json = await res.json();
      setWarehouses(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgSlug) load();
  }, [orgSlug]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/${orgSlug}/warehouse/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          type: form.type,
          isDefault: form.isDefault,
          branchId: form.branchId || undefined,
          address: form.address || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to create warehouse');
      }
      setForm({ code: '', name: '', type: 'GENERAL', isDefault: false, branchId: '', address: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create warehouse');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Warehouses</h1>
        <p className="text-gray-600">Manage warehouse masters and defaults.</p>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3 bg-white border border-gray-200 rounded-md p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Code
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Name
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Type
            <select
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {warehouseTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Branch ID (optional)
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            />
          </label>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            />
            <span>Set as default</span>
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700 md:col-span-3">
            Address (optional)
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? 'Saving...' : 'Add Warehouse'}
        </button>
      </form>

      <div className="overflow-auto border border-gray-200 rounded-md bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Branch</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Default</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Bins</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {warehouses.map((w) => (
              <tr key={w.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-800">{w.code}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{w.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{w.type}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{w.branchCode || '—'}</td>
                <td className="px-4 py-3 text-sm">{w.isDefault ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{w.bins}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{new Date(w.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {warehouses.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-4 text-sm text-gray-600" colSpan={7}>
                  No warehouses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
