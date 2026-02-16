'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Loader2, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import Loading from '@/components/ui/loading';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/utils';

interface Vendor {
  id: string;
  name: string;
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  purchasePrice: number;
}

interface TaxRate {
  id: string;
  name: string;
  rate: number;
}

interface ReceiptItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export default function NewGoodsReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState<Record<string, string>>({});
  const [productDropdownOpen, setProductDropdownOpen] = useState<Record<string, boolean>>({});
  
  const { currency, organization } = useOrganization();

  const [formData, setFormData] = useState({
    vendorId: '',
    receiptDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    notes: '',
    assetAccountId: '',
    apAccountId: '',
  });

  const [items, setItems] = useState<ReceiptItem[]>([
    {
      id: '1',
      productId: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 0,
    },
  ]);

  const [landedCosts, setLandedCosts] = useState({
    freightCost: 0,
    insuranceCost: 0,
    customsDuty: 0,
    otherCosts: 0,
    allocationMethod: 'BY_VALUE' as 'BY_VALUE' | 'BY_WEIGHT' | 'BY_VOLUME' | 'BY_QUANTITY',
  });

  const [priceWarnings, setPriceWarnings] = useState<Record<string, { lastPrice: number; percentDiff: number }>>({});

  useEffect(() => {
    loadData();
  }, [orgSlug]);

  async function loadData() {
    try {
      const [vendorsRes, productsRes, taxRatesRes, accountsRes] = await Promise.all([
        fetch(`/api/orgs/${orgSlug}/vendors`),
        fetch(`/api/orgs/${orgSlug}/inventory/products?limit=1000`),
        fetch(`/api/orgs/${orgSlug}/tax/rates?activeOnly=true`),
        fetch(`/api/orgs/${orgSlug}/chart-of-accounts?isActive=true`),
      ]);

      if (!vendorsRes.ok || !productsRes.ok) {
        throw new Error('Failed to load data');
      }

      const [vendorsData, productsData, taxRatesData, accountsData] = await Promise.all([
        vendorsRes.json(),
        productsRes.json(),
        taxRatesRes.json().catch(() => ({ data: [] })),
        accountsRes.json().catch(() => ({ accounts: [] })),
      ]);

      // Ensure we always set arrays
      const vendorsList = Array.isArray(vendorsData) ? vendorsData : (vendorsData?.vendors || vendorsData?.data || []);
      const productsList = Array.isArray(productsData) ? productsData : (Array.isArray(productsData?.data) ? productsData.data : []);
      const taxRatesList = Array.isArray(taxRatesData) ? taxRatesData : (Array.isArray(taxRatesData?.data) ? taxRatesData.data : []);
      const accountsList = Array.isArray(accountsData) ? accountsData : (Array.isArray(accountsData?.data) ? accountsData.data : []);
      
      setVendors(vendorsList);
      setProducts(productsList);
      setTaxRates(taxRatesList);
      setAccounts(accountsList);
    } catch (err: any) {
      setError(err.message);
      // Set empty arrays on error to prevent filter errors
      setVendors([]);
      setProducts([]);
      setTaxRates([]);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field: string, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleItemChange(itemId: string, field: keyof ReceiptItem, value: any) {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId
          ? { ...item, [field]: field === 'quantity' || field === 'unitPrice' || field === 'taxRate' ? Number(value) : value }
          : item
      )
    );
  }

  function handleProductSelect(itemId: string, product: Product) {
    handleItemChange(itemId, 'productId', product.id);
    handleItemChange(itemId, 'productName', product.name);
    handleItemChange(itemId, 'unitPrice', product.purchasePrice);
    setProductDropdownOpen((prev) => ({ ...prev, [itemId]: false }));
    setProductSearch((prev) => ({ ...prev, [itemId]: product.name }));
    
    // Clear price warning when product selected (will recheck on price change)
    setPriceWarnings((prev) => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  }

  function addItem() {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        productId: '',
        productName: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
      },
    ]);
  }

  function removeItem(itemId: string) {
    if (items.length === 1) {
      setError('At least one item is required');
      return;
    }
    setItems(items.filter((item) => item.id !== itemId));
  }

  function calculateLineTotal(item: ReceiptItem) {
    const subtotal = item.quantity * item.unitPrice;
    const tax = subtotal * (item.taxRate / 100);
    return subtotal + tax;
  }

  function calculateTotals() {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      return sum + itemSubtotal * (item.taxRate / 100);
    }, 0);
    const totalLandedCosts = landedCosts.freightCost + landedCosts.insuranceCost + landedCosts.customsDuty + landedCosts.otherCosts;
    const total = subtotal + taxAmount + totalLandedCosts;
    return { subtotal, taxAmount, total, totalLandedCosts };
  }

  function checkPriceVariance(itemId: string, newPrice: number) {
    const item = items.find((i) => i.id === itemId);
    if (!item || !item.productId) return;
    
    const product = products.find((p) => p.id === item.productId);
    if (!product || !product.purchasePrice || product.purchasePrice === 0) return;
    
    const lastPrice = product.purchasePrice;
    const priceDiff = Math.abs(newPrice - lastPrice);
    const percentDiff = (priceDiff / lastPrice) * 100;
    
    if (percentDiff > 10) {
      setPriceWarnings((prev) => ({
        ...prev,
        [itemId]: { lastPrice, percentDiff },
      }));
    } else {
      setPriceWarnings((prev) => {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Validate form
      if (!formData.vendorId) {
        throw new Error('Please select a vendor');
      }

      if (!formData.assetAccountId) {
        throw new Error('Please select an Inventory Asset Account');
      }

      if (!formData.apAccountId) {
        throw new Error('Please select an Accounts Payable Account');
      }

      if (items.length === 0) {
        throw new Error('Please add at least one item');
      }

      // Validate all items have required fields
      for (const item of items) {
        if (!item.productId) {
          throw new Error('All items must have a product selected');
        }
        if (item.quantity <= 0) {
          throw new Error('All items must have a positive quantity');
        }
      }

      const hasLandedCosts = landedCosts.freightCost > 0 || landedCosts.insuranceCost > 0 || landedCosts.customsDuty > 0 || landedCosts.otherCosts > 0;
      
      const payload = {
        vendorId: formData.vendorId,
        receiptDate: formData.receiptDate,
        referenceNumber: formData.referenceNumber || undefined,
        notes: formData.notes || undefined,
        assetAccountId: formData.assetAccountId,
        apAccountId: formData.apAccountId,
        postToGL: true,
        createAPBill: false,
        landedCosts: hasLandedCosts ? landedCosts : undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
        })),
      };

      const response = await fetch(`/api/orgs/${orgSlug}/inventory/goods-receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create goods receipt');
      }

      const result = await response.json();
      console.log('Goods receipt created successfully:', result);
      
      const receiptId = result.data?.goodsReceipt?.id;
      
      if (!receiptId) {
        console.error('Invalid response structure:', result);
        throw new Error('Failed to get receipt ID from response');
      }
      
      // Navigate to the created receipt
      router.replace(`/${orgSlug}/inventory/goods-receipts/${receiptId}`);
    } catch (err: any) {
      console.error('Error creating goods receipt:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const { subtotal, taxAmount, total, totalLandedCosts } = calculateTotals();
  
  const filteredVendors = vendorSearch.trim() === '' 
    ? vendors 
    : vendors.filter((v) => {
        const searchTerm = vendorSearch.toLowerCase();
        const vendorName = (v.name || v.companyName || v.contactName || '').toLowerCase();
        return vendorName.includes(searchTerm);
      });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/${orgSlug}/inventory/goods-receipts`}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Goods Receipts
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="w-10 h-10 text-blue-600" />
            New Goods Receipt / Stock Purchase
          </h1>
          <p className="text-gray-600 mt-1">Receive stock from vendor and register with EFRIS</p>
        </div>

        {error && <Alert variant="error" className="mb-6">{error}</Alert>}

        <form onSubmit={(e) => handleSubmit(e, false)} className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Receipt Header */}
            <Card className="shadow-sm">
              <CardHeader className="bg-white border-b">
                <CardTitle className="text-xl">Receipt Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Vendor Selection */}
                <div className="space-y-2">
                  <Label htmlFor="vendor" className="text-sm font-semibold">
                    Vendor <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="vendor"
                      type="text"
                      placeholder="Type to search vendors..."
                      value={vendorSearch}
                      onChange={(e) => {
                        setVendorSearch(e.target.value);
                        setVendorDropdownOpen(true);
                      }}
                      onFocus={() => setVendorDropdownOpen(true)}
                      className="h-11"
                    />
                    {vendorDropdownOpen && filteredVendors.length > 0 && (
                      <>
                        <div 
                          className="fixed inset-0 z-40"
                          onClick={() => setVendorDropdownOpen(false)}
                        />
                        <ul className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredVendors.map((vendor) => (
                            <li
                              key={vendor.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setFormData((prev) => ({ ...prev, vendorId: vendor.id }));
                                setVendorSearch(vendor.name || vendor.companyName || vendor.contactName || '');
                                setVendorDropdownOpen(false);
                              }}
                              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            >
                              <p className="font-medium text-gray-900">{vendor.name || vendor.companyName || vendor.contactName}</p>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="receiptDate" className="text-sm font-semibold">
                      Receipt Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="receiptDate"
                      type="date"
                      value={formData.receiptDate}
                      onChange={(e) => handleChange('receiptDate', e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="referenceNumber" className="text-sm font-semibold">
                      External Reference (Optional)
                    </Label>
                    <Input
                      id="referenceNumber"
                      type="text"
                      placeholder="PO #, Delivery Note # (Receipt # auto-generated)"
                      value={formData.referenceNumber}
                      onChange={(e) => handleChange('referenceNumber', e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assetAccount" className="text-sm font-semibold">
                      Inventory Asset Account <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="assetAccount"
                      value={formData.assetAccountId}
                      onChange={(e) => handleChange('assetAccountId', e.target.value)}
                      className="h-11 w-full px-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Inventory Account</option>
                      {accounts
                        .filter(acc => acc.accountType === 'ASSET')
                        .map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apAccount" className="text-sm font-semibold">
                      Accounts Payable Account <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="apAccount"
                      value={formData.apAccountId}
                      onChange={(e) => handleChange('apAccountId', e.target.value)}
                      className="h-11 w-full px-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select AP Account</option>
                      {accounts
                        .filter(acc => acc.accountType === 'LIABILITY')
                        .map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-semibold">
                    Notes
                  </Label>
                  <textarea
                    id="notes"
                    rows={3}
                    placeholder="Additional notes about this receipt..."
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card className="shadow-sm">
              <CardHeader className="bg-white border-b flex flex-row items-center justify-between">
                <CardTitle className="text-xl">Items</CardTitle>
                <Button type="button" onClick={addItem} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="w-full">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm font-semibold text-gray-700">
                        <th className="pb-3 pr-4">Product</th>
                        <th className="pb-3 px-2">Quantity</th>
                        <th className="pb-3 px-2">Unit Price</th>
                        <th className="pb-3 px-2">Tax Rate (%)</th>
                        <th className="pb-3 px-2 text-right">Line Total</th>
                        <th className="pb-3 pl-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const searchTerm = (productSearch[item.id] || '').toLowerCase();
                        const filteredProducts = searchTerm === ''
                          ? products
                          : products.filter((p) =>
                              p.name.toLowerCase().includes(searchTerm) ||
                              p.sku.toLowerCase().includes(searchTerm)
                            );

                        return (
                          <tr key={item.id} className="border-b">
                            <td className="py-3 pr-4">
                              <div className="relative">
                                <Input
                                  type="text"
                                  placeholder="Type to search products..."
                                  value={productSearch[item.id] || item.productName || ''}
                                  onChange={(e) => {
                                    setProductSearch((prev) => ({ ...prev, [item.id]: e.target.value }));
                                    setProductDropdownOpen((prev) => ({ ...prev, [item.id]: true }));
                                  }}
                                  onFocus={() => setProductDropdownOpen((prev) => ({ ...prev, [item.id]: true }))}
                                  className="h-10 w-full min-w-[200px]"
                                />
                                {productDropdownOpen[item.id] && filteredProducts.length > 0 && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-[99]"
                                      onClick={() => setProductDropdownOpen((prev) => ({ ...prev, [item.id]: false }))}
                                    />
                                    <ul className="absolute z-[100] w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                      {filteredProducts.map((product) => (
                                        <li
                                          key={product.id}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleProductSelect(item.id, product);
                                            setProductDropdownOpen((prev) => ({ ...prev, [item.id]: false }));
                                          }}
                                          className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                        >
                                          <p className="font-medium text-sm text-gray-900">{product.name}</p>
                                          <p className="text-xs text-gray-500">{product.sku} • {formatCurrency(product.purchasePrice)}</p>
                                        </li>
                                      ))}
                                    </ul>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                className="h-10 w-24"
                              />
                            </td>
                            <td className="py-3 px-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const newPrice = parseFloat(e.target.value) || 0;
                                  handleItemChange(item.id, 'unitPrice', e.target.value);
                                  checkPriceVariance(item.id, newPrice);
                                }}
                                className="h-10 w-28"
                              />
                              {priceWarnings[item.id] && (
                                <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                  <p className="font-semibold">⚠️ {priceWarnings[item.id].percentDiff.toFixed(1)}% variance</p>
                                  <p>Last: {formatCurrency(priceWarnings[item.id].lastPrice)}</p>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-2">
                              <select
                                value={item.taxRate}
                                onChange={(e) => handleItemChange(item.id, 'taxRate', e.target.value)}
                                className="h-10 w-24 px-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="0">NO VAT</option>
                                {taxRates.map((rate) => (
                                  <option key={rate.id} value={rate.rate}>
                                    {rate.name} ({rate.rate}%)
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-2 text-right font-medium">
                              {formatCurrency(calculateLineTotal(item))}
                            </td>
                            <td className="py-3 pl-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Landed Costs */}
            <Card className="shadow-sm">
              <CardHeader className="bg-white border-b">
                <CardTitle className="text-xl">Landed Costs (Optional)</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Additional costs to be allocated across inventory items</p>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="freightCost" className="text-sm font-semibold">
                      Freight Cost
                    </Label>
                    <Input
                      id="freightCost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={landedCosts.freightCost}
                      onChange={(e) => setLandedCosts({ ...landedCosts, freightCost: parseFloat(e.target.value) || 0 })}
                      className="h-11"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insuranceCost" className="text-sm font-semibold">
                      Insurance Cost
                    </Label>
                    <Input
                      id="insuranceCost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={landedCosts.insuranceCost}
                      onChange={(e) => setLandedCosts({ ...landedCosts, insuranceCost: parseFloat(e.target.value) || 0 })}
                      className="h-11"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customsDuty" className="text-sm font-semibold">
                      Customs Duty
                    </Label>
                    <Input
                      id="customsDuty"
                      type="number"
                      min="0"
                      step="0.01"
                      value={landedCosts.customsDuty}
                      onChange={(e) => setLandedCosts({ ...landedCosts, customsDuty: parseFloat(e.target.value) || 0 })}
                      className="h-11"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="otherCosts" className="text-sm font-semibold">
                      Other Costs
                    </Label>
                    <Input
                      id="otherCosts"
                      type="number"
                      min="0"
                      step="0.01"
                      value={landedCosts.otherCosts}
                      onChange={(e) => setLandedCosts({ ...landedCosts, otherCosts: parseFloat(e.target.value) || 0 })}
                      className="h-11"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allocationMethod" className="text-sm font-semibold">
                    Allocation Method
                  </Label>
                  <select
                    id="allocationMethod"
                    value={landedCosts.allocationMethod}
                    onChange={(e) => setLandedCosts({ ...landedCosts, allocationMethod: e.target.value as any })}
                    className="w-full h-11 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="BY_VALUE">By Value (Recommended)</option>
                    <option value="BY_WEIGHT">By Weight</option>
                    <option value="BY_VOLUME">By Volume</option>
                    <option value="BY_QUANTITY">By Quantity</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    How landed costs will be distributed across inventory items
                  </p>
                </div>

                {totalLandedCosts > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900">
                      Total Landed Costs: {formatCurrency(totalLandedCosts)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Will be allocated proportionally across all items using {landedCosts.allocationMethod.replace('BY_', '').toLowerCase()} method
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">\
            <div className="space-y-6 lg:sticky lg:top-6">
              {/* Summary */}
              <Card className="shadow-sm">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="text-lg">Receipt Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax Amount:</span>
                    <span className="font-medium">{formatCurrency(taxAmount)}</span>
                  </div>
                  {totalLandedCosts > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Landed Costs:</span>
                      <span className="font-medium">{formatCurrency(totalLandedCosts)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-2xl font-bold text-blue-600">{formatCurrency(total)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="space-y-3">
                <Button type="submit" disabled={submitting} className="w-full h-11 text-base font-semibold">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Goods Receipt'
                  )}
                </Button>
                
                <Link href={`/${orgSlug}/inventory/goods-receipts`} className="block">
                  <Button type="button" variant="outline" className="w-full h-11">
                    Cancel
                  </Button>
                </Link>
              </div>

              {/* Help Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-gray-700 leading-relaxed">
                  <span className="font-semibold text-blue-900">About Stock Purchases:</span> Use this form to record stock received from vendors. For EFRIS tax registration, use Bills instead.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
