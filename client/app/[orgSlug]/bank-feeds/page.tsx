'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';
import {
  Upload, RefreshCw, Search, X, ArrowLeft, ArrowRight, Check,
  CheckCircle2, AlertTriangle, Ban, Link2, FileText, Receipt,
  Zap, Filter, ChevronDown, ChevronUp, Eye, Trash2, Undo2,
  Landmark, Plus, Settings, Wand2, ArrowLeftRight, Smartphone,
  Tag, Clock, BookOpen, Hash, Percent,
} from 'lucide-react';

/* ═══════════ TYPES ═══════════ */

interface BankAccount {
  id: string; accountName: string; bankName: string; currency: string; accountNumber: string;
}

interface SuggestedMatch {
  type: 'INVOICE' | 'BILL' | 'PAYMENT' | 'TRANSFER';
  id: string; reference: string; amount: number; date: string;
  counterparty: string; confidenceScore: number; matchReasons: string[];
}

interface FeedTransaction {
  id: string; transactionDate: string; amount: number; description: string;
  rawDescription: string | null; payee: string | null; referenceNo: string | null;
  transactionType: string; status: string; confidenceScore: number | null;
  matchedPaymentId: string | null; matchedInvoiceId: string | null;
  matchedBillId: string | null; categoryAccountId: string | null;
  appliedRuleId: string | null; isReconciled: boolean;
  suggestedMatches: SuggestedMatch[]; appliedRuleName: string | null;
  categoryAccountName: string | null; bankFeed?: any;
}

interface Feed {
  id: string; feedName: string; feedType: string; lastSyncAt: string | null;
  bankAccount: BankAccount | null; _count: { transactions: number };
}

interface BankRule {
  id: string; ruleName: string; description: string | null;
  conditionField: string; conditionOperator: string; conditionValue: string;
  categoryAccountId: string | null; taxRateId: string | null;
  payee: string | null; priority: number; isActive: boolean;
  timesApplied: number; lastAppliedAt: string | null;
}

interface GLAccount { id: string; code: string; name: string; }

/* ═══════════ CONSTANTS ═══════════ */

const INPUT_CLS = 'w-full h-10 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50';

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  UNPROCESSED: { label: 'Unprocessed', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300', icon: Clock },
  MATCHED: { label: 'Matched', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300', icon: Link2 },
  CREATED: { label: 'Categorized', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300', icon: Tag },
  IGNORED: { label: 'Ignored', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400', icon: Ban },
  PENDING: { label: 'Pending', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300', icon: Clock },
};

const TABS = [
  { key: 'inbox', label: 'Transaction Inbox', icon: FileText },
  { key: 'feeds', label: 'Import History', icon: Upload },
  { key: 'rules', label: 'Bank Rules', icon: Settings },
] as const;

/* ═══════════ MAIN PAGE ═══════════ */

export default function BankFeedsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const { organization, currency } = useOrganization();
  const baseCurrency = organization?.baseCurrency || currency || 'USD';

  /* ─── State ─── */
  const [activeTab, setActiveTab] = useState<'inbox' | 'feeds' | 'rules'>('inbox');
  const [transactions, setTransactions] = useState<FeedTransaction[]>([]);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [glAccounts, setGLAccounts] = useState<GLAccount[]>([]);
  const [rules, setRules] = useState<BankRule[]>([]);
  const [stats, setStats] = useState<Record<string, { count: number; total: number }>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [accountFilter, setAccountFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Expanded row for side-by-side match suggestion
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Upload form
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAccountId, setUploadAccountId] = useState('');
  const [uploadFeedName, setUploadFeedName] = useState('');
  const [uploadFeedType, setUploadFeedType] = useState('CSV');
  const [uploading, setUploading] = useState(false);

  // Rule form
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    ruleName: '', description: '', conditionField: 'description',
    conditionOperator: 'contains', conditionValue: '',
    categoryAccountId: '', taxRateId: '', payee: '', priority: 0,
  });
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Batch categorize
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchAccountId, setBatchAccountId] = useState('');

  // Auto-match
  const [autoMatching, setAutoMatching] = useState(false);

  /* ─── Data ─── */
  const fetchInbox = useCallback(async () => {
    if (!orgSlug) return;
    setLoading(true); setError(null);
    try {
      const sp = new URLSearchParams();
      if (statusFilter) sp.set('status', statusFilter);
      if (accountFilter) sp.set('bankAccountId', accountFilter);
      sp.set('includeSuggestions', 'true');
      sp.set('limit', '300');

      const res = await fetch(`/api/orgs/${orgSlug}/banking/bank-feeds/transactions?${sp}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      setTransactions(data.transactions || []);
      setStats(data.stats || {});
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, statusFilter, accountFilter]);

  const fetchFeeds = useCallback(async () => {
    if (!orgSlug) return;
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/banking/bank-feeds`);
      if (res.ok) { const d = await res.json(); setFeeds(d.feeds || []); }
    } catch {}
  }, [orgSlug]);

  const fetchAccounts = useCallback(async () => {
    if (!orgSlug) return;
    try {
      const [accRes, glRes] = await Promise.all([
        fetch(`/api/orgs/${orgSlug}/banking/accounts`),
        fetch(`/api/orgs/${orgSlug}/chart-of-accounts`),
      ]);
      if (accRes.ok) { const a = await accRes.json(); setBankAccounts(a.accounts || []); }
      if (glRes.ok) { const g = await glRes.json(); setGLAccounts(g.data || g.accounts || []); }
    } catch {}
  }, [orgSlug]);

  const fetchRules = useCallback(async () => {
    if (!orgSlug) return;
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/banking/bank-feeds/rules?includeInactive=true`);
      if (res.ok) { const d = await res.json(); setRules(d.rules || []); }
    } catch {}
  }, [orgSlug]);

  useEffect(() => {
    Promise.all([fetchInbox(), fetchFeeds(), fetchAccounts(), fetchRules()]);
  }, [fetchInbox, fetchFeeds, fetchAccounts, fetchRules]);

  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); } }, [success]);

  /* ─── Filtered transactions ─── */
  const filteredTxns = useMemo(() => {
    if (!search) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(t =>
      t.description.toLowerCase().includes(q) ||
      (t.payee || '').toLowerCase().includes(q) ||
      (t.referenceNo || '').includes(q)
    );
  }, [transactions, search]);

  /* ─── Upload ─── */
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile || !uploadAccountId || !uploadFeedName) return;
    setUploading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('bankAccountId', uploadAccountId);
      fd.append('feedName', uploadFeedName);
      fd.append('feedType', uploadFeedType);

      const res = await fetch(`/api/orgs/${orgSlug}/banking/bank-feeds`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setSuccess(`Imported ${data.imported} transactions (${data.skipped} duplicates skipped)`);
      setShowUpload(false);
      setUploadFile(null); setUploadFeedName(''); setUploadAccountId('');
      fetchInbox(); fetchFeeds();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  /* ─── Auto-Match ─── */
  async function handleAutoMatch() {
    setAutoMatching(true); setError(null);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/banking/bank-feeds/auto-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankAccountId: accountFilter || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`Auto-matched: ${data.rulesCategorized} by rules, ${data.autoMatched} by matching engine`);
      fetchInbox();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAutoMatching(false);
    }
  }

  /* ─── Actions ─── */
  async function applyAction(txnId: string, action: string, matchedId?: string, categoryAccountId?: string) {
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/banking/bank-feeds/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankTransactionId: txnId, action, matchedId, categoryAccountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`Transaction ${action.toLowerCase().replace('_', ' ')}`);
      fetchInbox();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function undoAction(txnId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/banking/bank-feeds/transactions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ undo: true, bankTransactionId: txnId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Action undone');
      fetchInbox();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleBatchApprove() {
    if (selectedIds.size === 0 || !batchAccountId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/banking/bank-feeds/transactions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchApprove: true, transactionIds: Array.from(selectedIds), categoryAccountId: batchAccountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`Batch approved: ${data.approved} transactions`);
      setShowBatchModal(false); setSelectedIds(new Set());
      fetchInbox();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  /* ─── Rules ─── */
  function openCreateRule(prefill?: Partial<typeof ruleForm>) {
    setEditingRuleId(null);
    setRuleForm({
      ruleName: '', description: '', conditionField: 'description',
      conditionOperator: 'contains', conditionValue: '',
      categoryAccountId: '', taxRateId: '', payee: '', priority: 0,
      ...prefill,
    });
    setShowRuleModal(true);
  }

  function openEditRule(rule: BankRule) {
    setEditingRuleId(rule.id);
    setRuleForm({
      ruleName: rule.ruleName, description: rule.description || '',
      conditionField: rule.conditionField, conditionOperator: rule.conditionOperator,
      conditionValue: rule.conditionValue, categoryAccountId: rule.categoryAccountId || '',
      taxRateId: rule.taxRateId || '', payee: rule.payee || '', priority: rule.priority,
    });
    setShowRuleModal(true);
  }

  async function handleRuleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      const url = editingRuleId
        ? `/api/orgs/${orgSlug}/banking/bank-feeds/rules/${editingRuleId}`
        : `/api/orgs/${orgSlug}/banking/bank-feeds/rules`;
      const res = await fetch(url, {
        method: editingRuleId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(editingRuleId ? 'Rule updated' : 'Rule created');
      setShowRuleModal(false);
      fetchRules();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this rule?')) return;
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/banking/bank-feeds/rules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setSuccess('Rule deleted');
      fetchRules();
    } catch (err: any) {
      setError(err.message);
    }
  }

  /* ─── Selection helpers ─── */
  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  }
  function selectAllUnprocessed() {
    const ids = filteredTxns.filter(t => t.status === 'UNPROCESSED').map(t => t.id);
    setSelectedIds(new Set(ids));
  }
  function clearSelection() { setSelectedIds(new Set()); }

  /* ─── Stats summary ─── */
  const unprocessedCount = stats['UNPROCESSED']?.count || 0;
  const matchedCount = stats['MATCHED']?.count || 0;
  const createdCount = stats['CREATED']?.count || 0;
  const ignoredCount = stats['IGNORED']?.count || 0;
  const totalCount = unprocessedCount + matchedCount + createdCount + ignoredCount;

  /* ─── Loading state ─── */
  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading bank feeds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full space-y-5 min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* ════ HEADER ════ */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(`/${orgSlug}/banking/accounts`)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bank Feeds</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Import, categorize &amp; match bank transactions automatically
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleAutoMatch} disabled={autoMatching}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">
            <Wand2 className={`w-4 h-4 ${autoMatching ? 'animate-spin' : ''}`} />
            {autoMatching ? 'Matching...' : 'Auto-Match All'}
          </button>
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Upload className="w-4 h-4" /> Import Statement
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* ════ KPI BAR ════ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', count: totalCount, cls: 'text-gray-900 dark:text-white', bg: 'bg-gray-50 dark:bg-gray-800', filterVal: '' },
          { label: 'Unprocessed', count: unprocessedCount, cls: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/10', filterVal: 'UNPROCESSED' },
          { label: 'Matched', count: matchedCount, cls: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/10', filterVal: 'MATCHED' },
          { label: 'Categorized', count: createdCount, cls: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/10', filterVal: 'CREATED' },
          { label: 'Ignored', count: ignoredCount, cls: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800', filterVal: 'IGNORED' },
        ].map(kpi => (
          <button key={kpi.label} onClick={() => { setStatusFilter(kpi.filterVal); setActiveTab('inbox'); }}
            className={`${kpi.bg} rounded-xl p-4 text-left transition-all hover:ring-2 hover:ring-blue-500/30 ${statusFilter === kpi.filterVal ? 'ring-2 ring-blue-500' : ''}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.cls}`}>{kpi.count}</p>
          </button>
        ))}
      </div>

      {/* ════ TABS ════ */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ════ TAB: INBOX ════ */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {/* Filters & Batch */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search description, payee..."
                value={search} onChange={e => setSearch(e.target.value)} className={`${INPUT_CLS} pl-10`} />
            </div>
            <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)} className={`${INPUT_CLS} w-48`}>
              <option value="">All Accounts</option>
              {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`${INPUT_CLS} w-40`}>
              <option value="">All Statuses</option>
              <option value="UNPROCESSED">Unprocessed</option>
              <option value="MATCHED">Matched</option>
              <option value="CREATED">Categorized</option>
              <option value="IGNORED">Ignored</option>
            </select>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-gray-500 dark:text-gray-400">{selectedIds.size} selected</span>
                <button onClick={() => setShowBatchModal(true)}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
                  Batch Categorize
                </button>
                <button onClick={clearSelection} className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
                  Clear
                </button>
              </div>
            )}
            {selectedIds.size === 0 && unprocessedCount > 0 && (
              <button onClick={selectAllUnprocessed}
                className="ml-auto px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
                Select all unprocessed
              </button>
            )}
          </div>

          {/* Transaction List */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="w-10 px-3 py-3"><input type="checkbox" className="rounded"
                      checked={selectedIds.size > 0 && selectedIds.size === filteredTxns.filter(t => t.status === 'UNPROCESSED').length}
                      onChange={e => e.target.checked ? selectAllUnprocessed() : clearSelection()} /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description / Payee</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Confidence</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredTxns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {transactions.length === 0 ? 'No transactions imported yet. Upload a bank statement to get started.' : 'No transactions match your filters.'}
                        </p>
                      </td>
                    </tr>
                  ) : filteredTxns.map(txn => {
                    const isExpanded = expandedId === txn.id;
                    const statusInfo = STATUS_MAP[txn.status] || STATUS_MAP['UNPROCESSED'];
                    const StatusIcon = statusInfo.icon;
                    const isCredit = txn.amount >= 0;
                    const topMatch = txn.suggestedMatches[0];
                    const acctCurrency = txn.bankFeed?.bankAccount?.currency || baseCurrency;

                    return (
                      <React.Fragment key={txn.id}>
                        {/* Main Row */}
                        <tr className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${isExpanded ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                          <td className="px-3 py-3">
                            {txn.status === 'UNPROCESSED' ? (
                              <input type="checkbox" className="rounded"
                                checked={selectedIds.has(txn.id)}
                                onChange={() => toggleSelect(txn.id)} />
                            ) : <div className="w-4" />}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {new Date(txn.transactionDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">{txn.description}</div>
                            {txn.payee && <div className="text-xs text-gray-400">{txn.payee}</div>}
                            {txn.appliedRuleName && (
                              <div className="text-xs text-purple-500 flex items-center gap-1 mt-0.5">
                                <Wand2 className="w-3 h-3" /> Rule: {txn.appliedRuleName}
                              </div>
                            )}
                            {txn.categoryAccountName && (
                              <div className="text-xs text-blue-500 flex items-center gap-1 mt-0.5">
                                <BookOpen className="w-3 h-3" /> {txn.categoryAccountName}
                              </div>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-sm font-semibold text-right whitespace-nowrap ${isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isCredit ? '+' : ''}{formatCurrency(txn.amount, acctCurrency)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              <StatusIcon className="w-3 h-3" /> {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {topMatch ? (
                              <div className="flex items-center justify-center gap-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                  topMatch.confidenceScore >= 85 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    : topMatch.confidenceScore >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                }`}>
                                  {Math.round(topMatch.confidenceScore)}
                                </div>
                                <span className="text-[10px] text-gray-400">%</span>
                              </div>
                            ) : txn.status === 'MATCHED' ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {txn.status === 'UNPROCESSED' && (
                                <>
                                  {topMatch && (
                                    <button onClick={() => setExpandedId(isExpanded ? null : txn.id)}
                                      title="View matches"
                                      className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md">
                                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                  <button onClick={() => applyAction(txn.id, 'IGNORE')}
                                    title="Ignore"
                                    className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => openCreateRule({ conditionValue: txn.description.substring(0, 30), ruleName: `Rule: ${txn.description.substring(0, 20)}` })}
                                    title="Create rule from this"
                                    className="p-1.5 text-purple-500 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md">
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              {(txn.status === 'MATCHED' || txn.status === 'CREATED' || txn.status === 'IGNORED') && !txn.isReconciled && (
                                <button onClick={() => undoAction(txn.id)} title="Undo"
                                  className="p-1.5 text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md">
                                  <Undo2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded: Match Suggestions Panel */}
                        {isExpanded && txn.suggestedMatches.length > 0 && (
                          <tr>
                            <td colSpan={7} className="p-0">
                              <div className="bg-blue-50/50 dark:bg-blue-900/10 border-t border-b border-blue-100 dark:border-blue-900/30 px-6 py-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Suggested Matches</span>
                                  <span className="text-xs text-gray-400">({txn.suggestedMatches.length} found)</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {txn.suggestedMatches.map(match => {
                                    const actionMap: Record<string, string> = {
                                      INVOICE: 'MATCH_INVOICE', BILL: 'MATCH_BILL', PAYMENT: 'MATCH_PAYMENT',
                                    };
                                    return (
                                      <div key={`${match.type}-${match.id}`}
                                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                              match.type === 'INVOICE' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                : match.type === 'BILL' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                            }`}>
                                              {match.type}
                                            </span>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{match.reference}</span>
                                            <span className={`ml-auto text-xs font-bold rounded-full px-2 py-0.5 ${
                                              match.confidenceScore >= 85 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                : match.confidenceScore >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                            }`}>
                                              {Math.round(match.confidenceScore)}%
                                            </span>
                                          </div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                                            <div>{match.counterparty} &bull; {formatCurrency(match.amount, acctCurrency)} &bull; {new Date(match.date).toLocaleDateString()}</div>
                                            <div className="flex flex-wrap gap-1">
                                              {match.matchReasons.map((r, i) => (
                                                <span key={i} className="text-[10px] px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{r}</span>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                        <button onClick={() => applyAction(txn.id, actionMap[match.type] || 'MATCH_PAYMENT', match.id)}
                                          className="ml-3 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 flex items-center gap-1 shrink-0">
                                          <Check className="w-3 h-3" /> Match
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                                {/* Quick actions for non-matches */}
                                <div className="mt-3 flex items-center gap-2">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">Or:</span>
                                  <button onClick={() => {
                                    const acctId = prompt('Enter GL Account ID for this expense category:');
                                    if (acctId) applyAction(txn.id, 'CREATE_EXPENSE', undefined, acctId);
                                  }} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                    Create as Expense
                                  </button>
                                  <span className="text-gray-300 dark:text-gray-600">|</span>
                                  <button onClick={() => applyAction(txn.id, 'TRANSFER')}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                    Mark as Transfer
                                  </button>
                                  <span className="text-gray-300 dark:text-gray-600">|</span>
                                  <button onClick={() => applyAction(txn.id, 'IGNORE')}
                                    className="text-xs text-gray-500 dark:text-gray-400 hover:underline">
                                    Ignore
                                  </button>
                                </div>
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
          </div>
        </div>
      )}

      {/* ════ TAB: IMPORT HISTORY ════ */}
      {activeTab === 'feeds' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Feed Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Bank Account</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Transactions</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Imported</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {feeds.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                    No feeds imported yet. Upload a CSV or OFX statement above.
                  </td></tr>
                ) : feeds.map(feed => (
                  <tr key={feed.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">{feed.feedName}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">{feed.feedType}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {feed.bankAccount ? `${feed.bankAccount.accountName} (${feed.bankAccount.bankName})` : '—'}
                    </td>
                    <td className="px-5 py-3 text-center text-sm font-medium text-gray-900 dark:text-white">{feed._count.transactions}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {feed.lastSyncAt ? new Date(feed.lastSyncAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => { setAccountFilter(''); setStatusFilter(''); setActiveTab('inbox'); }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        View Transactions
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════ TAB: BANK RULES ════ */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Rules auto-categorize imported transactions based on description patterns.
            </p>
            <button onClick={() => openCreateRule()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> New Rule
            </button>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Rule Name</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Condition</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category / Payee</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Times Used</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rules.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                      No rules yet. Create a rule to auto-categorize transactions containing recurring descriptions like &quot;MTN AIRTIME&quot;.
                    </td></tr>
                  ) : rules.map(rule => (
                    <tr key={rule.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!rule.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-5 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{rule.ruleName}</div>
                        {rule.description && <div className="text-xs text-gray-400">{rule.description}</div>}
                      </td>
                      <td className="px-5 py-3 text-sm">
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">
                          {rule.conditionField} {rule.conditionOperator} &quot;{rule.conditionValue}&quot;
                        </code>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {rule.categoryAccountId && <div className="text-xs">{glAccounts.find(g => g.id === rule.categoryAccountId)?.name || rule.categoryAccountId}</div>}
                        {rule.payee && <div className="text-xs text-purple-500">Payee: {rule.payee}</div>}
                      </td>
                      <td className="px-5 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">{rule.priority}</td>
                      <td className="px-5 py-3 text-center text-sm text-gray-500 dark:text-gray-400">{rule.timesApplied}</td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditRule(rule)}
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteRule(rule.id)}
                            className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════ UPLOAD MODAL ════ */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-500" /> Import Bank Statement
              </h2>
              <button onClick={() => setShowUpload(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Account *</label>
                <select value={uploadAccountId} onChange={e => setUploadAccountId(e.target.value)} className={INPUT_CLS} required>
                  <option value="">Select bank account...</option>
                  {bankAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.accountName} — {a.bankName} ({a.accountNumber})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Feed Name *</label>
                  <input type="text" value={uploadFeedName} onChange={e => setUploadFeedName(e.target.value)}
                    placeholder="e.g., Feb 2026 Statement" className={INPUT_CLS} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">File Format</label>
                  <select value={uploadFeedType} onChange={e => setUploadFeedType(e.target.value)} className={INPUT_CLS}>
                    <option value="CSV">CSV</option>
                    <option value="OFX">OFX / QFX</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Statement File *</label>
                <input type="file" accept=".csv,.ofx,.qfx,.txt"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/20 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-800 cursor-pointer" required />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Duplicate transactions will be automatically skipped (hash-based detection)</p>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={() => setShowUpload(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
                <button type="submit" disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {uploading ? 'Importing...' : 'Import Statement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════ RULE MODAL ════ */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRuleModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-500" /> {editingRuleId ? 'Edit Rule' : 'Create Bank Rule'}
              </h2>
              <button onClick={() => setShowRuleModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleRuleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rule Name *</label>
                <input type="text" value={ruleForm.ruleName} onChange={e => setRuleForm({ ...ruleForm, ruleName: e.target.value })}
                  placeholder="MTN Airtime Auto-Categorize" className={INPUT_CLS} required />
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Condition</p>
                <div className="grid grid-cols-3 gap-3">
                  <select value={ruleForm.conditionField} onChange={e => setRuleForm({ ...ruleForm, conditionField: e.target.value })} className={INPUT_CLS}>
                    <option value="description">Description</option>
                    <option value="payee">Payee</option>
                    <option value="referenceNo">Reference No</option>
                    <option value="amount">Amount</option>
                  </select>
                  <select value={ruleForm.conditionOperator} onChange={e => setRuleForm({ ...ruleForm, conditionOperator: e.target.value })} className={INPUT_CLS}>
                    <option value="contains">Contains</option>
                    <option value="equals">Equals</option>
                    <option value="startsWith">Starts With</option>
                    <option value="endsWith">Ends With</option>
                    <option value="regex">Regex</option>
                  </select>
                  <input type="text" value={ruleForm.conditionValue}
                    onChange={e => setRuleForm({ ...ruleForm, conditionValue: e.target.value })}
                    placeholder="MTN AIRTIME" className={INPUT_CLS} required />
                </div>
                <p className="text-xs text-gray-400">
                  If <strong>{ruleForm.conditionField}</strong> {ruleForm.conditionOperator} &quot;{ruleForm.conditionValue || '...'}&quot;
                </p>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg space-y-3">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Action — Categorize as</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">GL Account</label>
                    <select value={ruleForm.categoryAccountId}
                      onChange={e => setRuleForm({ ...ruleForm, categoryAccountId: e.target.value })} className={INPUT_CLS}>
                      <option value="">Select...</option>
                      {glAccounts.map(g => <option key={g.id} value={g.id}>{g.code} - {g.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Override Payee</label>
                    <input type="text" value={ruleForm.payee}
                      onChange={e => setRuleForm({ ...ruleForm, payee: e.target.value })}
                      placeholder="Optional" className={INPUT_CLS} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <input type="number" value={ruleForm.priority}
                    onChange={e => setRuleForm({ ...ruleForm, priority: parseInt(e.target.value) || 0 })}
                    className={INPUT_CLS} />
                  <p className="text-xs text-gray-400 mt-0.5">Higher = applied first</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <input type="text" value={ruleForm.description}
                    onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })}
                    placeholder="Optional note" className={INPUT_CLS} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                  {submitting ? 'Saving...' : editingRuleId ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════ BATCH CATEGORIZE MODAL ════ */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBatchModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Batch Categorize</h2>
              <button onClick={() => setShowBatchModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Categorize <strong>{selectedIds.size}</strong> selected transactions as a single expense category.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GL Account (Expense Category) *</label>
                <select value={batchAccountId} onChange={e => setBatchAccountId(e.target.value)} className={INPUT_CLS} required>
                  <option value="">Select category...</option>
                  {glAccounts.filter(g => g.code?.startsWith('5') || g.code?.startsWith('6')).map(g => (
                    <option key={g.id} value={g.id}>{g.code} - {g.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-0.5">Showing expense accounts (5xxx, 6xxx)</p>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
                <button onClick={handleBatchApprove} disabled={submitting || !batchAccountId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'Processing...' : `Approve ${selectedIds.size} Transactions`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
