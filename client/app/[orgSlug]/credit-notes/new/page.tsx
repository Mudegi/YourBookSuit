'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, ArrowLeft } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';

interface Customer { id: string; customerNumber: string; companyName: string | null; firstName: string; lastName: string; }
interface Invoice { id: string; invoiceNumber: string; total: number; amountDue: number; }

export default function NewCreditNotePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const { organization } = useOrganization();
  const isUganda = organization?.homeCountry?.toUpperCase() === 'UG' || organization?.homeCountry?.toUpperCase() === 'UGANDA';

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sendToEfris, setSendToEfris] = useState(false);
  const [efrisEnabled, setEfrisEnabled] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    invoiceId: '',
    branchId: '',
    creditDate: new Date().toISOString().split('T')[0],
    reason: 'GOODS_RETURNED',
    description: '',
    internalNotes: '',
    lineItems: [{ description: '', quantity: '1', unitPrice: '', taxRate: '0', productId: '', accountId: '' }],
  });

  useEffect(() => { 
    fetchCustomers();
  }, []);
  
  useEffect(() => {
    if (organization) {
      checkEfrisConfig();
    }
  }, [organization]);
  
  useEffect(() => { if (formData.customerId) fetchInvoices(); }, [formData.customerId]);

  const checkEfrisConfig = async () => {
    // Only check EFRIS for Uganda organizations
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

  const fetchCustomers = async () => {
    const res = await fetch(`/api/orgs/${orgSlug}/customers`);
    const data = await res.json();
    if (data.success) setCustomers(data.data);
  };

  const fetchInvoices = async () => {
    const res = await fetch(`/api/orgs/${orgSlug}/invoices?customerId=${formData.customerId}&status=SENT`);
    const data = await res.json();
    if (data.success) setInvoices(data.data);
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      lineItems: [...formData.lineItems, { description: '', quantity: '1', unitPrice: '', taxRate: '0', productId: '', accountId: '' }],
    });
  };

  const updateLineItem = (idx: number, key: string, value: string) => {
    const items = [...formData.lineItems];
    items[idx] = { ...items[idx], [key]: value };
    setFormData({ ...formData, lineItems: items });
  };

  const removeLineItem = (idx: number) => {
    const items = formData.lineItems.filter((_, i) => i !== idx);
    setFormData({ ...formData, lineItems: items });
  };

  const validate = () => {
    if (!formData.customerId) return 'Customer is required';
    if (!formData.description) return 'Description is required';
    if (formData.lineItems.length === 0) return 'At least one line item is required';
    for (const li of formData.lineItems) {
      if (!li.description) return 'Line item description is required';
      if (!li.unitPrice || parseFloat(li.unitPrice) <= 0) return 'Line item unit price must be > 0';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent, shouldSendToEfris = false) => {
    e.preventDefault();
    const err = validate();
    if (err) { alert(err); return; }
    try {
      setLoading(true);
      const res = await fetch(`/api/orgs/${orgSlug}/credit-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.customerId,
          invoiceId: formData.invoiceId || undefined,
          branchId: formData.branchId || undefined,
          reason: formData.reason,
          description: formData.description,
          internalNotes: formData.internalNotes || undefined,
          lineItems: formData.lineItems.map(li => ({
            description: li.description,
            quantity: parseFloat(li.quantity || '1'),
            unitPrice: parseFloat(li.unitPrice),
            taxRate: parseFloat(li.taxRate || '0'),
            productId: li.productId || undefined,
            accountId: li.accountId || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        const creditNoteId = data.data.id;

        // Submit to EFRIS if requested
        if (shouldSendToEfris) {
          try {
            const efrisRes = await fetch(`/api/orgs/${orgSlug}/credit-notes/${creditNoteId}/efris`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });

            if (!efrisRes.ok) {
              const efrisError = await efrisRes.json();
              alert(`Credit note created but EFRIS submission failed: ${efrisError.error}`);
              // Still navigate to credit note detail
              router.push(`/${orgSlug}/credit-notes/${creditNoteId}`);
              return;
            }
          } catch (efrisErr) {
            alert('Credit note created but EFRIS submission failed');
            router.push(`/${orgSlug}/credit-notes/${creditNoteId}`);
            return;
          }
        }

        router.push(`/${orgSlug}/credit-notes/${creditNoteId}`);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create credit note');
    } finally { setLoading(false); }
  };

  const currency = (n: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(n);
  const totals = formData.lineItems.reduce((acc, li) => {
    const qty = parseFloat(li.quantity || '1');
    const price = parseFloat(li.unitPrice || '0');
    const rate = parseFloat(li.taxRate || '0');
    const sub = qty * price; const tax = sub * rate / 100; return { subtotal: acc.subtotal + sub, tax: acc.tax + tax };
  }, { subtotal: 0, tax: 0 });

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Link href={`/${orgSlug}/credit-notes`} className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Credit Notes
      </Link>
      <h1 className="text-3xl font-bold mb-4">New Credit Note</h1>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e, sendToEfris); }} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required>
              <option value="">Select customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.companyName || `${c.firstName} ${c.lastName}`} ({c.customerNumber})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link Invoice (optional)</label>
            <select value={formData.invoiceId} onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
              <option value="">—</option>
              {invoices.map(inv => (
                <option key={inv.id} value={inv.id}>{inv.invoiceNumber} • Due {currency(inv.amountDue)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <select value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required>
              <option value="GOODS_RETURNED">Goods Returned</option>
              <option value="DAMAGED_GOODS">Damaged Goods</option>
              <option value="PRICING_ERROR">Pricing Error</option>
              <option value="BILLING_ERROR">Billing Error</option>
              <option value="DISCOUNT_ADJUSTMENT">Discount Adjustment</option>
              <option value="SERVICE_ISSUE">Service Issue</option>
              <option value="CANCELLATION">Cancellation</option>
              <option value="GOODWILL">Goodwill</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Credit Date *</label>
            <input type="date" value={formData.creditDate} onChange={(e) => setFormData({ ...formData, creditDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Reason details" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Line Items *</label>
          <div className="space-y-3">
            {formData.lineItems.map((li, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <input className="px-3 py-2 border rounded-lg md:col-span-2" placeholder="Description" value={li.description} onChange={(e) => updateLineItem(idx, 'description', e.target.value)} />
                <input className="px-3 py-2 border rounded-lg" type="number" placeholder="Qty" value={li.quantity} onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)} />
                <input className="px-3 py-2 border rounded-lg" type="number" placeholder="Unit Price" value={li.unitPrice} onChange={(e) => updateLineItem(idx, 'unitPrice', e.target.value)} />
                <input className="px-3 py-2 border rounded-lg" type="number" placeholder="Tax %" value={li.taxRate} onChange={(e) => updateLineItem(idx, 'taxRate', e.target.value)} />
                <button type="button" onClick={() => removeLineItem(idx)} className="px-3 py-2 border rounded-lg hover:bg-gray-50">Remove</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addLineItem} className="mt-3 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Add Line Item</button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
          <textarea value={formData.internalNotes} onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={2} />
        </div>

        <div className="flex justify-end items-center gap-6 border-t pt-4">
          <div className="text-right">
            <div className="text-sm text-gray-600">Subtotal</div>
            <div className="font-medium">{currency(totals.subtotal)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Tax</div>
            <div className="font-medium">{currency(totals.tax)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-xl font-bold">{currency(totals.subtotal + totals.tax)}</div>
          </div>
          <Link href={`/${orgSlug}/credit-notes`} className="px-6 py-2 border rounded-lg hover:bg-gray-50">Cancel</Link>
          <button 
            type="button" 
            onClick={(e: any) => {
              setSendToEfris(false);
              handleSubmit(e, false);
            }}
            disabled={loading} 
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Create Credit Note'}
          </button>
          {efrisEnabled && (
            <button 
              type="button" 
              onClick={(e: any) => {
                setSendToEfris(true);
                handleSubmit(e, true);
              }}
              disabled={loading} 
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Save and apply to EFRIS'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
