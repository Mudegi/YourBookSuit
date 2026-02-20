'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Plus, Trash2, Search,
  Package, RotateCcw, FileText, X, Warehouse,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

// ── Interfaces ──────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  customerNumber: string;
  companyName: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
}

interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  total: number;
  amountDue: number;
  amountPaid: number;
  status: string;
  currency?: string;
  efrisFDN?: string | null;
  taxCalculationMethod?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  subtotal: number;
  product?: { id: string; name: string; sku: string } | null;
  productId?: string | null;
  taxRateId?: string | null;
  warehouseId?: string | null;
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  total: number;
  amountDue: number;
  status: string;
  currency?: string;
  efrisFDN?: string | null;
  taxCalculationMethod?: string;
  customer: Customer;
  items: InvoiceItem[];
}

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
}

interface CreditLineItem {
  id: string;
  originalItemId?: string;
  productId?: string | null;
  description: string;
  originalQty: number;
  creditQty: number;
  unitPrice: number;
  taxRate: number;
  taxRateId?: string | null;
  restock: boolean;
  warehouseId: string;
  subtotal: number;
  taxAmount: number;
  total: number;
}

// ── Reason Codes ────────────────────────────────────────────────────────────

const REASON_CODES = [
  { value: 'GOODS_RETURNED', label: 'Goods Returned' },
  { value: 'DAMAGED_GOODS', label: 'Damaged Goods' },
  { value: 'PRICING_ERROR', label: 'Pricing Error' },
  { value: 'BILLING_ERROR', label: 'Billing Error' },
  { value: 'DISCOUNT_ADJUSTMENT', label: 'Post-sale Discount' },
  { value: 'SERVICE_ISSUE', label: 'Service Issue' },
  { value: 'CANCELLATION', label: 'Canceled Order' },
  { value: 'GOODWILL', label: 'Goodwill Credit' },
  { value: 'OTHER', label: 'Other' },
] as const;

// ── Component ───────────────────────────────────────────────────────────────

export default function NewCreditNotePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const { organization, currency } = useOrganization();

  // ── Data State ──
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [defaultWarehouseId, setDefaultWarehouseId] = useState('');

  // ── Form State ──
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [creditDate, setCreditDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('GOODS_RETURNED');
  const [description, setDescription] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [items, setItems] = useState<CreditLineItem[]>([]);
  const [globalRestock, setGlobalRestock] = useState(true);
  const [globalWarehouseId, setGlobalWarehouseId] = useState('');
  const [taxInclusive, setTaxInclusive] = useState(false);

  // ── UI State ──
  const [loading, setLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);

  // ── Computed ──
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const totalTax = items.reduce((s, i) => s + i.taxAmount, 0);
  const total = subtotal + totalTax;

  // ── Data Fetching ──
  useEffect(() => {
    fetchCustomers();
    fetchWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug]);

  useEffect(() => {
    if (selectedCustomer) fetchInvoices(selectedCustomer.id);
    else { setInvoices([]); setSelectedInvoice(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer]);

  useEffect(() => {
    if (defaultWarehouseId && !globalWarehouseId) {
      setGlobalWarehouseId(defaultWarehouseId);
    }
  }, [defaultWarehouseId, globalWarehouseId]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/customers?limit=1000`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || data.data || []);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchInvoices = async (customerId: string) => {
    try {
      const res = await fetch(
        `/api/orgs/${orgSlug}/invoices?customerId=${customerId}&limit=500`
      );
      if (res.ok) {
        const data = await res.json();
        const allInvoices = data.invoices || data.data || [];
        const eligible = allInvoices.filter((inv: any) =>
          ['SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID'].includes(inv.status)
        );
        setInvoices(eligible);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/inventory/warehouses`);
      if (res.ok) {
        const data = await res.json();
        const wh = data.warehouses || data.data || data || [];
        setWarehouses(Array.isArray(wh) ? wh : []);
        const defaultWh = (Array.isArray(wh) ? wh : []).find(
          (w: WarehouseOption) => w.isDefault
        );
        if (defaultWh) setDefaultWarehouseId(defaultWh.id);
      }
    } catch {
      /* warehouses are optional */
    }
  };

  const fetchInvoiceDetail = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/invoices/${invoiceId}`);
      if (res.ok) {
        const data = await res.json();
        const inv = data.data || data;
        setSelectedInvoice(inv);
        populateFromInvoice(inv);
        return inv;
      }
    } catch (err) {
      console.error('Error fetching invoice detail:', err);
    }
    return null;
  };

  // ── Tax calculation helper (respects inclusive / exclusive) ──
  const calcLine = (qty: number, unitPrice: number, taxRate: number, isInclusive: boolean) => {
    if (isInclusive && taxRate > 0) {
      // unitPrice already includes tax — extract it
      const gross = qty * unitPrice;
      const taxAmt = gross * taxRate / (100 + taxRate);
      const sub = gross - taxAmt;
      return {
        subtotal: Math.round(sub * 100) / 100,
        taxAmount: Math.round(taxAmt * 100) / 100,
        total: Math.round(gross * 100) / 100,
      };
    }
    // Tax-exclusive: add tax on top
    const sub = qty * unitPrice;
    const taxAmt = sub * taxRate / 100;
    return {
      subtotal: Math.round(sub * 100) / 100,
      taxAmount: Math.round(taxAmt * 100) / 100,
      total: Math.round((sub + taxAmt) * 100) / 100,
    };
  };

  // ── Populate items from selected invoice ──
  const populateFromInvoice = (invoice: InvoiceDetail) => {
    const whId = globalWarehouseId || defaultWarehouseId;
    const isInclusive = invoice.taxCalculationMethod === 'INCLUSIVE';
    setTaxInclusive(isInclusive);

    const creditItems: CreditLineItem[] = (invoice.items || []).map((item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const tax = Number(item.taxRate) || 0;
      const { subtotal: sub, taxAmount: taxAmt, total: tot } = calcLine(qty, price, tax, isInclusive);
      return {
        id: Math.random().toString(36).substr(2, 9),
        originalItemId: item.id,
        productId: item.productId || item.product?.id || null,
        description: item.description || item.product?.name || '',
        originalQty: qty,
        creditQty: qty,
        unitPrice: price,
        taxRate: tax,
        taxRateId: item.taxRateId || null,
        restock: !!item.productId || !!item.product,
        warehouseId: item.warehouseId || whId,
        subtotal: sub,
        taxAmount: taxAmt,
        total: tot,
      };
    });
    setItems(creditItems);
    setDescription(`Credit for Invoice ${invoice.invoiceNumber}`);
  };

  // ── "Credit Entire Invoice" shortcut ──
  const creditEntireInvoice = () => {
    if (!selectedInvoice) return;
    populateFromInvoice(selectedInvoice);
    toast.success('All items set to full credit');
  };

  // ── Line Item Helpers ──
  const recalcItem = (item: CreditLineItem): CreditLineItem => {
    const { subtotal, taxAmount, total } = calcLine(
      item.creditQty, item.unitPrice, item.taxRate, taxInclusive
    );
    return { ...item, subtotal, taxAmount, total };
  };

  const updateItem = (id: string, updates: Partial<CreditLineItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return recalcItem({ ...item, ...updates });
      })
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const addManualItem = () => {
    const whId = globalWarehouseId || defaultWarehouseId;
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        description: '',
        originalQty: 0,
        creditQty: 1,
        unitPrice: 0,
        taxRate: 0,
        taxRateId: null,
        restock: false,
        warehouseId: whId,
        subtotal: 0,
        taxAmount: 0,
        total: 0,
      },
    ]);
  };

  const toggleGlobalRestock = (checked: boolean) => {
    setGlobalRestock(checked);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        restock: item.productId ? checked : false,
      }))
    );
  };

  const applyGlobalWarehouse = (warehouseId: string) => {
    setGlobalWarehouseId(warehouseId);
    setItems((prev) =>
      prev.map((item) =>
        item.restock ? { ...item, warehouseId: warehouseId } : item
      )
    );
  };

  // ── Filtered lists for dropdowns ──
  const filteredCustomers = customers.filter((c) => {
    const name =
      c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim();
    return (
      name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.customerNumber?.toLowerCase().includes(customerSearch.toLowerCase())
    );
  });

  const filteredInvoices = invoices.filter((inv) =>
    inv.invoiceNumber?.toLowerCase().includes(invoiceSearch.toLowerCase())
  );

  // ── Validation ──
  const validate = (): string[] => {
    const errors: string[] = [];
    if (!selectedCustomer) errors.push('Customer is required');
    if (!reason) errors.push('Reason is required');
    if (!description.trim()) errors.push('Description is required');
    if (items.length === 0) errors.push('At least one line item is required');
    items.forEach((item, idx) => {
      const ln = idx + 1;
      if (!item.description.trim())
        errors.push(`Line ${ln}: Description is required`);
      if (item.creditQty <= 0)
        errors.push(`Line ${ln}: Quantity must be greater than 0`);
      if (item.unitPrice <= 0)
        errors.push(`Line ${ln}: Unit price must be greater than 0`);
      if (item.originalQty > 0 && item.creditQty > item.originalQty) {
        errors.push(
          `Line ${ln}: Credit qty (${item.creditQty}) exceeds original qty (${item.originalQty})`
        );
      }
      if (item.restock && !item.warehouseId && warehouses.length > 0) {
        errors.push(`Line ${ln}: Select a warehouse for restocking`);
      }
    });
    return errors;
  };

  // ── Submit ──
  const handleSubmit = async () => {
    const errors = validate();
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/credit-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer!.id,
          invoiceId: selectedInvoice?.id || undefined,
          creditDate,
          reason,
          description,
          internalNotes: internalNotes || undefined,
          restockInventory: items.some((i) => i.restock),
          lineItems: items.map((item, idx) => ({
            lineNumber: idx + 1,
            description: item.description,
            quantity: item.creditQty,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            taxRateId: item.taxRateId || undefined,
            productId: item.productId || undefined,
            restock: item.restock,
            warehouseId: item.restock ? item.warehouseId : undefined,
          })),
        }),
      });

      const data = await res.json();
      if (data.success || res.ok) {
        const creditNoteId = data.data?.id || data.id;
        toast.success('Credit note created successfully');

        router.push(`/${orgSlug}/credit-notes/${creditNoteId}`);
      } else {
        toast.error(data.error || 'Failed to create credit note');
      }
    } catch (err) {
      console.error('Error creating credit note:', err);
      toast.error('Failed to create credit note');
    } finally {
      setLoading(false);
    }
  };

  // ── Selection Handlers ──
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDropdown(false);
    setCustomerSearch('');
    setSelectedInvoice(null);
    setItems([]);
  };

  const handleSelectInvoice = async (invoice: InvoiceSummary) => {
    setShowInvoiceDropdown(false);
    setInvoiceSearch('');
    await fetchInvoiceDetail(invoice.id);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* ── Sticky Top Bar ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/${orgSlug}/credit-notes`)}
                className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  New Credit Note
                </h1>
                <p className="text-xs text-gray-500">{organization?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedInvoice && (
                <button
                  type="button"
                  onClick={creditEntireInvoice}
                  className="px-4 py-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  Credit Entire Invoice
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={loading || !selectedCustomer || items.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">
        {/* ── Card: Customer & Invoice Linkage ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Customer + Invoice Selection */}
          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Customer Selector */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Customer <span className="text-red-400">*</span>
              </label>
              {selectedCustomer ? (
                <div className="flex items-start justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {selectedCustomer.companyName ||
                        `${selectedCustomer.firstName} ${selectedCustomer.lastName}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedCustomer.customerNumber}
                    </p>
                    {selectedCustomer.email && (
                      <p className="text-xs text-gray-400">
                        {selectedCustomer.email}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setSelectedInvoice(null);
                      setItems([]);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() =>
                        setTimeout(() => setShowCustomerDropdown(false), 200)
                      }
                      placeholder="Search by name, email, or customer #..."
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {filteredCustomers.slice(0, 20).map((c) => (
                        <button
                          key={c.id}
                          onMouseDown={() => handleSelectCustomer(c)}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors"
                        >
                          <p className="font-medium text-sm text-gray-900">
                            {c.companyName ||
                              `${c.firstName} ${c.lastName}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {c.customerNumber}{' '}
                            {c.email ? `\u2022 ${c.email}` : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Invoice Selector */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Link to Invoice
              </label>
              {selectedInvoice ? (
                <div className="flex items-start justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {selectedInvoice.invoiceNumber}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      <span>
                        Total:{' '}
                        {formatCurrency(selectedInvoice.total, currency)}
                      </span>
                      <span>
                        Due:{' '}
                        {formatCurrency(selectedInvoice.amountDue, currency)}
                      </span>
                    </div>
                    {selectedInvoice.efrisFDN && (
                      <p className="text-[10px] text-blue-600 font-medium mt-1">
                        FDN: {selectedInvoice.efrisFDN}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedInvoice(null);
                      setItems([]);
                    }}
                    className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : selectedCustomer ? (
                <div className="relative">
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={invoiceSearch}
                      onChange={(e) => {
                        setInvoiceSearch(e.target.value);
                        setShowInvoiceDropdown(true);
                      }}
                      onFocus={() => setShowInvoiceDropdown(true)}
                      onBlur={() =>
                        setTimeout(() => setShowInvoiceDropdown(false), 200)
                      }
                      placeholder="Search invoice number..."
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {showInvoiceDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {filteredInvoices.length > 0 ? (
                        filteredInvoices.map((inv) => (
                          <button
                            key={inv.id}
                            onMouseDown={() => handleSelectInvoice(inv)}
                            className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-sm text-gray-900">
                                  {inv.invoiceNumber}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {new Date(
                                    inv.invoiceDate
                                  ).toLocaleDateString()}{' '}
                                  &middot; {inv.status}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-700 tabular-nums">
                                  {formatCurrency(inv.total, currency)}
                                </p>
                                {Number(inv.amountDue) > 0 && (
                                  <p className="text-[10px] text-amber-600 tabular-nums">
                                    Due:{' '}
                                    {formatCurrency(inv.amountDue, currency)}
                                  </p>
                                )}
                              </div>
                            </div>
                            {inv.efrisFDN && (
                              <p className="text-[10px] text-blue-500 mt-0.5">
                                FDN: {inv.efrisFDN}
                              </p>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center text-sm text-gray-400">
                          {invoices.length === 0
                            ? 'No eligible invoices for this customer'
                            : 'No matching invoices'}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    Selecting an invoice auto-populates items. You can also
                    create a standalone credit note.
                  </p>
                </div>
              ) : (
                <div className="px-4 py-2.5 text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-lg">
                  Select a customer first
                </div>
              )}
            </div>
          </div>

          {/* Credit Note Details Row */}
          <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-gray-100 pt-5">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Credit Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={creditDate}
                onChange={(e) => setCreditDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Reason <span className="text-red-400">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {REASON_CODES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Description <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief reason for this credit note..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ── Card: Inventory Restock Controls ── */}
        {items.some((i) => !!i.productId) && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={globalRestock}
                  onChange={(e) => toggleGlobalRestock(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Return items to inventory
                  </span>
                  <p className="text-[10px] text-gray-500">
                    Stock levels will be increased for checked items
                  </p>
                </div>
              </label>

              {globalRestock && warehouses.length > 0 && (
                <div className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-gray-400" />
                  <select
                    value={globalWarehouseId}
                    onChange={(e) => applyGlobalWarehouse(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Card: Line Items ── */}
        <div
          className="bg-white rounded-xl border border-gray-200 shadow-sm"
          style={{ overflow: 'visible' }}
        >
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Credit Items
            </h3>
            <button
              onClick={addManualItem}
              className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500 font-medium">
                No credit items
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Select an invoice to auto-populate, or add items manually
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th
                      className="pl-5 pr-2 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                      style={{ width: '36px' }}
                    >
                      #
                    </th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th
                      className="px-2 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                      style={{ width: '80px' }}
                    >
                      Orig. Qty
                    </th>
                    <th
                      className="px-2 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                      style={{ width: '80px' }}
                    >
                      Credit Qty
                    </th>
                    <th
                      className="px-2 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                      style={{ width: '120px' }}
                    >
                      Unit Price
                    </th>
                    <th
                      className="px-2 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                      style={{ width: '80px' }}
                    >
                      Tax %
                    </th>
                    <th
                      className="px-2 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                      style={{ width: '70px' }}
                    >
                      Restock
                    </th>
                    <th
                      className="px-2 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                      style={{ width: '130px' }}
                    >
                      Amount
                    </th>
                    <th
                      className="px-2 py-2.5"
                      style={{ width: '36px' }}
                    ></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="group hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="pl-5 pr-2 py-3 text-center text-xs text-gray-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            updateItem(item.id, {
                              description: e.target.value,
                            })
                          }
                          placeholder="Item description"
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                        {item.productId && (
                          <span className="text-[10px] text-gray-400 mt-0.5 block">
                            Product linked
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {item.originalQty > 0 ? (
                          <span className="text-xs text-gray-400 tabular-nums">
                            {item.originalQty}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">&mdash;</span>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          value={item.creditQty}
                          onChange={(e) =>
                            updateItem(item.id, {
                              creditQty: parseFloat(e.target.value) || 0,
                            })
                          }
                          min="0"
                          max={
                            item.originalQty > 0
                              ? item.originalQty
                              : undefined
                          }
                          step="0.01"
                          className={`w-full px-2 py-1.5 text-sm text-center border rounded-md focus:ring-2 focus:ring-blue-500 ${
                            item.originalQty > 0 &&
                            item.creditQty > item.originalQty
                              ? 'border-red-400 bg-red-50'
                              : 'border-gray-200'
                          }`}
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(item.id, {
                              unitPrice: parseFloat(e.target.value) || 0,
                            })
                          }
                          min="0"
                          step="0.01"
                          className="w-full px-2 py-1.5 text-sm text-right border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          value={item.taxRate}
                          onChange={(e) =>
                            updateItem(item.id, {
                              taxRate: parseFloat(e.target.value) || 0,
                            })
                          }
                          min="0"
                          step="0.01"
                          className="w-full px-2 py-1.5 text-sm text-right border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-3 text-center">
                        {item.productId ? (
                          <input
                            type="checkbox"
                            checked={item.restock}
                            onChange={(e) =>
                              updateItem(item.id, {
                                restock: e.target.checked,
                              })
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-xs text-gray-300">&mdash;</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(item.total, currency)}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Summary ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5">
            <div className="flex justify-end">
              <div className="w-full max-w-sm space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium text-gray-700 tabular-nums">
                    {formatCurrency(subtotal, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax</span>
                  <span className="font-medium text-gray-700 tabular-nums">
                    {formatCurrency(totalTax, currency)}
                  </span>
                </div>
                <div className="pt-3 mt-1 border-t-2 border-gray-900">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Credit Total
                    </span>
                    <span className="text-2xl font-bold text-red-600 tabular-nums">
                      {formatCurrency(total, currency)}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 text-right mt-0.5 uppercase">
                    {currency}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Impact Preview ── */}
        {selectedInvoice && total > 0 && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
            <h3 className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-3">
              Impact Preview
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[10px] text-blue-500 uppercase font-medium">
                  Accounts Receivable
                </p>
                <p className="font-semibold text-gray-900 tabular-nums">
                  -{formatCurrency(total, currency)}
                </p>
                <p className="text-[10px] text-gray-500">
                  Reduces amount owed
                </p>
              </div>
              <div>
                <p className="text-[10px] text-blue-500 uppercase font-medium">
                  Sales Revenue
                </p>
                <p className="font-semibold text-gray-900 tabular-nums">
                  -{formatCurrency(subtotal, currency)}
                </p>
                <p className="text-[10px] text-gray-500">Reverses income</p>
              </div>
              <div>
                <p className="text-[10px] text-blue-500 uppercase font-medium">
                  Tax Payable
                </p>
                <p className="font-semibold text-gray-900 tabular-nums">
                  -{formatCurrency(totalTax, currency)}
                </p>
                <p className="text-[10px] text-gray-500">Tax reclaimed</p>
              </div>
              {items.some((i) => i.restock) && (
                <div>
                  <p className="text-[10px] text-blue-500 uppercase font-medium">
                    Inventory
                  </p>
                  <p className="font-semibold text-emerald-700">
                    +
                    {items
                      .filter((i) => i.restock)
                      .reduce((s, i) => s + i.creditQty, 0)}{' '}
                    units
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Returned to stock
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Internal Notes ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Internal Notes
            </label>
          </div>
          <div className="p-5">
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={2}
              placeholder="Internal notes (not visible on the credit note document)..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none placeholder:text-gray-300"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
