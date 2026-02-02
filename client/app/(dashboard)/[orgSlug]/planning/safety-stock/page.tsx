'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  Calculator, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Download,
  Upload,
  Settings,
  Eye,
  Edit,
  Trash2,
  Shield,
  Package,
  DollarSign,
  Activity
} from 'lucide-react';
import { SafetyStockMethod } from '@prisma/client';

interface StockHealth {
  currentLevel: number;
  safetyLevel: number;
  coverage: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskMessage: string;
  financialValue: number;
  financialValueFormatted: string;
  shortfall: number;
}

interface SafetyStockRecord {
  id: string;
  productId: string;
  safetyStockQty: number;
  calculationMethod: SafetyStockMethod;
  serviceLevel?: number;
  leadTimeDays?: number;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
  product: {
    id: string;
    name: string;
    sku: string;
    purchasePrice: number;
    category?: string;
  };
  warehouse?: {
    id: string;
    name: string;
  };
  stockHealth: StockHealth;
}

interface SafetyStockSummary {
  totalProducts: number;
  activeProducts: number;
  highRiskProducts: number;
  totalFinancialValue: number;
  totalFinancialValueFormatted: string;
  totalShortfall: number;
  currency: string;
}

interface SafetyStockCalculationResult {
  suggestedQuantity: number;
  currentQuantity: number;
  method: SafetyStockMethod;
  financialImpact: number;
  riskReduction: number;
  calculation: {
    avgDailyDemand: number;
    maxDailyDemand: number;
    avgLeadTime: number;
    maxLeadTime: number;
    demandStdDev?: number;
    zScore?: number;
    regionalMultiplier: number;
  };
}

const SafetyStockPage = () => {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [safetyStocks, setSafetyStocks] = useState<SafetyStockRecord[]>([]);
  const [summary, setSummary] = useState<SafetyStockSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [riskFilter, setRiskFilter] = useState('');

  // Calculation workbench state
  const [calculationDialog, setCalculationDialog] = useState(false);
  const [selectedProductForCalc, setSelectedProductForCalc] = useState<string>('');
  const [calculationResults, setCalculationResults] = useState<SafetyStockCalculationResult[]>([]);
  const [calculationLoading, setCalculationLoading] = useState(false);

  // Configuration state
  const [configureDialog, setConfigureDialog] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchSafetyStockData();
  }, [page, searchTerm, warehouseFilter, methodFilter, statusFilter, riskFilter]);
  const fetchSafetyStockData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        orgId: orgSlug,
        page: page.toString(),
        limit: '50',
        ...(searchTerm && { search: searchTerm }),
        ...(warehouseFilter !== 'all' && { warehouseId: warehouseFilter }),
        ...(methodFilter && { method: methodFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(riskFilter && { riskLevel: riskFilter }),
      });

      const response = await fetch(`/api/planning/safety-stock/overview?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        setSafetyStocks(data.safetyStocks);
        setSummary(data.summary);
        setTotalPages(data.pagination.totalPages);
      } else {
        console.error('Error fetching safety stock data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching safety stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateForProduct = async (productId: string) => {
    setSelectedProductForCalc(productId);
    setCalculationDialog(true);
    setCalculationLoading(true);

    try {
      const response = await fetch(`/api/planning/safety-stock?orgId=${orgSlug}&productId=${productId}`);
      const data = await response.json();

      if (response.ok) {
        setCalculationResults(data.results);
      }
    } catch (error) {
      console.error('Error calculating safety stock:', error);
    } finally {
      setCalculationLoading(false);
    }
  };

  const handleBulkOperation = async (action: string) => {
    if (selectedProducts.length === 0) return;

    try {
      const response = await fetch('/api/planning/safety-stock/overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          productIds: selectedProducts,
          updates: action === 'bulk_update' ? { serviceLevel: 95 } : undefined,
        }),
      });

      if (response.ok) {
        setSelectedProducts([]);
        fetchSafetyStockData();
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'high': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const formatCurrency = (amount: number) => {
    // Since we'll be using formatted currency from API, 
    // this is a fallback for legacy data
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number, decimals = 0) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-gray-500">Loading safety stock data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Safety Stock Management</h1>
          <p className="text-gray-500 mt-1">Insurance Policy for Inventory - Monitor and optimize safety stock levels</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => {
              // Export functionality - could download CSV or Excel
              console.log('Export safety stock data');
            }}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => {
              // Import functionality - could open file dialog
              console.log('Import safety stock data');
            }}
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button className="flex items-center gap-2" onClick={() => setConfigureDialog(true)}>
            <Settings className="h-4 w-4" />
            Configure
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Products</p>
              <p className="text-2xl font-bold text-blue-600">{summary?.totalProducts || 0}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Rules</p>
              <p className="text-2xl font-bold text-green-600">{summary?.activeProducts || 0}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">High Risk Items</p>
              <p className="text-2xl font-bold text-red-600">{summary?.highRiskProducts || 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Financial Value</p>
              <p className="text-2xl font-bold text-purple-600">{summary?.totalFinancialValueFormatted || 'N/A'}</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Shortfall</p>
              <p className="text-2xl font-bold text-orange-600">{formatNumber(summary?.totalShortfall || 0)}</p>
            </div>
            <Activity className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select 
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Warehouses</option>
            <option value="main">Main Warehouse</option>
          </select>
          <select 
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Methods</option>
            <option value={SafetyStockMethod.STATISTICAL}>Statistical</option>
            <option value={SafetyStockMethod.BASED_ON_LEAD_TIME}>Lead Time Based</option>
            <option value={SafetyStockMethod.PERCENTAGE_OF_DEMAND}>Percentage</option>
            <option value={SafetyStockMethod.FIXED}>Fixed</option>
          </select>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>
          <select 
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
          <Button
            variant="outline"
            onClick={() => fetchSafetyStockData()}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-800 font-medium">
              {selectedProducts.length} items selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkOperation('bulk_update')}
            >
              Bulk Update
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkOperation('bulk_recalculate')}
            >
              Recalculate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkOperation('bulk_deactivate')}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              Deactivate
            </Button>
          </div>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === safetyStocks.length && safetyStocks.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProducts(safetyStocks.map(s => s.productId));
                      } else {
                        setSelectedProducts([]);
                      }
                    }}
                    className="rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Safety Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coverage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Financial Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {safetyStocks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Safety Stock Records</h3>
                    <p className="text-gray-500">Start by creating safety stock rules for your products to prevent stockouts.</p>
                  </td>
                </tr>
              ) : (
                safetyStocks.map((stock) => (
                  <tr key={stock.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(stock.productId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts(prev => [...prev, stock.productId]);
                          } else {
                            setSelectedProducts(prev => prev.filter(id => id !== stock.productId));
                          }
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{stock.product.name}</div>
                        <div className="text-sm text-gray-500">{stock.product.sku}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{formatNumber(stock.stockHealth.currentLevel)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{formatNumber(stock.stockHealth.safetyLevel)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              stock.stockHealth.coverage >= 1 ? 'bg-green-500' :
                              stock.stockHealth.coverage >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(stock.stockHealth.coverage * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{formatNumber(stock.stockHealth.coverage * 100, 1)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(stock.stockHealth.riskLevel)}`}>
                        {getRiskIcon(stock.stockHealth.riskLevel)}
                        {stock.stockHealth.riskLevel.toUpperCase()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs text-gray-500">{stock.calculationMethod.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{stock.stockHealth.financialValueFormatted}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCalculateForProduct(stock.productId)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Calculate"
                        >
                          <Calculator className="h-4 w-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-800" title="View Details">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-800" title="Edit">
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Calculation Dialog */}
      {calculationDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-96 overflow-auto">
            <h2 className="text-xl font-bold mb-4">Safety Stock Calculator</h2>
            {calculationLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Calculating safety stock recommendations...</span>
              </div>
            ) : calculationResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Method</th>
                      <th className="text-left py-2">Suggested Qty</th>
                      <th className="text-left py-2">Current Qty</th>
                      <th className="text-left py-2">Financial Impact</th>
                      <th className="text-left py-2">Risk Reduction</th>
                      <th className="text-left py-2">Regional Multiplier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculationResults.map((result, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-2 font-medium">{result.method.replace(/_/g, ' ')}</td>
                        <td className="py-2">{formatNumber(result.suggestedQuantity)}</td>
                        <td className="py-2">{formatNumber(result.currentQuantity)}</td>
                        <td className="py-2">
                          <span className={result.financialImpact >= 0 ? 'text-red-600' : 'text-green-600'}>
                            {formatCurrency(Math.abs(result.financialImpact))}
                          </span>
                        </td>
                        <td className="py-2 text-green-600">+{formatNumber(result.riskReduction, 1)}%</td>
                        <td className="py-2">{result.calculation.regionalMultiplier}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Select a product to see calculations</p>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setCalculationDialog(false)}>Close</Button>
              <Button>Apply Recommendations</Button>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Dialog */}
      {configureDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96 overflow-auto">
            <h2 className="text-xl font-bold mb-4">Safety Stock Configuration</h2>
            
            <div className="space-y-4">
              {/* Default Calculation Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Calculation Method
                </label>
                <select className="w-full p-2 border rounded-md">
                  <option value="FIXED">Fixed Quantity</option>
                  <option value="STATISTICAL">Statistical</option>
                  <option value="PERCENTAGE">Percentage of Demand</option>
                </select>
              </div>

              {/* Default Service Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Service Level (%)
                </label>
                <input 
                  type="number" 
                  min="90" 
                  max="99.9" 
                  step="0.1" 
                  placeholder="95.0"
                  className="w-full p-2 border rounded-md"
                />
              </div>

              {/* Default Lead Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Lead Time (days)
                </label>
                <input 
                  type="number" 
                  min="1" 
                  max="365" 
                  placeholder="14"
                  className="w-full p-2 border rounded-md"
                />
              </div>

              {/* Review Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Review Period (days)
                </label>
                <input 
                  type="number" 
                  min="1" 
                  max="90" 
                  placeholder="30"
                  className="w-full p-2 border rounded-md"
                />
              </div>

              {/* Auto-update Settings */}
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="autoUpdate" 
                  className="rounded"
                />
                <label htmlFor="autoUpdate" className="text-sm text-gray-700">
                  Auto-update safety stock levels based on demand changes
                </label>
              </div>

              {/* Alert Settings */}
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="lowStockAlerts" 
                  className="rounded"
                  defaultChecked
                />
                <label htmlFor="lowStockAlerts" className="text-sm text-gray-700">
                  Enable low stock alerts
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setConfigureDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setConfigureDialog(false)}>
                Save Configuration
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafetyStockPage;
