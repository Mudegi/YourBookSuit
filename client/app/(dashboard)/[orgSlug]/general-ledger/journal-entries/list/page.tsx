'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Eye, RotateCcw, Filter, Search, Download, CheckSquare,
  AlertTriangle, Calendar, Building, DollarSign,
  Archive, BookOpen, X, ChevronLeft, ChevronRight, Shield,
  FileText, Clock, Trash2, Send, ArrowUpDown
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface JournalEntry {
  id: string;
  transactionNumber: string;
  transactionDate: string;
  transactionType: string;
  description: string;
  status: string;
  notes?: string;
  attachments: string[];
  branchId?: string;
  createdAt: string;
  ledgerEntries: Array<{
    id: string;
    entryType: string;
    amount: number;
    currency: string;
    account: { id: string; code: string; name: string; accountType: string };
  }>;
  createdBy: { id: string; email: string; firstName: string; lastName: string };
  approvedBy?: { id: string; firstName: string; lastName: string } | null;
  branch?: { id: string; name: string; code: string } | null;
  metadata: {
    reference: string;
    isBalanced: boolean;
    foreignAmount?: number;
    foreignCurrency?: string;
    baseCurrencyEquivalent: number;
    baseCurrency: string;
    auditTrail: { lastModified: string; lastModifiedBy: string; version: number };
  };
}

interface Branch { id: string; name: string; code: string }

export default function JournalEntriesListPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const { organization, currency } = useOrganization();
  const onboardingCheck = useOnboardingGuard();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  // Modals
  const [reverseModal, setReverseModal] = useState<{ entryId: string; ref: string } | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reverseLoading, setReverseLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ entryId: string; ref: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Summary
  const [summary, setSummary] = useState({ total: 0, drafted: 0, posted: 0, voided: 0, totalAmount: 0 });

  useEffect(() => {
    if (orgSlug) {
      fetchEntries();
      fetchBranches();
    }
  }, [orgSlug, page, filterStatus, filterType, filterBranch, filterDateFrom, filterDateTo]);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const qp = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filterDateFrom) qp.append('startDate', filterDateFrom);
      if (filterDateTo) qp.append('endDate', filterDateTo);
      if (filterBranch) qp.append('branchId', filterBranch);
      if (filterType) qp.append('transactionType', filterType);
      if (filterStatus) qp.append('status', filterStatus);
      if (searchQuery) qp.append('search', searchQuery);

      const res = await fetch(`/api/orgs/${orgSlug}/journal-entries?${qp}`);
      const data = await res.json();

      if (data.success) {
        setEntries(data.entries || []);
        setTotal(data.total || 0);

        // Compute summary
        const all = data.entries || [];
        const drafted = all.filter((e: any) => e.status === 'DRAFT').length;
        const posted = all.filter((e: any) => e.status === 'POSTED').length;
        const voided = all.filter((e: any) => e.status === 'VOIDED').length;
        const totalAmt = all.reduce((s: number, e: any) => s + (e.metadata?.baseCurrencyEquivalent || 0), 0);
        setSummary({ total: data.total, drafted, posted, voided, totalAmount: totalAmt });
      }
    } catch (err) {
      console.error('Error fetching journal entries:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, page, filterStatus, filterType, filterBranch, filterDateFrom, filterDateTo, searchQuery]);

  const fetchBranches = async () => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/branches`);
      const data = await res.json();
      if (Array.isArray(data)) setBranches(data);
      else if (data.data && Array.isArray(data.data)) setBranches(data.data);
    } catch { /* ignore */ }
  };

  const handleSearch = () => { setPage(1); fetchEntries(); };

  const handleReverse = async () => {
    if (!reverseModal) return;
    setReverseLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/journal-entries/${reverseModal.entryId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reverseReason }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setReverseModal(null);
      setReverseReason('');
      fetchEntries();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reverse entry');
    } finally {
      setReverseLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleteLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/journal-entries/${deleteModal.entryId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setDeleteModal(null);
      fetchEntries();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete draft');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePostDraft = async (entryId: string) => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/journal-entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'post' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      fetchEntries();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to post draft');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedEntries.size === 0) return;
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/journal-entries/bulk-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds: Array.from(selectedEntries) }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedEntries(new Set());
        fetchEntries();
      }
    } catch { /* ignore */ }
  };

  const toggleExpand = (id: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const calcDebits = (entry: JournalEntry) =>
    entry.ledgerEntries.filter(e => e.entryType === 'DEBIT').reduce((s, e) => s + e.amount, 0);

  const clearFilters = () => {
    setSearchQuery(''); setFilterStatus(''); setFilterType(''); setFilterBranch('');
    setFilterDateFrom(''); setFilterDateTo(''); setPage(1);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      POSTED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      DRAFT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
      VOIDED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
      CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    };
    return map[status] || map.CANCELLED;
  };

  const getTypeBadge = (type: string) => {
    const map: Record<string, string> = {
      JOURNAL_ENTRY: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
      INVOICE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
      BILL: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
      PAYMENT: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      DEPRECIATION: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
    };
    return map[type] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  };

  const pages = Math.ceil(total / limit);
  const baseCurrency = organization?.baseCurrency || currency || 'UGX';

  if (onboardingCheck.loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Journal Entries
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Audit trail of all financial transactions &bull; {baseCurrency}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
              showFilters
                ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <button
            onClick={() => {
              const qp = new URLSearchParams({ format: 'excel' });
              if (filterDateFrom) qp.append('startDate', filterDateFrom);
              if (filterDateTo) qp.append('endDate', filterDateTo);
              window.open(`/api/orgs/${orgSlug}/journal-entries/export?${qp}`, '_blank');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <Link
            href={`/${orgSlug}/general-ledger/journal-entries`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
          >
            <Plus className="h-5 w-5" />
            New Entry
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Entries', value: summary.total, icon: FileText, color: 'blue' },
          { label: 'Drafts', value: summary.drafted, icon: Clock, color: 'amber' },
          { label: 'Posted', value: summary.posted, icon: Shield, color: 'green' },
          { label: 'Total Amount', value: formatCurrency(summary.totalAmount, baseCurrency), icon: DollarSign, color: 'purple', isAmount: true },
        ].map((card) => (
          <div
            key={card.label}
            className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 transition hover:shadow-md`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${card.color}-100 dark:bg-${card.color}-900/30`}>
                <card.icon className={`h-5 w-5 text-${card.color}-600 dark:text-${card.color}-400`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">{card.label}</p>
                <p className={`text-xl font-bold text-gray-900 dark:text-white font-mono ${card.isAmount ? 'text-lg' : ''}`}>
                  {card.isAmount ? card.value : card.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search by reference, description, or notes..."
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setPage(1); fetchEntries(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button onClick={handleSearch}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition">
            Search
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date From</label>
              <input type="date" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date To</label>
              <input type="date" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="POSTED">Posted</option>
                <option value="VOIDED">Voided</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Source Type</label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="">All Types</option>
                <option value="JOURNAL_ENTRY">Manual Entry</option>
                <option value="INVOICE">Sales Invoice</option>
                <option value="BILL">Purchase Bill</option>
                <option value="PAYMENT">Payment</option>
                <option value="DEPRECIATION">Depreciation</option>
                <option value="INVENTORY_ADJUSTMENT">Inventory Adjustment</option>
              </select>
            </div>
            {branches.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Branch</label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
                  <option value="">All Branches</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button onClick={clearFilters}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm">
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedEntries.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-blue-800 dark:text-blue-300 font-medium">{selectedEntries.size} selected</span>
              <button onClick={handleBulkApprove}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                <CheckSquare className="h-4 w-4" /> Post Selected
              </button>
            </div>
            <button onClick={() => setSelectedEntries(new Set())}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm">Clear Selection</button>
          </div>
        </div>
      )}

      {/* Action Error */}
      {actionError && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <span className="text-red-800 dark:text-red-300">{actionError}</span>
          <button onClick={() => setActionError('')} className="ml-auto text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading journal entries...</p>
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-16 text-center">
          <Archive className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No journal entries found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first manual journal entry to start recording transactions</p>
          <Link href={`/${orgSlug}/general-ledger/journal-entries`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition">
            <Plus className="h-5 w-5" /> New Journal Entry
          </Link>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox"
                        checked={selectedEntries.size === entries.length && entries.length > 0}
                        onChange={() => {
                          if (selectedEntries.size === entries.length) setSelectedEntries(new Set());
                          else setSelectedEntries(new Set(entries.map(e => e.id)));
                        }}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created By</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {entries.map((entry) => {
                    const debitTotal = calcDebits(entry);
                    const ref = entry.metadata?.reference || entry.transactionNumber;
                    const isExpanded = expandedEntries.has(entry.id);

                    return (
                      <React.Fragment key={entry.id}>
                        <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer ${
                          entry.status === 'VOIDED' ? 'opacity-60' : ''
                        }`}>
                          <td className="px-4 py-3">
                            <input type="checkbox"
                              checked={selectedEntries.has(entry.id)}
                              onChange={() => {
                                const next = new Set(selectedEntries);
                                if (next.has(entry.id)) next.delete(entry.id);
                                else next.add(entry.id);
                                setSelectedEntries(next);
                              }}
                              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
                          </td>
                          <td className="px-4 py-3" onClick={() => toggleExpand(entry.id)}>
                            <div className="flex items-center gap-2">
                              <ArrowUpDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">{ref}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {new Date(entry.transactionDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-xs">{entry.description}</p>
                            {entry.branch && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                <Building className="h-3 w-3" /> {entry.branch.code}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(entry.status)}`}>
                              {entry.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getTypeBadge(entry.transactionType)}`}>
                              {entry.transactionType.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(debitTotal, baseCurrency)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {entry.createdBy.firstName} {entry.createdBy.lastName}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <Link href={`/${orgSlug}/general-ledger/journal-entries/${entry.id}`}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition" title="View">
                                <Eye className="h-4 w-4" />
                              </Link>
                              {entry.status === 'DRAFT' && (
                                <>
                                  <button onClick={() => handlePostDraft(entry.id)}
                                    className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition" title="Post">
                                    <Send className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => setDeleteModal({ entryId: entry.id, ref })}
                                    className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition" title="Delete Draft">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {entry.status === 'POSTED' && (
                                <button onClick={() => setReverseModal({ entryId: entry.id, ref })}
                                  className="p-1.5 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition" title="Reverse">
                                  <RotateCcw className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Ledger Lines */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="px-4 py-0">
                              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg mx-4 my-2 p-4">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                      <th className="text-left pb-2 font-medium">Account</th>
                                      <th className="text-right pb-2 font-medium">Debit</th>
                                      <th className="text-right pb-2 font-medium">Credit</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {entry.ledgerEntries.map((le) => (
                                      <tr key={le.id}>
                                        <td className="py-1.5">
                                          <span className="font-mono text-xs text-gray-500 dark:text-gray-400 mr-2">{le.account.code}</span>
                                          <span className="text-gray-900 dark:text-gray-100">{le.account.name}</span>
                                        </td>
                                        <td className="py-1.5 text-right font-mono text-gray-900 dark:text-gray-100">
                                          {le.entryType === 'DEBIT' ? formatCurrency(le.amount, le.currency) : '-'}
                                        </td>
                                        <td className="py-1.5 text-right font-mono text-gray-900 dark:text-gray-100">
                                          {le.entryType === 'CREDIT' ? formatCurrency(le.amount, le.currency) : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {entry.notes && (
                                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">Notes: {entry.notes}</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Page {page} of {pages}</span>
                  <button onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Reverse Modal ── */}
      {reverseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setReverseModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <RotateCcw className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reverse Entry</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{reverseModal.ref}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This will create an offsetting entry that swaps all debits and credits.
              The original entry remains for audit trail purposes.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Reversal</label>
              <textarea rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., Incorrect account used, wrong amount..."
                value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} />
            </div>
            {actionError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{actionError}</p>}
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => { setReverseModal(null); setReverseReason(''); setActionError(''); }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Cancel
              </button>
              <button onClick={handleReverse} disabled={reverseLoading || !reverseReason.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition disabled:opacity-50">
                {reverseLoading ? 'Reversing...' : 'Create Reversing Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Draft Modal ── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Draft</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{deleteModal.ref}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This will permanently delete this draft journal entry. This action cannot be undone.
            </p>
            {actionError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{actionError}</p>}
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => { setDeleteModal(null); setActionError(''); }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Cancel
              </button>
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

import React from 'react';
