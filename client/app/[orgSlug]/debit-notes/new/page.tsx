'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, ArrowLeft } from 'lucide-react';

export default function NewDebitNotePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [efrisEnabled, setEfrisEnabled] = useState(false);
  const [sendToEfris, setSendToEfris] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    invoiceId: '',
    branchId: '',
    debitDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    reason: 'ADDITIONAL_CHARGES',
    description: '',
    internalNotes: '',
    lineItems: [{ description: '', quantity: '1', unitPrice: '', taxRate: '0', productId: '', accountId: '' }],
  });

  useEffect(() => { 
    fetchCustomers(); 
    checkEfrisConfig();
  }, []);
  useEffect(() => { if (formData.customerId) fetchInvoices(); }, [formData.customerId]);

  const checkEfrisConfig = async () => {
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
    const res = await fetch(`/api/${orgSlug}/customers`);
    const data = await res.json();
    if (data.success) setCustomers(data.data);
  };

  const fetchInvoices = async () => {
    const res = await fetch(`/api/${orgSlug}/invoices?customerId=${formData.customerId}&status=SENT`);
    const data = await res.json();
    if (data.success) setInvoices(data.data);
  };

  const addLineItem = () => setFormData({ ...formData, lineItems: [...formData.lineItems, { description: '', quantity: '1', unitPrice: '', taxRate: '0', productId: '', accountId: '' }] });
  const updateLineItem = (i:number,k:string,v:string) => { const items=[...formData.lineItems]; items[i]={...items[i],[k]:v}; setFormData({...formData,lineItems:items}); };
  const removeLineItem = (i:number) => setFormData({...formData,lineItems:formData.lineItems.filter((_,idx)=>idx!==i)});

  const validate = () => {
    if (!formData.customerId) return 'Customer is required';
    if (!formData.description) return 'Description is required';
    if (formData.lineItems.length === 0) return 'At least one line item is required';
    for (const li of formData.lineItems) {
      if (!li.description) return 'Line item description is required';
      if (!li.unitPrice || parseFloat(li.unitPrice) <= 0) return 'Unit price must be > 0';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent, shouldSendToEfris = false) => {
    e.preventDefault();
    const err = validate(); if (err) { alert(err); return; }
    try {
      setLoading(true);
      const res = await fetch(`/api/${orgSlug}/debit-notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          customerId: formData.customerId,
          invoiceId: formData.invoiceId || undefined,
          branchId: formData.branchId || undefined,
          reason: formData.reason,
          description: formData.description,
          internalNotes: formData.internalNotes || undefined,
          dueDate: formData.dueDate || undefined,
          lineItems: formData.lineItems.map(li => ({ description: li.description, quantity: parseFloat(li.quantity||'1'), unitPrice: parseFloat(li.unitPrice), taxRate: parseFloat(li.taxRate||'0'), productId: li.productId||undefined, accountId: li.accountId||undefined })),
        })
      });
      const data = await res.json();
      if (data.success) {
        const debitNoteId = data.data.id;

        // Submit to EFRIS if requested
        if (shouldSendToEfris) {
          try {
            const efrisRes = await fetch(`/api/${orgSlug}/debit-notes/${debitNoteId}/efris`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });

            if (!efrisRes.ok) {
              const efrisError = await efrisRes.json();
              alert(`⚠️ Debit Note created but EFRIS submission failed: ${efrisError.error || 'Unknown error'}\n\nYou can submit to EFRIS later from the debit note detail page.`);
            } else {
              alert('✅ Debit Note created and submitted to EFRIS successfully!');
            }
          } catch (efrisErr) {
            console.error('EFRIS submission error:', efrisErr);
            alert('⚠️ Debit Note created but EFRIS submission failed. You can submit to EFRIS later from the debit note detail page.');
          }
        }

        router.push(`/${orgSlug}/debit-notes/${debitNoteId}`);
      }
      else alert('Error: ' + data.error);
    } catch (err) { console.error(err); alert('Failed to create debit note'); }
    finally { setLoading(false); }
  };

  const currency = (n: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(n);
  const totals = formData.lineItems.reduce((acc, li) => { const qty=parseFloat(li.quantity||'1'); const price=parseFloat(li.unitPrice||'0'); const rate=parseFloat(li.taxRate||'0'); const sub=qty*price; const tax=sub*rate/100; return { subtotal: acc.subtotal+sub, tax: acc.tax+tax }; }, { subtotal: 0, tax: 0 });

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Link href={`/${orgSlug}/debit-notes`} className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"><ArrowLeft className="w-4 h-4" /> Back to Debit Notes</Link>
      <h1 className="text-3xl font-bold mb-4">New Debit Note</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select value={formData.customerId} onChange={(e)=>setFormData({ ...formData, customerId:e.target.value })} className="w-full px-3 py-2 border rounded-lg" required>
              <option value="">Select customer</option>
              {customers.map((c:any)=>(<option key={c.id} value={c.id}>{c.companyName || `${c.firstName} ${c.lastName}`} ({c.customerNumber})</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link Invoice (optional)</label>
            <select value={formData.invoiceId} onChange={(e)=>setFormData({ ...formData, invoiceId:e.target.value })} className="w-full px-3 py-2 border rounded-lg">
              <option value="">—</option>
              {invoices.map((inv:any)=>(<option key={inv.id} value={inv.id}>{inv.invoiceNumber} • Due {currency(inv.amountDue)}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Debit Date *</label>
            <input type="date" value={formData.debitDate} onChange={(e)=>setFormData({ ...formData, debitDate:e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" value={formData.dueDate} onChange={(e)=>setFormData({ ...formData, dueDate:e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <select value={formData.reason} onChange={(e)=>setFormData({ ...formData, reason:e.target.value })} className="w-full px-3 py-2 border rounded-lg" required>
              <option value="ADDITIONAL_CHARGES">Additional Charges</option>
              <option value="LATE_PAYMENT_FEE">Late Payment Fee</option>
              <option value="INTEREST_CHARGE">Interest Charge</option>
              <option value="SHIPPING_ADJUSTMENT">Shipping Adjustment</option>
              <option value="PRICE_ADJUSTMENT">Price Adjustment</option>
              <option value="SERVICE_UPGRADE">Service Upgrade</option>
              <option value="UNDERBILLING">Underbilling</option>
              <option value="PENALTY">Penalty</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <input type="text" value={formData.description} onChange={(e)=>setFormData({ ...formData, description:e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Line Items *</label>
          <div className="space-y-3">
            {formData.lineItems.map((li, idx)=> (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <input className="px-3 py-2 border rounded-lg md:col-span-2" placeholder="Description" value={li.description} onChange={(e)=>updateLineItem(idx,'description',e.target.value)} />
                <input className="px-3 py-2 border rounded-lg" type="number" placeholder="Qty" value={li.quantity} onChange={(e)=>updateLineItem(idx,'quantity',e.target.value)} />
                <input className="px-3 py-2 border rounded-lg" type="number" placeholder="Unit Price" value={li.unitPrice} onChange={(e)=>updateLineItem(idx,'unitPrice',e.target.value)} />
                <input className="px-3 py-2 border rounded-lg" type="number" placeholder="Tax %" value={li.taxRate} onChange={(e)=>updateLineItem(idx,'taxRate',e.target.value)} />
                <button type="button" onClick={()=>removeLineItem(idx)} className="px-3 py-2 border rounded-lg hover:bg-gray-50">Remove</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addLineItem} className="mt-3 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Add Line Item</button>
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
          <Link href={`/${orgSlug}/debit-notes`} className="px-6 py-2 border rounded-lg hover:bg-gray-50">Cancel</Link>
          <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2">
            <Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Create Debit Note'}
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
              <Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Save and Send to EFRIS'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
