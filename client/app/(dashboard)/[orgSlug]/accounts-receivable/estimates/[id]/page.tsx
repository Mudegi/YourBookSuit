'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Send, CheckCircle, XCircle, TrendingUp,
  Copy, Printer, Trash2, Edit2, AlertTriangle, Clock,
  FileText, ExternalLink,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useOrganization } from '@/hooks/useOrganization';

interface Customer {
  id: string; firstName: string; lastName: string;
  companyName: string | null; email: string | null; phone: string | null;
  billingAddress: any; shippingAddress: any;
}
interface EstimateItem {
  id: string; description: string; quantity: number; unitPrice: number;
  discountPercent: number | null; taxRate: number; taxAmount: number;
  subtotal: number; total: number; isOptional: boolean; notes: string | null;
  product: { id: string; name: string; sku: string } | null;
}
interface Estimate {
  id: string; estimateNumber: string; estimateDate: string;
  expirationDate: string; status: string; versionNumber: number;
  currency: string; subtotal: number; taxAmount: number;
  discountAmount: number; shippingAmount: number; total: number;
  notes: string | null; terms: string | null; reference: string | null;
  deliveryAddress: any; convertedInvoiceId: string | null;
  sourceEstimateId: string | null;
  customer: Customer;
  items: EstimateItem[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:    { label: 'Draft',    color: 'text-gray-700',   bg: 'bg-gray-100' },
  SENT:     { label: 'Sent',     color: 'text-blue-700',   bg: 'bg-blue-100' },
  ACCEPTED: { label: 'Accepted', color: 'text-green-700',  bg: 'bg-green-100' },
  DECLINED: { label: 'Declined', color: 'text-red-700',    bg: 'bg-red-100' },
  EXPIRED:  { label: 'Expired',  color: 'text-orange-700', bg: 'bg-orange-100' },
  INVOICED: { label: 'Invoiced', color: 'text-purple-700', bg: 'bg-purple-100' },
};

const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
const custName  = (c: Customer) => c.companyName || `${c.firstName} ${c.lastName}`.trim();

export default function EstimateDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const orgSlug = params.orgSlug as string;
  const id      = params.id as string;
  const { currency: orgCurrency } = useOrganization();

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [busy,     setBusy]     = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/orgs/${orgSlug}/estimates/${id}`)
      .then(r => r.json())
      .then(d => setEstimate(d.data))
      .finally(() => setLoading(false));
  }, [orgSlug, id]);

  const doStatus = async (status: string) => {
    setBusy(status);
    const res  = await fetch(`/api/orgs/${orgSlug}/estimates/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.success) setEstimate(data.data);
    setBusy(null);
  };

  const doConvert = async () => {
    if (!confirm('Convert this estimate to an invoice?')) return;
    setBusy('convert');
    const res  = await fetch(`/api/orgs/${orgSlug}/estimates/${id}/convert`, { method: 'POST' });
    const data = await res.json();
    setBusy(null);
    if (data.success) router.push(`/${orgSlug}/accounts-receivable/invoices/${data.invoiceId}`);
    else alert(data.error || 'Conversion failed');
  };

  const doClone = async () => {
    setBusy('clone');
    const res  = await fetch(`/api/orgs/${orgSlug}/estimates/${id}/clone`, { method: 'POST' });
    const data = await res.json();
    setBusy(null);
    if (data.success) router.push(`/${orgSlug}/accounts-receivable/estimates/${data.data.id}`);
    else alert(data.error || 'Clone failed');
  };

  const doDelete = async () => {
    if (!confirm('Delete this estimate?')) return;
    setBusy('delete');
    const res  = await fetch(`/api/orgs/${orgSlug}/estimates/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) router.push(`/${orgSlug}/accounts-receivable/estimates`);
    else { alert(data.error || 'Delete failed'); setBusy(null); }
  };

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!estimate) return (
    <div className="p-6 text-center">
      <p className="text-gray-500">Estimate not found.</p>
      <Link href={`/${orgSlug}/accounts-receivable/estimates`} className="mt-3 text-blue-600 hover:underline">← Back to estimates</Link>
    </div>
  );

  const cfg  = STATUS_CONFIG[estimate.status] || STATUS_CONFIG.DRAFT;
  const days = daysUntil(estimate.expirationDate);
  const mandatoryItems = estimate.items.filter(i => !i.isOptional);
  const optionalItems  = estimate.items.filter(i => i.isOptional);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/${orgSlug}/accounts-receivable/estimates`}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{estimate.estimateNumber}</h1>
              {estimate.versionNumber > 1 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 rounded-full">
                  v{estimate.versionNumber}
                </span>
              )}
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${cfg.bg} ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {custName(estimate.customer)} &middot; Created {new Date(estimate.estimateDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {estimate.status === 'DRAFT' && (
            <button onClick={() => doStatus('SENT')} disabled={!!busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition">
              <Send className="w-4 h-4" /> Send
            </button>
          )}
          {estimate.status === 'SENT' && (<>
            <button onClick={() => doStatus('ACCEPTED')} disabled={!!busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition">
              <CheckCircle className="w-4 h-4" /> Accept
            </button>
            <button onClick={() => doStatus('DECLINED')} disabled={!!busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 rounded-lg transition">
              <XCircle className="w-4 h-4" /> Decline
            </button>
          </>)}
          {estimate.status === 'ACCEPTED' && !estimate.convertedInvoiceId && (
            <button onClick={doConvert} disabled={!!busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition">
              <TrendingUp className="w-4 h-4" />
              {busy === 'convert' ? 'Converting…' : 'Convert to Invoice'}
            </button>
          )}
          {estimate.convertedInvoiceId && (
            <Link href={`/${orgSlug}/accounts-receivable/invoices/${estimate.convertedInvoiceId}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition">
              <ExternalLink className="w-4 h-4" /> View Invoice
            </Link>
          )}
          <button onClick={doClone} disabled={!!busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 transition">
            <Copy className="w-4 h-4" /> Clone / New Version
          </button>
          {estimate.status !== 'INVOICED' && (
            <button onClick={doDelete} disabled={!!busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Expiry warning */}
      {['DRAFT','SENT'].includes(estimate.status) && days >= 0 && days <= 3 && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700 rounded-xl text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          This estimate expires in <strong>{days} day(s)</strong> on {new Date(estimate.expirationDate).toLocaleDateString()}. Follow up with the customer.
        </div>
      )}
      {['DRAFT','SENT'].includes(estimate.status) && days < 0 && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <Clock className="w-4 h-4 flex-shrink-0" />
          This estimate <strong>expired</strong> on {new Date(estimate.expirationDate).toLocaleDateString()}.
          Clone it to create a new version with updated prices.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Customer info */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-4">Customer</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-lg">{custName(estimate.customer)}</p>
                {estimate.customer.email && <p className="text-gray-600 dark:text-slate-400">{estimate.customer.email}</p>}
                {estimate.customer.phone && <p className="text-gray-600 dark:text-slate-400">{estimate.customer.phone}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Billing Address</p>
                {estimate.customer.billingAddress ? (
                  <div className="text-gray-600 dark:text-slate-400">
                    {Object.values(estimate.customer.billingAddress).filter(Boolean).join(', ')}
                  </div>
                ) : <p className="text-gray-400 text-xs italic">Not set</p>}
              </div>
              {estimate.reference && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Reference / RFQ #</p>
                  <p className="font-medium text-gray-900 dark:text-white">{estimate.reference}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 mb-1">Validity Period</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(estimate.estimateDate).toLocaleDateString()} — {new Date(estimate.expirationDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Mandatory Line Items */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-4">Line Items</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left pb-2 text-xs text-gray-400 font-medium">Description</th>
                  <th className="text-right pb-2 text-xs text-gray-400 font-medium">Qty</th>
                  <th className="text-right pb-2 text-xs text-gray-400 font-medium">Unit Price</th>
                  <th className="text-right pb-2 text-xs text-gray-400 font-medium">Disc %</th>
                  <th className="text-right pb-2 text-xs text-gray-400 font-medium">Tax</th>
                  <th className="text-right pb-2 text-xs text-gray-400 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                {mandatoryItems.map(item => (
                  <tr key={item.id}>
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-gray-900 dark:text-white">{item.description}</p>
                      {item.product && <p className="text-xs text-gray-400">{item.product.name} · {item.product.sku}</p>}
                      {item.notes && <p className="text-xs text-gray-400 italic mt-0.5">{item.notes}</p>}
                    </td>
                    <td className="py-2.5 text-right text-gray-600 dark:text-slate-400">{Number(item.quantity)}</td>
                    <td className="py-2.5 text-right text-gray-600 dark:text-slate-400">{formatCurrency(Number(item.unitPrice), estimate.currency)}</td>
                    <td className="py-2.5 text-right text-gray-600 dark:text-slate-400">{Number(item.discountPercent) || 0}%</td>
                    <td className="py-2.5 text-right text-gray-600 dark:text-slate-400">{Number(item.taxRate)}%</td>
                    <td className="py-2.5 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(Number(item.total), estimate.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Optional items */}
            {optionalItems.length > 0 && (
              <div className="mt-4 border-t-2 border-dashed border-amber-200 dark:border-amber-700 pt-4">
                <p className="text-xs font-semibold text-amber-600 mb-3 uppercase tracking-wider">Optional Items</p>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                    {optionalItems.map(item => (
                      <tr key={item.id} className="opacity-75">
                        <td className="py-2.5 pr-4">
                          <p className="font-medium text-gray-900 dark:text-white">{item.description}</p>
                          <p className="text-xs text-amber-600 mt-0.5">⚡ Optional — customer can choose to include this</p>
                        </td>
                        <td className="py-2.5 text-right text-gray-600 dark:text-slate-400">{Number(item.quantity)}</td>
                        <td className="py-2.5 text-right text-gray-600 dark:text-slate-400">{formatCurrency(Number(item.unitPrice), estimate.currency)}</td>
                        <td className="py-2.5 text-right text-gray-600 dark:text-slate-400">{Number(item.discountPercent) || 0}%</td>
                        <td className="py-2.5 text-right text-gray-600 dark:text-slate-400">{Number(item.taxRate)}%</td>
                        <td className="py-2.5 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(Number(item.total), estimate.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Terms */}
          {(estimate.terms || estimate.notes) && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
              {estimate.terms && (
                <div>
                  <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Terms & Conditions</h2>
                  <p className="text-sm text-gray-600 dark:text-slate-400 whitespace-pre-wrap">{estimate.terms}</p>
                </div>
              )}
              {estimate.notes && (
                <div>
                  <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Notes</h2>
                  <p className="text-sm text-gray-600 dark:text-slate-400 whitespace-pre-wrap">{estimate.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right summary column */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-4">Totals</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-slate-400">
                <span>Subtotal</span><span>{formatCurrency(Number(estimate.subtotal), estimate.currency)}</span>
              </div>
              {Number(estimate.discountAmount) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span><span>−{formatCurrency(Number(estimate.discountAmount), estimate.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 dark:text-slate-400">
                <span>Tax</span><span>{formatCurrency(Number(estimate.taxAmount), estimate.currency)}</span>
              </div>
              {Number(estimate.shippingAmount) > 0 && (
                <div className="flex justify-between text-gray-600 dark:text-slate-400">
                  <span>Shipping</span><span>{formatCurrency(Number(estimate.shippingAmount), estimate.currency)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-slate-600 pt-2 flex justify-between font-bold text-gray-900 dark:text-white text-base">
                <span>Total</span>
                <span className="text-blue-600">{formatCurrency(Number(estimate.total), estimate.currency)}</span>
              </div>
            </div>

            {/* Non-posting notice */}
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs text-green-700 dark:text-green-300">
              <strong>✅ Non-Posting</strong><br />
              This estimate has <strong>zero impact</strong> on your General Ledger or Balance Sheet.
              {estimate.convertedInvoiceId
                ? ' Already converted to an invoice.'
                : ' Convert to invoice to record revenue.'}
            </div>
          </div>

          {/* Workflow timeline */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-4">Workflow</h2>
            <div className="space-y-2 text-sm">
              {[
                { step: 'DRAFT',    label: 'Draft created',      done: true },
                { step: 'SENT',     label: 'Sent to customer',   done: ['SENT','ACCEPTED','DECLINED','INVOICED'].includes(estimate.status) },
                { step: 'ACCEPTED', label: 'Customer accepted',  done: ['ACCEPTED','INVOICED'].includes(estimate.status) },
                { step: 'INVOICED', label: 'Converted to invoice', done: estimate.status === 'INVOICED' },
              ].map(w => (
                <div key={w.step} className={`flex items-center gap-2 ${w.done ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-600'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${w.done ? 'bg-green-100 text-green-600' : 'bg-gray-100 dark:bg-slate-700 text-gray-400'}`}>
                    {w.done ? '✓' : w.step.charAt(0)}
                  </div>
                  {w.label}
                </div>
              ))}
              {estimate.status === 'DECLINED' && (
                <div className="flex items-center gap-2 text-red-600">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs bg-red-100">✗</div>
                  Customer declined
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
