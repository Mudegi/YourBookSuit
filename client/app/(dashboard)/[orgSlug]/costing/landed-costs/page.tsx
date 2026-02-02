/**
 * Landed Costs Page - Cost Apportionment Engine
 * 
 * Essential module for businesses in landlocked countries where freight/customs
 * can add 20-40% to item costs. Provides comprehensive cost allocation across
 * multiple items in a container/shipment.
 * 
 * Features:
 * 1. Cost Apportionment Engine (Value, Weight, Volume, Quantity allocation)
 * 2. Multi-currency support with exchange rates
 * 3. Before/After cost impact analysis
 * 4. GL integration with inventory/COGS posting
 * 5. Country-specific cost types
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Package, DollarSign, TrendingUp, Plus, Ship, Calculator, 
  FileText, Globe, Truck, ArrowRight, AlertCircle, CheckCircle,
  Edit, Eye, Filter, Download, Settings
} from 'lucide-react';

interface LandedCost {
  id: string;
  referenceType: string;
  referenceId: string;
  totalProductCost: number;
  freightCost: number;
  insuranceCost: number;
  customsDuty: number;
  handlingCost: number;
  otherCosts: number;
  totalLandedCost: number;
  allocationMethod: string;
  isAllocated: boolean;
  allocatedAt?: string;
  allocations: Array<{
    id: string;
    product: {
      id: string;
      name: string;
      sku: string;
    };
    quantity: number;
    productCost: number;
    allocatedAmount: number;
    unitLandedCost: number;
  }>;
  createdAt: string;
  notes?: string;
}

interface Organization {
  baseCurrency: string;
  homeCountry: string;
}

export default function LandedCostsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  
  const [landedCosts, setLandedCosts] = useState<LandedCost[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCost, setSelectedCost] = useState<LandedCost | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    referenceType: '',
    allocationMethod: '',
    isAllocated: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchLandedCosts();
    // Only fetch organization if we don't have it yet
    if (!organization?.baseCurrency) {
      fetchOrganization();
    }
  }, [orgSlug, filters]);

  const fetchLandedCosts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`/api/${orgSlug}/costing/landed-costs?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLandedCosts(data.data || []);
        
        // Extract organization info from the API response
        if (data.meta?.baseCurrency || data.summary?.baseCurrency) {
          setOrganization(prev => ({
            baseCurrency: data.meta?.baseCurrency || data.summary?.baseCurrency || prev?.baseCurrency || 'USD',
            homeCountry: prev?.homeCountry || 'US',
          }));
        }
      } else {
        console.error('Failed to fetch landed costs');
      }
    } catch (error) {
      console.error('Error fetching landed costs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganization = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/organization`);
      if (response.ok) {
        const data = await response.json();
        setOrganization({
          baseCurrency: data.data?.baseCurrency || 'USD',
          homeCountry: data.data?.homeCountry || 'US',
        });
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const formatCurrency = (amount: number) => {
    const currency = organization?.baseCurrency || 'USD';
    const locale = currency === 'UGX' ? 'en-UG' : 'en-US';
    const decimals = currency === 'UGX' ? 0 : 2; // UGX typically doesn't use decimals
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  };

  const calculateSummaryStats = () => {
    const totalCosts = landedCosts.reduce((sum, lc) => sum + lc.totalLandedCost, 0);
    const totalAllocations = landedCosts.reduce((sum, lc) => sum + lc.allocations.length, 0);
    const allocatedCount = landedCosts.filter(lc => lc.isAllocated).length;
    const pendingCount = landedCosts.length - allocatedCount;
    
    // Calculate average cost increase percentage
    let totalOriginalValue = 0;
    let totalLandedValue = 0;
    
    landedCosts.forEach(lc => {
      totalOriginalValue += lc.totalProductCost;
      totalLandedValue += lc.totalLandedCost;
    });
    
    const averageIncrease = totalOriginalValue > 0 ? 
      ((totalLandedValue - totalOriginalValue) / totalOriginalValue) * 100 : 0;

    return {
      totalCosts,
      totalAllocations,
      allocatedCount,
      pendingCount,
      averageIncrease,
    };
  };

  const getStatusIcon = (isAllocated: boolean) => {
    return isAllocated ? 
      <CheckCircle className="w-5 h-5 text-green-600" /> : 
      <AlertCircle className="w-5 h-5 text-yellow-600" />;
  };

  const getStatusText = (isAllocated: boolean) => {
    return isAllocated ? 'Allocated' : 'Pending';
  };

  const getAllocationMethodDisplay = (method: string) => {
    const methodMap: Record<string, string> = {
      'BY_VALUE': 'By Value',
      'BY_WEIGHT': 'By Weight',
      'BY_VOLUME': 'By Volume',
      'BY_QUANTITY': 'By Quantity',
    };
    return methodMap[method] || method;
  };

  const getReferenceTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      'PURCHASE_RECEIPT': 'Purchase Receipt',
      'CONTAINER': 'Container',
      'SHIPMENT': 'Shipment',
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Loading landed costs...</p>
        </div>
      </div>
    );
  }

  const stats = calculateSummaryStats();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Landed Costs</h1>
          <p className="text-gray-600 mt-1">
            Cost Apportionment Engine - Calculate true cost of inventory
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {organization?.homeCountry === 'UG' ? 
              'Critical for Uganda operations - freight from Mombasa can add 20-40% to costs' :
              'Allocate freight, customs, and handling costs across inventory items'
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
            onClick={() => router.push(`/${orgSlug}/costing/landed-costs/worksheet`)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            Cost Worksheet
          </button>
          <button
            onClick={() => router.push(`/${orgSlug}/costing/landed-costs/new`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Landed Cost
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference Type</label>
              <select
                value={filters.referenceType}
                onChange={(e) => handleFilterChange('referenceType', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Types</option>
                <option value="PURCHASE_RECEIPT">Purchase Receipt</option>
                <option value="CONTAINER">Container</option>
                <option value="SHIPMENT">Shipment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allocation Method</label>
              <select
                value={filters.allocationMethod}
                onChange={(e) => handleFilterChange('allocationMethod', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Methods</option>
                <option value="BY_VALUE">By Value</option>
                <option value="BY_WEIGHT">By Weight</option>
                <option value="BY_VOLUME">By Volume</option>
                <option value="BY_QUANTITY">By Quantity</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.isAllocated}
                onChange={(e) => handleFilterChange('isAllocated', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Status</option>
                <option value="true">Allocated</option>
                <option value="false">Pending</option>
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
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Landed Costs</p>
              <p className="text-2xl font-bold text-gray-900">{landedCosts.length}</p>
            </div>
            <Package className="w-10 h-10 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Cost Value</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalCosts)}</p>
            </div>
            <DollarSign className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Items Allocated</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalAllocations}</p>
            </div>
            <Ship className="w-10 h-10 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Allocated</p>
              <p className="text-2xl font-bold text-green-600">{stats.allocatedCount}</p>
              <p className="text-xs text-gray-500">Pending: {stats.pendingCount}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Cost Increase</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.averageIncrease.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">vs FOB cost</p>
            </div>
            <TrendingUp className="w-10 h-10 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Currency & Country Context */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              Organization Currency: {organization?.baseCurrency} | Country: {organization?.homeCountry}
            </p>
            {organization?.homeCountry === 'UG' && (
              <p className="text-xs text-blue-700 mt-1">
                🚨 Uganda Operations: Factor in border delays, fuel surcharges, and railway development levy
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Landed Costs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">Cost Apportionment Records</h3>
          <p className="text-sm text-gray-600 mt-1">
            Track freight, customs, and handling cost allocation across inventory items
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Breakdown</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocation</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Product Cost</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Landed Cost</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Increase</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {landedCosts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <Ship className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No landed costs found</p>
                    <p className="text-sm mt-1">
                      Create landed costs to allocate freight and customs costs to inventory
                    </p>
                    <button
                      onClick={() => router.push(`/${orgSlug}/costing/landed-costs/new`)}
                      className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Create First Landed Cost
                    </button>
                  </td>
                </tr>
              ) : (
                landedCosts.map((landedCost) => {
                  const costIncrease = landedCost.totalLandedCost - landedCost.totalProductCost;
                  const increasePercent = landedCost.totalProductCost > 0 ? 
                    (costIncrease / landedCost.totalProductCost) * 100 : 0;

                  return (
                    <tr key={landedCost.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">
                            {getReferenceTypeDisplay(landedCost.referenceType)}
                          </div>
                          <div className="text-sm text-gray-500">{landedCost.referenceId}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(landedCost.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div>Freight: {formatCurrency(landedCost.freightCost)}</div>
                          <div>Customs: {formatCurrency(landedCost.customsDuty)}</div>
                          <div>Other: {formatCurrency(landedCost.handlingCost + landedCost.otherCosts)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {getAllocationMethodDisplay(landedCost.allocationMethod)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatCurrency(landedCost.totalProductCost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {formatCurrency(landedCost.totalLandedCost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="text-orange-600 font-medium">
                          +{formatCurrency(costIncrease)}
                        </div>
                        <div className="text-xs text-gray-500">
                          (+{increasePercent.toFixed(1)}%)
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(landedCost.isAllocated)}
                          <span className={`text-sm font-medium ${
                            landedCost.isAllocated ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {getStatusText(landedCost.isAllocated)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {landedCost.allocations.length} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedCost(landedCost)}
                            className="text-blue-600 hover:text-blue-800"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/${orgSlug}/costing/landed-costs/${landedCost.id}/edit`)}
                            className="text-gray-600 hover:text-gray-800"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Landed Cost Details: {selectedCost.referenceId}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {getReferenceTypeDisplay(selectedCost.referenceType)} • 
                    {getAllocationMethodDisplay(selectedCost.allocationMethod)} allocation
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCost(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Cost Breakdown */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Cost Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Freight</p>
                    <p className="font-semibold">{formatCurrency(selectedCost.freightCost)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Insurance</p>
                    <p className="font-semibold">{formatCurrency(selectedCost.insuranceCost)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Customs Duty</p>
                    <p className="font-semibold">{formatCurrency(selectedCost.customsDuty)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Handling & Other</p>
                    <p className="font-semibold">
                      {formatCurrency(selectedCost.handlingCost + selectedCost.otherCosts)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Allocation Items */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Item Allocations</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Original Cost</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Allocated</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">New Unit Cost</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Increase</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedCost.allocations.map((allocation) => {
                        const originalUnitCost = allocation.productCost / allocation.quantity;
                        const increase = allocation.unitLandedCost - originalUnitCost;
                        const increasePercent = originalUnitCost > 0 ? (increase / originalUnitCost) * 100 : 0;

                        return (
                          <tr key={allocation.id}>
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-medium text-gray-900">{allocation.product.name}</div>
                                <div className="text-sm text-gray-500">{allocation.product.sku}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-sm">{allocation.quantity}</td>
                            <td className="px-4 py-3 text-right text-sm">
                              {formatCurrency(originalUnitCost)}
                            </td>
                            <td className="px-4 py-3 text-right text-sm">
                              {formatCurrency(allocation.allocatedAmount)}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-medium">
                              {formatCurrency(allocation.unitLandedCost)}
                            </td>
                            <td className="px-4 py-3 text-right text-sm">
                              <div className="text-orange-600">
                                +{formatCurrency(increase)}
                              </div>
                              <div className="text-xs text-gray-500">
                                (+{increasePercent.toFixed(1)}%)
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedCost.notes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {selectedCost.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
