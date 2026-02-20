'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle, XCircle, DollarSign, FileText, Clock,
  Package, Calendar, User, Hash, AlertTriangle, Upload, Shield, Loader2,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/utils';
import { CreditNoteApplicationModal } from '@/components/accounting/CreditNoteApplicationModal';

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
  DRAFT:             { bg: 'bg-gray-100',   text: 'text-gray-700',   icon: FileText },
  PENDING_APPROVAL:  { bg: 'bg-amber-50',   text: 'text-amber-700',  icon: Clock },
  APPROVED:          { bg: 'bg-emerald-50',  text: 'text-emerald-700', icon: CheckCircle },
  APPLIED:           { bg: 'bg-blue-50',     text: 'text-blue-700',   icon: DollarSign },
  PARTIALLY_APPLIED: { bg: 'bg-cyan-50',     text: 'text-cyan-700',   icon: DollarSign },
  VOID:              { bg: 'bg-red-50',      text: 'text-red-700',    icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.DRAFT;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full ${s.bg} ${s.text}`}>
      <Icon className="w-3.5 h-3.5" />
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export default function CreditNoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const id = params.id as string;
  const { organization, currency } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<any>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [efrisEnabled, setEfrisEnabled] = useState(false);
  const [efrisSubmitting, setEfrisSubmitting] = useState(false);
  const [efrisResult, setEfrisResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchNote();
    checkEfris();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const checkEfris = async () => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/settings/efris`);
      const data = await res.json();
      setEfrisEnabled(data.success && data.config?.isActive);
    } catch {
      setEfrisEnabled(false);
    }
  };

  const fetchNote = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orgs/${orgSlug}/credit-notes/${id}`);
      const data = await res.json();
      if (data.success) setNote(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const approve = async () => {
    if (!confirm('Approve this credit note?')) return;
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/credit-notes/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalNotes: '', autoPost: true }),
      });
      const data = await res.json();
      if (data.success) fetchNote();
      else alert('Error: ' + data.error);
    } catch (e) {
      console.error(e);
    }
  };

  const submitToEfris = async () => {
    if (!confirm('Submit this credit note to EFRIS? This cannot be undone.')) return;
    try {
      setEfrisSubmitting(true);
      setEfrisResult(null);
      const res = await fetch(`/api/orgs/${orgSlug}/credit-notes/${id}/efris`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        const ref = data.referenceNo || data.fdn || '';
        setEfrisResult({ type: 'success', message: ref ? `Submitted to EFRIS — Reference: ${ref}` : 'Credit note submitted to EFRIS successfully' });
        fetchNote();
      } else {
        setEfrisResult({ type: 'error', message: data.error || 'EFRIS submission failed' });
      }
    } catch (e: any) {
      setEfrisResult({ type: 'error', message: e.message || 'Network error' });
    } finally {
      setEfrisSubmitting(false);
    }
  };

  const fmt = (n: number | string) =>
    formatCurrency(typeof n === 'string' ? parseFloat(n) : n, currency);

  // ── Loading / Not found states ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/80 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading credit note...</div>
      </div>
    );
  }
  if (!note) {
    return (
      <div className="min-h-screen bg-gray-50/80 flex flex-col items-center justify-center gap-3">
        <AlertTriangle className="w-8 h-8 text-gray-300" />
        <p className="text-gray-500">Credit note not found</p>
        <Link
          href={`/${orgSlug}/credit-notes`}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Back to Credit Notes
        </Link>
      </div>
    );
  }

  const customerName =
    note.customer?.companyName ||
    `${note.customer?.firstName || ''} ${note.customer?.lastName || ''}`.trim() ||
    'Unknown Customer';

  const canApply =
    ['APPROVED', 'PARTIALLY_APPLIED'].includes(note.status) &&
    parseFloat(note.remainingAmount) > 0;

  const canSubmitEfris =
    efrisEnabled &&
    note.status === 'APPROVED' &&
    !note.efrisFDN;

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href={`/${orgSlug}/credit-notes`}
                className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  {note.creditNoteNumber}
                </h1>
                <p className="text-xs text-gray-500">{customerName}</p>
              </div>
              <StatusBadge status={note.status} />
            </div>
            <div className="flex items-center gap-2">
              {note.status === 'DRAFT' && (
                <button
                  onClick={approve}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve &amp; Post
                </button>
              )}
              {canSubmitEfris && (
                <button
                  onClick={submitToEfris}
                  disabled={efrisSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                >
                  {efrisSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {efrisSubmitting ? 'Submitting...' : 'Submit to EFRIS'}
                </button>
              )}
              {canApply && (
                <button
                  onClick={() => setShowApplicationModal(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4" />
                  Apply to Invoice
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">
        {/* ── EFRIS Submission Result Banner ── */}
        {efrisResult && (
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
              efrisResult.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {efrisResult.type === 'success' ? (
              <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            )}
            <p className="flex-1 font-medium">{efrisResult.message}</p>
            <button
              onClick={() => setEfrisResult(null)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── EFRIS Submitted Badge ── */}
        {note.efrisFDN && (
          <div className="flex items-center gap-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl">
            <Shield className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-purple-700">EFRIS Submitted</span>
              <span className="mx-2 text-purple-300">|</span>
              <span className="text-purple-600">Ref: </span>
              <span className="font-mono text-purple-800">{note.efrisFDN}</span>
              {note.efrisVerificationCode && (
                <>
                  <span className="mx-2 text-purple-300">|</span>
                  <span className="text-purple-600">Code: </span>
                  <span className="font-mono text-purple-800">{note.efrisVerificationCode}</span>
                </>
              )}
            </div>
          </div>
        )}
        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Total Amount
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">
              {fmt(note.totalAmount)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Applied
            </p>
            <p className="text-xl font-bold text-emerald-600 mt-1 tabular-nums">
              {fmt(note.appliedAmount)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Remaining
            </p>
            <p className="text-xl font-bold text-blue-600 mt-1 tabular-nums">
              {fmt(note.remainingAmount)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Reason
            </p>
            <p className="text-sm font-medium text-gray-700 mt-1.5">
              {(note.reason || '').replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        {/* ── Details Card ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Details
            </h3>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-medium">Credit Date</p>
                <p className="text-gray-900">
                  {new Date(note.creditDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-medium">Customer</p>
                <p className="text-gray-900">{customerName}</p>
                <p className="text-xs text-gray-400">{note.customer?.customerNumber}</p>
              </div>
            </div>
            {note.invoice && (
              <div className="flex items-start gap-2">
                <Hash className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Linked Invoice</p>
                  <Link
                    href={`/${orgSlug}/accounts-receivable/invoices/${note.invoice.id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {note.invoice.invoiceNumber}
                  </Link>
                </div>
              </div>
            )}
            {note.description && (
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Description</p>
                  <p className="text-gray-900">{note.description}</p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Line Items ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Line Items
            </h3>
          </div>
          {note.lineItems?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th className="pl-5 pr-2 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-10">
                      #
                    </th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider w-20">
                      Qty
                    </th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider w-32">
                      Unit Price
                    </th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider w-20">
                      Tax %
                    </th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider w-28">
                      Tax
                    </th>
                    <th className="pr-5 pl-3 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider w-36">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {note.lineItems.map((item: any, idx: number) => (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="pl-5 pr-2 py-3 text-center text-xs text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-gray-900">{item.description}</p>
                        {item.product && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {item.product.sku || item.product.name}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                        {parseFloat(item.quantity)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                        {fmt(item.unitPrice)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-500">
                        {parseFloat(item.taxRate)}%
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-500">
                        {fmt(item.taxAmount)}
                      </td>
                      <td className="pr-5 pl-3 py-3 text-right tabular-nums font-semibold text-gray-900">
                        {fmt(item.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                    <td colSpan={5}></td>
                    <td className="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                      Subtotal
                    </td>
                    <td className="pr-5 pl-3 py-3 text-right tabular-nums font-semibold text-gray-900">
                      {fmt(note.subtotal || note.taxAmount ? (parseFloat(note.totalAmount) - parseFloat(note.taxAmount || 0)) : note.totalAmount)}
                    </td>
                  </tr>
                  {parseFloat(note.taxAmount || 0) > 0 && (
                    <tr className="bg-gray-50/50">
                      <td colSpan={5}></td>
                      <td className="px-3 py-2 text-right text-xs font-bold text-gray-500 uppercase">
                        Tax
                      </td>
                      <td className="pr-5 pl-3 py-2 text-right tabular-nums font-semibold text-gray-700">
                        {fmt(note.taxAmount)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-gray-50/50 border-t border-gray-200">
                    <td colSpan={5}></td>
                    <td className="px-3 py-3 text-right text-xs font-bold text-gray-900 uppercase">
                      Total
                    </td>
                    <td className="pr-5 pl-3 py-3 text-right tabular-nums text-lg font-bold text-red-600">
                      {fmt(note.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-sm text-gray-400">
              No line items
            </div>
          )}
        </div>

        {/* ── Applications History ── */}
        {note.applications?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Applications
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th className="pl-5 px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Amount Applied
                    </th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="pr-5 px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {note.applications.map((app: any) => (
                    <tr key={app.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="pl-5 px-3 py-3">
                        {app.invoice ? (
                          <Link
                            href={`/${orgSlug}/accounts-receivable/invoices/${app.invoice.id || app.invoiceId}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {app.invoice.invoiceNumber}
                          </Link>
                        ) : (
                          <span className="text-gray-400">{app.invoiceId}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-gray-900">
                        {fmt(app.amount)}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {new Date(app.appliedDate).toLocaleDateString()}
                      </td>
                      <td className="pr-5 px-3 py-3 text-gray-500 text-xs">
                        {app.notes || '\u2014'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Internal Notes ── */}
        {note.internalNotes && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Internal Notes
              </h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {note.internalNotes}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Application Modal ── */}
      {showApplicationModal && note && (
        <CreditNoteApplicationModal
          open={showApplicationModal}
          onClose={() => setShowApplicationModal(false)}
          creditNote={{
            id: note.id,
            creditNoteNumber: note.creditNoteNumber,
            customerId: note.customerId,
            totalAmount: parseFloat(note.totalAmount),
            appliedAmount: parseFloat(note.appliedAmount),
            remainingAmount: parseFloat(note.remainingAmount),
            currency: currency || 'USD',
            lineItems: (note.lineItems || []).map((li: any) => ({
              id: li.id,
              productId: li.productId,
              description: li.description,
              quantity: parseFloat(li.quantity),
            })),
          }}
          orgSlug={orgSlug}
          onSuccess={() => {
            fetchNote();
            setShowApplicationModal(false);
          }}
        />
      )}
    </div>
  );
}
