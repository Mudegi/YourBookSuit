'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, Shield, Clock, AlertTriangle, RotateCcw,
  Send, Trash2, Printer, Building, Calendar, User, FileText,
  CheckCircle, X, Scale, Edit3
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface EntryDetail {
  id: string;
  transactionNumber: string;
  transactionDate: string;
  transactionType: string;
  description: string;
  notes?: string;
  status: string;
  branchId?: string;
  referenceId?: string;
  reference: string;
  journalType: string;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
  createdBy: { id: string; email: string; firstName: string; lastName: string };
  approvedById?: string;
  approvedAt?: string;
  branch?: { id: string; name: string; code: string } | null;
  ledgerEntries: Array<{
    id: string;
    entryType: string;
    amount: number;
    amountInBase: number;
    currency: string;
    exchangeRate: number;
    description?: string;
    account: {
      id: string;
      code: string;
      name: string;
      accountType: string;
      accountSubType?: string;
    };
  }>;
}

export default function JournalEntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const entryId = params.id as string;
  const { organization, currency } = useOrganization();
  const onboardingCheck = useOnboardingGuard();

  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [reverseReason, setReverseReason] = useState('');
  const [reverseLoading, setReverseLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const baseCurrency = organization?.baseCurrency || currency || 'UGX';

  useEffect(() => {
    if (orgSlug && entryId) fetchEntry();
  }, [orgSlug, entryId]);

  const fetchEntry = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orgs/${orgSlug}/journal-entries/${entryId}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setEntry(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load journal entry');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    setPostLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/journal-entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'post' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setActionSuccess('Journal entry posted. COA balances updated.');
      fetchEntry();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setPostLoading(false);
    }
  };

  const handleReverse = async () => {
    if (!reverseReason.trim()) return;
    setReverseLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/journal-entries/${entryId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reverseReason }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setShowReverseModal(false);
      setReverseReason('');
      setActionSuccess('Reversing entry created successfully.');
      fetchEntry();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reverse');
    } finally {
      setReverseLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/journal-entries/${entryId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      router.push(`/${orgSlug}/general-ledger/journal-entries/list`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; icon: any }> = {
      POSTED: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-800 dark:text-green-300', icon: Shield },
      DRAFT: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-800 dark:text-amber-300', icon: Clock },
      VOIDED: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-800 dark:text-red-300', icon: AlertTriangle },
      CANCELLED: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', icon: X },
    };
    const s = map[status] || map.CANCELLED;
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold rounded-full ${s.bg} ${s.text}`}>
        <Icon className="h-4 w-4" /> {status}
      </span>
    );
  };

  if (onboardingCheck.loading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading journal entry...</p>
        </div>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Error</h2>
        <p className="text-red-600 dark:text-red-400">{error || 'Journal entry not found'}</p>
        <Link href={`/${orgSlug}/general-ledger/journal-entries/list`}
          className="inline-flex items-center gap-2 mt-4 text-blue-600 dark:text-blue-400 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to list
        </Link>
      </div>
    );
  }

  const description = entry.description.replace(/^\[(.*?)\]\s*/, '');
  const journalType = entry.journalType || 'General';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/${orgSlug}/general-ledger/journal-entries/list`}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-500 dark:text-gray-400">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                {entry.reference || entry.transactionNumber}
              </h1>
              {getStatusBadge(entry.status)}
            </div>
            <p className="text-gray-600 dark:text-gray-400">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {entry.status === 'DRAFT' && (
            <>
              <Link href={`/${orgSlug}/general-ledger/journal-entries?edit=${entry.id}`}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <Edit3 className="h-4 w-4" /> Edit
              </Link>
              <button onClick={handlePost} disabled={postLoading || !entry.isBalanced}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition disabled:opacity-50">
                <Send className="h-4 w-4" /> {postLoading ? 'Posting...' : 'Post'}
              </button>
              <button onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </>
          )}
          {entry.status === 'POSTED' && (
            <button onClick={() => setShowReverseModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition">
              <RotateCcw className="h-4 w-4" /> Reverse
            </button>
          )}
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      {/* Action Messages */}
      {actionSuccess && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="text-green-800 dark:text-green-300 font-medium">{actionSuccess}</span>
          <button onClick={() => setActionSuccess('')} className="ml-auto text-green-500 hover:text-green-700"><X className="h-4 w-4" /></button>
        </div>
      )}
      {actionError && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <span className="text-red-800 dark:text-red-300">{actionError}</span>
          <button onClick={() => setActionError('')} className="ml-auto text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Debits', value: formatCurrency(entry.totalDebits, baseCurrency), color: 'blue' },
          { label: 'Total Credits', value: formatCurrency(entry.totalCredits, baseCurrency), color: 'green' },
          { label: 'Difference', value: formatCurrency(Math.abs(entry.totalDebits - entry.totalCredits), baseCurrency), 
            color: entry.isBalanced ? 'green' : 'red' },
          { label: 'Lines', value: entry.ledgerEntries.length, color: 'purple' },
        ].map(card => (
          <div key={card.label}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">{card.label}</p>
            <p className={`text-xl font-bold font-mono mt-1 text-${card.color}-700 dark:text-${card.color}-300`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Entry Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Metadata */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Details</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-500 dark:text-gray-400 w-24">Date:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {new Date(entry.transactionDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-500 dark:text-gray-400 w-24">Type:</span>
              <span className="text-gray-900 dark:text-white font-medium">{journalType}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Scale className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-500 dark:text-gray-400 w-24">Balance:</span>
              <span className={`font-medium ${entry.isBalanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {entry.isBalanced ? 'Balanced' : 'Not Balanced'}
              </span>
            </div>
            {entry.branch && (
              <div className="flex items-center gap-3 text-sm">
                <Building className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <span className="text-gray-500 dark:text-gray-400 w-24">Branch:</span>
                <span className="text-gray-900 dark:text-white font-medium">{entry.branch.code} — {entry.branch.name}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-500 dark:text-gray-400 w-24">Created By:</span>
              <span className="text-gray-900 dark:text-white">{entry.createdBy.firstName} {entry.createdBy.lastName}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-500 dark:text-gray-400 w-24">Created:</span>
              <span className="text-gray-700 dark:text-gray-300 text-xs">{formatDateTime(entry.createdAt)}</span>
            </div>
            {entry.notes && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium mb-1">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{entry.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Ledger Lines */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">Ledger Lines</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Account</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Debit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {entry.ledgerEntries.map((le) => (
                  <tr key={le.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                    <td className="px-4 py-3">
                      <Link href={`/${orgSlug}/general-ledger/chart-of-accounts/${le.account.id}`}
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition">
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400 mr-2">{le.account.code}</span>
                        <span className="text-sm text-gray-900 dark:text-white">{le.account.name}</span>
                      </Link>
                      <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">({le.account.accountType})</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {le.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {le.entryType === 'DEBIT' ? (
                        <span className="font-mono text-sm font-semibold text-blue-900 dark:text-blue-300">
                          {formatCurrency(le.amount, le.currency)}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {le.entryType === 'CREDIT' ? (
                        <span className="font-mono text-sm font-semibold text-green-900 dark:text-green-300">
                          {formatCurrency(le.amount, le.currency)}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 font-semibold">
                  <td colSpan={2} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-right uppercase">Totals</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-blue-900 dark:text-blue-300">
                      {formatCurrency(entry.totalDebits, baseCurrency)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-green-900 dark:text-green-300">
                      {formatCurrency(entry.totalCredits, baseCurrency)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Immutability Notice */}
      {entry.status === 'POSTED' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">This entry is posted and immutable</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              To correct this entry, use the <strong>Reverse</strong> button to create an offsetting entry that preserves the audit trail.
            </p>
          </div>
        </div>
      )}

      {/* ── Reverse Modal ── */}
      {showReverseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowReverseModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <RotateCcw className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reverse Entry</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{entry.reference || entry.transactionNumber}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This creates an offsetting entry with all debits and credits swapped. The original remains in the audit trail.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason <span className="text-red-500">*</span></label>
              <textarea rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., Incorrect account, wrong amount..."
                value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} />
            </div>
            {actionError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{actionError}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowReverseModal(false); setReverseReason(''); setActionError(''); }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
              <button onClick={handleReverse} disabled={reverseLoading || !reverseReason.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition disabled:opacity-50">
                {reverseLoading ? 'Reversing...' : 'Create Reversing Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Draft</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This will permanently delete this draft journal entry. This cannot be undone.
            </p>
            {actionError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{actionError}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowDeleteModal(false); setActionError(''); }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition disabled:opacity-50">
                {deleteLoading ? 'Deleting...' : 'Delete Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
