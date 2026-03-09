'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Warehouse as WarehouseIcon,
  ArrowLeft,
  MapPin,
  Building2,
  User,
  Phone,
  Mail,
  Star,
  Package,
  DollarSign,
  Clock,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  BarChart3,
  History,
  Search,
} from 'lucide-react';

interface WarehouseDetail {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description?: string;
  type: string;
  isDefault: boolean;
  isActive: boolean;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  branchId?: string;
  branch?: { id: string; code: string; name: string } | null;
  managerId?: string;
  manager?: { id: string; firstName: string; lastName: string; email: string } | null;
  capacityVolume?: number | null;
  capacityWeight?: number | null;
  usedVolume?: number | null;
  usedWeight?: number | null;
  bins: Array<{ id: string; code: string; name: string; type: string; isActive: boolean }>;
  recentMovements: Array<{
    id: string;
    productSku: string;
    productName: string;
    movementType: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    referenceType?: string;
    referenceNumber?: string;
    notes?: string;
    movementDate: string;
  }>;
  stockLevels: Array<{
    id: string;
    productId: string;
    productSku: string;
    productName: string;
    productCategory?: string;
    quantityOnHand: number;
    quantityReserved: number;
    quantityAvailable: number;
    averageCost: number;
    totalValue: number;
    reorderLevel?: number | null;
    belowReorder: boolean;
    lastMovementDate?: string;
  }>;
  totalStockValue: number;
  totalQuantity: number;
  totalProducts: number;
  createdAt: string;
  updatedAt: string;
}

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

const movementTypeColors: Record<string, string> = {
  PURCHASE: 'text-green-700 bg-green-50',
  SALE: 'text-red-700 bg-red-50',
  ADJUSTMENT: 'text-blue-700 bg-blue-50',
  TRANSFER: 'text-purple-700 bg-purple-50',
  RETURN: 'text-orange-700 bg-orange-50',
  WRITE_OFF: 'text-gray-700 bg-gray-50',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTypeLabel(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const warehouseId = params?.warehouseId as string;

  const [warehouse, setWarehouse] = useState<WarehouseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'stock' | 'movements' | 'bins'>('overview');
  const [stockSearch, setStockSearch] = useState('');

  const loadWarehouse = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${orgSlug}/warehouse/warehouses/${warehouseId}`);
      if (!res.ok) throw new Error('Failed to load warehouse');
      const json = await res.json();
      setWarehouse(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warehouse');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, warehouseId]);

  useEffect(() => {
    if (orgSlug && warehouseId) loadWarehouse();
  }, [orgSlug, warehouseId, loadWarehouse]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">{error || 'Warehouse not found.'}</p>
        <button
          onClick={() => router.push(`/${orgSlug}/warehouse/warehouses`)}
          className="mt-4 text-blue-600 hover:underline"
        >
          Back to warehouses
        </button>
      </div>
    );
  }

  const capacityPct = warehouse.capacityVolume && warehouse.usedVolume
    ? Math.min(100, Math.round((warehouse.usedVolume / warehouse.capacityVolume) * 100))
    : null;

  const filteredStockLevels = warehouse.stockLevels.filter(sl =>
    !stockSearch ||
    sl.productName.toLowerCase().includes(stockSearch.toLowerCase()) ||
    sl.productSku.toLowerCase().includes(stockSearch.toLowerCase())
  );

  const lowStockItems = warehouse.stockLevels.filter(sl => sl.belowReorder);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push(`/${orgSlug}/warehouse/warehouses`)}
            className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{warehouse.name}</h1>
              {warehouse.isDefault && (
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              )}
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[warehouse.type] || 'bg-gray-100 text-gray-800'}`}>
                {formatTypeLabel(warehouse.type)}
              </span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                warehouse.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {warehouse.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm font-mono text-gray-500">{warehouse.code}</p>
            {warehouse.description && (
              <p className="text-sm text-gray-600 mt-1">{warehouse.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Info Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Stock Value</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(warehouse.totalStockValue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Products Stocked</p>
              <p className="text-lg font-bold text-gray-900">{warehouse.totalProducts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Quantity</p>
              <p className="text-lg font-bold text-gray-900">{formatNumber(warehouse.totalQuantity)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Boxes className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Bins / Locations</p>
              <p className="text-lg font-bold text-gray-900">{warehouse.bins.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">
              {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below reorder level
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.slice(0, 5).map(item => (
              <span key={item.id} className="inline-flex items-center bg-white border border-amber-200 rounded-full px-3 py-1 text-xs">
                <span className="font-medium text-amber-800">{item.productSku}</span>
                <span className="text-amber-600 ml-1">
                  ({formatNumber(item.quantityAvailable)} / {formatNumber(item.reorderLevel!)})
                </span>
              </span>
            ))}
            {lowStockItems.length > 5 && (
              <span className="text-xs text-amber-600">+{lowStockItems.length - 5} more</span>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {(['overview', 'stock', 'movements', 'bins'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'overview' ? 'Overview' :
               tab === 'stock' ? `Stock Levels (${warehouse.totalProducts})` :
               tab === 'movements' ? `Recent Activity (${warehouse.recentMovements.length})` :
               `Bins (${warehouse.bins.length})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Details Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Warehouse Details</h3>
            <dl className="space-y-3">
              {warehouse.branch && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <dt className="text-xs text-gray-500">Branch</dt>
                    <dd className="text-sm text-gray-900">{warehouse.branch.name} ({warehouse.branch.code})</dd>
                  </div>
                </div>
              )}
              {(warehouse.address || warehouse.city || warehouse.country) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <dt className="text-xs text-gray-500">Location</dt>
                    <dd className="text-sm text-gray-900">
                      {[warehouse.address, warehouse.city, warehouse.country].filter(Boolean).join(', ')}
                    </dd>
                  </div>
                </div>
              )}
              {warehouse.manager && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <dt className="text-xs text-gray-500">Manager</dt>
                    <dd className="text-sm text-gray-900">
                      {warehouse.manager.firstName} {warehouse.manager.lastName}
                    </dd>
                    <dd className="text-xs text-gray-500">{warehouse.manager.email}</dd>
                  </div>
                </div>
              )}
              {warehouse.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <dt className="text-xs text-gray-500">Phone</dt>
                    <dd className="text-sm text-gray-900">{warehouse.phone}</dd>
                  </div>
                </div>
              )}
              {warehouse.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <dt className="text-xs text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900">{warehouse.email}</dd>
                  </div>
                </div>
              )}
            </dl>

            {/* Capacity */}
            {capacityPct !== null && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Capacity Utilization</h4>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-500">
                    {formatNumber(warehouse.usedVolume!)} / {formatNumber(warehouse.capacityVolume!)} m³
                  </span>
                  <span className={`font-bold ${
                    capacityPct > 90 ? 'text-red-600' : capacityPct > 70 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {capacityPct}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      capacityPct > 90 ? 'bg-red-500' : capacityPct > 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${capacityPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Top Stock by Value */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Top Items by Value</h3>
            {warehouse.stockLevels.length > 0 ? (
              <div className="space-y-3">
                {warehouse.stockLevels.slice(0, 8).map((sl, i) => (
                  <div key={sl.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs font-medium text-gray-400 w-5">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{sl.productName}</p>
                        <p className="text-xs text-gray-500">{sl.productSku} · {formatNumber(sl.quantityOnHand)} on hand</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 ml-3">{formatCurrency(sl.totalValue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No stock in this warehouse yet.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search products..."
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
            />
          </div>

          <div className="overflow-auto border border-gray-200 rounded-lg bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">On Hand</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Reserved</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Available</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Avg Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total Value</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStockLevels.map(sl => (
                  <tr key={sl.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{sl.productName}</div>
                      <div className="text-xs text-gray-500 font-mono">{sl.productSku}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{sl.productCategory || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatNumber(sl.quantityOnHand)}</td>
                    <td className="px-4 py-3 text-sm text-right text-orange-600">{formatNumber(sl.quantityReserved)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatNumber(sl.quantityAvailable)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(sl.averageCost)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(sl.totalValue)}</td>
                    <td className="px-4 py-3 text-center">
                      {sl.belowReorder ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                          <AlertTriangle className="h-3 w-3" />
                          Low
                        </span>
                      ) : sl.quantityAvailable <= 0 ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                          Out
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredStockLevels.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-sm text-gray-500 text-center" colSpan={8}>
                      {stockSearch ? 'No matching products found.' : 'No stock in this warehouse yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <History className="h-4 w-4 text-gray-400" />
              Recent Inventory Activity
            </h3>
          </div>
          {warehouse.recentMovements.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {warehouse.recentMovements.map(m => (
                <div key={m.id} className="px-4 py-3 flex items-center gap-4">
                  <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${movementTypeColors[m.movementType] || 'bg-gray-50 text-gray-700'}`}>
                    {m.movementType}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.productName}</p>
                    <p className="text-xs text-gray-500">{m.productSku}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${m.quantity >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {m.quantity >= 0 ? '+' : ''}{formatNumber(m.quantity)}
                    </p>
                    <p className="text-xs text-gray-500">{formatCurrency(Math.abs(m.totalCost))}</p>
                  </div>
                  <div className="text-right min-w-[80px]">
                    {m.referenceNumber && (
                      <p className="text-xs font-mono text-gray-600 truncate">{m.referenceNumber}</p>
                    )}
                    <p className="text-xs text-gray-400">{timeAgo(m.movementDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-sm text-gray-500 text-center">
              No recent activity in this warehouse.
            </div>
          )}
        </div>
      )}

      {activeTab === 'bins' && (
        <div className="space-y-4">
          {warehouse.bins.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {warehouse.bins.map(bin => (
                <div key={bin.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-gray-900">{bin.name}</h4>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      bin.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {bin.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-gray-500">{bin.code}</p>
                  <p className="text-xs text-gray-600 mt-1">Type: {formatTypeLabel(bin.type)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Boxes className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-700">No bins configured</p>
              <p className="text-sm mt-1">Add bins to organize products within this warehouse.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
