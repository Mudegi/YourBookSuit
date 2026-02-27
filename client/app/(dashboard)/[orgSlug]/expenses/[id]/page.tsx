'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Receipt,
  Wallet,
  User,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  XCircle,
  Printer,
  Download,
  RotateCcw,
  Hash,
  Building2,
  Smartphone,
  Paperclip,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';

// ──────────── Status Config ────────────
const statusConfig: Record<string, { label: string; colors: string; bgColors: string; icon: any }> = {
  DRAFT: {
    label: 'Draft',
    colors: 'text-yellow-800 dark:text-yellow-400',
    bgColors: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: Clock,
  },
  POSTED: {
    label: 'Posted',
    colors: 'text-green-800 dark:text-green-400',
    bgColors: 'bg-green-100 dark:bg-green-900/30',
    icon: CheckCircle2,
  },
  VOIDED: {
    label: 'Voided',
    colors: 'text-red-800 dark:text-red-400',
    bgColors: 'bg-red-100 dark:bg-red-900/30',
    icon: Ban,
  },
  CANCELLED: {
    label: 'Cancelled',
    colors: 'text-gray-800 dark:text-gray-300',
    bgColors: 'bg-gray-100 dark:bg-gray-700',
    icon: XCircle,
  },
};

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const expenseId = params?.id as string;
  const { organization } = useOrganization();
  const currency = organization?.baseCurrency || 'UGX';

  const [expense, setExpense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    loadExpense();
  }, [orgSlug, expenseId]);

  const loadExpense = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/expenses/${expenseId}`);
      if (!res.ok) throw new Error('Expense not found');
      const data = await res.json();
      if (data.success) {
        setExpense(data.expense);
      } else {
        setError(data.error || 'Failed to load expense');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load expense');
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!confirm('Are you sure you want to void this expense? This will create a reversing journal entry.')) return;
    setVoiding(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/expenses/${expenseId}/void`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await loadExpense();
      } else {
        alert(data.error || 'Failed to void expense');
      }
    } catch (e) {
      alert('Failed to void expense');
    } finally {
      setVoiding(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Loading expense...</p>
        </div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Expense Not Found</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error}</p>
        <button
          onClick={() => router.push(`/${orgSlug}/expenses`)}
          className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Expenses
        </button>
      </div>
    );
  }

  const meta = expense.metadata || {};
  const isVoided = expense.status === 'VOIDED' || expense.status === 'CANCELLED';
  const statusCfg = statusConfig[expense.status] || statusConfig.DRAFT;
  const StatusIcon = statusCfg.icon;

  // Separate debit (expense accounts) and credit (payment accounts) entries
  const debitEntries = (expense.ledgerEntries || []).filter((e: any) => e.entryType === 'DEBIT');
  const creditEntries = (expense.ledgerEntries || []).filter((e: any) => e.entryType === 'CREDIT');

  const totalDebit = debitEntries.reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);
  const totalCredit = creditEntries.reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${orgSlug}/expenses`)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              {expense.referenceId || meta.referenceNumber || expense.transactionNumber}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Expense Detail</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          {expense.status === 'POSTED' && (
            <button
              onClick={handleVoid}
              disabled={voiding}
              className="px-3 py-2 text-sm border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-1.5 disabled:opacity-50"
            >
              <AlertTriangle className="h-4 w-4" />
              {voiding ? 'Voiding...' : 'Void Expense'}
            </button>
          )}
        </div>
      </div>

      {/* ── Status Banner ── */}
      {isVoided && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <Ban className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">This expense has been voided</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">GL entries have been reversed. This record is kept for audit purposes.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Main Details ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Expense Overview</h2>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.bgColors} ${statusCfg.colors}`}>
                <StatusIcon className="h-3 w-3" />
                {statusCfg.label}
              </span>
            </div>

            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-4">
              {/* Date */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                  <Calendar className="h-3 w-3" /> Date
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(expense.transactionDate).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>

              {/* Payee */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                  <User className="h-3 w-3" /> Payee
                </p>
                <p className="text-sm text-gray-900 dark:text-white">{meta.payeeName || expense.description}</p>
              </div>

              {/* Payment Method */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                  <Wallet className="h-3 w-3" /> Payment Method
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {meta.paymentMethod?.replace(/_/g, ' ') || '—'}
                </p>
              </div>

              {/* Reference */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                  <Hash className="h-3 w-3" /> Reference
                </p>
                <p className="text-sm text-gray-900 dark:text-white font-mono">
                  {expense.referenceId || meta.referenceNumber || expense.transactionNumber}
                </p>
              </div>

              {/* Type */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                  <FileText className="h-3 w-3" /> Type
                </p>
                <p className="text-sm">
                  {meta.isReimbursement ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-full text-xs font-medium">
                      <RotateCcw className="h-3 w-3" /> Reimbursement
                    </span>
                  ) : (
                    <span className="text-gray-900 dark:text-white">Direct Payment</span>
                  )}
                </p>
              </div>

              {/* Mobile Money Details */}
              {meta.paymentMethod === 'MOBILE_MONEY' && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                    <Smartphone className="h-3 w-3" /> MoMo Txn ID
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white font-mono">
                    {meta.mobileMoneyTransactionId || '—'}
                    {meta.mobileMoneyProvider && (
                      <span className="text-xs text-gray-500 ml-1">({meta.mobileMoneyProvider})</span>
                    )}
                  </p>
                </div>
              )}

              {/* Created By */}
              {expense.createdBy && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                    <Building2 className="h-3 w-3" /> Created By
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {[expense.createdBy.firstName, expense.createdBy.lastName].filter(Boolean).join(' ') || expense.createdBy.email}
                  </p>
                </div>
              )}
            </div>

            {/* Notes */}
            {expense.notes && (
              <div className="px-5 pb-5">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3">{expense.notes}</p>
              </div>
            )}
          </div>

          {/* ── Journal Entry / GL Lines ── */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Journal Entry</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Account</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Debit</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {(expense.ledgerEntries || []).map((entry: any, i: number) => (
                    <tr key={entry.id || i} className={isVoided ? 'opacity-50' : ''}>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {entry.account?.code ? `${entry.account.code} - ` : ''}
                            {entry.account?.name || 'Unknown Account'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{entry.account?.accountType}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {entry.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                        {entry.entryType === 'DEBIT' ? formatCurrency(entry.amount, currency) : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                        {entry.entryType === 'CREDIT' ? formatCurrency(entry.amount, currency) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-300 dark:border-gray-600">
                  <tr className="font-semibold">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white" colSpan={2}>Total</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                      {formatCurrency(totalDebit, currency)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                      {formatCurrency(totalCredit, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-6">
          {/* Amount Summary Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Amount Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Gross Amount</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(meta.totalGross || expense.calculatedTotal || totalDebit, currency)}
                </span>
              </div>
              {(meta.totalTax > 0) && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Tax</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(meta.totalTax, currency)}
                  </span>
                </div>
              )}
              {(meta.whtAmount > 0) && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">WHT</span>
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    ({formatCurrency(meta.whtAmount, currency)})
                  </span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Net Total</span>
                <span className={`text-lg font-bold ${isVoided ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                  {formatCurrency(expense.calculatedTotal || totalDebit, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Trail */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Audit Trail</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full mt-0.5">
                  <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-900 dark:text-white">Created</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(expense.createdAt).toLocaleString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              {expense.status === 'POSTED' && (
                <div className="flex items-start gap-2.5">
                  <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-full mt-0.5">
                    <CheckCircle2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">Auto-posted to GL</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Transaction #{expense.transactionNumber}</p>
                  </div>
                </div>
              )}
              {isVoided && (
                <div className="flex items-start gap-2.5">
                  <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded-full mt-0.5">
                    <Ban className="h-3 w-3 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">Voided</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(expense.updatedAt).toLocaleString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Receipt */}
          {meta.receiptAttachmentId && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" /> Receipt
              </h3>
              <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg text-center">
                <Paperclip className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-500 dark:text-gray-400">Receipt attached</p>
                <p className="text-xs font-mono text-gray-400 mt-1">{meta.receiptAttachmentId.slice(0, 12)}...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
