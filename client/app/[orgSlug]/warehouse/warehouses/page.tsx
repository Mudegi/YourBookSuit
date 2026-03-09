'use client';

import { FormEvent, useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Warehouse as WarehouseIcon,
  Plus,
  Search,
  MapPin,
  Package,
  DollarSign,
  Star,
  ChevronRight,
  Building2,
  Phone,
  Mail,
  User,
  Filter,
  BarChart3,
  ArrowUpDown,
  Boxes,
  AlertTriangle,
  X,
} from 'lucide-react';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: string;
  isDefault: boolean;
  isActive: boolean;
  branchId?: string | null;
  branchCode?: string | null;
  branchName?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  capacityPct?: number | null;
  bins: number;
  stockLevels: number;
  stockValue: number;
  productCount: number;
  createdAt: string;
}

interface Branch {
  id: string;
  code: string;
  name: string;
}

const warehouseTypes = [
  'GENERAL', 'MANUFACTURING', 'RECEIVING', 'SHIPPING',
  'QA_HOLD', 'THIRD_PARTY', 'TRANSIT', 'DAMAGED', 'QUARANTINE',
];

const typeColors: Record<string, string> = {
  GENERAL: 'bg-blue-100 text-blue-800',
  MANUFACTURING: 'bg-purple-100 text-purple-800',
  RECEIVING: 'bg-green-100 text-green-800',
  SHIPPING: 'bg-orange-100 text-orange-800',
  QA_HOLD: 'bg-yellow-100 text-yellow-800',
  THIRD_PARTY: 'bg-gray-100 text-gray-800',
  TRANSIT: 'bg-cyan-100 text-cyan-800',
  DAMAGED: 'bg-red-100 text-red-800',
  QUARANTINE: 'bg-amber-100 text-amber-800',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTypeLabel(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default function WarehousesPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    type: 'GENERAL',
    isDefault: false,
    branchId: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    managerId: '',
    capacityVolume: '',
    capacityWeight: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.set('search', searchQuery);
      if (filterBranch) queryParams.set('branchId', filterBranch);
      if (filterType) queryParams.set('type', filterType);

      const res = await fetch(`/api/${orgSlug}/warehouse/warehouses?${queryParams}`);
      if (!res.ok) throw new Error('Failed to load warehouses');
      const json = await res.json();
      setWarehouses(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, searchQuery, filterBranch, filterType]);

  const loadBranches = async () => {
    try {
      const res = await fetch(`/api/${orgSlug}/branches`);
      if (res.ok) {
        const json = await res.json();
        setBranches(json.data || json.branches || []);
      }
    } catch (_) { /* branches optional */ }
  };

  useEffect(() => {
    if (orgSlug) {
      loadWarehouses();
      loadBranches();
    }
  }, [orgSlug, loadWarehouses]);

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
          description: form.description || undefined,
          type: form.type,
          isDefault: form.isDefault,
          branchId: form.branchId || undefined,
          address: form.address || undefined,
          city: form.city || undefined,
          country: form.country || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          managerId: form.managerId || undefined,
          capacityVolume: form.capacityVolume ? parseFloat(form.capacityVolume) : undefined,
          capacityWeight: form.capacityWeight ? parseFloat(form.capacityWeight) : undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to create warehouse');
      }
      setForm({
        code: '', name: '', description: '', type: 'GENERAL', isDefault: false,
        branchId: '', address: '', city: '', country: '', phone: '', email: '',
        managerId: '', capacityVolume: '', capacityWeight: '',
      });
      setShowCreateForm(false);
      await loadWarehouses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create warehouse');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (warehouseId: string) => {
    try {
      const res = await fetch(`/api/${orgSlug}/warehouse/warehouses/${warehouseId}/set-default`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to set default');
      await loadWarehouses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default');
    }
  };

  // Stats
  const totalValue = warehouses.reduce((sum, w) => sum + (w.stockValue || 0), 0);
  const totalProducts = warehouses.reduce((sum, w) => sum + (w.productCount || 0), 0);
  const activeWarehouses = warehouses.filter(w => w.isActive).length;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <WarehouseIcon className="h-7 w-7 text-blue-600" />
            Warehouse Directory
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage physical storage locations and track stock per warehouse.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Add Warehouse
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <WarehouseIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Warehouses</p>
              <p className="text-xl font-bold text-gray-900">{activeWarehouses}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Stock Value</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total SKUs Stocked</p>
              <p className="text-xl font-bold text-gray-900">{totalProducts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Boxes className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Bins</p>
              <p className="text-xl font-bold text-gray-900">
                {warehouses.reduce((sum, w) => sum + w.bins, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Create New Warehouse</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. WH-001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Main Store"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {warehouseTypes.map((t) => (
                  <option key={t} value={t}>{formatTypeLabel(t)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              >
                <option value="">— No Branch —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
                type="email"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                />
                Set as default warehouse
              </label>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-60 text-sm font-medium"
            >
              {submitting ? 'Creating...' : 'Create Warehouse'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search warehouses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          {warehouseTypes.map((t) => (
            <option key={t} value={t}>{formatTypeLabel(t)}</option>
          ))}
        </select>
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
          <button
            className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setViewMode('grid')}
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          <button
            className={`px-3 py-2 text-sm ${viewMode === 'table' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setViewMode('table')}
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {warehouses.map((w) => (
            <div
              key={w.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => router.push(`/${orgSlug}/warehouse/warehouses/${w.id}`)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-gray-900 truncate">{w.name}</h3>
                      {w.isDefault && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm font-mono text-gray-500">{w.code}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[w.type] || 'bg-gray-100 text-gray-800'}`}>
                    {formatTypeLabel(w.type)}
                  </span>
                </div>

                {w.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{w.description}</p>
                )}

                <div className="space-y-2 text-sm">
                  {w.branchName && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building2 className="h-3.5 w-3.5 text-gray-400" />
                      <span>{w.branchName} ({w.branchCode})</span>
                    </div>
                  )}
                  {(w.address || w.city) && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span className="truncate">{[w.address, w.city, w.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {w.managerName && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      <span>{w.managerName}</span>
                    </div>
                  )}
                </div>

                {/* Capacity Bar */}
                {w.capacityPct !== null && w.capacityPct !== undefined && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">Capacity</span>
                      <span className={`font-medium ${w.capacityPct > 90 ? 'text-red-600' : w.capacityPct > 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {w.capacityPct}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          w.capacityPct > 90 ? 'bg-red-500' : w.capacityPct > 70 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${w.capacityPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(w.stockValue)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-sm text-gray-600">{w.productCount} SKUs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Boxes className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-sm text-gray-600">{w.bins} bins</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 ml-auto group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            </div>
          ))}

          {warehouses.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 text-gray-500">
              <WarehouseIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-700">No warehouses yet</p>
              <p className="text-sm mt-1">Create your first warehouse to start tracking stock by location.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Warehouse
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-auto border border-gray-200 rounded-lg bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Warehouse</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Branch</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Location</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Stock Value</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">SKUs</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Bins</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Default</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {warehouses.map((w) => (
                <tr
                  key={w.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/${orgSlug}/warehouse/warehouses/${w.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{w.name}</div>
                        <div className="text-xs font-mono text-gray-500">{w.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[w.type] || 'bg-gray-100 text-gray-800'}`}>
                      {formatTypeLabel(w.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{w.branchName || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                    {[w.address, w.city].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                    {formatCurrency(w.stockValue)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">{w.productCount}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">{w.bins}</td>
                  <td className="px-4 py-3 text-center">
                    {w.isDefault ? (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mx-auto" />
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSetDefault(w.id); }}
                        className="text-gray-300 hover:text-yellow-500 mx-auto block"
                        title="Set as default"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      w.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {w.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {warehouses.length === 0 && !loading && (
                <tr>
                  <td className="px-4 py-8 text-sm text-gray-500 text-center" colSpan={9}>
                    No warehouses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}
