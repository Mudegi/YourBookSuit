'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PaymentMethod } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Save, AlertCircle, Printer } from 'lucide-react';

interface SalesReceiptFormProps {
  organizationId: string;
  userId: string;
  branchId?: string;
  defaultDepositAccountId?: string;
  isTaxInclusive?: boolean;
  baseCurrency?: string;
  onSuccess?: (receipt: any) => void;
  onCancel?: () => void;
}

interface LineItem {
  id: string;
  productId?: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'AMOUNT' | 'PERCENTAGE';
  taxRuleId?: string;
  taxRate: number;
  warehouseId?: string;
}

export default function SalesReceiptForm({
  organizationId,
  userId,
  branchId,
  defaultDepositAccountId,
  isTaxInclusive = true,
  baseCurrency = 'UGX',
  onSuccess,
  onCancel,
}: SalesReceiptFormProps) {
  // Tax calculation method state
  const [taxCalculationMethod, setTaxCalculationMethod] = useState<'EXCLUSIVE' | 'INCLUSIVE'>(
    isTaxInclusive ? 'INCLUSIVE' : 'EXCLUSIVE'
  );
  
  // Form state
  const [receiptDate, setReceiptDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [customerId, setCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [depositToAccountId, setDepositToAccountId] = useState<string>(
    defaultDepositAccountId || ''
  );
  const [mobileNetwork, setMobileNetwork] = useState<string>('');
  const [payerPhoneNumber, setPayerPhoneNumber] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<LineItem[]>([]);
  
  // Loading & error state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldPrintAfterSave, setShouldPrintAfterSave] = useState(false);
  
  // Dropdowns data
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [taxRules, setTaxRules] = useState<any[]>([]);
  
  // Refs for auto-focus after product selection
  const quantityRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Fetch dropdown data
  useEffect(() => {
    loadDropdownData();
  }, []);

  async function loadDropdownData() {
    try {
      const orgSlug = window.location.pathname.split('/')[1];
      
      const [customersRes, productsRes, accountsRes, warehousesRes, taxRulesRes] = await Promise.all([
        fetch(`/api/orgs/${orgSlug}/customers`).catch(() => ({ ok: false })),
        fetch(`/api/orgs/${orgSlug}/inventory/products`).catch(() => ({ ok: false })),
        fetch(`/api/orgs/${orgSlug}/bank-accounts`).catch(() => ({ ok: false })),
        fetch(`/api/orgs/${orgSlug}/warehouses`).catch(() => ({ ok: false })),
        fetch(`/api/orgs/${orgSlug}/tax-rules?activeOnly=true`).catch(() => ({ ok: false })),
      ]);

      if (customersRes.ok && 'json' in customersRes) {
        const data = await customersRes.json();
        setCustomers(data.customers || data.data || data || []);
      }
      if (productsRes.ok && 'json' in productsRes) {
        const data = await productsRes.json();
        setProducts(data.data || data.products || data || []);
      }
      if (accountsRes.ok && 'json' in accountsRes) {
        const data = await accountsRes.json();
        setBankAccounts(data.data || data.bankAccounts || data.accounts || data || []);
      }
      if (warehousesRes.ok && 'json' in warehousesRes) {
        const data = await warehousesRes.json();
        setWarehouses(data.data || data.warehouses || data || []);
      }
      if (taxRulesRes.ok && 'json' in taxRulesRes) {
        const data = await taxRulesRes.json();
        setTaxRules(data.data || data.taxRules || data || []);
      }
    } catch (err) {
      console.error('Error loading dropdown data:', err);
    }
  }

  // Real-time totals calculation using TaxCalculationService logic
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    items.forEach((item) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      
      // Calculate discount
      const discountAmount = item.discountType === 'PERCENTAGE'
        ? (lineSubtotal * item.discount) / 100
        : item.discount;
      
      totalDiscount += discountAmount;
      
      // Tax calculation following TaxCalculationService pattern
      const taxPercentage = item.taxRate / 100;
      let netAmount: number;
      let taxAmount: number;
      let grossAmount: number;

      if (taxCalculationMethod === 'INCLUSIVE') {
        // TAX INCLUSIVE: Tax is embedded in the price
        // Gross = (Unit Price × Quantity) - Discount
        // Net = Gross / (1 + Rate)
        // Tax = Gross - Net
        grossAmount = lineSubtotal - discountAmount;
        netAmount = grossAmount / (1 + taxPercentage);
        taxAmount = grossAmount - netAmount;
      } else {
        // TAX EXCLUSIVE: Tax is added on top
        // Net = (Unit Price × Quantity) - Discount
        // Tax = Net × Rate
        // Gross = Net + Tax
        netAmount = lineSubtotal - discountAmount;
        taxAmount = netAmount * taxPercentage;
        grossAmount = netAmount + taxAmount;
      }
      
      totalTax += taxAmount;
      subtotal += netAmount;
    });

    // Total is always subtotal + tax (same formula for both modes)
    const total = subtotal + totalTax;

    return {
      subtotal: subtotal.toFixed(2),
      totalTax: totalTax.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      total: total.toFixed(2),
    };
  }, [items, taxCalculationMethod]);

  // Add new line item
  function addLineItem() {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      productId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      discountType: 'AMOUNT',
      taxRate: 0,
      warehouseId: warehouseId || '',
    };
    setItems([...items, newItem]);
  }

  // Handle product selection (auto-add item)
  function handleProductSelect(itemId: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    // Find matching tax rule based on product's default tax rate
    const productTaxRate = Number(product.defaultTaxRate || 0);
    const matchingTaxRule = taxRules.find(rule => Number(rule.rate) === productTaxRate);

    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              productId: product.id,
              description: product.name,
              unitPrice: Number(product.sellingPrice || 0),
              taxRate: productTaxRate,
              taxRuleId: matchingTaxRule?.id || undefined,
            }
          : item
      )
    );

    // Auto-focus quantity field
    setTimeout(() => {
      quantityRefs.current[itemId]?.focus();
      quantityRefs.current[itemId]?.select();
    }, 100);
  }

  // Update line item
  function updateLineItem(itemId: string, field: keyof LineItem, value: any) {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item))
    );
  }

  // Handle tax method toggle - recalculate all prices
  function handleTaxMethodToggle(newMethod: 'EXCLUSIVE' | 'INCLUSIVE') {
    setTaxCalculationMethod(newMethod);
    
    // Recalculate all line items with adjusted prices
    setItems((prev) =>
      prev.map((item) => {
        if (!item.taxRate || item.taxRate === 0) {
          // No tax, no adjustment needed
          return item;
        }

        const taxPercentage = item.taxRate / 100;
        let newUnitPrice = item.unitPrice;

        if (newMethod === 'INCLUSIVE') {
          // Switching to INCLUSIVE: multiply price by (1 + tax rate)
          // Example: 10000 * 1.18 = 11800
          newUnitPrice = item.unitPrice * (1 + taxPercentage);
        } else {
          // Switching to EXCLUSIVE: divide price by (1 + tax rate)
          // Example: 11800 / 1.18 = 10000
          newUnitPrice = item.unitPrice / (1 + taxPercentage);
        }

        return {
          ...item,
          unitPrice: Math.round(newUnitPrice * 100) / 100, // Round to 2 decimals
        };
      })
    );
  }

  // Remove line item
  function removeLineItem(itemId: string) {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }

  // Submit form
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!depositToAccountId) {
        throw new Error('Please select a deposit account');
      }

      if (items.length === 0) {
        throw new Error('Please add at least one item');
      }

      const orgSlug = window.location.pathname.split('/')[1];

      const payload = {
        receiptDate,
        customerId: customerId || undefined,
        currency: baseCurrency,
        exchangeRate: 1,
        paymentMethod,
        referenceNumber: referenceNumber || undefined,
        depositToAccountId,
        mobileNetwork: paymentMethod === 'MOBILE_MONEY' ? mobileNetwork : undefined,
        payerPhoneNumber: paymentMethod === 'MOBILE_MONEY' ? payerPhoneNumber : undefined,
        branchId,
        warehouseId: warehouseId || undefined,
        notes: notes || undefined,
        taxCalculationMethod: taxCalculationMethod,
        items: items.map((item) => ({
          productId: item.productId,
          serviceId: item.serviceId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          discountType: item.discountType,
          taxRuleId: item.taxRuleId,
          warehouseId: item.warehouseId,
        })),
      };

      const response = await fetch(`/api/orgs/${orgSlug}/sales-receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create sales receipt');
      }

      // If should print, open print window
      if (shouldPrintAfterSave && result.salesReceipt) {
        const orgSlug = window.location.pathname.split('/')[1];
        const printUrl = `/${orgSlug}/accounts-receivable/sales-receipts/${result.salesReceipt.id}/print`;
        window.open(printUrl, '_blank');
      }

      if (onSuccess) {
        onSuccess(result.salesReceipt);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
      setShouldPrintAfterSave(false); // Reset flag
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Receipt Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="receiptDate">Receipt Date *</Label>
            <Input
              id="receiptDate"
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="customerId">Customer (Optional)</Label>
            <select
              id="customerId"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Walk-in Customer --</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.companyName || `${customer.firstName} ${customer.lastName}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              required
              className="mt-1 w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="CASH">Cash</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHECK">Check</option>
              <option value="CARD">Card</option>
            </select>
          </div>

          <div>
            <Label htmlFor="depositToAccountId">Deposit To Account *</Label>
            <select
              id="depositToAccountId"
              value={depositToAccountId}
              onChange={(e) => setDepositToAccountId(e.target.value)}
              required
              className="mt-1 w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Account --</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name || account.accountName}
                </option>
              ))}
            </select>
          </div>

          {/* Contextual Payment Reference Fields */}
          {paymentMethod === 'MOBILE_MONEY' && (
            <>
              <div>
                <Label htmlFor="mobileNetwork">Mobile Network *</Label>
                <select
                  id="mobileNetwork"
                  value={mobileNetwork}
                  onChange={(e) => setMobileNetwork(e.target.value)}
                  required
                  className="mt-1 w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Network --</option>
                  <option value="MTN">MTN Mobile Money</option>
                  <option value="AIRTEL">Airtel Money</option>
                </select>
              </div>

              <div>
                <Label htmlFor="payerPhoneNumber">Phone Number *</Label>
                <Input
                  id="payerPhoneNumber"
                  type="tel"
                  value={payerPhoneNumber}
                  onChange={(e) => setPayerPhoneNumber(e.target.value)}
                  placeholder="256XXXXXXXXX"
                  required
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="referenceNumber">Transaction ID *</Label>
                <Input
                  id="referenceNumber"
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Enter mobile money transaction ID"
                  required
                  className="mt-1"
                />
              </div>
            </>
          )}

          {paymentMethod !== 'MOBILE_MONEY' && paymentMethod !== 'CASH' && (
            <div className="md:col-span-2">
              <Label htmlFor="referenceNumber">Reference Number</Label>
              <Input
                id="referenceNumber"
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Check number, transfer reference, etc."
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label htmlFor="warehouseId">Warehouse</Label>
            <select
              id="warehouseId"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Warehouse --</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tax Calculation Method Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Tax Calculation Method</h3>
              <p className="text-xs text-gray-500 mt-1">
                {taxCalculationMethod === 'EXCLUSIVE' 
                  ? 'Prices exclude tax. Tax is calculated and added on top.'
                  : 'Prices include tax. Tax is extracted from the entered price.'}
              </p>
            </div>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => handleTaxMethodToggle('EXCLUSIVE')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  taxCalculationMethod === 'EXCLUSIVE'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tax Exclusive
              </button>
              <button
                type="button"
                onClick={() => handleTaxMethodToggle('INCLUSIVE')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  taxCalculationMethod === 'INCLUSIVE'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tax Inclusive
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Items</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No items added yet. Click "Add Item" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-end border-b pb-4">
                  <div className="col-span-3">
                    <Label className="text-xs">Product *</Label>
                    <select
                      value={item.productId || ''}
                      onChange={(e) => handleProductSelect(item.id, e.target.value)}
                      required
                      className="mt-1 w-full h-9 rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <Label className="text-xs">Description</Label>
                    <Input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      className="mt-1 h-9 text-sm"
                    />
                  </div>

                  <div className="col-span-1">
                    <Label className="text-xs">Qty *</Label>
                    <Input
                      ref={(el) => { quantityRefs.current[item.id] = el; }}
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      required
                      className="mt-1 h-9 text-sm"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Unit Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                      }
                      required
                      className="mt-1 h-9 text-sm"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Tax Rule</Label>
                    <select
                      value={item.taxRuleId || ''}
                      onChange={(e) => {
                        const selectedRule = taxRules.find(r => r.id === e.target.value);
                        updateLineItem(item.id, 'taxRuleId', e.target.value || undefined);
                        updateLineItem(item.id, 'taxRate', selectedRule ? Number(selectedRule.rate) : 0);
                      }}
                      className="mt-1 w-full h-9 rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No Tax (0%)</option>
                      {taxRules.map((rule) => (
                        <option key={rule.id} value={rule.id}>
                          {rule.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-1">
                    <Label className="text-xs">Total</Label>
                    <div className="font-semibold text-sm mt-2">
                      {(item.quantity * item.unitPrice).toFixed(2)}
                    </div>
                  </div>

                  <div className="col-span-1 flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(item.id)}
                      className="h-9 w-9 p-0"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totals Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-right max-w-sm ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold">{baseCurrency} {totals.subtotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax:</span>
              <span className="font-semibold">{baseCurrency} {totals.totalTax}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-blue-600">{baseCurrency} {totals.total}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardContent className="pt-6">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            className="mt-2 w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button 
          type="button" 
          variant="outline"
          onClick={(e) => {
            setShouldPrintAfterSave(true);
            // Trigger form submission
            const form = e.currentTarget.closest('form');
            if (form) {
              form.requestSubmit();
            }
          }}
          disabled={loading || items.length === 0}
        >
          {loading && shouldPrintAfterSave ? (
            'Saving...'
          ) : (
            <>
              <Printer className="w-4 h-4 mr-2" />
              Save and Print
            </>
          )}
        </Button>
        <Button type="submit" disabled={loading || items.length === 0}>
          {loading && !shouldPrintAfterSave ? (
            'Saving...'
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Receipt
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
