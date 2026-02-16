'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Trash2, Save, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useOrganization } from '@/hooks/useOrganization';

interface StockDecreaseItem {
  id: string;
  productId?: string;
  goodsCode: string;
  productName: string;
  measureUnit: string;
  quantity: string;
  unitPrice: string;
  remarks: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  sellingPrice: number;
}

export default function StockDecreasePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const { organization } = useOrganization();
  const isUganda = organization?.homeCountry?.toUpperCase() === 'UG' || organization?.homeCountry?.toUpperCase() === 'UGANDA';

  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<StockDecreaseItem[]>([
    {
      id: '1',
      productId: '',
      goodsCode: '',
      productName: '',
      measureUnit: '101',
      quantity: '',
      unitPrice: '',
      remarks: '',
    },
  ]);
  const [adjustType, setAdjustType] = useState('102'); // Default: Damaged
  const [stockInDate, setStockInDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittingEfris, setSubmittingEfris] = useState(false);
  const [efrisEnabled, setEfrisEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (organization) {
      checkEfrisConfig();
    }
  }, [organization]);

  const checkEfrisConfig = async () => {
    if (!isUganda) {
      setEfrisEnabled(false);
      return;
    }
    
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/settings/efris`);
      if (res.ok) {
        const data = await res.json();
        setEfrisEnabled(data.config?.isActive === true);
      }
    } catch (err) {
      console.error('Error checking EFRIS config:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/${orgSlug}/inventory/products`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        productId: '',
        goodsCode: '',
        productName: '',
        measureUnit: '101',
        quantity: '',
        unitPrice: '',
        remarks: '',
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: string, value: string) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // If product is selected, populate fields
          if (field === 'productId' && value) {
            const product = products.find((p) => p.id === value);
            if (product) {
              updated.goodsCode = product.sku;
              updated.productName = product.name;
              updated.unitPrice = product.sellingPrice.toString();
            }
          }

          return updated;
        }
        return item;
      })
    );
  };

  const validate = (): string | null => {
    if (!adjustType) {
      return 'Please select an adjust type';
    }

    if (adjustType === '104' && !remarks) {
      return 'Remarks are required when adjust type is "Others"';
    }

    for (const item of items) {
      if (!item.goodsCode) {
        return 'All items must have a product/SKU code';
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        return 'All items must have a valid quantity';
      }
      if (!item.unitPrice || parseFloat(item.unitPrice) <= 0) {
        return 'All items must have a valid unit price';
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent, submitToEfris = false) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (submitToEfris) {
      setSubmittingEfris(true);
    } else {
      setSubmitting(true);
    }

    try {
      const res = await fetch(`/api/orgs/${orgSlug}/inventory/stock-decrease`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustType,
          stockInDate,
          remarks,
          submitToEfris,
          items: items.map((item) => ({
            productId: item.productId || undefined,
            goodsCode: item.goodsCode,
            measureUnit: item.measureUnit,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            remarks: item.remarks || undefined,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit stock decrease');
      }

      setSuccess(submitToEfris ? 'Stock decrease submitted successfully to EFRIS' : 'Stock decrease created successfully');
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(`/${orgSlug}/inventory/products`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit stock decrease');
    } finally {
      setSubmitting(false);
      setSubmittingEfris(false);
    }
  };

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href={`/${orgSlug}/inventory/products`} className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Stock Decrease</h1>
            </div>
            <p className="text-gray-600">
              Record inventory reductions for damaged, expired, or consumed items
            </p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-700">{success}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Adjustment Details */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Adjustment Details</h2>
            </div>
            <div className="px-5 py-5 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Adjust Type<span className="text-red-500">*</span>
                </label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  required
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="101">101 - Expired</option>
                  <option value="102">102 - Damaged</option>
                  <option value="103">103 - Personal Use</option>
                  <option value="104">104 - Others</option>
                  <option value="105">105 - Raw Materials</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={stockInDate}
                  onChange={(e) => setStockInDate(e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700">
                  Remarks{adjustType === '104' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={adjustType === '104' ? 'Required for Others type' : 'Optional notes'}
                  required={adjustType === '104'}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-900">Items</h2>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-3 items-start border-b border-gray-100 pb-4 last:border-0">
                  <div className="col-span-12 md:col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                    <select
                      value={item.productId}
                      onChange={(e) => updateItem(item.id, 'productId', e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Select Product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.sku} - {product.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-6 md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">SKU*</label>
                    <input
                      type="text"
                      value={item.goodsCode}
                      onChange={(e) => updateItem(item.id, 'goodsCode', e.target.value)}
                      placeholder="PRD-001"
                      required
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div className="col-span-6 md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity*</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                      placeholder="0"
                      required
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div className="col-span-6 md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price*</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div className="col-span-6 md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Item Remarks</label>
                    <input
                      type="text"
                      value={item.remarks}
                      onChange={(e) => updateItem(item.id, 'remarks', e.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-1 flex items-end justify-center md:justify-end">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className="p-2 text-red-600 hover:text-red-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end">
            <Link
              href={`/${orgSlug}/inventory/products`}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={(e: any) => handleSubmit(e, false)}
              disabled={submitting || submittingEfris}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Saving...' : 'Create Stock Decrease'}
            </button>
            {isUganda && efrisEnabled && (
              <button
                type="button"
                onClick={(e: any) => handleSubmit(e, true)}
                disabled={submitting || submittingEfris}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {submittingEfris ? 'Submitting...' : 'Submit to EFRIS'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
