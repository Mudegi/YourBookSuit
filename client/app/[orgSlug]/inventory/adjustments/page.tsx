'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Adjustment {
  id: string;
  productId: string;
  productName?: string;
  sku?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  warehouseLocation?: string;
  notes?: string | null;
  movementDate: string;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

export default function InventoryAdjustmentsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [form, setForm] = useState({
    productId: '',
    quantity: '0',
    unitCost: '0',
    warehouseLocation: 'Main',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAdjustments();
    loadProducts();
  }, [orgSlug]);

  const loadAdjustments = async () => {
    try {
      const res = await fetch(`/api/${orgSlug}/inventory/adjustments`);
      if (!res.ok) throw new Error('Failed to load adjustments');
      const json = await res.json();
      setAdjustments(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load adjustments');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    const res = await fetch(`/api/${orgSlug}/inventory/products`);
    if (res.ok) {
      const json = await res.json();
      setProducts((json.data || []).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku })));
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/${orgSlug}/inventory/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
          unitCost: Number(form.unitCost),
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to save adjustment');
      }
      setForm({ ...form, quantity: '0', unitCost: '0', notes: '' });
      await loadAdjustments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save adjustment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading adjustments...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory Adjustments</h1>
        <p className="text-gray-600">Adjust on-hand quantities to correct shrinkage, damages, or corrections.</p>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-3">New Adjustment</h2>
        <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={submit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Product</label>
            <select
              name="productId"
              value={form.productId}
              onChange={onChange}
              required
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Quantity (+/-)</label>
            <input
              name="quantity"
              type="number"
              step="0.01"
              value={form.quantity}
              onChange={onChange}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Unit Cost</label>
            <input
              name="unitCost"
              type="number"
              step="0.01"
              value={form.unitCost}
              onChange={onChange}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Warehouse</label>
            <input
              name="warehouseLocation"
              value={form.warehouseLocation}
              onChange={onChange}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={onChange}
              rows={2}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Adjustment'}
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-auto border border-gray-200 rounded-lg shadow-sm bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Product</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Qty</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Unit Cost</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Total</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Warehouse</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {adjustments.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-700">{new Date(a.movementDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{a.productName} ({a.sku})</td>
                <td className="px-4 py-3 text-sm text-gray-900">{a.quantity}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{a.unitCost.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{a.totalCost.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{a.warehouseLocation}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{a.notes || '—'}</td>
              </tr>
            ))}
            {adjustments.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-600" colSpan={7}>
                  No adjustments recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
