'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, ChevronLeft, Save, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useOrganization } from '@/hooks/useOrganization';

interface Customer {
  id: string; firstName: string; lastName: string;
  companyName: string | null; email: string | null;
}
interface Product {
  id: string; name: string; sku: string;
  salesPrice: number | null; description: string | null;
}
interface LineItem {
  id: string;
  productId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  taxRate: string;
  isOptional: boolean;
  notes: string;
  // computed
  subtotal: number;
  taxAmount: number;
  total: number;
}

const newLine = (): LineItem => ({
  id: Math.random().toString(36).slice(2),
  productId: '', description: '', quantity: '1', unitPrice: '0',
  discountPercent: '0', taxRate: '0', isOptional: false, notes: '',
  subtotal: 0, taxAmount: 0, total: 0,
});

function computeLine(l: LineItem, method: string): LineItem {
  const qty  = parseFloat(l.quantity)        || 0;
  const price = parseFloat(l.unitPrice)      || 0;
  const disc  = parseFloat(l.discountPercent) || 0;
  const tax   = parseFloat(l.taxRate)        || 0;
  const sub   = qty * price;
  const discAmt = sub * disc / 100;
  const afterDisc = sub - discAmt;
  const taxAmt = method === 'INCLUSIVE'
    ? afterDisc - afterDisc / (1 + tax / 100)
    : afterDisc * tax / 100;
  const total = method === 'INCLUSIVE' ? afterDisc : afterDisc + taxAmt;
  return { ...l, subtotal: sub, taxAmount: taxAmt, total };
}

export default function NewEstimatePage() {
  const params  = useParams();
  const router  = useRouter();
  const orgSlug = params.orgSlug as string;
  const { organization } = useOrganization();

  // Header fields
  const [customerId,   setCustomerId]   = useState('');
  const [estimateDate, setEstimateDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate,   setExpiryDate]   = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [currency,       setCurrency]       = useState('');
  const [taxMethod,      setTaxMethod]      = useState('EXCLUSIVE');
  const [reference,      setReference]      = useState('');
  const [notes,          setNotes]          = useState('');
  const [terms,          setTerms]          = useState('');
  const [shippingAmount, setShippingAmount] = useState('0');

  // Data
  const [customers,     setCustomers]     = useState<Customer[]>([]);
  const [products,      setProducts]      = useState<Product[]>([]);
  const [lines,         setLines]         = useState<LineItem[]>([newLine()]);
  const [orgCurrencies, setOrgCurrencies] = useState<{ code: string; name: string; isBase: boolean }[]>([]);

  // UI state
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [prodSearch, setProdSearch] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/orgs/${orgSlug}/customers?limit=200`)
      .then(r => r.json())
      .then(d => setCustomers(d.data || d.customers || []));
    fetch(`/api/orgs/${orgSlug}/products?limit=200`)
      .then(r => r.json())
      .then(d => setProducts(d.data || d.products || []));
    fetch(`/api/${orgSlug}/currencies`)
      .then(r => r.json())
      .then(d => {
        const list = d.data || [];
        setOrgCurrencies(list);
        const base = list.find((c: any) => c.isBase);
        if (base?.code) setCurrency(prev => prev || base.code);
      });
  }, [orgSlug]);

  // Fallback: if Currency table was empty, apply org baseCurrency once hook resolves it
  useEffect(() => {
    if (organization?.baseCurrency) {
      setCurrency(prev => prev || organization.baseCurrency);
    }
  }, [organization?.baseCurrency]);

  const updateLine = (id: string, patch: Partial<LineItem>) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const merged = { ...l, ...patch };
      return computeLine(merged, taxMethod);
    }));
  };

  const selectProduct = (lineId: string, product: Product) => {
    updateLine(lineId, {
      productId:   product.id,
      description: product.description || product.name,
      unitPrice:   String(product.salesPrice || 0),
    });
    setProdSearch(p => ({ ...p, [lineId]: product.name }));
  };

  const subtotal  = lines.reduce((s, l) => s + l.subtotal, 0);
  const taxTotal  = lines.reduce((s, l) => s + l.taxAmount, 0);
  const discTotal = lines.reduce((s, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    const disc = parseFloat(l.discountPercent) || 0;
    return s + qty * price * disc / 100;
  }, 0);
  const shipping  = parseFloat(shippingAmount) || 0;
  const grandTotal = subtotal - discTotal + taxTotal + shipping;

  const handleSave = async (status: 'DRAFT' | 'SENT' = 'DRAFT') => {
    setError('');
    if (!customerId)   return setError('Please select a customer.');
    if (!lines.length) return setError('Add at least one line item.');

    setSaving(true);
    try {
      const payload = {
        customerId, estimateDate, expirationDate: expiryDate,
        currency, taxCalculationMethod: taxMethod, reference,
        notes, terms, shippingAmount: parseFloat(shippingAmount) || 0,
        items: lines.map((l, i) => ({
          productId:      l.productId || null,
          description:    l.description,
          quantity:       parseFloat(l.quantity) || 0,
          unitPrice:      parseFloat(l.unitPrice) || 0,
          discountPercent: parseFloat(l.discountPercent) || 0,
          discount:       0,
          taxRate:        parseFloat(l.taxRate) || 0,
          isOptional:     l.isOptional,
          notes:          l.notes || null,
          sortOrder:      i,
        })),
      };

      const res  = await fetch(`/api/orgs/${orgSlug}/estimates`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || 'Save failed'); return; }

      if (status === 'SENT') {
        await fetch(`/api/orgs/${orgSlug}/estimates/${data.data.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'SENT' }),
        });
      }
      router.push(`/${orgSlug}/accounts-receivable/estimates/${data.data.id}`);
    } finally { setSaving(false); }
  };

  const filteredProducts = (search: string) =>
    search.length < 1 ? [] :
    products.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 8);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/accounts-receivable/estimates`}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Estimate / Quotation</h1>
          <p className="text-sm text-gray-500 mt-0.5">Non-posting — no GL impact until converted to an invoice</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column — form */}
        <div className="lg:col-span-2 space-y-6">

          {/* Customer & Dates */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-4">Customer & Dates</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Customer *</label>
                <select value={customerId} onChange={e => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="">— Select customer —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.companyName || `${c.firstName} ${c.lastName}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Estimate Date *</label>
                <input type="date" value={estimateDate} onChange={e => setEstimateDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Valid Until (Expiry) *</label>
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <p className="text-xs text-amber-600 mt-1">⚠ Prices may change after this date. The validity period protects you from rate and cost fluctuations.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  {orgCurrencies.length > 0
                    ? orgCurrencies.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.code}{c.name ? ` — ${c.name}` : ''}{c.isBase ? ' (base)' : ''}
                        </option>
                      ))
                    : currency
                      ? <option value={currency}>{currency} (org default)</option>
                      : <option value="">Loading…</option>
                  }
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Tax Method</label>
                <select value={taxMethod} onChange={e => {
                  setTaxMethod(e.target.value);
                  setLines(prev => prev.map(l => computeLine(l, e.target.value)));
                }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="EXCLUSIVE">Tax Exclusive</option>
                  <option value="INCLUSIVE">Tax Inclusive</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Reference / RFQ #</label>
                <input type="text" value={reference} onChange={e => setReference(e.target.value)}
                  placeholder="Customer's RFQ or PO reference"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Line Items</h2>
              <button onClick={() => setLines(prev => [...prev, newLine()])}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition">
                <Plus className="w-3 h-3" /> Add Line
              </button>
            </div>

            <div className="space-y-4">
              {lines.map((line, idx) => (
                <div key={line.id} className={`rounded-xl border p-4 ${line.isOptional ? 'border-dashed border-amber-300 bg-amber-50/30 dark:bg-amber-900/10' : 'border-gray-200 dark:border-slate-700'}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold text-gray-400">#{idx + 1}</span>
                    <div className="flex items-center gap-2 ml-auto">
                      <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" checked={line.isOptional}
                          onChange={e => updateLine(line.id, { isOptional: e.target.checked })}
                          className="rounded" />
                        Optional line
                      </label>
                      {lines.length > 1 && (
                        <button onClick={() => setLines(prev => prev.filter(l => l.id !== line.id))}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Product search */}
                  <div className="relative mb-3">
                    <input
                      value={prodSearch[line.id] ?? ''}
                      onChange={e => {
                        setProdSearch(p => ({ ...p, [line.id]: e.target.value }));
                        if (!e.target.value) updateLine(line.id, { productId: '' });
                      }}
                      placeholder="Search product / service (or leave blank for custom)"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {filteredProducts(prodSearch[line.id] ?? '').length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredProducts(prodSearch[line.id] ?? '').map(p => (
                          <button key={p.id} type="button"
                            onMouseDown={() => selectProduct(line.id, p)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
                            <span className="font-medium dark:text-white">{p.name}</span>
                            <span className="ml-2 text-gray-400 text-xs">{p.sku}</span>
                            {p.salesPrice && <span className="float-right text-blue-600 text-xs">{formatCurrency(p.salesPrice, currency)}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                    <div className="col-span-2 sm:col-span-5">
                      <input value={line.description} onChange={e => updateLine(line.id, { description: e.target.value })}
                        placeholder="Description *"
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Qty</label>
                      <input type="number" min="0" value={line.quantity} onChange={e => updateLine(line.id, { quantity: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Unit Price</label>
                      <input type="number" min="0" value={line.unitPrice} onChange={e => updateLine(line.id, { unitPrice: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Disc %</label>
                      <input type="number" min="0" max="100" value={line.discountPercent} onChange={e => updateLine(line.id, { discountPercent: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Tax %</label>
                      <input type="number" min="0" value={line.taxRate} onChange={e => updateLine(line.id, { taxRate: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Line Total</label>
                      <div className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg">
                        {formatCurrency(line.total, currency)}
                      </div>
                    </div>
                  </div>
                  {line.isOptional && (
                    <p className="text-xs text-amber-600 mt-1">⚡ Optional — customer can accept or reject this line</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Terms & Notes */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-4">Terms & Notes</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Terms & Conditions</label>
                <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={4}
                  placeholder="e.g. 50% deposit required before work begins. Delivery within 7 working days of receipt of deposit."
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Internal Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Notes visible to your team only"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Right column — summary */}
        <div className="space-y-6">
          {/* Totals */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 sticky top-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-4">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, currency)}</span>
              </div>
              {discTotal > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span>
                  <span>−{formatCurrency(discTotal, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 dark:text-slate-400">
                <span>Tax</span>
                <span>{formatCurrency(taxTotal, currency)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600 dark:text-slate-400">
                <span>Shipping</span>
                <input type="number" min="0" value={shippingAmount} onChange={e => setShippingAmount(e.target.value)}
                  className="w-28 text-right px-2 py-1 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-transparent dark:text-white" />
              </div>
              <div className="border-t border-gray-200 dark:border-slate-600 pt-2 flex justify-between font-bold text-gray-900 dark:text-white">
                <span>Total</span>
                <span className="text-blue-600">{formatCurrency(grandTotal, currency)}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg text-xs text-gray-500 dark:text-slate-400">
              <strong>📋 Non-Posting Document</strong><br />
              This estimate will <strong>not</strong> create any journal entries or affect your balance sheet.
              Convert to invoice when the customer accepts.
            </div>

            <div className="mt-6 space-y-3">
              <button onClick={() => handleSave('DRAFT')} disabled={saving}
                className="w-full py-2.5 bg-gray-900 dark:bg-slate-700 hover:bg-gray-800 dark:hover:bg-slate-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition">
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save as Draft'}
              </button>
              <button onClick={() => handleSave('SENT')} disabled={saving}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
                {saving ? 'Saving…' : 'Save & Mark as Sent'}
              </button>
              <Link href={`/${orgSlug}/accounts-receivable/estimates`}
                className="block w-full py-2.5 text-center text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                Cancel
              </Link>
            </div>

            {/* Validity reminder */}
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-300">
              <strong>⏰ Price Validity:</strong> This estimate expires on{' '}
              <strong>{new Date(expiryDate).toLocaleDateString()}</strong>.
              After this date, prices may change due to exchange rate or cost fluctuations.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
