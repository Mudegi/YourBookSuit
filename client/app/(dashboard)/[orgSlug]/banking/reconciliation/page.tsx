'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Plus,
  Lock,
  Sparkles,
  X,
  Search,
  Check,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useOrganization } from '@/hooks/useOrganization';

/* ──────────── Types ──────────── */

interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  currency: string;
  currentBalance: number;
}

interface ClearableItem {
  id: string;
  type: 'payment' | 'bankTransaction';
  date: string;
  amount: number;
  description: string;
  reference?: string;
  payee?: string;
  isDeposit: boolean;
}

interface ReconciliationGap {
  openingBalance: number;
  clearedDeposits: number;
  clearedWithdrawals: number;
  calculatedBalance: number;
  statementBalance: number;
  difference: number;
  isBalanced: boolean;
  unclearedDeposits: number;
  unclearedWithdrawals: number;
  totalItems: number;
  clearedItems: number;
}

interface MatchSuggestion {
  paymentId: string;
  bankTransactionId: string;
  confidenceScore: number;
  matchReason: string;
}

interface Reconciliation {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  accountNumber: string;
  currency: string;
  statementDate: string;
  statementBalance: number;
  bookBalance: number;
  openingBalance: number;
  status: string;
  notes?: string;
  clearedPaymentIds: string[];
  clearedTransactionIds: string[];
  adjustmentEntries: any[];
}

/* ──────────── Page Component ──────────── */

export default function BankReconciliationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgSlug = params?.orgSlug as string;
  const reconciliationId = searchParams?.get('id');
  const { organization } = useOrganization();
  const currency = organization?.baseCurrency || 'USD';

  // Core state
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [statementDate, setStatementDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [statementBalance, setStatementBalance] = useState('');

  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(
    null
  );
  const [clearableItems, setClearableItems] = useState<ClearableItem[]>([]);
  const [gap, setGap] = useState<ReconciliationGap | null>(null);
  const [matchSuggestions, setMatchSuggestions] = useState<MatchSuggestion[]>(
    []
  );
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'deposits' | 'withdrawals'
  >('all');
  const [showCleared, setShowCleared] = useState(true);

  // Adjustment modal
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({
    transactionDate: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    accountId: '',
    adjustmentType: 'FEE' as 'FEE' | 'INTEREST' | 'WHT' | 'OTHER',
  });
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);

  /* ──────────── Data loading ──────────── */

  useEffect(() => {
    loadAccounts();
    loadExpenseAccounts();
    if (reconciliationId) {
      loadReconciliation(reconciliationId);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug, reconciliationId]);

  const loadAccounts = async () => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/bank-accounts`);
      const data = await response.json();
      if (data.bankAccounts) setAccounts(data.bankAccounts);
      else if (data.success && data.data) setAccounts(data.data);
    } catch (e) {
      console.error('Error loading accounts:', e);
    }
  };

  const loadExpenseAccounts = async () => {
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/chart-of-accounts?type=EXPENSE`
      );
      const data = await response.json();
      if (data.success && data.data) setExpenseAccounts(data.data);
      else if (data.accounts) setExpenseAccounts(data.accounts);
    } catch (e) {
      console.error('Error loading expense accounts:', e);
    }
  };

  const loadReconciliation = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/banking/reconciliation/${id}`
      );
      const data = await response.json();
      if (data.success) {
        setReconciliation(data.data.reconciliation);
        setClearableItems(data.data.clearableItems || []);
        setGap(data.data.gap);
        setMatchSuggestions(data.data.matchSuggestions || []);
        // Restore cleared IDs from reconciliation record
        const ids = new Set<string>([
          ...(data.data.reconciliation.clearedPaymentIds || []),
          ...(data.data.reconciliation.clearedTransactionIds || []),
        ]);
        setClearedIds(ids);
      }
    } catch (e) {
      console.error('Error loading reconciliation:', e);
      setError('Failed to load reconciliation');
    } finally {
      setLoading(false);
    }
  };

  /* ──────────── Client-side gap recalculation ──────────── */

  const localGap = useMemo<ReconciliationGap | null>(() => {
    if (!reconciliation || clearableItems.length === 0) return gap;
    const opening = reconciliation.openingBalance;
    const stmtBal = reconciliation.statementBalance;

    let clearedDeposits = 0;
    let clearedWithdrawals = 0;
    let unclearedDeposits = 0;
    let unclearedWithdrawals = 0;

    for (const item of clearableItems) {
      const amt = Math.abs(item.amount);
      if (clearedIds.has(item.id)) {
        if (item.isDeposit) clearedDeposits += amt;
        else clearedWithdrawals += amt;
      } else {
        if (item.isDeposit) unclearedDeposits += amt;
        else unclearedWithdrawals += amt;
      }
    }

    const calculatedBalance = opening + clearedDeposits - clearedWithdrawals;
    const difference = calculatedBalance - stmtBal;

    return {
      openingBalance: opening,
      clearedDeposits,
      clearedWithdrawals,
      calculatedBalance,
      statementBalance: stmtBal,
      difference,
      isBalanced: Math.abs(difference) < 0.01,
      unclearedDeposits,
      unclearedWithdrawals,
      totalItems: clearableItems.length,
      clearedItems: clearedIds.size,
    };
  }, [clearableItems, clearedIds, reconciliation, gap]);

  /* ──────────── Filter & search ──────────── */

  const filteredItems = useMemo(() => {
    return clearableItems.filter((item) => {
      if (filterType === 'deposits' && !item.isDeposit) return false;
      if (filterType === 'withdrawals' && item.isDeposit) return false;
      if (!showCleared && clearedIds.has(item.id)) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          item.description.toLowerCase().includes(term) ||
          (item.reference && item.reference.toLowerCase().includes(term)) ||
          (item.payee && item.payee.toLowerCase().includes(term)) ||
          Math.abs(item.amount).toFixed(2).includes(term)
        );
      }
      return true;
    });
  }, [clearableItems, filterType, showCleared, searchTerm, clearedIds]);

  /* ──────────── Toggle clear (tick / untick) ──────────── */

  const toggleClear = useCallback(
    async (item: ClearableItem) => {
      if (!reconciliation || reconciliation.status === 'FINALIZED') return;
      const isCleared = !clearedIds.has(item.id);

      // Optimistic update
      setClearedIds((prev) => {
        const next = new Set(prev);
        if (isCleared) next.add(item.id);
        else next.delete(item.id);
        return next;
      });

      try {
        const response = await fetch(
          `/api/orgs/${orgSlug}/banking/reconciliation/${reconciliation.id}/clear`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: item.id,
              itemType: item.type,
              isCleared,
            }),
          }
        );
        const data = await response.json();
        if (!data.success) {
          // Revert on failure
          setClearedIds((prev) => {
            const next = new Set(prev);
            if (isCleared) next.delete(item.id);
            else next.add(item.id);
            return next;
          });
          setError(data.error || 'Failed to update');
        }
      } catch {
        // Revert
        setClearedIds((prev) => {
          const next = new Set(prev);
          if (isCleared) next.delete(item.id);
          else next.add(item.id);
          return next;
        });
        setError('Failed to update clear status');
      }
    },
    [reconciliation, clearedIds, orgSlug]
  );

  /* ──────────── Select all visible ──────────── */

  const toggleSelectAll = useCallback(async () => {
    if (!reconciliation || reconciliation.status === 'FINALIZED') return;
    const allVisible = filteredItems.every((i) => clearedIds.has(i.id));
    const unclearedVisible = filteredItems.filter(
      (i) => !clearedIds.has(i.id)
    );
    const itemsToToggle = allVisible ? filteredItems : unclearedVisible;
    const targetState = !allVisible;

    // Optimistic update
    setClearedIds((prev) => {
      const next = new Set(prev);
      for (const item of itemsToToggle) {
        if (targetState) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });

    // Persist each in background
    for (const item of itemsToToggle) {
      try {
        await fetch(
          `/api/orgs/${orgSlug}/banking/reconciliation/${reconciliation.id}/clear`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: item.id,
              itemType: item.type,
              isCleared: targetState,
            }),
          }
        );
      } catch {
        /* swallow; user can retry */
      }
    }
  }, [reconciliation, filteredItems, clearedIds, orgSlug]);

  /* ──────────── Actions ──────────── */

  const startReconciliation = async () => {
    if (!selectedAccountId || !statementBalance) {
      setError('Please select a bank account and enter statement balance');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/banking/reconciliation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bankAccountId: selectedAccountId,
            statementDate,
            statementBalance: parseFloat(statementBalance),
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        router.push(
          `/${orgSlug}/banking/reconciliation?id=${data.data.id}`
        );
        setSuccess('Reconciliation started');
      } else {
        setError(data.error || 'Failed to start reconciliation');
      }
    } catch {
      setError('Failed to start reconciliation');
    } finally {
      setLoading(false);
    }
  };

  const autoMatchAll = async () => {
    if (!reconciliation || matchSuggestions.length === 0) return;
    const highConfidence = matchSuggestions
      .filter((s) => s.confidenceScore >= 80)
      .map((s) => ({
        paymentId: s.paymentId,
        bankTransactionId: s.bankTransactionId,
      }));
    if (highConfidence.length === 0) {
      setError('No high-confidence matches found');
      return;
    }
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/banking/reconciliation/${reconciliation.id}/bulk-match`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matches: highConfidence }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setSuccess(`Matched ${data.data.matched} transactions`);
        loadReconciliation(reconciliation.id);
      }
    } catch {
      setError('Failed to auto-match');
    }
  };

  const finalizeReconciliation = async () => {
    if (!reconciliation) return;
    if (!localGap?.isBalanced) {
      setError('Cannot finalize: difference must be zero');
      return;
    }
    if (
      !confirm(
        'Finalize this reconciliation? All cleared transactions will be locked for audit integrity.'
      )
    )
      return;

    setSaving(true);
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/banking/reconciliation/${reconciliation.id}/finalize`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const data = await response.json();
      if (data.success) {
        setSuccess('Reconciliation finalized & locked');
        loadReconciliation(reconciliation.id);
      } else {
        setError(data.error || 'Failed to finalize');
      }
    } catch {
      setError('Failed to finalize reconciliation');
    } finally {
      setSaving(false);
    }
  };

  const createAdjustment = async () => {
    if (
      !reconciliation ||
      !adjustmentData.amount ||
      !adjustmentData.accountId
    ) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/banking/reconciliation/${reconciliation.id}/adjustment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...adjustmentData,
            bankAccountId: reconciliation.bankAccountId,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setSuccess(`Adjustment created: ${adjustmentData.description}`);
        setShowAdjustmentModal(false);
        setAdjustmentData({
          transactionDate: new Date().toISOString().split('T')[0],
          amount: '',
          description: '',
          accountId: '',
          adjustmentType: 'FEE',
        });
        loadReconciliation(reconciliation.id);
      } else {
        setError(data.error || 'Failed to create adjustment');
      }
    } catch {
      setError('Failed to create adjustment');
    }
  };

  /* ──────────── Helpers ──────────── */

  const fmt = (amount: number) => formatCurrency(amount, currency);
  const isFinalized = reconciliation?.status === 'FINALIZED';

  /* ──────────── Render ──────────── */

  if (loading && reconciliationId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push(`/${orgSlug}/banking/accounts`)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Bank Reconciliation
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1 ml-14">
            The Final Audit &mdash; Tick off cleared items until the difference
            is zero
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError('')}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center">
          <CheckCircle2 className="h-5 w-5 mr-2" />
          <div className="flex-1">{success}</div>
          <button onClick={() => setSuccess('')}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ──── Start new reconciliation ──── */}
      {!reconciliation && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Start New Reconciliation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bank Account
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
              >
                <option value="">
                  &mdash; Select Account ({accounts.length} available) &mdash;
                </option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accountName || a.bankName} &mdash; ****
                    {a.accountNumber.slice(-4)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Statement Date
              </label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Statement Ending Balance
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                value={statementBalance}
                onChange={(e) => setStatementBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              onClick={() => router.push(`/${orgSlug}/banking/accounts`)}
              className="px-6 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={startReconciliation}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Reconciliation'}
            </button>
          </div>
        </div>
      )}

      {/* ──── Active Reconciliation ──── */}
      {reconciliation && (
        <>
          {/* ─── Running Difference Banner ─── */}
          <div
            className={`rounded-lg shadow-lg p-6 ${
              localGap?.isBalanced
                ? 'bg-gradient-to-r from-green-600 to-emerald-700'
                : 'bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-700 dark:to-blue-900'
            } text-white`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">
                  {reconciliation.bankAccountName}
                </h2>
                <p className="text-white/70 text-sm">
                  Statement Date:{' '}
                  {new Date(
                    reconciliation.statementDate
                  ).toLocaleDateString()}{' '}
                  &middot; Acct: ****
                  {reconciliation.accountNumber.slice(-4)}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {isFinalized ? (
                  <div className="flex items-center px-4 py-2 bg-green-500/30 rounded-lg border border-green-300/50">
                    <Lock className="h-5 w-5 mr-2" />
                    <span className="font-semibold">FINALIZED &amp; LOCKED</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (confirm('Cancel this reconciliation?'))
                        router.push(`/${orgSlug}/banking/accounts`);
                    }}
                    className="px-4 py-2 bg-red-500/20 border border-red-300/30 text-white rounded-lg hover:bg-red-500/40"
                  >
                    <X className="h-4 w-4 inline mr-1" />
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Summary row */}
            {localGap && (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-5">
                <SummaryCard
                  label="Opening Balance"
                  value={fmt(localGap.openingBalance)}
                />
                <SummaryCard
                  label="Cleared Deposits"
                  value={fmt(localGap.clearedDeposits)}
                  accent="green"
                />
                <SummaryCard
                  label="Cleared Withdrawals"
                  value={fmt(localGap.clearedWithdrawals)}
                  accent="red"
                />
                <SummaryCard
                  label="Calculated Balance"
                  value={fmt(localGap.calculatedBalance)}
                />
                <SummaryCard
                  label="Statement Balance"
                  value={fmt(localGap.statementBalance)}
                />
                <div
                  className={`bg-white/10 backdrop-blur rounded-lg p-3 ring-2 ${
                    localGap.isBalanced
                      ? 'ring-green-400'
                      : 'ring-yellow-400'
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wider text-white/60">
                    Difference
                  </div>
                  <div
                    className={`text-xl font-bold mt-0.5 ${
                      localGap.isBalanced
                        ? 'text-green-300'
                        : 'text-yellow-300'
                    }`}
                  >
                    {fmt(localGap.difference)}
                  </div>
                  <div className="text-[10px] text-white/50 mt-0.5">
                    {localGap.clearedItems}/{localGap.totalItems} cleared
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── Action Bar ─── */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 flex flex-wrap gap-3 justify-between items-center">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search amount, ref, payee..."
                  className="pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filter buttons */}
              <div className="flex rounded-lg border border-gray-300 dark:border-slate-600 overflow-hidden text-sm">
                {(['all', 'deposits', 'withdrawals'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterType(f)}
                    className={`px-3 py-2 capitalize ${
                      filterType === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <label className="flex items-center text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCleared}
                  onChange={(e) => setShowCleared(e.target.checked)}
                  className="mr-1.5 rounded"
                />
                Show cleared
              </label>

              {!isFinalized && (
                <>
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Toggle All
                  </button>
                  <button
                    onClick={autoMatchAll}
                    disabled={matchSuggestions.length === 0}
                    className="flex items-center px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Auto-Match (
                    {
                      matchSuggestions.filter((s) => s.confidenceScore >= 80)
                        .length
                    }
                    )
                  </button>
                  <button
                    onClick={() => setShowAdjustmentModal(true)}
                    className="flex items-center px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adjustment
                  </button>
                </>
              )}
            </div>

            {/* Finalize */}
            {!isFinalized && (
              <button
                onClick={finalizeReconciliation}
                disabled={!localGap?.isBalanced || saving}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Lock className="h-4 w-4 mr-2" />
                {saving ? 'Finalizing...' : 'Finalize & Lock'}
              </button>
            )}
          </div>

          {/* ─── Two-column checklist ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deposits (Money In) */}
            <ItemColumn
              title="Money In (Deposits)"
              items={filteredItems.filter((i) => i.isDeposit)}
              clearedIds={clearedIds}
              onToggle={toggleClear}
              currency={currency}
              isFinalized={!!isFinalized}
              accentColor="green"
            />
            {/* Withdrawals (Money Out) */}
            <ItemColumn
              title="Money Out (Withdrawals)"
              items={filteredItems.filter((i) => !i.isDeposit)}
              clearedIds={clearedIds}
              onToggle={toggleClear}
              currency={currency}
              isFinalized={!!isFinalized}
              accentColor="red"
            />
          </div>

          {/* ─── Uncleared summary ─── */}
          {localGap &&
            (localGap.unclearedDeposits > 0 ||
              localGap.unclearedWithdrawals > 0) && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                <h4 className="font-semibold text-amber-800 dark:text-amber-300 text-sm mb-1">
                  Outstanding Items
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Deposits in transit:{' '}
                  <strong>{fmt(localGap.unclearedDeposits)}</strong> &middot;
                  Outstanding withdrawals:{' '}
                  <strong>{fmt(localGap.unclearedWithdrawals)}</strong>
                </p>
              </div>
            )}

          {/* ─── Adjustment Modal ─── */}
          {showAdjustmentModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Quick Adjustment
                  </h3>
                  <button
                    onClick={() => setShowAdjustmentModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Record bank charges, interest income, or WHT that appears on
                  the statement but isn&apos;t in your books.
                </p>
                <div className="space-y-4">
                  <AdjField label="Type">
                    <select
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      value={adjustmentData.adjustmentType}
                      onChange={(e) =>
                        setAdjustmentData({
                          ...adjustmentData,
                          adjustmentType: e.target.value as any,
                        })
                      }
                    >
                      <option value="FEE">Bank Fee/Charge</option>
                      <option value="INTEREST">Interest Income</option>
                      <option value="WHT">Withholding Tax (WHT)</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </AdjField>
                  <AdjField label="Date">
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      value={adjustmentData.transactionDate}
                      onChange={(e) =>
                        setAdjustmentData({
                          ...adjustmentData,
                          transactionDate: e.target.value,
                        })
                      }
                    />
                  </AdjField>
                  <AdjField label="Amount">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      value={adjustmentData.amount}
                      onChange={(e) =>
                        setAdjustmentData({
                          ...adjustmentData,
                          amount: e.target.value,
                        })
                      }
                      placeholder="0.00"
                    />
                  </AdjField>
                  <AdjField label="Expense Account">
                    <select
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      value={adjustmentData.accountId}
                      onChange={(e) =>
                        setAdjustmentData({
                          ...adjustmentData,
                          accountId: e.target.value,
                        })
                      }
                    >
                      <option value="">&mdash; Select Account &mdash;</option>
                      {expenseAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.accountCode} &mdash; {a.accountName}
                        </option>
                      ))}
                    </select>
                  </AdjField>
                  <AdjField label="Description">
                    <textarea
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      rows={2}
                      value={adjustmentData.description}
                      onChange={(e) =>
                        setAdjustmentData({
                          ...adjustmentData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Enter description..."
                    />
                  </AdjField>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowAdjustmentModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createAdjustment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Adjustment
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ──────────── Sub-components ──────────── */

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'green' | 'red';
}) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-white/60">
        {label}
      </div>
      <div
        className={`text-lg font-bold mt-0.5 ${
          accent === 'green'
            ? 'text-green-300'
            : accent === 'red'
              ? 'text-red-300'
              : 'text-white'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function AdjField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function ItemColumn({
  title,
  items,
  clearedIds,
  onToggle,
  currency,
  isFinalized,
  accentColor,
}: {
  title: string;
  items: ClearableItem[];
  clearedIds: Set<string>;
  onToggle: (item: ClearableItem) => void;
  currency: string;
  isFinalized: boolean;
  accentColor: 'green' | 'red';
}) {
  const isGreen = accentColor === 'green';
  const total = items.reduce((s, i) => s + Math.abs(i.amount), 0);
  const clearedTotal = items
    .filter((i) => clearedIds.has(i.id))
    .reduce((s, i) => s + Math.abs(i.amount), 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
      <div
        className={`${
          isGreen
            ? 'bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800'
        } px-6 py-4 flex justify-between items-center`}
      >
        <div>
          <h3
            className={`text-lg font-bold ${
              isGreen
                ? 'text-green-900 dark:text-green-300'
                : 'text-red-900 dark:text-red-300'
            }`}
          >
            {title}
          </h3>
          <p
            className={`text-sm ${
              isGreen
                ? 'text-green-700 dark:text-green-400'
                : 'text-red-700 dark:text-red-400'
            }`}
          >
            {items.length} items &middot; Cleared:{' '}
            {formatCurrency(clearedTotal, currency)} /{' '}
            {formatCurrency(total, currency)}
          </p>
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700">
        {items.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-10">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
            <p>No items</p>
          </div>
        ) : (
          items.map((item) => {
            const cleared = clearedIds.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => !isFinalized && onToggle(item)}
                className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
                  cleared
                    ? 'bg-green-50/50 dark:bg-green-900/10'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                } ${isFinalized ? 'cursor-default' : ''}`}
              >
                {/* Checkbox */}
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    cleared
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'border-gray-300 dark:border-slate-500'
                  } ${isFinalized ? 'opacity-60' : ''}`}
                >
                  {cleared && <Check className="h-3 w-3" />}
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      cleared
                        ? 'text-gray-500 dark:text-gray-400 line-through'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {item.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {new Date(item.date).toLocaleDateString()}
                    {item.reference && (
                      <> &middot; Ref: {item.reference}</>
                    )}
                    {item.payee && <> &middot; {item.payee}</>}
                    <span className="ml-1 text-gray-400">
                      ({item.type === 'payment' ? 'Book' : 'Bank'})
                    </span>
                  </p>
                </div>

                {/* Amount */}
                <div
                  className={`flex-shrink-0 text-sm font-semibold tabular-nums ${
                    cleared
                      ? 'text-gray-400 dark:text-gray-500'
                      : isGreen
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(Math.abs(item.amount), currency)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
