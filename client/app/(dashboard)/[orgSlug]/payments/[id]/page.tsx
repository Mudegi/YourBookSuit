'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Smartphone,
  Printer,
  Ban,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';

// ──────────── Types ────────────

interface Account {
  id: string;
  code: string;
  name: string;
  accountType: string;
}

interface LedgerEntry {
  id: string;
  debit: number;
  credit: number;
  description: string;
  account: Account;
}

interface Transaction {
  id: string;
  transactionNumber: string;
  transactionDate: string;
  status: string;
  entries: LedgerEntry[];
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  customer: { id: string; name: string };
}

interface Bill {
  id: string;
  billNumber: string;
  totalAmount: number;
  vendor: { id: string; name: string };
}

interface Allocation {
  id: string;
  amount: number;
  invoice: Invoice | null;
  bill: Bill | null;
}

interface Payment {
  id: string;
  paymentNumber?: string;
  paymentType: string;
  paymentDate: string;
  amount: number;
  allocatedAmount?: number;
  status?: string;
  allocationStatus?: string;
  paymentMethod: string;
  mobileMoneyProvider?: string;
  mobileMoneyTxnId?: string;
  referenceNumber: string | null;
  notes: string | null;
  voidedAt?: string;
  voidReason?: string;
  customer: { id: string; name: string } | null;
  vendor: { id: string; name: string } | null;
  bankAccount: Account;
  transaction: Transaction;
  allocations: Allocation[];
  createdBy?: { id: string; name: string; email: string };
}

// ──────────── Helpers ────────────

const PAYMENT_METHODS: Record<string, string> = {
  CASH: 'Cash',
  CHECK: 'Check',
  BANK_TRANSFER: 'Bank Transfer',
  CREDIT_CARD: 'Credit Card',
  DEBIT_CARD: 'Debit Card',
  MOBILE_MONEY: 'Mobile Money',
  ONLINE_PAYMENT: 'Online Payment',
  OTHER: 'Other',
  // Legacy
  CARD: 'Credit/Debit Card',
  ACH: 'ACH Transfer',
  WIRE: 'Wire Transfer',
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  POSTED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  CLEARED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  VOIDED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const ALLOCATION_STYLES: Record<string, string> = {
  FULLY_APPLIED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  PARTIALLY_APPLIED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  UNAPPLIED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

// ──────────── Component ────────────

export default function PaymentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const paymentId = params.id as string;
  const { currency } = useOrganization();

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchPayment(); }, [paymentId]);

  async function fetchPayment() {
    try {
      setLoading(true);
      const response = await fetch(`/api/orgs/${orgSlug}/payments/${paymentId}`);
      if (!response.ok) throw new Error('Failed to fetch payment');
      const data = await response.json();
      setPayment(data);
    } catch (err) {
      setError('Failed to load payment details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVoid() {
    if (!voidReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/payments/${paymentId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to void payment');
      }
      setVoidDialogOpen(false);
      setVoidReason('');
      fetchPayment();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAutoAllocate() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/payments/${paymentId}/auto-allocate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to auto-allocate');
      }
      fetchPayment();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !payment) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-lg">
          {error}
        </div>
        <Link href={`/${orgSlug}/payments`} className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Payments
        </Link>
      </div>
    );
  }

  if (!payment) return null;

  const isReceipt = payment.paymentType === 'RECEIPT' || payment.paymentType === 'CUSTOMER_PAYMENT';
  const isVoided = payment.status === 'VOIDED';
  const status = payment.status || 'POSTED';
  const allocationStatus = payment.allocationStatus || 'UNAPPLIED';
  const totalAllocated = payment.allocations.reduce((sum, a) => sum + Number(a.amount), 0);
  const unappliedAmount = Number(payment.amount) - totalAllocated;
  const canVoid = !isVoided && status !== 'CLEARED';
  const canAutoAllocate = !isVoided && allocationStatus !== 'FULLY_APPLIED';

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 print:hidden">
        <div>
          <Link href={`/${orgSlug}/payments`} className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Payments
          </Link>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isReceipt ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-blue-100 dark:bg-blue-900/40'}`}>
              {isReceipt
                ? <ArrowDownLeft className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                : <ArrowUpRight className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isReceipt ? 'Customer Receipt' : 'Vendor Payment'}
                {payment.paymentNumber && <span className="ml-2 text-gray-500 dark:text-gray-400 font-mono text-lg">#{payment.paymentNumber}</span>}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isReceipt ? 'Money In' : 'Money Out'} • {new Date(payment.paymentDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canAutoAllocate && (
            <button
              onClick={handleAutoAllocate}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/60 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Zap className="w-4 h-4" /> Auto-Allocate
            </button>
          )}
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors">
            <Printer className="w-4 h-4" /> Print
          </button>
          {canVoid && (
            <button
              onClick={() => setVoidDialogOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 text-sm font-medium transition-colors"
            >
              <Ban className="w-4 h-4" /> Void
            </button>
          )}
        </div>
      </div>

      {/* Void Confirmation Dialog */}
      {voidDialogOpen && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
            <Ban className="w-5 h-5" /> Void This Payment?
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">
            This will reverse the GL posting, remove all allocations, and revert
            {isReceipt ? ' invoice' : ' bill'} statuses. This action cannot be undone.
          </p>
          <textarea
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder="Reason for voiding (required)..."
            className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm mb-3"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleVoid}
              disabled={actionLoading || !voidReason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {actionLoading ? 'Voiding...' : 'Confirm Void'}
            </button>
            <button
              onClick={() => { setVoidDialogOpen(false); setVoidReason(''); }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Voided Banner */}
      {isVoided && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">This payment has been voided</p>
            {payment.voidReason && <p className="text-sm text-red-600 dark:text-red-400 mt-1">Reason: {payment.voidReason}</p>}
            {payment.voidedAt && <p className="text-xs text-red-500 dark:text-red-500 mt-1">Voided on {new Date(payment.voidedAt).toLocaleDateString()}</p>}
          </div>
        </div>
      )}

      {/* Status & Allocation Badges */}
      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[status] || STATUS_STYLES.DRAFT}`}>
          {status === 'POSTED' && <CheckCircle2 className="w-3.5 h-3.5" />}
          {status === 'DRAFT' && <Clock className="w-3.5 h-3.5" />}
          {status === 'VOIDED' && <XCircle className="w-3.5 h-3.5" />}
          {status === 'CLEARED' && <CheckCircle2 className="w-3.5 h-3.5" />}
          {status}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${ALLOCATION_STYLES[allocationStatus] || ALLOCATION_STYLES.UNAPPLIED}`}>
          {allocationStatus.replace('_', ' ')}
        </span>
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${isReceipt ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
          {isReceipt ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
          {isReceipt ? 'Receipt' : 'Payment'}
        </span>
      </div>

      {/* Payment Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Party */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              {isReceipt ? 'Received From' : 'Paid To'}
            </p>
            <p className="font-semibold text-lg text-gray-900 dark:text-white">
              {payment.customer ? (
                <Link href={`/${orgSlug}/accounts-receivable/customers/${payment.customer.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  {payment.customer.name}
                </Link>
              ) : payment.vendor ? (
                <Link href={`/${orgSlug}/accounts-payable/vendors/${payment.vendor.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  {payment.vendor.name}
                </Link>
              ) : '—'}
            </p>
          </div>

          {/* Amount */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Amount</p>
            <p className={`font-bold text-2xl font-mono ${isVoided ? 'line-through text-gray-400 dark:text-gray-500' : isReceipt ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {formatCurrency(payment.amount, currency)}
            </p>
          </div>

          {/* Applied */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Applied / Unapplied</p>
            <p className="text-lg text-gray-900 dark:text-white font-mono">
              {formatCurrency(totalAllocated, currency)}
              {unappliedAmount > 0.01 && (
                <span className="text-amber-600 dark:text-amber-400 text-sm ml-2">
                  ({formatCurrency(unappliedAmount, currency)} unapplied)
                </span>
              )}
            </p>
          </div>

          {/* Date */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Payment Date</p>
            <p className="font-medium text-gray-900 dark:text-white">{new Date(payment.paymentDate).toLocaleDateString()}</p>
          </div>

          {/* Payment Method */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Payment Method</p>
            <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
              {payment.paymentMethod === 'MOBILE_MONEY' && <Smartphone className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />}
              {PAYMENT_METHODS[payment.paymentMethod] || payment.paymentMethod}
            </p>
          </div>

          {/* Bank Account */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              {isReceipt ? 'Deposited To' : 'Paid From'}
            </p>
            <p className="font-medium text-gray-900 dark:text-white">
              <Link href={`/${orgSlug}/general-ledger/chart-of-accounts/${payment.bankAccount.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                {payment.bankAccount.code} - {payment.bankAccount.name}
              </Link>
            </p>
          </div>

          {/* Mobile Money Provider */}
          {payment.mobileMoneyProvider && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Mobile Network</p>
              <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                {payment.mobileMoneyProvider}
              </p>
            </div>
          )}

          {/* Mobile Money Txn ID */}
          {payment.mobileMoneyTxnId && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Mobile Money Txn ID</p>
              <p className="font-medium text-gray-900 dark:text-white font-mono">{payment.mobileMoneyTxnId}</p>
            </div>
          )}

          {/* Reference Number */}
          {payment.referenceNumber && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Reference Number</p>
              <p className="font-medium text-gray-900 dark:text-white font-mono">{payment.referenceNumber}</p>
            </div>
          )}

          {/* Created By */}
          {payment.createdBy && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Recorded By</p>
              <p className="font-medium text-gray-900 dark:text-white">{payment.createdBy.name}</p>
            </div>
          )}
        </div>

        {/* Notes */}
        {payment.notes && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{payment.notes}</p>
          </div>
        )}
      </div>

      {/* Allocations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Applied to {isReceipt ? 'Invoices' : 'Bills'}
        </h2>

        {payment.allocations.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No allocations — this is a prepayment / advance.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    {isReceipt ? 'Invoice #' : 'Bill #'}
                  </th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    {isReceipt ? 'Customer' : 'Vendor'}
                  </th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {payment.allocations.map((allocation) => {
                  const doc = allocation.invoice || allocation.bill;
                  const docNumber = allocation.invoice
                    ? allocation.invoice.invoiceNumber
                    : allocation.bill?.billNumber;
                  const party = allocation.invoice
                    ? allocation.invoice.customer
                    : allocation.bill?.vendor;

                  return (
                    <tr key={allocation.id}>
                      <td className="py-3">
                        <Link
                          href={
                            allocation.invoice
                              ? `/${orgSlug}/accounts-receivable/invoices/${allocation.invoice.id}`
                              : `/${orgSlug}/accounts-payable/bills/${allocation.bill?.id}`
                          }
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium font-mono"
                        >
                          {docNumber}
                        </Link>
                      </td>
                      <td className="py-3 text-gray-700 dark:text-gray-300">{party?.name}</td>
                      <td className="py-3 text-right text-gray-500 dark:text-gray-400 font-mono">
                        {doc ? formatCurrency(doc.totalAmount, currency) : '—'}
                      </td>
                      <td className="py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(allocation.amount, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-bold">
                  <td colSpan={3} className="py-3 text-right text-gray-700 dark:text-gray-300">Total Applied:</td>
                  <td className="py-3 text-right text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatCurrency(totalAllocated, currency)}
                  </td>
                </tr>
                {unappliedAmount > 0.01 && (
                  <tr className="font-medium">
                    <td colSpan={3} className="py-2 text-right text-amber-600 dark:text-amber-400">Unapplied:</td>
                    <td className="py-2 text-right text-amber-600 dark:text-amber-400 font-mono">
                      {formatCurrency(unappliedAmount, currency)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* GL Posting Details */}
      {payment.transaction && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 print:hidden">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">General Ledger Posting</h2>

          <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
            <span className="text-gray-500 dark:text-gray-400">Transaction:</span>
            <Link
              href={`/${orgSlug}/general-ledger/journal-entries/list?transactionId=${payment.transaction.id}`}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium font-mono"
            >
              {payment.transaction.transactionNumber}
            </Link>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-gray-500 dark:text-gray-400">
              {new Date(payment.transaction.transactionDate).toLocaleDateString()}
            </span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
              payment.transaction.status === 'POSTED'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : payment.transaction.status === 'VOIDED'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {payment.transaction.status}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Account</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Debit</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {payment.transaction.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-2">
                      <Link
                        href={`/${orgSlug}/general-ledger/chart-of-accounts/${entry.account.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                      >
                        {entry.account.code} - {entry.account.name}
                      </Link>
                    </td>
                    <td className="py-2 text-gray-500 dark:text-gray-400">{entry.description}</td>
                    <td className="py-2 text-right text-emerald-600 dark:text-emerald-400 font-mono">
                      {entry.debit > 0 ? formatCurrency(entry.debit, currency) : '—'}
                    </td>
                    <td className="py-2 text-right text-red-500 dark:text-red-400 font-mono">
                      {entry.credit > 0 ? formatCurrency(entry.credit, currency) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-semibold">
                  <td colSpan={2} className="py-2 text-gray-700 dark:text-gray-300">Total</td>
                  <td className="py-2 text-right text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatCurrency(payment.transaction.entries.reduce((sum, e) => sum + e.debit, 0), currency)}
                  </td>
                  <td className="py-2 text-right text-red-500 dark:text-red-400 font-mono">
                    {formatCurrency(payment.transaction.entries.reduce((sum, e) => sum + e.credit, 0), currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
