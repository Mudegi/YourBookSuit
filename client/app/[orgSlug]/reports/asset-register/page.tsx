'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Download, FileText, Printer, Calendar } from 'lucide-react';

interface Asset {
  id: string;
  assetNumber: string;
  name: string;
  category: {
    name: string;
    code: string;
  };
  purchaseDate: string;
  purchasePrice: number;
  currentBookValue: number;
  accumulatedDepreciation: number;
  depreciationMethod: string;
  usefulLifeYears: number;
  status: string;
  location: string | null;
}

export default function AssetRegisterPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'ACTIVE',
    categoryId: '',
    asOfDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchAssets();
  }, [filters]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.categoryId) queryParams.append('categoryId', filters.categoryId);

      const response = await fetch(`/api/${orgSlug}/assets?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setAssets(data.data);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateTotals = () => {
    return assets.reduce(
      (acc, asset) => ({
        cost: acc.cost + asset.purchasePrice,
        bookValue: acc.bookValue + asset.currentBookValue,
        depreciation: acc.depreciation + asset.accumulatedDepreciation,
      }),
      { cost: 0, bookValue: 0, depreciation: 0 }
    );
  };

  const totals = calculateTotals();

  const handleExport = () => {
    // CSV export
    const headers = [
      'Asset Number',
      'Name',
      'Category',
      'Purchase Date',
      'Cost (UGX)',
      'Book Value (UGX)',
      'Depreciation (UGX)',
      'Status',
      'Location',
    ];
    const rows = assets.map((asset) => [
      asset.assetNumber,
      asset.name,
      asset.category.name,
      asset.purchaseDate,
      asset.purchasePrice,
      asset.currentBookValue,
      asset.accumulatedDepreciation,
      asset.status,
      asset.location || '',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset-register-${filters.asOfDate}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fixed Assets Register</h1>
            <p className="text-gray-600 mt-1">Comprehensive list of all registered fixed assets</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="UNDER_MAINTENANCE">Under Maintenance</option>
              <option value="DISPOSED">Disposed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              As of Date
            </label>
            <input
              type="date"
              value={filters.asOfDate}
              onChange={(e) => setFilters({ ...filters, asOfDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchAssets}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Cost</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totals.cost)}</div>
          <div className="text-xs text-gray-500 mt-1">{assets.length} assets</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Current Book Value</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(totals.bookValue)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {((totals.bookValue / (totals.cost || 1)) * 100).toFixed(1)}% of original cost
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Accumulated Depreciation</div>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(totals.depreciation)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {((totals.depreciation / (totals.cost || 1)) * 100).toFixed(1)}% depreciated
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading assets...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Asset #</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Purchase Date</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Cost</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Depreciation</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Book Value</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {assets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <div>No assets found matching the selected filters.</div>
                      </td>
                    </tr>
                  ) : (
                    assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono">{asset.assetNumber}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{asset.name}</div>
                          {asset.location && <div className="text-xs text-gray-500">{asset.location}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm">{asset.category.name}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(asset.purchaseDate)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(asset.purchasePrice)}</td>
                        <td className="px-4 py-3 text-sm text-right text-red-600">
                          {formatCurrency(asset.accumulatedDepreciation)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {formatCurrency(asset.currentBookValue)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              asset.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800'
                                : asset.status === 'INACTIVE'
                                ? 'bg-gray-100 text-gray-800'
                                : asset.status === 'UNDER_MAINTENANCE'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {asset.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-900">
                      Total ({assets.length} assets)
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold">{formatCurrency(totals.cost)}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-red-600">
                      {formatCurrency(totals.depreciation)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold">{formatCurrency(totals.bookValue)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .container,
          .container * {
            visibility: visible;
          }
          .container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
