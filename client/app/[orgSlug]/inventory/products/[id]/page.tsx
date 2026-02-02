'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  productType: string;
  category?: string | null;
  unitOfMeasure: string;
  purchasePrice: number;
  sellingPrice: number;
  trackInventory: boolean;
  reorderLevel?: number | null;
  reorderQuantity?: number | null;
  taxable: boolean;
  defaultTaxRate: number;
  isActive: boolean;
  quantityOnHand: number;
  quantityAvailable: number;
  averageCost: number;
}

interface MovementRow {
  id: string;
  movementType: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  warehouseLocation?: string;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  movementDate: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const id = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [activity, setActivity] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [orgSlug, id]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, actRes] = await Promise.all([
        fetch(`/api/${orgSlug}/inventory/products/${id}`),
        fetch(`/api/${orgSlug}/inventory/products/${id}/activity`),
      ]);
      if (!prodRes.ok) throw new Error('Failed to load product');
      const prodJson = await prodRes.json();
      setProduct(prodJson.data);
      if (actRes.ok) {
        const actJson = await actRes.json();
        setActivity(actJson.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }

  const updateField = (name: string, value: any) => {
    setProduct((prev) => {
      if (!prev) return prev;
      // Enforce inventory tracking toggle based on product type
      if (name === 'productType') {
        const nextType = value as string;
        return {
          ...prev,
          productType: nextType,
          trackInventory: nextType === 'INVENTORY' ? prev.trackInventory : false,
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/${orgSlug}/inventory/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: product.sku,
          name: product.name,
          description: product.description,
          productType: product.productType,
          category: product.category,
          unitOfMeasure: product.unitOfMeasure,
          purchasePrice: product.purchasePrice,
          sellingPrice: product.sellingPrice,
          trackInventory: product.trackInventory,
          reorderLevel: product.reorderLevel,
          reorderQuantity: product.reorderQuantity,
          taxable: product.taxable,
          defaultTaxRate: product.defaultTaxRate,
          isActive: product.isActive,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to save product');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading product...</div>;
  if (!product) return <div className="p-6 text-red-600">Product not found.</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-gray-600">SKU {product.sku}</p>
        </div>
        <button
          className="px-4 py-2 text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50"
          onClick={() => router.push(`/${orgSlug}/inventory/products`)}
        >
          Back to Products
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <form onSubmit={save} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              value={product.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">SKU</label>
            <input
              value={product.sku}
              onChange={(e) => updateField('sku', e.target.value)}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select
              value={product.productType}
              onChange={(e) => updateField('productType', e.target.value)}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="INVENTORY">Inventory</option>
              <option value="SERVICE">Service</option>
              <option value="NON_INVENTORY">Non-Inventory</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <input
              value={product.category || ''}
              onChange={(e) => updateField('category', e.target.value)}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Unit of Measure</label>
            <input
              value={product.unitOfMeasure}
              onChange={(e) => updateField('unitOfMeasure', e.target.value)}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Purchase Price</label>
            <input
              type="number"
              step="0.01"
              value={product.purchasePrice}
              onChange={(e) => updateField('purchasePrice', Number(e.target.value))}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Selling Price</label>
            <input
              type="number"
              step="0.01"
              value={product.sellingPrice}
              onChange={(e) => updateField('sellingPrice', Number(e.target.value))}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Default Tax Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={product.defaultTaxRate}
              onChange={(e) => updateField('defaultTaxRate', Number(e.target.value))}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={product.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="inline-flex items-center space-x-2">
            <input
              type="checkbox"
              checked={product.trackInventory}
              onChange={(e) => updateField('trackInventory', e.target.checked)}
                disabled={product.productType !== 'INVENTORY'}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Track inventory</span>
          </label>
          <label className="inline-flex items-center space-x-2">
            <input
              type="checkbox"
              checked={product.taxable}
              onChange={(e) => updateField('taxable', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Taxable</span>
          </label>
          <label className="inline-flex items-center space-x-2">
            <input
              type="checkbox"
              checked={product.isActive}
              onChange={(e) => updateField('isActive', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Active</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Reorder Level</label>
            <input
              type="number"
              step="0.01"
              value={product.reorderLevel ?? ''}
              onChange={(e) => updateField('reorderLevel', e.target.value ? Number(e.target.value) : null)}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Reorder Quantity</label>
            <input
              type="number"
              step="0.01"
              value={product.reorderQuantity ?? ''}
              onChange={(e) => updateField('reorderQuantity', e.target.value ? Number(e.target.value) : null)}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Inventory Status</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="text-gray-600">On Hand</div>
            <div className="text-xl font-semibold">{product.quantityOnHand}</div>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="text-gray-600">Available</div>
            <div className="text-xl font-semibold">{product.quantityAvailable}</div>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="text-gray-600">Avg Cost</div>
            <div className="text-xl font-semibold">{product.averageCost.toFixed(2)}</div>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="text-gray-600">Reorder Level</div>
            <div className="text-xl font-semibold">{product.reorderLevel ?? '—'}</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Activity</h2>
          <div className="text-sm text-gray-600">Latest stock movements for this product</div>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Unit Cost</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Warehouse</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activity.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{new Date(m.movementDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{m.movementType}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{m.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{m.unitCost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{m.totalCost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{m.warehouseLocation}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{m.referenceId || '—'}</td>
                </tr>
              ))}
              {activity.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-600" colSpan={7}>
                    No movements recorded for this product yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
