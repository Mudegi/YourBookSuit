'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, TrendingDown, Wrench, FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface AssetDetails {
  id: string;
  assetNumber: string;
  name: string;
  description: string;
  category: {
    name: string;
    code: string;
    ugandaTaxRate: number | null;
  };
  purchaseDate: string;
  purchasePrice: number;
  currentBookValue: number;
  accumulatedDepreciation: number;
  status: string;
  depreciationMethod: string;
  usefulLifeYears: number;
  salvageValue: number;
  location: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
  vendor: string;
  invoiceNumber: string;
  depreciationSchedule: Array<{
    id: string;
    period: string;
    depreciationAmount: number;
    closingBookValue: number;
    posted: boolean;
  }>;
  maintenanceRecords: Array<{
    id: string;
    maintenanceDate: string;
    maintenanceType: string;
    description: string;
    cost: number;
    status: string;
  }>;
}

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const assetId = params.id as string;

  const [asset, setAsset] = useState<AssetDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'depreciation' | 'maintenance'>('overview');

  useEffect(() => {
    fetchAssetDetails();
  }, [assetId]);

  const fetchAssetDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/${orgSlug}/assets/${assetId}`);
      const data = await response.json();

      if (data.success) {
        setAsset(data.data.asset);
      }
    } catch (error) {
      console.error('Error fetching asset:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      UNDER_MAINTENANCE: 'bg-yellow-100 text-yellow-800',
      DISPOSED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const handleDispose = () => {
    router.push(`/${orgSlug}/fixed-assets/${assetId}/dispose`);
  };

  const handleAddMaintenance = () => {
    router.push(`/${orgSlug}/fixed-assets/${assetId}/maintenance/new`);
  };

  const handleCalculateDepreciation = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/assets/${assetId}/depreciation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'calculate' }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Depreciation schedule calculated successfully!');
        fetchAssetDetails();
      }
    } catch (error) {
      console.error('Error calculating depreciation:', error);
      alert('Failed to calculate depreciation');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading asset details...</div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Asset not found</div>
      </div>
    );
  }

  const depreciationPercent = asset.purchasePrice > 0
    ? ((asset.accumulatedDepreciation / asset.purchasePrice) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/${orgSlug}/fixed-assets`}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assets
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{asset.name}</h1>
              {getStatusBadge(asset.status)}
            </div>
            <p className="text-gray-600">{asset.assetNumber}</p>
            <p className="text-sm text-gray-500 mt-1">{asset.category.name}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddMaintenance}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              Add Maintenance
            </button>
            {asset.status === 'ACTIVE' && (
              <button
                onClick={handleDispose}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Dispose Asset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Purchase Price</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(asset.purchasePrice)}</div>
          <div className="text-xs text-gray-500 mt-1">{formatDate(asset.purchaseDate)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Current Book Value</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(asset.currentBookValue)}</div>
          <div className="text-xs text-gray-500 mt-1">{depreciationPercent}% depreciated</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Accumulated Depreciation</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(asset.accumulatedDepreciation)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Maintenance Records</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{asset.maintenanceRecords.length}</div>
          <div className="text-xs text-gray-500 mt-1">
            Total: {formatCurrency(asset.maintenanceRecords.reduce((sum, m) => sum + m.cost, 0))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('depreciation')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'depreciation'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Depreciation Schedule
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'maintenance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Maintenance History
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Asset Details</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-gray-600">Description</dt>
                      <dd className="text-sm text-gray-900 mt-1">{asset.description || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Location</dt>
                      <dd className="text-sm text-gray-900 mt-1">{asset.location || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Serial Number</dt>
                      <dd className="text-sm text-gray-900 mt-1">{asset.serialNumber || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Model</dt>
                      <dd className="text-sm text-gray-900 mt-1">{asset.model || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Manufacturer</dt>
                      <dd className="text-sm text-gray-900 mt-1">{asset.manufacturer || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Depreciation Settings</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-gray-600">Method</dt>
                      <dd className="text-sm text-gray-900 mt-1">{asset.depreciationMethod.replace(/_/g, ' ')}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Useful Life</dt>
                      <dd className="text-sm text-gray-900 mt-1">{asset.usefulLifeYears} years</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Salvage Value</dt>
                      <dd className="text-sm text-gray-900 mt-1">{formatCurrency(asset.salvageValue)}</dd>
                    </div>
                    {asset.category.ugandaTaxRate && (
                      <div>
                        <dt className="text-sm text-gray-600">Uganda Tax Rate</dt>
                        <dd className="text-sm text-gray-900 mt-1">{asset.category.ugandaTaxRate}% (URA)</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Purchase Information</h3>
                <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <dt className="text-sm text-gray-600">Vendor</dt>
                    <dd className="text-sm text-gray-900 mt-1">{asset.vendor || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Invoice Number</dt>
                    <dd className="text-sm text-gray-900 mt-1">{asset.invoiceNumber || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Purchase Date</dt>
                    <dd className="text-sm text-gray-900 mt-1">{formatDate(asset.purchaseDate)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {/* Depreciation Tab */}
          {activeTab === 'depreciation' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Depreciation Schedule</h3>
                <button
                  onClick={handleCalculateDepreciation}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <TrendingDown className="w-4 h-4" />
                  Recalculate Schedule
                </button>
              </div>

              {asset.depreciationSchedule.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No depreciation schedule yet. Click "Recalculate Schedule" to generate.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Depreciation</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Book Value</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {asset.depreciationSchedule.slice(0, 12).map((schedule) => (
                        <tr key={schedule.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{schedule.period}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {formatCurrency(schedule.depreciationAmount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                            {formatCurrency(schedule.closingBookValue)}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                schedule.posted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {schedule.posted ? 'Posted' : 'Not Posted'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Maintenance History</h3>
                <button
                  onClick={handleAddMaintenance}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Wrench className="w-4 h-4" />
                  Add Maintenance
                </button>
              </div>

              {asset.maintenanceRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Wrench className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No maintenance records yet. Click "Add Maintenance" to record service.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {asset.maintenanceRecords.map((maintenance) => (
                    <div key={maintenance.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{maintenance.maintenanceType.replace(/_/g, ' ')}</span>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                maintenance.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {maintenance.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{maintenance.description}</p>
                          <p className="text-xs text-gray-500 mt-2">{formatDate(maintenance.maintenanceDate)}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{formatCurrency(maintenance.cost)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
