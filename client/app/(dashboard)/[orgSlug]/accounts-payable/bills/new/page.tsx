'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import Loading from '@/components/ui/loading';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';

interface Vendor {
  id: string;
  name: string;
  paymentTerms: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  accountType: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  defaultTaxRate: number;
  category?: string;
}

interface TaxLine {
  taxType: string;
  rate: number;
  jurisdictionId?: string;
  taxRuleId?: string;
  isCompound?: boolean;
  compoundSequence?: number;
  isWithholding?: boolean;
}

interface BillItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  accountId: string;
  taxLines?: TaxLine[];
  taxAmount: number;
}

export default function NewBillPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug as string;
  const preselectedVendorId = searchParams.get('vendorId');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState<Record<string, string>>({});
  const [productDropdownOpen, setProductDropdownOpen] = useState<Record<string, boolean>>({});
  const [productResults, setProductResults] = useState<Record<string, Product[]>>({});
  const [productSearchLoading, setProductSearchLoading] = useState<Set<string>>(new Set());
  const [accountSearch, setAccountSearch] = useState<Record<string, string>>({});
  const [accountResults, setAccountResults] = useState<Record<string, Account[]>>({});
  const [vendorSearchLoading, setVendorSearchLoading] = useState(false);
  const [accountLoadingIds, setAccountLoadingIds] = useState<Set<string>>(new Set());
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    name: '',
    email: '',
    phone: '',
    paymentTerms: 'NET_30',
  });
  const [vendorFormError, setVendorFormError] = useState<string | null>(null);
  const [vendorFormLoading, setVendorFormLoading] = useState(false);
  const { currency } = useOrganization();

  const [formData, setFormData] = useState({
    vendorId: preselectedVendorId || '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    billNumber: '',
    referenceNumber: '',
    notes: '',
  });

  const [items, setItems] = useState<BillItem[]>([
    {
      id: '1',
      productId: '',
      name: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      accountId: '',
      taxLines: [],
      taxAmount: 0,
    },
  ]);
  const [expandedTaxRows, setExpandedTaxRows] = useState<Set<string>>(new Set());
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Debounced live vendor search
  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const term = vendorSearch.trim();
        // Only fetch if search term is 2+ chars
        if (term.length < 2) {
          setVendorSearchLoading(false);
          return;
        }
        
        setVendorSearchLoading(true);
        const qs = new URLSearchParams();
        qs.set('isActive', 'true');
        qs.set('search', term);
        
        const res = await fetch(`/api/orgs/${orgSlug}/vendors?${qs.toString()}`, { 
          signal: controller.signal 
        });
        
        if (res.ok) {
          const data = await res.json();
          const list: Vendor[] = Array.isArray(data.vendors)
            ? data.vendors
            : Array.isArray(data.data)
              ? data.data
              : [];
          setVendors(list);
        }
      } catch (err) {
        // Aborted requests are expected
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Vendor search error:', err);
        }
      } finally {
        setVendorSearchLoading(false);
      }
    }, 300);
    
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [vendorSearch, orgSlug]);

  // Client-side fallback filter for vendor list (instant response)
  const displayVendors = React.useMemo(() => {
    const term = vendorSearch.trim().toLowerCase();
    if (!term) return vendors;
    return vendors.filter((v) => v.name?.toLowerCase().includes(term));
  }, [vendors, vendorSearch]);

  // Client-side product filter for each item
  const getDisplayProducts = React.useCallback((itemId: string): Product[] => {
    const term = productSearch[itemId]?.trim().toLowerCase() || '';
    if (!term) return products;
    return products.filter((p) => 
      p.name?.toLowerCase().includes(term) || 
      p.sku?.toLowerCase().includes(term)
    );
  }, [products, productSearch]);

  useEffect(() => {
    fetchData();
  }, [orgSlug]);

  useEffect(() => {
    // Auto-calculate due date when vendor or bill date changes
    if (formData.vendorId && formData.billDate) {
      const vendor = vendors.find((v) => v.id === formData.vendorId);
      if (vendor) {
        calculateDueDate(formData.billDate, vendor.paymentTerms);
      }
    }
  }, [formData.vendorId, formData.billDate, vendors]);

  async function fetchData() {
    try {
      setLoading(true);
        const [vendorsRes, accountsRes, nextRefRes, productsRes, taxRatesRes] = await Promise.all([
          fetch(`/api/orgs/${orgSlug}/vendors?isActive=true`),
          fetch(`/api/orgs/${orgSlug}/chart-of-accounts`),
          fetch(`/api/orgs/${orgSlug}/bills?nextReference=true`),
          fetch(`/api/${orgSlug}/inventory/products`),
          fetch(`/api/orgs/${orgSlug}/tax/rates?activeOnly=true`),
        ]);

        if (!vendorsRes.ok || !accountsRes.ok || !nextRefRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const vendorsData = await vendorsRes.json();
      const accountsData = await accountsRes.json();
        const nextRefData = await nextRefRes.json();
      const productsData = await productsRes.json();

      const vendorsList: Vendor[] = Array.isArray(vendorsData.vendors)
        ? vendorsData.vendors
        : Array.isArray(vendorsData.data)
          ? vendorsData.data
          : [];

      const accountsList: any[] = Array.isArray(accountsData.accounts)
        ? accountsData.accounts
        : Array.isArray(accountsData.data)
          ? accountsData.data
          : [];

      const productsList: Product[] = productsData.success && productsData.data 
        ? productsData.data 
        : [];

      const taxRatesData = await taxRatesRes.json();
      const taxRatesList = taxRatesData.success && taxRatesData.data ? taxRatesData.data : [];

      setVendors(vendorsList);
      setProducts(productsList);
      setTaxRates(taxRatesList);
      // Filter for EXPENSE accounts only
      setExpenseAccounts(
        accountsList.filter(
          (acc: Account) => acc.accountType === 'EXPENSE' && (acc as any).isActive !== false
        )
      );
      if (nextRefData?.nextReference && !formData.referenceNumber) {
        setFormData((prev) => ({ ...prev, referenceNumber: nextRefData.nextReference }));
      }
    } catch (err) {
      setError('Failed to load vendors and accounts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function calculateDueDate(billDate: string, paymentTerms: string) {
    const date = new Date(billDate);
    let daysToAdd = 30; // default

    switch (paymentTerms) {
      case 'DUE_ON_RECEIPT':
        daysToAdd = 0;
        break;
      case 'NET_15':
        daysToAdd = 15;
        break;
      case 'NET_30':
        daysToAdd = 30;
        break;
      case 'NET_60':
        daysToAdd = 60;
        break;
      case 'NET_90':
        daysToAdd = 90;
        break;
    }

    date.setDate(date.getDate() + daysToAdd);
    setFormData((prev) => ({
      ...prev,
      dueDate: date.toISOString().split('T')[0],
    }));
  }

  function normalizePaymentTerms(value: string | number | undefined): string {
    if (typeof value === 'number') {
      switch (value) {
        case 0:
          return 'DUE_ON_RECEIPT';
        case 15:
          return 'NET_15';
        case 60:
          return 'NET_60';
        case 90:
          return 'NET_90';
        case 30:
        default:
          return 'NET_30';
      }
    }
    if (typeof value === 'string') return value;
    return 'NET_30';
  }

  function handleVendorFormChange(field: string, value: string) {
    setVendorForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreateVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorForm.name.trim()) {
      setVendorFormError('Vendor name is required');
      return;
    }

    setVendorFormLoading(true);
    setVendorFormError(null);

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: vendorForm.name.trim(),
          email: vendorForm.email.trim() || undefined,
          phone: vendorForm.phone.trim() || undefined,
          paymentTerms: vendorForm.paymentTerms,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create vendor');
      }

      const created = await response.json();
      const normalizedVendor: Vendor = {
        id: created.id,
        name: created.companyName || created.name || vendorForm.name,
        paymentTerms: normalizePaymentTerms(created.paymentTerms),
      };

      setVendors((prev) => [...prev, normalizedVendor]);
      setFormData((prev) => ({ ...prev, vendorId: normalizedVendor.id }));
      setVendorForm({ name: '', email: '', phone: '', paymentTerms: 'NET_30' });
      setIsVendorModalOpen(false);
    } catch (err: any) {
      setVendorFormError(err.message);
    } finally {
      setVendorFormLoading(false);
    }
  }

  function handleChange(field: string, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function addItem() {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        productId: '',
        name: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        accountId: '',
        taxLines: [],
        taxAmount: 0,
      },
    ]);
  }

  function addTaxLine(itemId: string) {
    setItems(
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              taxLines: [
                ...(item.taxLines || []),
                { taxType: 'STANDARD', rate: 0, compoundSequence: (item.taxLines?.length || 0) + 1 },
              ],
            }
          : item
      )
    );
  }

  function updateTaxLine(itemId: string, taxIndex: number, field: keyof TaxLine, value: any) {
    setItems(
      items.map((item) =>
        item.id === itemId && item.taxLines
          ? {
              ...item,
              taxLines: item.taxLines.map((line, idx) => (idx === taxIndex ? { ...line, [field]: value } : line)),
            }
          : item
      )
    );
  }

  function removeTaxLine(itemId: string, taxIndex: number) {
    setItems(
      items.map((item) =>
        item.id === itemId && item.taxLines
          ? {
              ...item,
              taxLines: item.taxLines.filter((_, idx) => idx !== taxIndex),
            }
          : item
      )
    );
  }

  function removeItem(id: string) {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  }

  // Debounced per-line account live search (min 2 chars)
  useEffect(() => {
    const controllers: Record<string, AbortController> = {};
    const timers: Record<string, any> = {};

    Object.entries(accountSearch).forEach(([itemId, term]) => {
      const q = (term || '').trim();
      if (!q) {
        setAccountResults((prev) => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
        return;
      }
      if (q.length < 2) {
        return;
      }

      controllers[itemId] = new AbortController();
      setAccountLoadingIds((prev) => new Set([...Array.from(prev), itemId]));
      timers[itemId] = setTimeout(async () => {
        try {
          const qs = new URLSearchParams();
          qs.set('type', 'EXPENSE');
          qs.set('isActive', 'true');
          qs.set('search', q);
          const res = await fetch(`/api/orgs/${orgSlug}/chart-of-accounts?` + qs.toString(), {
            signal: controllers[itemId].signal,
          });
          if (!res.ok) return;
          const data = await res.json();
          const list: Account[] = Array.isArray(data.accounts)
            ? data.accounts
            : Array.isArray(data.data)
              ? data.data
              : [];
          setAccountResults((prev) => ({ ...prev, [itemId]: list }));
        } catch {}
        finally {
          setAccountLoadingIds((prev) => {
            const next = new Set(Array.from(prev));
            next.delete(itemId);
            return next;
          });
        }
      }, 250);
    });

    return () => {
      Object.values(controllers).forEach((c) => c.abort());
      Object.values(timers).forEach((t) => clearTimeout(t));
    };
  }, [accountSearch, orgSlug]);

  function updateItem(id: string, field: keyof BillItem, value: any) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  function calculateLineTotal(item: BillItem): number {
    return item.quantity * item.unitPrice + item.taxAmount;
  }

  function calculateSubtotal(): number {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }

  function calculateTaxTotal(): number {
    return items.reduce((sum, item) => sum + item.taxAmount, 0);
  }

  function calculateTotal(): number {
    return calculateSubtotal() + calculateTaxTotal();
  }

  const validateField = (field: string, value: string) => {
    let error = '';
    if (field === 'vendorId' && !value) error = 'Vendor is required.';
    if (field === 'billDate' && !value) error = 'Bill date is required.';
    if (field === 'dueDate' && !value) error = 'Due date is required.';
    setFormErrors((prev) => ({ ...prev, [field]: error }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Validate form
      if (!formData.vendorId) {
        throw new Error('Please select a vendor');
      }

      if (items.length === 0) {
        throw new Error('Please add at least one item');
      }

      // Validate all items have required fields
      for (const item of items) {
        if (!item.name) {
          throw new Error('All items must have a name');
        }
        if (!item.accountId) {
          throw new Error('All items must have an expense account');
        }
        if (item.quantity <= 0) {
          throw new Error('All items must have a positive quantity');
        }
      }

      const payload = {
        vendorId: formData.vendorId,
        billDate: formData.billDate,
        dueDate: formData.dueDate,
        billNumber: formData.billNumber || undefined,
        referenceNumber: formData.referenceNumber || undefined,
        notes: formData.notes || undefined,
        items: items.map((item) => ({
          description: item.name,
          productId: item.productId || undefined,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          accountId: item.accountId,
          taxAmount: Number(item.taxAmount || 0),
        })),
      };

      const response = await fetch(`/api/orgs/${orgSlug}/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create bill');
      }

      const bill = await response.json();

      router.push(`/${orgSlug}/accounts-payable/bills/${bill.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

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
            href={`/${orgSlug}/accounts-payable/bills`}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Bills
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">Create New Bill</h1>
          <p className="text-gray-600 mt-1">Add bill details, line items, and submit for processing</p>
        </div>

        {error && <Alert variant="error" className="mb-6">{error}</Alert>}

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bill Header */}
            <Card className="shadow-sm">
              <CardHeader className="bg-white border-b">
                <CardTitle className="text-xl">Bill Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
              {/* Vendor Section */}
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  <div className="flex-1">
                    <Label htmlFor="vendorSearch" className="text-sm font-semibold mb-2 block">Vendor *</Label>
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <Input
                          id="vendorSearch"
                          className="h-10 flex-1"
                          placeholder="Search vendors (type to see options)..."
                          value={vendorSearch}
                          onChange={(e) => setVendorSearch(e.target.value)}
                          onFocus={() => setVendorDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setVendorDropdownOpen(false), 200)}
                          autoComplete="off"
                        />
                        {vendorSearch && vendorSearch.length >= 1 && vendorSearchLoading && (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-500 flex-shrink-0" />
                        )}
                      </div>
                      {/* Dropdown Results */}
                      {vendorDropdownOpen && displayVendors.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                          {displayVendors.map((vendor: Vendor) => (
                            <button
                              key={vendor.id}
                              type="button"
                              onClick={() => {
                                handleChange('vendorId', vendor.id);
                                setVendorSearch('');
                                setVendorDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b last:border-b-0"
                            >
                              <div className="font-medium text-gray-900">{vendor.name}</div>
                              {vendor.paymentTerms && (
                                <div className="text-xs text-gray-500">Terms: {vendor.paymentTerms.replace(/_/g, ' ')}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {vendorDropdownOpen && displayVendors.length === 0 && !vendorSearchLoading && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 p-4 text-center text-sm text-gray-500">
                          No vendors found
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsVendorModalOpen(true)}
                    className="gap-1 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    New vendor
                  </Button>
                </div>
                {/* Selected Vendor Display */}
                {formData.vendorId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Selected Vendor:</span>{' '}
                      {vendors.find((v) => v.id === formData.vendorId)?.name || 'Loading...'}
                    </p>
                  </div>
                )}
                {formErrors.vendorId && <div className="text-xs text-red-600 mt-1">{formErrors.vendorId}</div>}
              </div>

              {/* Bill Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="billNumber" className="text-sm font-semibold">Bill Number <span className="text-gray-500 font-normal">(optional)</span></Label>
                  <Input
                    id="billNumber"
                    value={formData.billNumber}
                    onChange={(e) => handleChange('billNumber', e.target.value)}
                    placeholder="Auto-generated if empty"
                    className="h-10"
                  />
                </div>

                <div>
                  <Label htmlFor="billDate" className="text-sm font-semibold">Bill Date *</Label>
                  <Input
                    id="billDate"
                    type="date"
                    value={formData.billDate}
                    onChange={(e) => handleChange('billDate', e.target.value)}
                    required
                    className="h-10"
                  />
                  {formErrors.billDate && <div className="text-xs text-red-600 mt-1">{formErrors.billDate}</div>}
                </div>

                <div>
                  <Label htmlFor="dueDate" className="text-sm font-semibold">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleChange('dueDate', e.target.value)}
                    required
                    className="h-10"
                  />
                  {formErrors.dueDate && <div className="text-xs text-red-600 mt-1">{formErrors.dueDate}</div>}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="referenceNumber" className="text-sm font-semibold">Reference Number</Label>
                  <Input
                    id="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={(e) => handleChange('referenceNumber', e.target.value)}
                    placeholder="PO number or other reference"
                    className="h-10"
                  />
                </div>
              </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card className="shadow-sm">
              <CardHeader className="bg-white border-b flex flex-row items-center justify-between">
                <CardTitle className="text-xl">Line Items</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                  <Plus className="w-4 h-4" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b-2 border-gray-200">
                        <th className="text-left p-3 text-sm font-semibold text-gray-700 min-w-[250px]">Product *</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700 min-w-[200px]">Expense Account *</th>
                        <th className="text-right p-3 text-sm font-semibold text-gray-700 w-24">Quantity *</th>
                        <th className="text-right p-3 text-sm font-semibold text-gray-700 w-28">Unit Price *</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700 min-w-[180px]">Tax Rate</th>
                        <th className="text-right p-3 text-sm font-semibold text-gray-700 w-32">Line Total</th>
                        <th className="text-center p-3 text-sm font-semibold text-gray-700 w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                          {/* Product */}
                          <td className="p-3">
                            <div className="relative">
                              <Input
                                className="h-9 text-sm"
                                placeholder="Search products..."
                                value={productSearch[item.id] || item.name || ''}
                                onChange={(e) =>
                                  setProductSearch((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                                onFocus={() => setProductDropdownOpen((prev) => ({ ...prev, [item.id]: true }))}
                                onBlur={() => setTimeout(() => setProductDropdownOpen((prev) => ({ ...prev, [item.id]: false })), 200)}
                                autoComplete="off"
                              />
                              {productDropdownOpen[item.id] && getDisplayProducts(item.id).length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                                  {getDisplayProducts(item.id).map((product: Product) => (
                                    <button
                                      key={product.id}
                                      type="button"
                                      onClick={() => {
                                        updateItem(item.id, 'productId', product.id);
                                        updateItem(item.id, 'name', product.name);
                                        updateItem(item.id, 'unitPrice', product.purchasePrice);
                                        setProductSearch((prev) => ({
                                          ...prev,
                                          [item.id]: '',
                                        }));
                                        setProductDropdownOpen((prev) => ({ ...prev, [item.id]: false }));
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b last:border-b-0 text-sm"
                                    >
                                      <div className="font-medium text-gray-900">{product.name}</div>
                                      <div className="text-xs text-gray-600">SKU: {product.sku}</div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Expense Account */}
                          <td className="p-3">
                            <select
                              value={item.accountId}
                              onChange={(e) => updateItem(item.id, 'accountId', e.target.value)}
                              required
                              className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select...</option>
                              {expenseAccounts.slice(0, 50).map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.code} - {account.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Quantity */}
                          <td className="p-3">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              required
                              className="h-9 text-sm text-right"
                            />
                          </td>

                          {/* Unit Price */}
                          <td className="p-3">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              required
                              className="h-9 text-sm text-right"
                            />
                          </td>

                          {/* Tax Rate */}
                          <td className="p-3">
                            <select
                              value={item.taxAmount}
                              onChange={(e) => {
                                const selectedRate = taxRates.find(r => r.rate?.toString() === e.target.value);
                                if (selectedRate) {
                                  const rate = parseFloat(selectedRate.rate) / 100;
                                  const taxAmount = item.quantity * item.unitPrice * rate;
                                  updateItem(item.id, 'taxAmount', taxAmount);
                                } else {
                                  updateItem(item.id, 'taxAmount', 0);
                                }
                              }}
                              className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="0">No Tax (0%)</option>
                              {taxRates.map((rate) => (
                                <option key={rate.id} value={rate.rate}>
                                  {rate.name} ({rate.rate}%)
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Line Total */}
                          <td className="p-3 text-right font-semibold text-gray-900">
                            {formatCurrency(calculateLineTotal(item), currency)}
                          </td>

                          {/* Remove Button */}
                          <td className="p-3 text-center">
                            {items.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="shadow-sm">
              <CardHeader className="bg-white border-b">
                <CardTitle className="text-xl">Additional Notes</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
                placeholder="Add any notes, special instructions, or payment terms related to this bill..."
              />
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Sticky Summary */}
          <div className="lg:col-span-1">
            <div className="space-y-6 lg:sticky lg:top-6">
              {/* Summary Card */}
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

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  type="submit"
                  disabled={submitting} 
                  className="w-full h-11 text-base font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Bill'
                  )}
                </Button>
                <Link href={`/${orgSlug}/accounts-payable/bills`} className="block">
                  <Button type="button" variant="outline" className="w-full h-11">
                    Cancel
                  </Button>
                </Link>
              </div>

              {/* Help Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-gray-700 leading-relaxed">
                  <span className="font-semibold text-blue-900">Tip:</span> The due date is automatically calculated based on vendor payment terms. You can adjust it manually if needed.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
      {isVendorModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsVendorModalOpen(false)}
          title="Add New Vendor"
          size="md"
        >
          <form onSubmit={handleCreateVendor} className="space-y-5">
            {vendorFormError && <Alert variant="error">{vendorFormError}</Alert>}

            <div className="space-y-2">
              <Label htmlFor="newVendorName" className="text-sm font-semibold">Vendor Name *</Label>
              <Input
                id="newVendorName"
                value={vendorForm.name}
                onChange={(e) => handleVendorFormChange('name', e.target.value)}
                placeholder="Enter vendor name"
                className="h-10"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newVendorEmail" className="text-sm font-semibold">Email</Label>
                <Input
                  id="newVendorEmail"
                  type="email"
                  value={vendorForm.email}
                  onChange={(e) => handleVendorFormChange('email', e.target.value)}
                  placeholder="vendor@example.com"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newVendorPhone" className="text-sm font-semibold">Phone</Label>
                <Input
                  id="newVendorPhone"
                  type="tel"
                  value={vendorForm.phone}
                  onChange={(e) => handleVendorFormChange('phone', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newVendorPaymentTerms" className="text-sm font-semibold">Payment Terms</Label>
              <select
                id="newVendorPaymentTerms"
                value={vendorForm.paymentTerms}
                onChange={(e) => handleVendorFormChange('paymentTerms', e.target.value)}
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="DUE_ON_RECEIPT">Due on Receipt</option>
                <option value="NET_15">Net 15</option>
                <option value="NET_30">Net 30</option>
                <option value="NET_60">Net 60</option>
                <option value="NET_90">Net 90</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsVendorModalOpen(false)}
                disabled={vendorFormLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={vendorFormLoading} className="gap-2">
                {vendorFormLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {vendorFormLoading ? 'Saving...' : 'Save Vendor'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
