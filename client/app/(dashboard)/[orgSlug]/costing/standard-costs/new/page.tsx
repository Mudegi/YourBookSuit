'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Calculator } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
}

export default function NewStandardCostPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    productId: '',
    costingMethod: 'WEIGHTED_AVERAGE',
    materialCost: 0,
    laborCost: 0,
    overheadCost: 0,
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/products`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.productId) {
      newErrors.productId = 'Product is required';
    }
    if (!formData.costingMethod) {
      newErrors.costingMethod = 'Costing method is required';
    }
    if (formData.materialCost < 0) {
      newErrors.materialCost = 'Material cost must be non-negative';
    }
    if (formData.laborCost < 0) {
      newErrors.laborCost = 'Labor cost must be non-negative';
    }
    if (formData.overheadCost < 0) {
      newErrors.overheadCost = 'Overhead cost must be non-negative';
    }
    if (!formData.effectiveFrom) {
      newErrors.effectiveFrom = 'Effective from date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/${orgSlug}/costing/standard-costs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push(`/${orgSlug}/costing/standard-costs`);
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.error || 'Failed to create standard cost' });
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to create standard cost' });
    } finally {
      setLoading(false);
    }
  };

  const totalCost = formData.materialCost + formData.laborCost + formData.overheadCost;
  const selectedProduct = products.find(p => p.id === formData.productId);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/${orgSlug}/costing/standard-costs`}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Standard Costs
        </Link>
      </div>

      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">New Standard Cost</h1>
        <p className="text-gray-600 mb-8">
          Create a new standard cost for a product to establish baseline pricing.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product *
            </label>
            <select
              value={formData.productId}
              onChange={(e) => handleInputChange('productId', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 ${
                errors.productId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a product...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
            {errors.productId && (
              <p className="mt-1 text-sm text-red-600">{errors.productId}</p>
            )}
          </div>

          {/* Selected Product Info */}
          {selectedProduct && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900">Selected Product</h3>
              <p className="text-blue-700">{selectedProduct.name}</p>
              <p className="text-sm text-blue-600">SKU: {selectedProduct.sku}</p>
            </div>
          )}

          {/* Costing Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Costing Method *
            </label>
            <select
              value={formData.costingMethod}
              onChange={(e) => handleInputChange('costingMethod', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 ${
                errors.costingMethod ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="STANDARD">Standard</option>
              <option value="FIFO">FIFO</option>
              <option value="LIFO">LIFO</option>
              <option value="WEIGHTED_AVERAGE">Weighted Average</option>
              <option value="SPECIFIC_IDENTIFICATION">Specific Identification</option>
            </select>
            {errors.costingMethod && (
              <p className="mt-1 text-sm text-red-600">{errors.costingMethod}</p>
            )}
          </div>

          {/* Cost Components */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material Cost *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.materialCost}
                onChange={(e) => handleInputChange('materialCost', parseFloat(e.target.value) || 0)}
                className={`w-full border rounded-lg px-3 py-2 ${
                  errors.materialCost ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.materialCost && (
                <p className="mt-1 text-sm text-red-600">{errors.materialCost}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Labor Cost *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.laborCost}
                onChange={(e) => handleInputChange('laborCost', parseFloat(e.target.value) || 0)}
                className={`w-full border rounded-lg px-3 py-2 ${
                  errors.laborCost ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.laborCost && (
                <p className="mt-1 text-sm text-red-600">{errors.laborCost}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overhead Cost *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.overheadCost}
                onChange={(e) => handleInputChange('overheadCost', parseFloat(e.target.value) || 0)}
                className={`w-full border rounded-lg px-3 py-2 ${
                  errors.overheadCost ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.overheadCost && (
                <p className="mt-1 text-sm text-red-600">{errors.overheadCost}</p>
              )}
            </div>
          </div>

          {/* Total Cost Display */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5 text-gray-600" />
              <h3 className="font-medium text-gray-900">Cost Summary</h3>
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Material</div>
                <div className="font-medium">${formData.materialCost.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-600">Labor</div>
                <div className="font-medium">${formData.laborCost.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-600">Overhead</div>
                <div className="font-medium">${formData.overheadCost.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-600">Total</div>
                <div className="text-lg font-bold text-gray-900">${totalCost.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Effective Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Effective From *
              </label>
              <input
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) => handleInputChange('effectiveFrom', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 ${
                  errors.effectiveFrom ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.effectiveFrom && (
                <p className="mt-1 text-sm text-red-600">{errors.effectiveFrom}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Effective To (Optional)
              </label>
              <input
                type="date"
                value={formData.effectiveTo}
                onChange={(e) => handleInputChange('effectiveTo', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Add any additional notes about this standard cost..."
            />
          </div>

          {/* Error Display */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Creating...' : 'Create Standard Cost'}
            </button>
            <Link
              href={`/${orgSlug}/costing/standard-costs`}
              className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}