/**
 * New Inventory Revaluation Page
 * 
 * Form to create new inventory revaluations with:
 * 1. Financial safety controls
 * 2. Market price calculation
 * 3. GL preview feature
 * 4. Country-specific reason codes
 * 5. Real-time validation
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
  ArrowLeft, Calculator, Eye, AlertTriangle, CheckCircle,
  DollarSign, TrendingUp, TrendingDown, Zap, Globe, 
  Package, FileText, Save, Send, Lightbulb
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  currentCost: number;
  quantityOnHand: number;
  totalValue: number;
}

interface ReasonCode {
  code: string;
  name: string;
  description: string;
  requiresApproval: boolean;
}

interface MarketPrice {
  suggestedUnitCost: number;
  lastPurchasePrice: number;
  averageMarketPrice: number;
  priceSource: string;
  seasonalAdjustment: number;
}

interface GLPreview {
  currentQuantity: number;
  currentUnitCost: number;
  currentTotalValue: number;
  newUnitCost: number;
  newTotalValue: number;
  valueDifference: number;
  percentageChange: number;
  glPreview: {
    debitAccount: { code: string; name: string; amount: number };
    creditAccount: { code: string; name: string; amount: number };
  };
  warnings: string[];
}

interface Organization {
  baseCurrency: string;
  homeCountry: string;
}

export default function NewRevaluationPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  // Form state
  const [formData, setFormData] = useState({
    productId: '',
    warehouseId: '',
    reasonCode: '',
    newUnitCost: '',
    postingDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{id: string; name: string}>>([]);
  const [reasonCodes, setReasonCodes] = useState<ReasonCode[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Feature state
  const [marketPrice, setMarketPrice] = useState<MarketPrice | null>(null);
  const [glPreview, setGLPreview] = useState<GLPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMarketPrice, setLoadingMarketPrice] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchInitialData();
  }, [orgSlug]);

  useEffect(() => {
    if (formData.productId) {
      const product = products.find(p => p.id === formData.productId);
      setSelectedProduct(product || null);
      
      // Clear previous calculations
      setMarketPrice(null);
      setGLPreview(null);
    }
  }, [formData.productId, products]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Fetch products with inventory
      const productsResponse = await fetch(`/api/${orgSlug}/products?hasInventory=true`);
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData.data || []);
      }

      // Fetch warehouses
      const warehousesResponse = await fetch(`/api/${orgSlug}/warehouses`);
      if (warehousesResponse.ok) {
        const warehousesData = await warehousesResponse.json();
        setWarehouses(warehousesData.data || []);
      }

      // Fetch reason codes
      const reasonCodesResponse = await fetch(`/api/${orgSlug}/costing/revaluations/reason-codes`);
      if (reasonCodesResponse.ok) {
        const reasonCodesData = await reasonCodesResponse.json();
        setReasonCodes(reasonCodesData.data || []);
      }

      // Get organization info
      const orgResponse = await fetch(`/api/${orgSlug}/organization`);
      if (orgResponse.ok) {
        const orgData = await orgResponse.json();
        setOrganization(orgData.data);
      }

    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const calculateMarketPrice = async () => {
    if (!formData.productId) return;

    try {
      setLoadingMarketPrice(true);
      const response = await fetch(`/api/${orgSlug}/costing/revaluations/market-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: formData.productId }),
      });

      if (response.ok) {
        const data = await response.json();
        setMarketPrice(data.data);
        
        // Auto-fill suggested price
        if (data.data.suggestedUnitCost > 0) {
          setFormData(prev => ({ 
            ...prev, 
            newUnitCost: data.data.suggestedUnitCost.toFixed(2)
          }));
        }
      }
    } catch (error) {
      console.error('Error calculating market price:', error);
    } finally {
      setLoadingMarketPrice(false);
    }
  };

  const generateGLPreview = async () => {
    if (!formData.productId || !formData.newUnitCost) return;

    try {
      setLoadingPreview(true);
      const response = await fetch(`/api/${orgSlug}/costing/revaluations/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: formData.productId,
          warehouseId: formData.warehouseId || null,
          newUnitCost: parseFloat(formData.newUnitCost),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGLPreview(data.data);
      }
    } catch (error) {
      console.error('Error generating GL preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.productId) newErrors.productId = 'Product is required';
    if (!formData.reasonCode) newErrors.reasonCode = 'Reason code is required';
    if (!formData.newUnitCost) newErrors.newUnitCost = 'New unit cost is required';
    if (!formData.postingDate) newErrors.postingDate = 'Posting date is required';

    if (formData.newUnitCost && selectedProduct) {
      const newCost = parseFloat(formData.newUnitCost);
      if (newCost <= 0) newErrors.newUnitCost = 'Unit cost must be greater than zero';
      
      const percentChange = Math.abs((newCost - selectedProduct.currentCost) / selectedProduct.currentCost) * 100;
      if (percentChange > 50) {
        newErrors.newUnitCost = 'Large cost change (>50%) requires additional validation';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (status: 'DRAFT' | 'PENDING_APPROVAL') => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const response = await fetch(`/api/${orgSlug}/costing/revaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          newUnitCost: parseFloat(formData.newUnitCost),
          postingDate: formData.postingDate,
          status,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/${orgSlug}/costing/revaluations/${data.data.revaluation.id}`);
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.details || 'Failed to create revaluation' });
      }
    } catch (error) {
      console.error('Error creating revaluation:', error);
      setErrors({ submit: 'An error occurred while creating the revaluation' });
    } finally {
      setLoading(false);
    }
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

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Loading revaluation form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Inventory Revaluation</h1>
          <p className="text-gray-600">
            Adjust inventory costs with approval workflow and GL preview
          </p>
        </div>
      </div>

      {/* Country-Specific Help */}
      {organization?.homeCountry === 'UG' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Uganda Operations</h4>
                <p className="text-sm text-blue-700">
                  Use currency fluctuation reason codes for USD/UGX changes affecting imported goods.
                  Border delay and fuel price impact options are available for Mombasa port logistics.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revaluation Details</CardTitle>
              <CardDescription>
                Select the product and specify the new valuation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product *
                </label>
                <select
                  value={formData.productId}
                  onChange={(e) => handleInputChange('productId', e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 text-sm ${
                    errors.productId ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku}) - Qty: {product.quantityOnHand} - Cost: {formatCurrency(product.currentCost)}
                    </option>
                  ))}
                </select>
                {errors.productId && (
                  <p className="text-red-600 text-xs mt-1">{errors.productId}</p>
                )}
              </div>

              {/* Warehouse Selection */}
              {warehouses.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Warehouse
                  </label>
                  <select
                    value={formData.warehouseId}
                    onChange={(e) => handleInputChange('warehouseId', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">All warehouses</option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reason Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason Code *
                </label>
                <select
                  value={formData.reasonCode}
                  onChange={(e) => handleInputChange('reasonCode', e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 text-sm ${
                    errors.reasonCode ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a reason</option>
                  {reasonCodes.map(code => (
                    <option key={code.code} value={code.code}>
                      {code.name} {code.requiresApproval ? '(Requires Approval)' : ''}
                    </option>
                  ))}
                </select>
                {errors.reasonCode && (
                  <p className="text-red-600 text-xs mt-1">{errors.reasonCode}</p>
                )}
              </div>

              {/* New Unit Cost */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    New Unit Cost * ({organization?.baseCurrency || 'USD'})
                  </label>
                  {selectedProduct && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={calculateMarketPrice}
                      disabled={loadingMarketPrice}
                      className="flex items-center gap-2"
                    >
                      <Lightbulb className="w-4 h-4" />
                      {loadingMarketPrice ? 'Calculating...' : 'Suggest Price'}
                    </Button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={formData.newUnitCost}
                  onChange={(e) => handleInputChange('newUnitCost', e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 text-sm ${
                    errors.newUnitCost ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.newUnitCost && (
                  <p className="text-red-600 text-xs mt-1">{errors.newUnitCost}</p>
                )}
                {selectedProduct && formData.newUnitCost && (
                  <div className="mt-2 text-xs text-gray-600">
                    Current: {formatCurrency(selectedProduct.currentCost)} → 
                    New: {formatCurrency(parseFloat(formData.newUnitCost))} 
                    <span className={`ml-2 font-medium ${
                      parseFloat(formData.newUnitCost) > selectedProduct.currentCost 
                        ? 'text-red-600' : 'text-green-600'
                    }`}>
                      ({((parseFloat(formData.newUnitCost) - selectedProduct.currentCost) / selectedProduct.currentCost * 100).toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Posting Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posting Date *
                </label>
                <input
                  type="date"
                  value={formData.postingDate}
                  onChange={(e) => handleInputChange('postingDate', e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 text-sm ${
                    errors.postingDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.postingDate && (
                  <p className="text-red-600 text-xs mt-1">{errors.postingDate}</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="Additional notes or supporting documentation references..."
                />
              </div>

              {/* GL Preview Button */}
              {selectedProduct && formData.newUnitCost && (
                <div className="border-t pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateGLPreview}
                    disabled={loadingPreview}
                    className="w-full flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {loadingPreview ? 'Generating Preview...' : 'Preview GL Impact'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => handleSubmit('DRAFT')}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSubmit('PENDING_APPROVAL')}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
              Submit for Approval
            </Button>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <p className="text-red-700">{errors.submit}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Market Price Info */}
          {marketPrice && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Market Price Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Suggested Cost:</span>
                  <span className="font-medium">{formatCurrency(marketPrice.suggestedUnitCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Last Purchase:</span>
                  <span className="text-sm">{formatCurrency(marketPrice.lastPurchasePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Market Average:</span>
                  <span className="text-sm">{formatCurrency(marketPrice.averageMarketPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Source:</span>
                  <Badge variant="secondary">{marketPrice.priceSource}</Badge>
                </div>
                {marketPrice.seasonalAdjustment !== 1.0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Seasonal Adj:</span>
                    <span className="text-sm">×{marketPrice.seasonalAdjustment.toFixed(2)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* GL Preview */}
          {glPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">GL Impact Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Current Value:</span>
                    <span className="text-sm">{formatCurrency(glPreview.currentTotalValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">New Value:</span>
                    <span className="text-sm font-medium">{formatCurrency(glPreview.newTotalValue)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-medium">Net Change:</span>
                    <span className={`text-sm font-medium ${
                      glPreview.valueDifference >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {glPreview.valueDifference >= 0 ? '+' : ''}
                      {formatCurrency(glPreview.valueDifference)} 
                      ({glPreview.percentageChange >= 0 ? '+' : ''}{glPreview.percentageChange.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Journal Entries:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">DR: {glPreview.glPreview.debitAccount.name}</span>
                      <span className="text-green-700">{formatCurrency(glPreview.glPreview.debitAccount.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-700">CR: {glPreview.glPreview.creditAccount.name}</span>
                      <span className="text-red-700">{formatCurrency(glPreview.glPreview.creditAccount.amount)}</span>
                    </div>
                  </div>
                </div>

                {glPreview.warnings.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Warnings:
                    </h4>
                    <ul className="space-y-1">
                      {glPreview.warnings.map((warning, index) => (
                        <li key={index} className="text-xs text-amber-700">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Current Product Info */}
          {selectedProduct && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Product Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">SKU:</span>
                  <span className="font-mono">{selectedProduct.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity:</span>
                  <span>{selectedProduct.quantityOnHand.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Cost:</span>
                  <span className="font-medium">{formatCurrency(selectedProduct.currentCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Value:</span>
                  <span className="font-medium">{formatCurrency(selectedProduct.totalValue)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}