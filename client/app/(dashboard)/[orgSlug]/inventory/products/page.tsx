'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import {
  Plus, ArrowLeft, Search, LayoutGrid, LayoutList,
  Package, Tag, AlertTriangle, CheckCircle, XCircle,
  ShieldCheck, ChevronDown, ChevronUp,
} from 'lucide-react';

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

type ViewMode = 'cards' | 'table';
type SortField = 'name' | 'sku' | 'sellingPrice' | 'quantityOnHand';
type SortDir = 'asc' | 'desc';

const TYPE_COLORS: Record<string, string> = {
  INVENTORY:     'bg-blue-100 text-blue-700',
  SERVICE:       'bg-purple-100 text-purple-700',
  NON_INVENTORY: 'bg-amber-100 text-amber-700',
};

export default function ProductsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;

  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [view, setView]           = useState<ViewMode>('cards');
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir]     = useState<SortDir>('asc');

  useEffect(() => {
    if (!orgSlug || orgSlug.includes('[') || orgSlug.includes('%5B')) {
      fetch('/api/auth/session')
        .then(r => r.json())
        .then(d => {
          if (d?.data?.organization?.slug) router.replace(`/${d.data.organization.slug}/inventory/products`);
          else router.push('/login');
        })
        .catch(() => router.push('/login'));
      return;
    }
    (async () => {
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
    })();
  }, [orgSlug, router]);

  // Derived stats
  const stats = useMemo(() => ({
    total:    products.length,
    active:   products.filter(p => p.isActive).length,
    lowStock: products.filter(p => p.trackInventory && p.reorderLevel != null && p.quantityOnHand <= (p.reorderLevel ?? 0)).length,
    efris:    products.filter(p => p.efrisProductCode).length,
  }), [products]);

  // Unique types for filter tabs
  const types = useMemo(() => ['ALL', ...Array.from(new Set(products.map(p => p.productType)))], [products]);

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = products;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category ?? '').toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'ALL')   list = list.filter(p => p.productType === typeFilter);
    if (statusFilter === 'ACTIVE')   list = list.filter(p => p.isActive);
    if (statusFilter === 'INACTIVE') list = list.filter(p => !p.isActive);
    if (statusFilter === 'LOW_STOCK') list = list.filter(p => p.trackInventory && p.reorderLevel != null && p.quantityOnHand <= (p.reorderLevel ?? 0));

    list = [...list].sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'name')           return mul * a.name.localeCompare(b.name);
      if (sortField === 'sku')            return mul * a.sku.localeCompare(b.sku);
      if (sortField === 'sellingPrice')   return mul * (a.sellingPrice - b.sellingPrice);
      if (sortField === 'quantityOnHand') return mul * (a.quantityOnHand - b.quantityOnHand);
      return 0;
    });
    return list;
  }, [products, search, typeFilter, statusFilter, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 text-gray-400 inline ml-1" />;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 text-blue-500 inline ml-1" />
      : <ChevronDown className="h-3 w-3 text-blue-500 inline ml-1" />;
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-3" />
        <p className="text-gray-500 text-sm">Loading products…</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      {/* Back */}
      <div className="mb-4">
        <Link href={`/${orgSlug}/dashboard`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products &amp; Services</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track inventory items, services, and non-inventory SKUs.</p>
        </div>
        <Link href={`/${orgSlug}/inventory/products/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> New Product
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total',      value: stats.total,    icon: Package,       color: 'bg-blue-50 text-blue-700',   ring: 'ring-blue-200' },
          { label: 'Active',     value: stats.active,   icon: CheckCircle,   color: 'bg-green-50 text-green-700', ring: 'ring-green-200' },
          { label: 'Low Stock',  value: stats.lowStock, icon: AlertTriangle,  color: 'bg-amber-50 text-amber-700', ring: 'ring-amber-200' },
          { label: 'EFRIS',      value: stats.efris,    icon: ShieldCheck,   color: 'bg-purple-50 text-purple-700', ring: 'ring-purple-200' },
        ].map(({ label, value, icon: Icon, color, ring }) => (
          <div key={label} className={`flex items-center gap-3 px-4 py-3 rounded-xl ring-1 ${ring} ${color.split(' ')[0]} bg-opacity-60`}>
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, SKU, category…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="LOW_STOCK">Low Stock</option>
        </select>

        {/* Sort */}
        <select
          value={`${sortField}:${sortDir}`}
          onChange={e => { const [f,d] = e.target.value.split(':'); setSortField(f as SortField); setSortDir(d as SortDir); }}
          className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="name:asc">Name A–Z</option>
          <option value="name:desc">Name Z–A</option>
          <option value="sellingPrice:asc">Price Low–High</option>
          <option value="sellingPrice:desc">Price High–Low</option>
          <option value="quantityOnHand:asc">Stock Low–High</option>
          <option value="quantityOnHand:desc">Stock High–Low</option>
        </select>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button onClick={() => setView('cards')}
            className={`p-2 transition-colors ${view === 'cards' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            title="Card view">
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setView('table')}
            className={`p-2 transition-colors ${view === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            title="Table view">
            <LayoutList className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Type filter pills */}
      <div className="flex gap-2 flex-wrap mb-5">
        {types.map(t => (
          <button key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              typeFilter === t
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}>
            {t === 'ALL' ? 'All Types' : t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      <p className="text-xs text-gray-400 mb-4">{filtered.length} of {products.length} product{products.length !== 1 ? 's' : ''}</p>

      {/* ── CARD VIEW ── */}
      {view === 'cards' && (
        filtered.length === 0
          ? <EmptyState />
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(p => <ProductCard key={p.id} p={p} orgSlug={orgSlug} />)}
            </div>
      )}

      {/* ── TABLE VIEW ── */}
      {view === 'table' && (
        filtered.length === 0
          ? <EmptyState />
          : (
            /* Scrollable container that fills the viewport height minus header */
            <div className="rounded-xl border border-gray-200 shadow-sm bg-white overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 320px)' }}>
              <div className="overflow-auto flex-1">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_0_#e5e7eb]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap cursor-pointer select-none" onClick={() => toggleSort('sku')}>
                        SKU <SortIcon field="sku" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap cursor-pointer select-none" onClick={() => toggleSort('name')}>
                        Name <SortIcon field="name" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Category</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap cursor-pointer select-none" onClick={() => toggleSort('quantityOnHand')}>
                        On Hand <SortIcon field="quantityOnHand" />
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Available</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Avg Cost</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap cursor-pointer select-none" onClick={() => toggleSort('sellingPrice')}>
                        Sale Price <SortIcon field="sellingPrice" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Reorder</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">EFRIS</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(p => {
                      const isLow = p.trackInventory && p.reorderLevel != null && p.quantityOnHand <= (p.reorderLevel ?? 0);
                      return (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{p.sku}</td>
                          <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap max-w-[200px] truncate" title={p.name}>{p.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[p.productType] ?? 'bg-gray-100 text-gray-600'}`}>
                              {p.productType.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.category || '—'}</td>
                          <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${isLow ? 'text-amber-600' : 'text-gray-900'}`}>
                            {isLow && <AlertTriangle className="h-3 w-3 inline mr-1" />}{p.quantityOnHand}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">{p.quantityAvailable}</td>
                          <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">{p.averageCost.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">{p.sellingPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                            {p.reorderLevel ? `Lvl ${p.reorderLevel}` : '—'}
                            {p.reorderQuantity ? ` / ${p.reorderQuantity}` : ''}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {p.efrisProductCode
                              ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ Registered</span>
                              : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {p.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Link href={`/${orgSlug}/inventory/products/${p.id}/edit`}
                              className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors">
                              Edit
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
      )}
    </div>
  );
}

/* ── Product card component ── */
function ProductCard({ p, orgSlug }: { p: Product; orgSlug: string }) {
  const isLow = p.trackInventory && p.reorderLevel != null && p.quantityOnHand <= (p.reorderLevel ?? 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all p-4 flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight truncate" title={p.name}>{p.name}</p>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{p.sku}</p>
        </div>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[p.productType] ?? 'bg-gray-100 text-gray-600'}`}>
          {p.productType.replace('_', ' ')}
        </span>
      </div>

      {p.category && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Tag className="h-3 w-3" /> {p.category}
        </div>
      )}

      {/* Stock row */}
      {p.trackInventory && (
        <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${isLow ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
          <div className="text-xs text-gray-500">
            <span className="block font-medium text-gray-700">{p.quantityOnHand}</span>
            On Hand
          </div>
          <div className="text-xs text-gray-500 text-center">
            <span className="block font-medium text-gray-700">{p.quantityAvailable}</span>
            Available
          </div>
          {isLow
            ? <span className="flex items-center gap-1 text-xs font-medium text-amber-600"><AlertTriangle className="h-3 w-3" /> Low</span>
            : p.reorderLevel != null && <span className="text-xs text-gray-400">Min {p.reorderLevel}</span>}
        </div>
      )}

      {/* Price row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">Sale Price</p>
          <p className="text-sm font-bold text-gray-900">{p.sellingPrice.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Avg Cost</p>
          <p className="text-sm text-gray-600">{p.averageCost.toFixed(2)}</p>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1.5">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {p.isActive ? 'Active' : 'Inactive'}
        </span>
        {p.efrisProductCode && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
            <ShieldCheck className="h-3 w-3 inline mr-0.5" />EFRIS
          </span>
        )}
      </div>

      {/* Action */}
      <Link href={`/${orgSlug}/inventory/products/${p.id}/edit`}
        className="mt-auto block text-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
        Edit Product
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
      <Package className="mx-auto h-10 w-10 text-gray-300 mb-3" />
      <p className="text-sm font-medium text-gray-600">No products match your filters</p>
      <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter options.</p>
    </div>
  );
}
