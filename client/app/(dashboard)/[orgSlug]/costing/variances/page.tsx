/**
 * Cost Variances Page - "Financial Truth" Engine
 * 
 * This page serves as the analytical dashboard that groups "losses" into actionable categories.
 * Critical for CFOs operating in volatile economies like Uganda where variances are high
 * due to fluctuating exchange rates and fuel prices.
 * 
 * Features:
 * 1. Multi-currency variance analysis with Base Currency toggle
 * 2. Branch-level filtering for managers to see local operations
 * 3. Drill-down capabilities from variance amounts to source transactions
 * 4. Regional reason code categorization
 * 5. Automatic GL posting integration
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useOrganization } from '@/hooks/useOrganization';
import { 
  Plus, AlertTriangle, TrendingDown, TrendingUp, Filter, 
  DollarSign, Globe, MapPin, Calendar, FileText, Eye,
  RefreshCw, Download, Settings
} from 'lucide-react';

interface CostVariance {
  id: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  varianceType: string;
  materialVariance: number;
  laborVariance: number;
  overheadVariance: number;
  totalVariance: number;
  quantity: number;
  date: string;
  referenceType?: string;
  referenceId?: string;
  transaction?: {
    id: string;
    transactionType: string;
    referenceId: string;
  };
  notes?: string;
}

interface VarianceSummary {
  totalVariance: number;
  purchasePriceVariance: number;
  laborEfficiencyVariance: number;
  materialUsageVariance: number;
  currencyVariance: number;
  variancesByBranch: Record<string, number>;
  variancesByReasonCode: Record<string, number>;
  topVariances: Array<{
    productName: string;
    varianceAmount: number;
    variancePercent: number;
    transactionRef: string;
  }>;
}

interface FilterState {
  startDate: string;
  endDate: string;
  branchId: string;
  productId: string;
  varianceType: string;
  reasonCode: string;
  currency: 'BASE' | 'TRANSACTION';
  minVarianceAmount: number;
}

export default function CostVariancesPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { organization } = useOrganization();
  
  const [variances, setVariances] = useState<CostVariance[]>([]);
  const [summary, setSummary] = useState<VarianceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVariance, setSelectedVariance] = useState<CostVariance | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    branchId: '',
    productId: '',
    varianceType: '',
    reasonCode: '',
    currency: 'BASE',
    minVarianceAmount: 0,
  });

  // Available filter options
  const [branches, setBranches] = useState<Array<{id: string, name: string}>>([]);
  const [products, setProducts] = useState<Array<{id: string, name: string}>>([]);
  const [reasonCodes, setReasonCodes] = useState<string[]>([]);

  useEffect(() => {
    fetchVariances();
    fetchFilterOptions();
  }, [filters]);

  const fetchVariances = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '' && value !== 0) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/${orgSlug}/costing/variances/analysis?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setVariances(data.data.variances || []);
        setSummary(data.data.summary || null);
      }
    } catch (error) {
      console.error('Error fetching variances:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      // Fetch branches
      const branchResponse = await fetch(`/api/${orgSlug}/branches`);
      if (branchResponse.ok) {
        const branchData = await branchResponse.json();
        setBranches(branchData.data || []);
      }

      // Fetch products (limited for dropdown)
      const productResponse = await fetch(`/api/${orgSlug}/products?limit=100`);
      if (productResponse.ok) {
        const productData = await productResponse.json();
        setProducts(productData.data || []);
      }

      // Fetch localized reason codes
      const reasonResponse = await fetch(`/api/${orgSlug}/costing/variances/reason-codes`);
      if (reasonResponse.ok) {
        const reasonData = await reasonResponse.json();
        setReasonCodes(reasonData.data || []);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVariances();
  };

  const handleFilterChange = (key: keyof FilterState, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const formatCurrency = (amount: number, showSign: boolean = true) => {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: organization?.baseCurrency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));

    if (!showSign) return formattedAmount;

    const sign = amount >= 0 ? '' : '';
    const suffix = amount >= 0 ? ' U' : ' F'; // Unfavorable / Favorable
    return `${sign}${formattedAmount}${suffix}`;
  };

  const getVarianceColorClass = (amount: number) => {
    return amount >= 0 ? 'text-red-600' : 'text-green-600';
  };

  const handleVarianceClick = (variance: CostVariance) => {
    setSelectedVariance(variance);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading variance analysis...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cost Variances</h1>
          <p className="text-gray-600 mt-1">Financial Truth Engine - Track where money is leaking</p>
          <p className="text-sm text-gray-500 mt-1">
            Compares what should have happened (Standard) with what actually happened (Actual)
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href={`/${orgSlug}/costing/variances/new`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Record Variance
          </Link>
        </div>
      </div>

      {/* Currency Toggle */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">View Currency:</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleFilterChange('currency', 'BASE')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              filters.currency === 'BASE' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Base Currency (USD)
          </button>
          <button
            onClick={() => handleFilterChange('currency', 'TRANSACTION')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              filters.currency === 'TRANSACTION' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Transaction Currency
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Filters & Dimensions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                value={filters.branchId}
                onChange={(e) => handleFilterChange('branchId', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variance Type</label>
              <select
                value={filters.varianceType}
                onChange={(e) => handleFilterChange('varianceType', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Types</option>
                <option value="PURCHASE_PRICE">Purchase Price</option>
                <option value="LABOR_EFFICIENCY">Labor Efficiency</option>
                <option value="MATERIAL_USAGE">Material Usage</option>
                <option value="PRODUCTION">Production</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason Code</label>
              <select
                value={filters.reasonCode}
                onChange={(e) => handleFilterChange('reasonCode', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Reasons</option>
                {reasonCodes.map(code => (
                  <option key={code} value={code}>{code.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Variance Amount</label>
              <input
                type="number"
                value={filters.minVarianceAmount}
                onChange={(e) => handleFilterChange('minVarianceAmount', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Variance Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Variance</p>
                <p className={`text-2xl font-bold mt-1 ${getVarianceColorClass(summary.totalVariance)}`}>
                  {formatCurrency(summary.totalVariance)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {summary.totalVariance >= 0 ? 'Net Unfavorable' : 'Net Favorable'}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-orange-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Purchase Price Variance</p>
                <p className={`text-2xl font-bold mt-1 ${getVarianceColorClass(summary.purchasePriceVariance)}`}>
                  {formatCurrency(summary.purchasePriceVariance, false)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Supplier price impacts</p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Labor Efficiency Variance</p>
                <p className={`text-2xl font-bold mt-1 ${getVarianceColorClass(summary.laborEfficiencyVariance)}`}>
                  {formatCurrency(summary.laborEfficiencyVariance, false)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Production time impacts</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Material Usage Variance</p>
                <p className={`text-2xl font-bold mt-1 ${getVarianceColorClass(summary.materialUsageVariance)}`}>
                  {formatCurrency(summary.materialUsageVariance, false)}
                </p>
                <p className="text-xs text-gray-500 mt-1">BOM vs actual usage</p>
              </div>
              <TrendingDown className="w-10 h-10 text-green-600" />
            </div>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">Variance Analysis</h3>
          <p className="text-sm text-gray-600 mt-1">Click on variance amounts for drill-down details</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Material Variance</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Labor Variance</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Overhead Variance</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Variance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {variances.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No cost variances found</p>
                    <p className="text-sm mt-1">Adjust filters or record new variances to see analysis</p>
                  </td>
                </tr>
              ) : (
                variances.map((variance) => (
                  <tr key={variance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{variance.product.name}</div>
                        <div className="text-sm text-gray-500">{variance.product.sku}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {variance.varianceType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleVarianceClick(variance)}
                        className={`font-medium hover:underline ${getVarianceColorClass(variance.materialVariance)}`}
                      >
                        {formatCurrency(variance.materialVariance)}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleVarianceClick(variance)}
                        className={`font-medium hover:underline ${getVarianceColorClass(variance.laborVariance)}`}
                      >
                        {formatCurrency(variance.laborVariance)}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleVarianceClick(variance)}
                        className={`font-medium hover:underline ${getVarianceColorClass(variance.overheadVariance)}`}
                      >
                        {formatCurrency(variance.overheadVariance)}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                      <button
                        onClick={() => handleVarianceClick(variance)}
                        className={`hover:underline ${getVarianceColorClass(variance.totalVariance)}`}
                      >
                        {formatCurrency(variance.totalVariance)}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(variance.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {variance.referenceId && (
                        <span className="text-blue-600 hover:underline cursor-pointer">
                          {variance.referenceType}: {variance.referenceId}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleVarianceClick(variance)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Variance Detail Modal/Sidebar - TODO: Implement drill-down */}
      {selectedVariance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Variance Details: {selectedVariance.product.name}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Material Variance</label>
                    <p className={`text-lg font-semibold ${getVarianceColorClass(selectedVariance.materialVariance)}`}>
                      {formatCurrency(selectedVariance.materialVariance)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Labor Variance</label>
                    <p className={`text-lg font-semibold ${getVarianceColorClass(selectedVariance.laborVariance)}`}>
                      {formatCurrency(selectedVariance.laborVariance)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Overhead Variance</label>
                    <p className={`text-lg font-semibold ${getVarianceColorClass(selectedVariance.overheadVariance)}`}>
                      {formatCurrency(selectedVariance.overheadVariance)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Total Variance</label>
                    <p className={`text-xl font-bold ${getVarianceColorClass(selectedVariance.totalVariance)}`}>
                      {formatCurrency(selectedVariance.totalVariance)}
                    </p>
                  </div>
                </div>
                {selectedVariance.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Notes</label>
                    <p className="text-sm text-gray-600 mt-1">{selectedVariance.notes}</p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedVariance(null)}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
