'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import Loading from '@/components/ui/loading';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/utils';
import { Loader2, ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  defaultTaxRate: number;
}

interface Account {
  id: string;
  code: string;
  name: string;
  accountType: string;
}

interface BillItemForm {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  accountId?: string;
  taxAmount: number;
}

export default function EditBillPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const billId = params.id as string;
  const { currency } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);

  const [productSearch, setProductSearch] = useState<Record<string, string>>({});
  const [accountSearch, setAccountSearch] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    vendorId: '',
    billDate: '',
    dueDate: '',
    billNumber: '',
    referenceNumber: '',
    notes: '',
  });

  const [items, setItems] = useState<BillItemForm[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [billRes, accountsRes, productsRes] = await Promise.all([
          fetch(`/api/orgs/${orgSlug}/bills/${billId}`),
          fetch(`/api/orgs/${orgSlug}/chart-of-accounts`),
          fetch(`/api/${orgSlug}/inventory/products`),
        ]);
        if (!billRes.ok || !accountsRes.ok || !productsRes.ok) {
          throw new Error('Failed to load bill data');
        }
        const bill = await billRes.json();
        const accountsData = await accountsRes.json();
        const productsData = await productsRes.json();

        const accountsList: Account[] = Array.isArray(accountsData.accounts)
          ? accountsData.accounts
          : Array.isArray(accountsData.data)
          ? accountsData.data
          : [];
        setExpenseAccounts(accountsList.filter((a: any) => a.accountType === 'EXPENSE' && a.isActive !== false));

        const productsList: Product[] = productsData.success && productsData.data ? productsData.data : [];
        setProducts(productsList);

        setFormData({
          vendorId: bill.vendor?.id || '',
          billDate: bill.billDate ? new Date(bill.billDate).toISOString().split('T')[0] : '',
          dueDate: bill.dueDate ? new Date(bill.dueDate).toISOString().split('T')[0] : '',
          billNumber: bill.billNumber || '',
          referenceNumber: bill.referenceNumber || '',
          notes: bill.notes || '',
        });

        setItems(
          (bill.items || []).map((it: any) => ({
            id: it.id,
            productId: it.productId || undefined,
            name: it.description || '',
            quantity: Number(it.quantity) || 0,
            unitPrice: Number(it.unitPrice) || 0,
            accountId: it.account?.id || undefined,
            taxAmount: Number(it.taxAmount) || 0,
          }))
        );
      } catch (err: any) {
        setError(err.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [orgSlug, billId]);

  function updateItem(id: string, field: keyof BillItemForm, value: any) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: '',
        quantity: 1,
        unitPrice: 0,
        taxAmount: 0,
      },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function calculateLineTotal(item: BillItemForm) {
    return item.quantity * item.unitPrice + (item.taxAmount || 0);
  }
  function calculateSubtotal() {
    return items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  }
  function calculateTaxTotal() {
    return items.reduce((sum, it) => sum + (it.taxAmount || 0), 0);
  }
  function calculateTotal() {
    return calculateSubtotal() + calculateTaxTotal();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (!formData.billDate || !formData.dueDate) {
        throw new Error('Bill date and due date are required');
      }
      if (items.length === 0) throw new Error('Add at least one item');
      for (const it of items) {
        if (!it.name) throw new Error('All items must have a name');
        if (!it.quantity || it.quantity <= 0) throw new Error('Quantity must be positive');
      }

      const payload = {
        billDate: formData.billDate,
        dueDate: formData.dueDate,
        billNumber: formData.billNumber || undefined,
        referenceNumber: formData.referenceNumber || undefined,
        notes: formData.notes || undefined,
        items: items.map((it) => ({
          description: it.name,
          productId: it.productId || undefined,
          accountId: it.accountId || undefined,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          taxAmount: Number(it.taxAmount || 0),
        })),
      };

      const res = await fetch(`/api/orgs/${orgSlug}/bills/${billId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update bill');
      }
      router.push(`/${orgSlug}/accounts-payable/bills/${billId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const getDisplayProducts = (itemId: string): Product[] => {
    const term = (productSearch[itemId] || '').trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term));
  };

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
        <div className="mb-6">
          <Link href={`/${orgSlug}/accounts-payable/bills/${billId}`} className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Bill
          </Link>
          <h1 className="text-3xl font-bold">Edit Bill</h1>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="bg-white border-b">
                <CardTitle>Bill Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Bill Number</Label>
                    <Input value={formData.billNumber} onChange={(e) => setFormData((p) => ({ ...p, billNumber: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Bill Date *</Label>
                    <Input type="date" value={formData.billDate} onChange={(e) => setFormData((p) => ({ ...p, billDate: e.target.value }))} required />
                  </div>
                  <div>
                    <Label>Due Date *</Label>
                    <Input type="date" value={formData.dueDate} onChange={(e) => setFormData((p) => ({ ...p, dueDate: e.target.value }))} required />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Reference Number</Label>
                    <Input value={formData.referenceNumber} onChange={(e) => setFormData((p) => ({ ...p, referenceNumber: e.target.value }))} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-white border-b flex flex-row items-center justify-between">
                <CardTitle>Line Items</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1"><Plus className="w-4 h-4" /> Add Item</Button>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {items.map((item, index) => (
                    <div key={item.id} className="p-4 border border-gray-200 rounded-lg space-y-4 bg-white">
                      <div className="flex justify-between items-center pb-3 border-b">
                        <span className="font-semibold text-sm text-gray-700">Item {index + 1}</span>
                        {items.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-4 h-4 mr-1" /> Remove</Button>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Product *</Label>
                        <div className="relative">
                          <div className="flex items-center gap-2 mb-2">
                            <Input className="h-10 flex-1" placeholder="Search products by name or SKU..." value={productSearch[item.id] || ''}
                              onChange={(e) => setProductSearch((prev) => ({ ...prev, [item.id]: e.target.value }))} />
                          </div>
                          {productSearch[item.id] && getDisplayProducts(item.id).length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                              {getDisplayProducts(item.id).map((product: Product) => (
                                <button key={product.id} type="button" onClick={() => {
                                  updateItem(item.id, 'productId', product.id);
                                  updateItem(item.id, 'name', product.name);
                                  updateItem(item.id, 'unitPrice', product.purchasePrice);
                                  setProductSearch((prev) => ({ ...prev, [item.id]: '' }));
                                }} className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b last:border-b-0">
                                  <div className="font-medium text-gray-900">{product.name}</div>
                                  <div className="text-xs text-gray-600">SKU: {product.sku} | Price: ${product.purchasePrice}</div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {item.productId && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mt-2">
                            <p className="text-xs text-gray-700"><span className="font-semibold">Selected:</span> {item.name}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Expense Account *</Label>
                        <select className="h-10 w-full border rounded-md px-2" value={item.accountId || ''} onChange={(e) => updateItem(item.id, 'accountId', e.target.value)}>
                          <option value="">Select account...</option>
                          {expenseAccounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-sm font-semibold mb-2 block">Quantity *</Label>
                          <Input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} required />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold mb-2 block">Unit Price *</Label>
                          <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} required />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold mb-2 block">Tax</Label>
                          <Input type="number" min="0" step="0.01" value={item.taxAmount} onChange={(e) => updateItem(item.id, 'taxAmount', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded border border-gray-200 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Line Total:</span>
                        <span className="text-lg font-bold text-gray-900">{formatCurrency(calculateLineTotal(item), currency)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-white border-b">
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <textarea value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={4} />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <div className="space-y-6 lg:sticky lg:top-6">
              <Card className="shadow-md bg-gradient-to-br from-blue-50 to-white border-blue-100">
                <CardHeader className="bg-white border-b">
                  <CardTitle className="text-lg">Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-700">Subtotal:</span>
                      <span className="text-lg font-semibold">{formatCurrency(calculateSubtotal(), currency)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-700">Tax:</span>
                      <span className="text-lg font-semibold text-orange-600">{formatCurrency(calculateTaxTotal(), currency)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 pb-2 border-t-2 border-gray-300">
                      <span className="text-gray-900 font-bold text-lg">Total:</span>
                      <span className="text-2xl font-bold text-blue-600">{formatCurrency(calculateTotal(), currency)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Button type="submit" disabled={submitting} className="w-full h-11 text-base font-semibold">
                  {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>) : 'Save Changes'}
                </Button>
                <Link href={`/${orgSlug}/accounts-payable/bills/${billId}`} className="block">
                  <Button type="button" variant="outline" className="w-full h-11">Cancel</Button>
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
