'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, TrendingUp, DollarSign, Package, Calculator, Settings2, Filter, Download } from 'lucide-react';
import CostBreakdownChart from '@/components/costing/CostBreakdownChart';
import VersionControl from '@/components/costing/VersionControl';
import BomRollupWorkbench from '@/components/costing/BomRollupWorkbench';
import VarianceHighlights from '@/components/costing/VarianceHighlights';

interface StandardCost {
  id: string;
  product: {
    id: string;
    name: string;
    sku: string;
    category?: string;
  };
  costingMethod: string;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function StandardCostsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  
  const [standardCosts, setStandardCosts] = useState<StandardCost[]>([]);
  const [filteredCosts, setFilteredCosts] = useState<StandardCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<StandardCost | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'rollup' | 'variances'>('overview');
  const [filters, setFilters] = useState({
    costingMethod: '',
    search: '',
  });
  const [organization, setOrganization] = useState<{ baseCurrency: string } | null>(null);

  useEffect(() => {
    fetchStandardCosts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [standardCosts, filters]);

  const fetchStandardCosts = async (includeLocalized = false) => {
    try {
      const params = new URLSearchParams();
      if (includeLocalized) params.append('includeLocalized', 'true');
      
      const response = await fetch(`/api/${orgSlug}/costing/standard-costs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStandardCosts(data.data);
        setOrganization(data.organization);
      }
    } catch (error) {
      console.error('Error fetching standard costs:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = standardCosts;

    if (filters.costingMethod) {
      filtered = filtered.filter(cost => cost.costingMethod === filters.costingMethod);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(cost => 
        cost.product.name.toLowerCase().includes(searchTerm) ||
        cost.product.sku.toLowerCase().includes(searchTerm)
      );
    }

    setFilteredCosts(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FROZEN':
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PENDING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: organization?.baseCurrency || 'USD',
    }).format(amount);
  };

  // Calculate summary stats
  const totalProducts = filteredCosts.length;
  const frozenCosts = filteredCosts.filter(cost => cost.isFrozen).length;
  const avgMaterialCost = totalProducts > 0 
    ? filteredCosts.reduce((sum, sc) => sum + sc.materialCost, 0) / totalProducts 
    : 0;
  const avgTotalCost = totalProducts > 0 
    ? filteredCosts.reduce((sum, sc) => sum + sc.totalCost, 0) / totalProducts 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Standard Costs</h1>
          <p className="text-gray-600 mt-1">Financial baseline for variance analysis and pricing strategy</p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/${orgSlug}/costing/standard-costs/new`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Standard Cost
          </Link>
          <button className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-bold mt-1">{totalProducts}</p>
            </div>
            <Package className="w-10 h-10 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Frozen Costs</p>
              <p className="text-2xl font-bold mt-1">{frozenCosts}</p>
            </div>
            <Settings2 className="w-10 h-10 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Material Cost</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(avgMaterialCost)}</p>
            </div>
            <DollarSign className="w-10 h-10 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Total Cost</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(avgTotalCost)}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('rollup')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rollup'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            BOM Roll-up
          </button>
          <button
            onClick={() => setActiveTab('variances')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'variances'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Variance Analysis
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 w-64"
              />
              <select
                value={filters.costingMethod}
                onChange={(e) => setFilters(prev => ({ ...prev, costingMethod: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">All Methods</option>
                <option value="STANDARD">Standard</option>
                <option value="FIFO">FIFO</option>
                <option value="LIFO">LIFO</option>
                <option value="WEIGHTED_AVERAGE">Weighted Average</option>
                <option value="SPECIFIC_IDENTIFICATION">Specific ID</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cost Cards List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-lg font-medium text-gray-900">Standard Cost Cards</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {filteredCosts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>No standard costs found</p>
                      <p className="text-sm mt-1">Create your first standard cost to get started</p>
                    </div>
                  ) : (
                    filteredCosts.map((cost) => (
                      <div
                        key={cost.id}
                        className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedProduct?.id === cost.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => setSelectedProduct(cost)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{cost.product.name}</span>
                              <span className="text-sm text-gray-500">({cost.product.sku})</span>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(cost.status)}`}>
                                {cost.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>Version: {cost.costingVersion} | Method: {cost.costingMethod}</div>
                              <div>Effective: {new Date(cost.effectiveFrom).toLocaleDateString()}</div>
                              {cost.lastPurchasePrice && cost.priceVariance && (
                                <div className={`font-medium ${
                                  cost.priceVariance > 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  Variance: {formatCurrency(Math.abs(cost.priceVariance))} 
                                  {cost.priceVariance > 0 ? ' over' : ' under'}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">
                              {formatCurrency(cost.totalCost)}
                            </div>
                            <div className="text-xs text-gray-500">Total Cost</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Cost Breakdown Chart */}
            <div>
              {selectedProduct ? (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-medium text-gray-900">Cost Breakdown</h3>
                    <p className="text-sm text-gray-600">{selectedProduct.product.name}</p>
                  </div>
                  <div className="p-6">
                    <CostBreakdownChart
                      materialCost={selectedProduct.materialCost}
                      laborCost={selectedProduct.laborCost}
                      overheadCost={selectedProduct.overheadCost}
                      currency={organization?.baseCurrency}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                  <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Select a product to view cost breakdown</p>
                </div>
              )}
            </div>
          </div>

          {/* Version Control */}
          {selectedProduct && (
            <VersionControl
              versions={standardCosts.filter(cost => cost.product.id === selectedProduct.product.id)}
              currentVersion={selectedProduct}
              currency={organization?.baseCurrency}
            />
          )}
        </div>
      )}

      {activeTab === 'rollup' && (
        <div>
          {selectedProduct ? (
            <BomRollupWorkbench
              productId={selectedProduct.product.id}
              orgSlug={orgSlug}
              onRollupComplete={(result) => {
                console.log('Rollup completed:', result);
                fetchStandardCosts(); // Refresh data
              }}
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Select a product from the Overview tab to perform BOM roll-up</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'variances' && (
        <VarianceHighlights
          orgSlug={orgSlug}
          threshold={10}
          onVarianceClick={(variance) => {
            // Find and select the product with variance
            const product = standardCosts.find(cost => cost.product.id === variance.productId);
            if (product) {
              setSelectedProduct(product);
              setActiveTab('overview');
            }
          }}
        />
      )}
    </div>
  );
}
