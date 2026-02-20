'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Download, Mail, Printer, CheckCircle,
  Building2, Phone, DollarSign, Send, FileText,
  Calendar, Hash, User, CreditCard, BookOpen,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/utils';
import { EfrisStatusBadge, EfrisStatusDetails } from '@/components/efris/EfrisStatus';
import { toast } from 'sonner';

interface PaymentAllocation {
  id: string;
  amount: number;
  payment: {
    id: string;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber: string | null;
  };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  notes: string | null;
  terms: string | null;
  reference?: string | null;
  taxCalculationMethod: string;
  efrisFDN: string | null;
  efrisVerificationCode: string | null;
  efrisQRCode: string | null;
  eInvoiceStatus: string | null;
  eInvoiceSubmittedAt: string | null;
  transaction?: {
    transactionDate: string;
    reference: string;
    ledgerEntries: Array<{
      id: string;
      amount: number;
      entryType: string;
      account: { code: string; name: string };
    }>;
  } | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    billingAddress: any;
  };
  items: {
    id: string;
    sortOrder: number;
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    taxLines?: any[];
    product?: { id: string; name: string; sku: string };
  }[];
  payments?: PaymentAllocation[];
  Branch?: any;
  createdAt: string;
}

const STATUS_STYLES: Record<string, { pill: string; label: string }> = {
  DRAFT:    { pill: 'bg-gray-100 text-gray-600 ring-gray-200',   label: 'Draft'    },
  SENT:     { pill: 'bg-blue-100 text-blue-700 ring-blue-200',   label: 'Sent'     },
  ISSUED:   { pill: 'bg-blue-100 text-blue-700 ring-blue-200',   label: 'Issued'   },
  PARTIAL:  { pill: 'bg-amber-100 text-amber-700 ring-amber-200',label: 'Partial'  },
  PAID:     { pill: 'bg-green-100 text-green-700 ring-green-200',label: 'Paid'     },
  OVERDUE:  { pill: 'bg-red-100 text-red-700 ring-red-200',      label: 'Overdue'  },
  VOID:     { pill: 'bg-gray-100 text-gray-400 ring-gray-200',   label: 'Void'     },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function InvoiceDetailsPage() {
  const params   = useParams();
  const router   = useRouter();
  const orgSlug  = params.orgSlug as string;
  const invoiceId = params.id as string;

  const [invoice, setInvoice]                     = useState<Invoice | null>(null);
  const [loading, setLoading]                     = useState(true);
  const [updating, setUpdating]                   = useState(false);
  const [submittingToEfris, setSubmittingToEfris] = useState(false);
  const { currency } = useOrganization();

  useEffect(() => { fetchInvoice(); }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      const res  = await fetch(`/api/orgs/${orgSlug}/invoices/${invoiceId}`);
      const data = await res.json();
      if (data.success) setInvoice(data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!confirm(`Mark this invoice as ${newStatus}?`)) return;
    setUpdating(true);
    try {
      const res  = await fetch(`/api/orgs/${orgSlug}/invoices/${invoiceId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) fetchInvoice();
      else alert(data.error || 'Failed to update invoice');
    } catch { alert('Failed to update invoice'); }
    finally { setUpdating(false); }
  };

  const handleSubmitToEfris = async () => {
    if (!confirm('Submit this invoice to EFRIS for fiscalization?')) return;
    setSubmittingToEfris(true);
    const tid = toast.loading('Submitting invoice to EFRIS...');
    try {
      const res  = await fetch(`/api/orgs/${orgSlug}/invoices/${invoiceId}/efris`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Invoice fiscalized! FDN: ${data.fdn}`, { id: tid, duration: 8000 });
        fetchInvoice();
      } else {
        toast.error(`EFRIS failed: ${data.error || 'Unknown error'}`, { id: tid, duration: 10000 });
      }
    } catch (e: any) {
      toast.error(e.name === 'AbortError' ? 'EFRIS request timed out' : 'Failed to submit to EFRIS', { id: tid });
    } finally { setSubmittingToEfris(false); }
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-3 text-sm text-gray-500">Loading invoice…</p>
      </div>
    </div>
  );

  if (!invoice) return (
    <div className="text-center py-12">
      <p className="text-gray-500">Invoice not found.</p>
      <Link href={`/${orgSlug}/accounts-receivable/invoices`} className="mt-4 inline-block text-blue-600 hover:underline">
        ← Back to Invoices
      </Link>
    </div>
  );

  const st = STATUS_STYLES[invoice.status] ?? STATUS_STYLES.DRAFT;
  const totalPaid = (invoice.payments ?? []).reduce((s, p) => s + p.amount, 0);
  const balance   = invoice.total - totalPaid;
  const isOverdue = invoice.status !== 'PAID' && new Date(invoice.dueDate) < new Date();
  const customerName = invoice.customer.companyName ||
    `${invoice.customer.firstName ?? ''} ${invoice.customer.lastName ?? ''}`.trim();

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* ── Top navigation bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href={`/${orgSlug}/accounts-receivable/invoices`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="h-4 w-4" /> All Invoices
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* Utility buttons */}
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Printer className="h-4 w-4" /> Print
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" /> PDF
          </button>
          {invoice.customer.email && (
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Mail className="h-4 w-4" /> Email
            </button>
          )}

          {/* Action buttons */}
          {invoice.status === 'DRAFT' && (
            <button onClick={() => handleStatusUpdate('SENT')} disabled={updating}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <Send className="h-4 w-4" /> Mark as Sent
            </button>
          )}
          {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && (
            <>
              <Link href={`/${orgSlug}/payments/customer?customerId=${invoice.customer.id}&invoiceId=${invoice.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                <DollarSign className="h-4 w-4" /> Record Payment
              </Link>
              <button onClick={() => handleStatusUpdate('PAID')} disabled={updating}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                <CheckCircle className="h-4 w-4" /> Mark as Paid
              </button>
            </>
          )}
          {!invoice.efrisFDN && invoice.status !== 'DRAFT' && (
            <button onClick={handleSubmitToEfris} disabled={submittingToEfris}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
              <Send className="h-4 w-4" />
              {submittingToEfris ? 'Submitting…' : 'Submit to EFRIS'}
            </button>
          )}
        </div>
      </div>

      {/* ── EFRIS status strip ── */}
      {invoice.eInvoiceStatus && (
        <EfrisStatusDetails
          status={invoice.eInvoiceStatus}
          fdn={invoice.efrisFDN}
          verificationCode={invoice.efrisVerificationCode}
          submittedAt={invoice.eInvoiceSubmittedAt}
        />
      )}

      {/* ── Amount summary cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Invoice Total',  value: invoice.total,  color: 'text-gray-900' },
          { label: 'Amount Paid',    value: totalPaid,      color: 'text-green-600' },
          { label: 'Balance Due',    value: balance,        color: balance > 0 ? (isOverdue ? 'text-red-600' : 'text-amber-600') : 'text-green-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-5 py-4 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{formatCurrency(value, currency)}</p>
          </div>
        ))}
      </div>

      {/* ── Main invoice document ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Document header band */}
        <div className="bg-gray-900 px-8 py-6 flex items-start justify-between gap-6">
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">Invoice</p>
            <p className="text-white text-3xl font-bold tracking-tight">{invoice.invoiceNumber}</p>
            {invoice.reference && (
              <p className="text-gray-400 text-sm mt-1">Ref: {invoice.reference}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ring-1 ${st.pill}`}>
              {st.label}
            </span>
            {invoice.eInvoiceStatus && (
              <EfrisStatusBadge status={invoice.eInvoiceStatus} />
            )}
          </div>
        </div>

        <div className="px-8 py-7 space-y-8">

          {/* From / Bill To / Dates row */}
          <div className="grid grid-cols-3 gap-8 pb-7 border-b border-gray-100">

            {/* From */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">From</p>
              <p className="font-bold text-gray-900 text-sm">YourBooks</p>
              <p className="text-gray-500 text-sm">Professional Accounting</p>
              <p className="text-gray-400 text-xs mt-1">support@yourbooks.com</p>
            </div>

            {/* Bill To */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Bill To</p>
              <Link href={`/${orgSlug}/accounts-receivable/customers/${invoice.customer.id}`}
                className="font-bold text-gray-900 text-sm hover:text-blue-600 transition-colors">
                {customerName}
              </Link>
              {invoice.customer.companyName && invoice.customer.firstName && (
                <div className="flex items-center gap-1 text-gray-500 text-sm mt-0.5">
                  <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                  {invoice.customer.companyName}
                </div>
              )}
              {invoice.customer.email && (
                <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                  <Mail className="h-3 w-3 flex-shrink-0" /> {invoice.customer.email}
                </div>
              )}
              {invoice.customer.phone && (
                <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                  <Phone className="h-3 w-3 flex-shrink-0" /> {invoice.customer.phone}
                </div>
              )}
              {invoice.customer.billingAddress && (
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                  {typeof invoice.customer.billingAddress === 'string'
                    ? invoice.customer.billingAddress
                    : Object.values(invoice.customer.billingAddress as Record<string, string>).filter(Boolean).join(', ')}
                </p>
              )}
            </div>

            {/* Dates */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Details</p>
              {[
                { icon: Calendar, label: 'Invoice Date', value: fmt(invoice.invoiceDate) },
                { icon: Calendar, label: 'Due Date',     value: fmt(invoice.dueDate), highlight: isOverdue && invoice.status !== 'PAID' },
                { icon: Hash,     label: 'Invoice #',    value: invoice.invoiceNumber },
              ].map(({ icon: Icon, label, value, highlight }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </div>
                  <span className={`text-xs font-semibold ${highlight ? 'text-red-600' : 'text-gray-700'}`}>{value}</span>
                </div>
              ))}
              {invoice.Branch?.name && (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Building2 className="h-3.5 w-3.5" /> Branch
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{invoice.Branch.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Line items table */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Items</p>
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500">Description</th>
                  <th className="text-right pb-2 text-xs font-semibold text-gray-500 w-16 pl-8">Qty</th>
                  <th className="text-right pb-2 text-xs font-semibold text-gray-500 w-36 pl-8">Unit Price</th>
                  <th className="text-right pb-2 text-xs font-semibold text-gray-500 w-20 pl-8">Tax %</th>
                  <th className="text-right pb-2 text-xs font-semibold text-gray-500 w-36 pl-8">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => {
                  const displayUnitPrice = invoice.taxCalculationMethod === 'INCLUSIVE'
                    ? item.unitPrice * (1 + item.taxRate / 100)
                    : item.unitPrice;
                  return (
                    <tr key={item.id} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="py-3 text-gray-800 pr-4">
                        <span className="font-medium">{item.description}</span>
                        {item.product?.sku && (
                          <span className="ml-2 text-xs text-gray-400 font-mono">{item.product.sku}</span>
                        )}
                      </td>
                      <td className="py-3 text-right text-gray-700 pl-8 tabular-nums">{item.quantity}</td>
                      <td className="py-3 text-right text-gray-700 pl-8 tabular-nums">
                        {formatCurrency(displayUnitPrice, currency)}
                        {invoice.taxCalculationMethod === 'INCLUSIVE' && (
                          <span className="block text-[10px] text-gray-400">incl. tax</span>
                        )}
                      </td>
                      <td className="py-3 text-right text-gray-500 pl-8 tabular-nums">{item.taxRate}%</td>
                      <td className="py-3 text-right font-semibold text-gray-900 pl-8 tabular-nums">
                        {formatCurrency(item.total, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals block */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-medium text-gray-700 tabular-nums">{formatCurrency(invoice.subtotal, currency)}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Discount</span>
                  <span className="font-medium text-red-500 tabular-nums">−{formatCurrency(invoice.discountAmount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>Tax</span>
                <span className="font-medium text-gray-700 tabular-nums">{formatCurrency(invoice.taxAmount, currency)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-3 mt-1">
                <span className="text-gray-900">Total</span>
                <span className="text-blue-600 tabular-nums">{formatCurrency(invoice.total, currency)}</span>
              </div>
              {totalPaid > 0 && (
                <>
                  <div className="flex justify-between text-gray-500">
                    <span>Amount Paid</span>
                    <span className="font-medium text-green-600 tabular-nums">−{formatCurrency(totalPaid, currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-gray-200 pt-2">
                    <span className={balance > 0 ? (isOverdue ? 'text-red-600' : 'text-amber-600') : 'text-green-600'}>Balance Due</span>
                    <span className={`tabular-nums ${balance > 0 ? (isOverdue ? 'text-red-600' : 'text-amber-600') : 'text-green-600'}`}>
                      {formatCurrency(balance, currency)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes / Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="grid grid-cols-2 gap-6 border-t border-gray-100 pt-6">
              {invoice.notes && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Notes</p>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Terms</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Document footer */}
        <div className="border-t border-gray-100 px-8 py-3 bg-gray-50 flex items-center justify-between text-xs text-gray-400">
          <span>Created {new Date(invoice.createdAt).toLocaleString()}</span>
          <span className="font-mono">{invoice.invoiceNumber}</span>
        </div>
      </div>

      {/* ── Payment history ── */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-800">Payment History</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Method</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Reference</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.payments.map((alloc) => (
                <tr key={alloc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-gray-700">{fmt(alloc.payment.paymentDate)}</td>
                  <td className="px-6 py-3 text-gray-700">{alloc.payment.paymentMethod}</td>
                  <td className="px-6 py-3 text-gray-500 font-mono text-xs">{alloc.payment.referenceNumber || '—'}</td>
                  <td className="px-6 py-3 text-right font-semibold text-green-600 tabular-nums">{formatCurrency(alloc.amount, currency)}</td>
                  <td className="px-6 py-3 text-right">
                    <Link href={`/${orgSlug}/payments/${alloc.payment.id}`}
                      className="text-xs text-blue-600 hover:underline">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── GL Posting ── */}
      {invoice.transaction && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-800">General Ledger Posting</h2>
            </div>
            <div className="text-xs text-gray-400 font-mono">{invoice.transaction.reference}</div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Account</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500">Debit</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.transaction.ledgerEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-gray-700">
                    <span className="font-mono text-xs text-gray-400 mr-2">{entry.account.code}</span>
                    {entry.account.name}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                    {entry.entryType === 'DEBIT' ? formatCurrency(entry.amount, currency) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                    {entry.entryType === 'CREDIT' ? formatCurrency(entry.amount, currency) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
