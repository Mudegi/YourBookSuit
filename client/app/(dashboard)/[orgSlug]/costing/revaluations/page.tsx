/**
 * Inventory Revaluation Page - Financial Safety Engine
 * 
 * Critical financial tool that adjusts the value of existing inventory items.
 * Unlike Landed Costs (which add to new receipts), Revaluations change the 
 * value of items already sitting in the warehouse.
 * 
 * Features:
 * 1. Financial Safety with DRAFT -> SUBMITTED -> POSTED workflow
 * 2. Preview GL Entry feature before posting
 * 3. Country-specific reason codes and compliance
 * 4. Market price calculation integration
 * 5. Approval workflow controls
 * 6. Multi-currency support with proper formatting
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, DollarSign, TrendingUp, TrendingDown, Plus,
  AlertTriangle, CheckCircle, Clock, Calculator, Eye,
  Filter, Download, FileText, Globe, Shield, Zap
} from 'lucide-react';

interface Revaluation {
  id: string;
  revaluationNumber: string;
  product: { 
    id: string;
    name: string; 
    sku: string; 
  };
  warehouse?: {
    id: string;
    name: string;
  };
  oldUnitCost: number;
  newUnitCost: number;
  quantity: number;
  valueDifference: number;
  revaluationDate: string;
  reason: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'POSTED' | 'REJECTED';
  approvedBy?: { 
    id: string;
    name: string; 
  };
  notes?: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Organization {
  baseCurrency: string;
  homeCountry: string;
}

interface RevaluationSummary {
  totalRevaluations: number;
  draftCount: number;
  submittedCount: number;
  approvedCount: number;
  postedCount: number;
  totalValueImpact: number;
  pendingApprovalValue: number;
  averageValueChange: number;
}

interface FilterState {
  status: string;
  reasonCode: string;
  productId: string;
  warehouseId: string;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
}

export default function RevaluationsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  
  const [revaluations, setRevaluations] = useState<Revaluation[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [summary, setSummary] = useState<RevaluationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    reasonCode: '',
    productId: '',
    warehouseId: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
  });

  useEffect(() => {
    fetchRevaluations();
  }, [orgSlug, filters]);

  const fetchRevaluations = async () => {
    try {
      if (!refreshing) setLoading(true);

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`/api/${orgSlug}/costing/revaluations?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRevaluations(data.data.revaluations || []);
        setSummary(data.data.summary);
        setOrganization(data.meta.organization);
      }
    } catch (error) {
      console.error('Error fetching revaluations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRevaluations();
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const formatCurrency = (amount: number) => {
    if (!organization) return `$${amount.toFixed(2)}`;
    
    const currency = organization.baseCurrency || 'USD';
    const locale = currency === 'UGX' ? 'en-UG' : 'en-US';
    const decimals = currency === 'UGX' ? 0 : 2;
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'SUBMITTED': 'bg-blue-100 text-blue-800',
      'APPROVED': 'bg-green-100 text-green-800',
      'POSTED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      'DRAFT': <FileText className="w-4 h-4" />,
      'SUBMITTED': <Clock className="w-4 h-4" />,
      'APPROVED': <CheckCircle className="w-4 h-4" />,
      'POSTED': <Shield className="w-4 h-4" />,
      'REJECTED': <AlertTriangle className="w-4 h-4" />,
    };
    return icons[status as keyof typeof icons] || <FileText className="w-4 h-4" />;
  };

  const getChangeIcon = (valueDifference: number) => {
    return valueDifference >= 0 
      ? <TrendingUp className="w-4 h-4 text-green-500" />
      : <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 mx-auto text-gray-400 mb-4 animate-spin" />
          <p className="text-gray-500">Loading inventory revaluations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Revaluations</h1>
          <p className="text-gray-600 mt-1">
            Financial tool to adjust inventory values with approval workflow
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {organization?.homeCountry === 'UG' ? 
              'Critical for Uganda operations - adjust for currency fluctuations and market volatility' :
              'Adjust inventory costs for market changes, damage, or corrections'
            }
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
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Button
            onClick={() => router.push(`/${orgSlug}/costing/revaluations/new`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Revaluation
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Revaluations</p>
                  <p className="text-2xl font-bold">{summary.totalRevaluations}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Approval</p>
                  <p className="text-2xl font-bold">{summary.submittedCount}</p>
                  <p className="text-xs text-gray-400">
                    {formatCurrency(summary.pendingApprovalValue)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Posted</p>
                  <p className="text-2xl font-bold">{summary.postedCount}</p>
                </div>
                <Shield className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Value Impact</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(summary.totalValueImpact)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {getChangeIcon(summary.totalValueImpact)}
                    <p className="text-xs text-gray-500">
                      Avg: {summary.averageValueChange.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <DollarSign className={`h-8 w-8 ${summary.totalValueImpact >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="APPROVED">Approved</option>
                  <option value="POSTED">Posted</option>
                  <option value="REJECTED">Rejected</option>
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
                  <option value="MARKET_DECLINE">Market Price Decline</option>
                  <option value="MARKET_INCREASE">Market Price Increase</option>
                  <option value="CURRENCY_FLUCTUATION">Currency Fluctuation</option>
                  <option value="DAMAGE_WRITE_DOWN">Damage/Obsolescence</option>
                  <option value="ERROR_CORRECTION">Error Correction</option>
                </select>
              </div>
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revaluations Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value Impact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {revaluations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <FileText className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium">No revaluations found</p>
                      <p className="text-sm text-gray-400 mb-4">
                        Create your first inventory revaluation to adjust costs
                      </p>
                      <Button
                        onClick={() => router.push(`/${orgSlug}/costing/revaluations/new`)}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New Revaluation
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                revaluations.map((revaluation) => {
                  const changePercent = ((revaluation.newUnitCost - revaluation.oldUnitCost) / revaluation.oldUnitCost) * 100;
                  
                  return (
                    <tr
                      key={revaluation.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {revaluation.revaluationNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {revaluation.product.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {revaluation.product.sku}
                        </div>
                        {revaluation.warehouse && (
                          <div className="text-xs text-gray-400">
                            {revaluation.warehouse.name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <span className="line-through text-gray-400">
                            {formatCurrency(revaluation.oldUnitCost)}
                          </span>
                          <span className="mx-2">→</span>
                          <span className="font-medium">
                            {formatCurrency(revaluation.newUnitCost)}
                          </span>
                        </div>
                        <div className={`text-xs flex items-center gap-1 ${
                          changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {getChangeIcon(changePercent)}
                          {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          revaluation.valueDifference >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {revaluation.valueDifference >= 0 ? '+' : ''}
                          {formatCurrency(revaluation.valueDifference)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Qty: {revaluation.quantity.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {revaluation.reason}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusColor(revaluation.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(revaluation.status)}
                            {revaluation.status.replace('_', ' ')}
                          </div>
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(revaluation.revaluationDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/${orgSlug}/costing/revaluations/${revaluation.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {revaluation.status === 'APPROVED' && !revaluation.transactionId && (
                            <button
                              onClick={() => router.push(`/${orgSlug}/costing/revaluations/${revaluation.id}/preview`)}
                              className="text-green-600 hover:text-green-900"
                              title="Preview GL Entry"
                            >
                              <Calculator className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Country-Specific Help */}
      {organization?.homeCountry === 'UG' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Uganda Operations Guide</h4>
                <p className="text-sm text-blue-700 mb-2">
                  For businesses in Uganda, inventory revaluations are critical for managing:
                </p>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• Currency fluctuation impacts (USD/UGX exchange rate changes)</li>
                  <li>• Fuel price volatility affecting transportation costs</li>
                  <li>• Border delays and additional storage costs from Mombasa</li>
                  <li>• URA tax adjustments and compliance requirements</li>
                </ul>
                <p className="text-xs text-blue-500 mt-2">
                  Use reason codes specific to Uganda operations for proper audit trails.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
