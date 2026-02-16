'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
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
  efrisProductCode?: string | null;
  efrisRegisteredAt?: string | null;
  isActive: boolean;
  quantityOnHand: number;
  quantityAvailable: number;
  averageCost: number;
  stockMovements: number;
  createdAt: string;
}

export default function ProductsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If orgSlug is literally '[your-org-slug]' or contains brackets, fetch session to get real org
    if (!orgSlug || orgSlug.includes('[') || orgSlug.includes('%5B')) {
      fetch('/api/auth/session')
        .then(res => res.json())
        .then(data => {
          if (data?.data?.organization?.slug) {
            router.replace(`/${data.data.organization.slug}/inventory/products`);
          } else {
            router.push('/login');
          }
        })
        .catch(() => router.push('/login'));
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(`/api/orgs/${orgSlug}/inventory/products`);
        if (!res.ok) throw new Error('Failed to load products');
        const json = await res.json();
        setProducts(json.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orgSlug, router]);

  if (loading) return <div className="p-6">Loading products...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link 
          href={`/${orgSlug}/dashboard`}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 
          Back to Dashboard
        </Link>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Products & Services</h1>
          <p className="text-gray-600">Track inventory items, services, and non-inventory SKUs.</p>
        </div>
        <Link
          href={`/${orgSlug}/inventory/products/new`}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Product
        </Link>
      </div>

      {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

      <div className="overflow-auto border border-gray-200 rounded-lg shadow-sm bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">SKU</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">On Hand</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Available</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Avg Cost</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Sale Price</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Reorder</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">EFRIS</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-800">{p.sku}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{p.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{p.productType}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{p.category || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{p.quantityOnHand}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{p.quantityAvailable}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{p.averageCost.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{p.sellingPrice.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {p.reorderLevel ? `Lvl ${p.reorderLevel}` : '—'}
                  {p.reorderQuantity ? ` / Qty ${p.reorderQuantity}` : ''}
                </td>
                <td className="px-4 py-3 text-sm">
                  {p.efrisProductCode ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Registered
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      Not Registered
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <Link
                    href={`/${orgSlug}/inventory/products/${p.id}/edit`}
                    className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-600" colSpan={12}>
                  No products yet. Create your first product to start tracking inventory.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
