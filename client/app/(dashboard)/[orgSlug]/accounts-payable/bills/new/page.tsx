'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import Loading from '@/components/ui/loading';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
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
  taxRate?: number; // The selected tax rate percentage
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
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState<string | null>(null);
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
  const [submittingEfris, setSubmittingEfris] = useState(false);
  const [efrisEnabled, setEfrisEnabled] = useState(false);
  const { currency, organization } = useOrganization();
  const { user } = useAuth();
  const isUganda = organization?.homeCountry?.toUpperCase() === 'UG' || organization?.homeCountry?.toUpperCase() === 'UGANDA';

  const [formData, setFormData] = useState({
    vendorId: preselectedVendorId || '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    billNumber: '',
    referenceNumber: '',
    efrisReceiptNo: '',
    stockInType: '102', // Default: Local Purchase
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
      taxRate: 0,
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

  // Client-side product filter
  const getDisplayProducts = React.useMemo((): Product[] => {
    const term = productSearch.trim().toLowerCase() || '';
    if (!term) return products;
    return products.filter((p) => 
      p.name?.toLowerCase().includes(term) || 
      p.sku?.toLowerCase().includes(term)
    );
  }, [products, productSearch]);

  useEffect(() => {
    fetchData();
  }, [orgSlug]);

  // Check EFRIS configuration
  useEffect(() => {
    const checkEfris = async () => {
      if (!organization || !isUganda) return;
      try {
        const res = await fetch(`/api/orgs/${orgSlug}/settings/efris`);
        if (res.ok) {
          const data = await res.json();
          setEfrisEnabled(data.config?.isActive === true);
        }
      } catch (err) {
        console.error('[EFRIS] Error checking config:', err);
      }
    };
    checkEfris();
  }, [orgSlug, organization, isUganda]);

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
      const taxRatesList = taxRatesData.success && taxRatesData.data ? taxRatesData.data : (Array.isArray(taxRatesData) ? taxRatesData : []);
      console.log('[Bills] Tax rates loaded:', taxRatesList.length, taxRatesList);

      setVendors(vendorsList);
      setProducts(productsList);
      setTaxRates(taxRatesList);
      setAllAccounts(accountsList.filter((acc: any) => acc.isActive !== false));
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
        taxRate: 0,
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

  // Auto-select Opening Balance Equity (3900) for opening stock items
  useEffect(() => {
    if (formData.stockInType === '104' && allAccounts.length > 0) {
      const openingBalanceAccount = allAccounts.find(acc => acc.code === '3900');
      if (openingBalanceAccount) {
        setItems((prev) =>
          prev.map((item) => {
            // Auto-select for inventory items without an account
            if (item.productId && !item.accountId) {
              return { ...item, accountId: openingBalanceAccount.id };
            }
            return item;
          })
        );
      }
    }
  }, [formData.stockInType, allAccounts]);

  function updateItem(id: string, field: keyof BillItem, value: any) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        
        const updated = { ...item, [field]: value };
        
        // Recalculate tax amount when quantity, unitPrice, or taxRate changes
        if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
          const taxRate = field === 'taxRate' ? value : (item.taxRate || 0);
          const quantity = field === 'quantity' ? value : item.quantity;
          const unitPrice = field === 'unitPrice' ? value : item.unitPrice;
          updated.taxAmount = quantity * unitPrice * (taxRate / 100);
        }
        
        // Auto-select Opening Balance Equity for opening stock items
        if (field === 'productId' && value && formData.stockInType === '104') {
          const openingBalanceAccount = allAccounts.find(acc => acc.code === '3900');
          if (openingBalanceAccount) {
            updated.accountId = openingBalanceAccount.id;
          }
        }
        
        return updated;
      })
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

  function getAmountFontSize(formattedAmount: string): string {
    const length = formattedAmount.length;
    if (length <= 12) return 'text-lg';
    if (length <= 15) return 'text-base';
    return 'text-sm';
  }

  const validateField = (field: string, value: string) => {
    let error = '';
    if (field === 'vendorId' && !value) error = 'Vendor is required.';
    if (field === 'billDate' && !value) error = 'Bill date is required.';
    if (field === 'dueDate' && !value) error = 'Due date is required.';
    setFormErrors((prev) => ({ ...prev, [field]: error }));
  };

  async function handleSubmit(e: React.FormEvent, submitToEfris = false) {
    e.preventDefault();
    if (submitToEfris) {
      setSubmittingEfris(true);
    } else {
      setSubmitting(true);
    }
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
        // Only require accountId for non-inventory items
        if (!item.productId && !item.accountId) {
          throw new Error('Non-inventory items must have an expense account');
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
        efrisReceiptNo: formData.efrisReceiptNo || undefined,
        stockInType: formData.stockInType || undefined,
        notes: formData.notes || undefined,
        submitToEfris: submitToEfris,
        items: items.map((item) => ({
          description: item.name,
          productId: item.productId || undefined,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          accountId: item.accountId || undefined,  // Optional for inventory items
          taxAmount: Number(item.taxAmount || 0),
        })),
      };

      const response = await fetch(`/api/orgs/${orgSlug}/bills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organization?.id || '',
          'x-user-id': user?.id || '',
        },
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
      setSubmittingEfris(false);
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

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }}>
          {/* Main Content Area */}
          <div className="space-y-6">
            {/* Bill Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-6">Bill Information</h3>
              <div className="space-y-6">
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

                <div className="md:col-span-2">
                  <Label htmlFor="notes" className="text-sm font-semibold">Notes</Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                    rows={2}
                    placeholder="Add any notes or special instructions..."
                  />
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

                {isUganda && efrisEnabled && (
                  <>
                    <div className="md:col-span-2">
                      <Label htmlFor="efrisReceiptNo" className="text-sm font-semibold">
                        Vendor EFRIS Receipt No
                        <span className="ml-2 text-xs font-normal text-muted-foreground">(Optional - for VAT credit)</span>
                      </Label>
                      <Input
                        id="efrisReceiptNo"
                        value={formData.efrisReceiptNo || ''}
                        onChange={(e) => handleChange('efrisReceiptNo', e.target.value)}
                        placeholder="Vendor's EFRIS Fiscal Document Number"
                        className="h-10"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter the vendor's EFRIS FDN to claim Input VAT credit on this bill
                      </p>
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor="stockInType" className="text-sm font-semibold">
                        Stock Source Type *
                        <span className="ml-2 text-xs font-normal text-muted-foreground">(Required for EFRIS submission)</span>
                      </Label>
                      <select
                        id="stockInType"
                        value={formData.stockInType}
                        onChange={(e) => handleChange('stockInType', e.target.value)}
                        className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="101">Import - Goods from outside Uganda (customs cleared)</option>
                        <option value="102">Local Purchase - Bought from local supplier (default)</option>
                        <option value="103">Manufacture/Assembly - Produced in-house</option>
                        <option value="104">Opening Stock - Initial inventory when starting EFRIS</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Required by URA to track where goods came from and verify tax was paid correctly. Most purchases use "Local Purchase".
                        {formData.stockInType === '104' && (
                          <span className="block mt-1 text-amber-600 font-medium">
                            ⓘ Opening Stock: Select account 3900 (Opening Balance Equity) for inventory items. Stock won't be doubled - just reported to EFRIS.
                          </span>
                        )}
                      </p>
                    </div>
                  </>
                )}
              </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Line Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                  <Plus className="w-4 h-4" />
                  Add Item
                </Button>
              </div>
              <div className="border border-gray-300 rounded-lg" style={{ overflow: 'visible' }}>
                <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
                  <table className="w-full" style={{ overflow: 'visible' }}>
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-300">
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product *</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                          Account {formData.stockInType === '104' ? '(Opening Stock)' : '(Services only)'}
                        </th>
                        <th className="px-2 py-3 text-right text-xs font-semibold text-gray-700 uppercase" style={{ width: '70px' }}>Quantity *</th>
                        <th className="px-2 py-3 text-right text-xs font-semibold text-gray-700 uppercase" style={{ width: '140px' }}>Unit Price *</th>
                        <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 uppercase" style={{ width: '160px' }}>Tax Rate</th>
                        <th className="px-2 py-3 text-right text-xs font-semibold text-gray-700 uppercase" style={{ width: '140px' }}>Line Total</th>
                        <th className="px-1 py-3" style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item, index) => (
                        <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                          {/* Product */}
                          <td className="px-3 py-3">
                            <div className="relative">
                              <Input
                                className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                                placeholder="Search products..."
                                value={item.name || ''}
                                onChange={(e) => {
                                  updateItem(item.id, 'name', e.target.value);
                                  setProductSearch(e.target.value);
                                  setShowProductSearch(item.id);
                                }}
                                onFocus={() => {
                                  setProductSearch('');
                                  setShowProductSearch(item.id);
                                }}
                                onBlur={() => setTimeout(() => setShowProductSearch(null), 200)}
                                autoComplete="off"
                              />
                              
                              {showProductSearch === item.id && (
                                <div 
                                  className="absolute z-[9999] w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-2xl max-h-64 overflow-y-auto left-0 top-full" 
                                  style={{ minWidth: '300px' }}
                                  onMouseDown={(e) => e.preventDefault()}
                                >
                                  {getDisplayProducts.length > 0 ? (
                                    getDisplayProducts.map((product) => (
                                      <button
                                        key={product.id}
                                        type="button"
                                        onClick={() => {
                                          updateItem(item.id, 'productId', product.id);
                                          updateItem(item.id, 'name', product.name);
                                          updateItem(item.id, 'unitPrice', product.purchasePrice);
                                          setProductSearch('');
                                          setShowProductSearch(null);
                                        }}
                                        className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-0"
                                      >
                                        <div className="flex justify-between">
                                          <span className="font-medium text-sm">{product.name}</span>
                                          <span className="text-sm text-gray-600">{formatCurrency(product.purchasePrice, currency)}</span>
                                        </div>
                                        <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="px-3 py-2 text-sm text-gray-500">
                                      No products found (Total: {products.length})
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Expense Account */}
                          <td className="px-3 py-3">
                            <select
                              value={item.accountId}
                              onChange={(e) => updateItem(item.id, 'accountId', e.target.value)}
                              required={!item.productId}
                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select...</option>
                              {/* Show Opening Balance Equity for opening stock */}
                              {formData.stockInType === '104' && allAccounts
                                .filter(acc => acc.code === '3900')
                                .map((account) => (
                                  <option key={account.id} value={account.id}>
                                    {account.code} - {account.name} (Opening Stock)
                                  </option>
                                ))}
                              {/* Show expense accounts for non-inventory items */}
                              {!item.productId && expenseAccounts.slice(0, 50).map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.code} - {account.name}
                                </option>
                              ))}
                              {/* Note for inventory items */}
                              {item.productId && formData.stockInType !== '104' && (
                                <option value="" disabled>
                                  (Inventory items use account 1300 automatically)
                                </option>
                              )}
                            </select>
                            {item.productId && formData.stockInType === '104' && !item.accountId && (
                              <p className="text-xs text-amber-600 mt-1">⚠️ Select Opening Balance Equity (3900)</p>
                            )}
                          </td>

                          {/* Quantity */}
                          <td className="px-2 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              required
                              className="w-full px-2 py-2 text-sm text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                          </td>

                          {/* Unit Price */}
                          <td className="px-2 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              required
                              className="w-full px-2 py-2 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                          </td>

                          {/* Tax Rate */}
                          <td className="px-2 py-3">
                            <select
                              value={item.taxRate || 0}
                              onChange={(e) => {
                                const selectedRateValue = parseFloat(e.target.value);
                                updateItem(item.id, 'taxRate', selectedRateValue);
                              }}
                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
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
                          <td className="px-2 py-3 text-right">
                            <span className="text-sm font-medium">{formatCurrency(calculateLineTotal(item), currency)}</span>
                          </td>

                          {/* Remove Button */}
                          <td className="px-1 py-3 text-center">
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
              </div>
            </div>

            {/* Summary & Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Summary</h3>
              <div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-700">Subtotal:</span>
                      <span className={`${getAmountFontSize(formatCurrency(calculateSubtotal(), currency))} font-medium break-words`}>{formatCurrency(calculateSubtotal(), currency)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-700">Tax:</span>
                      <span className={`${getAmountFontSize(formatCurrency(calculateTaxTotal(), currency))} font-medium text-orange-600 break-words`}>{formatCurrency(calculateTaxTotal(), currency)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 pb-2 border-t border-gray-200">
                      <span className="text-base font-semibold">Total:</span>
                      <span className={`${getAmountFontSize(formatCurrency(calculateTotal(), currency))} font-bold text-blue-600 break-words`}>{formatCurrency(calculateTotal(), currency)}</span>
                    </div>
                  </div>
                </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-6">
                <Button 
                  type="button"
                  onClick={(e) => handleSubmit(e, false)}
                  disabled={submitting || submittingEfris} 
                  className="px-6 py-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
                {isUganda && efrisEnabled && (
                  <Button 
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={submitting || submittingEfris}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700"
                  >
                    {submittingEfris ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting to EFRIS...
                      </>
                    ) : (
                      'Save and add stock to EFRIS'
                    )}
                  </Button>
                )}
                <Link href={`/${orgSlug}/accounts-payable/bills`}>
                  <Button type="button" variant="outline" className="px-6 py-2">
                    Cancel
                  </Button>
                </Link>
              </div>

              {/* Help Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
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
