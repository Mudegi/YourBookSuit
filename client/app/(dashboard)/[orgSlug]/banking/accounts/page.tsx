'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';
import {
  Building2, Wallet, Smartphone, CreditCard, Landmark, PiggyBank,
  Plus, ArrowLeftRight, RefreshCw, Search, Eye, Pencil, Trash2,
  AlertTriangle, CheckCircle2, Clock, X, ArrowLeft, ArrowRight,
  Banknote, TrendingUp, TrendingDown, Shield, ExternalLink,
  BarChart3, CircleDollarSign, ChevronDown,
} from 'lucide-react';

/* ═══════════ TYPES ═══════════ */

interface GLAccount {
  id: string;
  code: string;
  name: string;
  accountName?: string;
  accountType: string;
}

interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  currency: string;
  accountType: string;
  openingBalance: number;
  currentBalance: number;
  statementBalance: number | null;
  reconciliationGap: number | null;
  glAccountId: string | null;
  glAccountCode: string | null;
  glAccountName: string | null;
  routingNumber: string | null;
  swiftCode: string | null;
  mobileMerchantId: string | null;
  mobileShortcode: string | null;
  lastReconciledDate: string | null;
  lastReconciledBalance: number | null;
  description: string | null;
  isActive: boolean;
  branchId: string | null;
  branchName: string | null;
  transactionCount: number;
}

interface Stats {
  totalAccounts: number;
  activeAccounts: number;
  totalSystemBalance: number;
  totalStatementBalance: number;
  totalReconciliationGap: number;
  accountsByType: Record<string, { count: number; balance: number }>;
  currency: string;
}

/* ═══════════ HELPERS ═══════════ */

const ACCOUNT_TYPES = [
  { value: 'CHECKING', label: 'Checking Account', icon: Building2, category: 'BANK' },
  { value: 'SAVINGS', label: 'Savings Account', icon: PiggyBank, category: 'BANK' },
  { value: 'MONEY_MARKET', label: 'Money Market', icon: TrendingUp, category: 'BANK' },
  { value: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard, category: 'BANK' },
  { value: 'LINE_OF_CREDIT', label: 'Line of Credit', icon: CircleDollarSign, category: 'BANK' },
  { value: 'CASH', label: 'Cash / Petty Cash', icon: Banknote, category: 'CASH' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone, category: 'MOBILE_MONEY' },
  { value: 'OTHER', label: 'Other', icon: Wallet, category: 'OTHER' },
] as const;

const CURRENCIES = [
  { code: 'UGX', name: 'Uganda Shilling' }, { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' }, { code: 'GBP', name: 'British Pound' },
  { code: 'KES', name: 'Kenyan Shilling' }, { code: 'TZS', name: 'Tanzanian Shilling' },
  { code: 'RWF', name: 'Rwandan Franc' }, { code: 'ZAR', name: 'South African Rand' },
  { code: 'NGN', name: 'Nigerian Naira' }, { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'CAD', name: 'Canadian Dollar' }, { code: 'AUD', name: 'Australian Dollar' },
  { code: 'JPY', name: 'Japanese Yen' }, { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'INR', name: 'Indian Rupee' },
];

function getAccountTypeInfo(type: string) {
  return ACCOUNT_TYPES.find(t => t.value === type) || ACCOUNT_TYPES[ACCOUNT_TYPES.length - 1];
}

function getAccountTypeCategory(type: string): string {
  const info = getAccountTypeInfo(type);
  return info.category;
}

const INPUT_CLS = 'w-full h-10 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed';

/* ═══════════ MAIN PAGE ═══════════ */

export default function BankAccountsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const { organization, currency } = useOrganization();
  const baseCurrency = organization?.baseCurrency || currency || 'USD';

  /* State */
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [glAccounts, setGLAccounts] = useState<GLAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [showInactive, setShowInactive] = useState(false);

  /* Modal state */
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* Account form */
  const [form, setForm] = useState({
    accountName: '', accountNumber: '', bankName: '', currency: '',
    accountType: 'CHECKING', glAccountId: '', openingBalance: '',
    routingNumber: '', swiftCode: '', mobileMerchantId: '', mobileShortcode: '',
    description: '', isActive: true,
  });

  /* Transfer form */
  const [transferForm, setTransferForm] = useState({
    fromBankAccountId: '', toBankAccountId: '', amount: '',
    transferDate: new Date().toISOString().split('T')[0],
    reference: '', notes: '',
  });

  /* ── Data Fetching ── */
  const fetchData = useCallback(async () => {
    if (!orgSlug) return;
    setLoading(true);
    setError(null);
    try {
      const [acctRes, coaRes] = await Promise.all([
        fetch(`/api/orgs/${orgSlug}/banking/accounts?includeInactive=${showInactive}`),
        fetch(`/api/orgs/${orgSlug}/chart-of-accounts?type=ASSET`),
      ]);

      if (!acctRes.ok) throw new Error('Failed to fetch bank accounts');

      const acctData = await acctRes.json();
      const coaData = coaRes.ok ? await coaRes.json() : { data: [] };

      setAccounts(acctData.accounts || []);
      setStats(acctData.stats || null);
      setGLAccounts(coaData.data || coaData.accounts || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, showInactive]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Clear success after delay */
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  /* ── Filtered Accounts ── */
  const filteredAccounts = useMemo(() => {
    let list = accounts;
    if (typeFilter !== 'ALL') {
      list = list.filter(a => {
        if (typeFilter === 'BANK') return ['CHECKING', 'SAVINGS', 'MONEY_MARKET', 'CREDIT_CARD', 'LINE_OF_CREDIT'].includes(a.accountType);
        if (typeFilter === 'CASH') return a.accountType === 'CASH';
        if (typeFilter === 'MOBILE_MONEY') return a.accountType === 'MOBILE_MONEY';
        return a.accountType === typeFilter;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.accountName.toLowerCase().includes(q) ||
        a.bankName.toLowerCase().includes(q) ||
        a.accountNumber.includes(q) ||
        (a.glAccountCode || '').includes(q)
      );
    }
    return list;
  }, [accounts, typeFilter, search]);

  /* ── GL accounts usable for new bank accounts (not already mapped) ── */
  const availableGLAccounts = useMemo(() => {
    const usedGLIds = new Set(accounts.map(a => a.glAccountId).filter(Boolean));
    if (isEditing && editingId) {
      const editing = accounts.find(a => a.id === editingId);
      if (editing?.glAccountId) usedGLIds.delete(editing.glAccountId);
    }
    return glAccounts.filter(g => !usedGLIds.has(g.id) && g.accountType === 'ASSET');
  }, [glAccounts, accounts, isEditing, editingId]);

  /* ── Account Form Handlers ── */
  function openCreateModal() {
    setIsEditing(false);
    setEditingId(null);
    setForm({
      accountName: '', accountNumber: '', bankName: '', currency: baseCurrency,
      accountType: 'CHECKING', glAccountId: '', openingBalance: '',
      routingNumber: '', swiftCode: '', mobileMerchantId: '', mobileShortcode: '',
      description: '', isActive: true,
    });
    setShowAccountModal(true);
  }

  function openEditModal(account: BankAccount) {
    setIsEditing(true);
    setEditingId(account.id);
    setForm({
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      bankName: account.bankName,
      currency: account.currency,
      accountType: account.accountType,
      glAccountId: account.glAccountId || '',
      openingBalance: String(account.openingBalance),
      routingNumber: account.routingNumber || '',
      swiftCode: account.swiftCode || '',
      mobileMerchantId: account.mobileMerchantId || '',
      mobileShortcode: account.mobileShortcode || '',
      description: account.description || '',
      isActive: account.isActive,
    });
    setShowAccountModal(true);
  }

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const url = isEditing
        ? `/api/orgs/${orgSlug}/banking/accounts/${editingId}`
        : `/api/orgs/${orgSlug}/banking/accounts`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          openingBalance: form.openingBalance ? parseFloat(form.openingBalance) : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      setSuccess(isEditing ? 'Bank account updated' : 'Bank account created');
      setShowAccountModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(account: BankAccount) {
    if (!confirm(`Delete "${account.accountName}" at ${account.bankName}? Accounts with transactions will be deactivated instead.`)) return;

    try {
      const res = await fetch(`/api/orgs/${orgSlug}/banking/accounts/${account.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setSuccess(data.message || 'Account removed');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  /* ── Transfer Handlers ── */
  function openTransferModal(fromId?: string) {
    setTransferForm({
      fromBankAccountId: fromId || '', toBankAccountId: '', amount: '',
      transferDate: new Date().toISOString().split('T')[0], reference: '', notes: '',
    });
    setShowTransferModal(true);
  }

  async function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/orgs/${orgSlug}/banking/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transfer failed');

      setSuccess(`Transfer completed — ${data.reference}`);
      setShowTransferModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const fromAcct = accounts.find(a => a.id === transferForm.fromBankAccountId);
  const toAcct = accounts.find(a => a.id === transferForm.toBankAccountId);
  const isMobileMoney = form.accountType === 'MOBILE_MONEY';

  /* ── Render ── */
  if (loading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading banking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ════ Header ════ */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Banking &amp; Cash Accounts</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Source of truth for all cash, bank &amp; mobile money balances
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => openTransferModal()}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeftRight className="w-4 h-4" /> Transfer Funds
          </button>
          <button onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Account
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

      {/* ════ KPI Cards ════ */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">System Balance</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(stats.totalSystemBalance, baseCurrency)}
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <Landmark className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">{stats.activeAccounts} active accounts</p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Statement Balance</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(stats.totalStatementBalance, baseCurrency)}
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">Per last imported statements</p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Reconciliation Gap</p>
                <p className={`text-xl font-bold mt-1 ${
                  stats.totalReconciliationGap === 0 ? 'text-green-600 dark:text-green-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {formatCurrency(Math.abs(stats.totalReconciliationGap), baseCurrency)}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${
                stats.totalReconciliationGap === 0
                  ? 'bg-green-50 dark:bg-green-900/20' : 'bg-amber-50 dark:bg-amber-900/20'
              }`}>
                {stats.totalReconciliationGap === 0
                  ? <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  : <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {stats.totalReconciliationGap === 0 ? 'All accounts balanced' : 'Needs reconciliation'}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Accounts</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalAccounts}</p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="flex gap-2 mt-1 flex-wrap">
              {Object.entries(stats.accountsByType).map(([type, data]) => (
                <span key={type} className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">
                  {getAccountTypeInfo(type).label.split(' ')[0]} ({data.count})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════ Filters ════ */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search accounts..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={`${INPUT_CLS} pl-10`} />
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {[
            { v: 'ALL', l: 'All' },
            { v: 'BANK', l: 'Bank' },
            { v: 'CASH', l: 'Cash' },
            { v: 'MOBILE_MONEY', l: 'Mobile' },
          ].map(({ v, l }) => (
            <button key={v} onClick={() => setTypeFilter(v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                typeFilter === v ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              {l}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
          Show Inactive
        </label>
        <button onClick={fetchData} title="Refresh"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ════ Account Cards Grid ════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredAccounts.map(account => {
          const typeInfo = getAccountTypeInfo(account.accountType);
          const Icon = typeInfo.icon;
          const hasGap = account.reconciliationGap !== null && account.reconciliationGap !== 0;

          return (
            <div key={account.id}
              className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-all hover:shadow-md ${
                !account.isActive ? 'opacity-60' : ''
              }`}>
              {/* Card Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${
                      account.accountType === 'MOBILE_MONEY' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                      account.accountType === 'CASH' ? 'bg-green-50 dark:bg-green-900/20' :
                      account.accountType === 'CREDIT_CARD' ? 'bg-purple-50 dark:bg-purple-900/20' :
                      'bg-blue-50 dark:bg-blue-900/20'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        account.accountType === 'MOBILE_MONEY' ? 'text-yellow-600 dark:text-yellow-400' :
                        account.accountType === 'CASH' ? 'text-green-600 dark:text-green-400' :
                        account.accountType === 'CREDIT_CARD' ? 'text-purple-600 dark:text-purple-400' :
                        'text-blue-600 dark:text-blue-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{account.accountName}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {account.bankName} &bull; {typeInfo.label}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!account.isActive && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full">
                        Inactive
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full font-mono">
                      {account.currency}
                    </span>
                  </div>
                </div>
              </div>

              {/* Balances */}
              <div className="p-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">System Balance</span>
                    {hasGap && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Gap
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                    {formatCurrency(account.currentBalance, account.currency)}
                  </p>
                </div>

                {account.statementBalance !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Statement Balance</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {formatCurrency(account.statementBalance, account.currency)}
                    </span>
                  </div>
                )}

                {hasGap && (
                  <div className="flex items-center justify-between text-sm px-2 py-1.5 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                    <span className="text-amber-700 dark:text-amber-400 font-medium">Difference</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      {formatCurrency(account.reconciliationGap!, account.currency)}
                    </span>
                  </div>
                )}

                {/* Account Details */}
                <div className="space-y-1.5 text-xs border-t border-gray-100 dark:border-gray-800 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Account #</span>
                    <span className="font-mono text-gray-600 dark:text-gray-400">
                      ****{account.accountNumber.slice(-4)}
                    </span>
                  </div>
                  {account.glAccountCode && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">GL Account</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        {account.glAccountCode} - {account.glAccountName}
                      </span>
                    </div>
                  )}
                  {account.mobileMerchantId && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Merchant ID</span>
                      <span className="font-mono text-gray-600 dark:text-gray-400">{account.mobileMerchantId}</span>
                    </div>
                  )}
                  {account.mobileShortcode && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Shortcode</span>
                      <span className="font-mono text-gray-600 dark:text-gray-400">{account.mobileShortcode}</span>
                    </div>
                  )}
                  {account.lastReconciledDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Reconciled</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {new Date(account.lastReconciledDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {account.branchName && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Branch</span>
                      <span className="text-gray-600 dark:text-gray-400">{account.branchName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Actions */}
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <Link href={`/${orgSlug}/banking/accounts/${account.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                  <Eye className="w-3.5 h-3.5" /> View
                </Link>
                <Link href={`/${orgSlug}/banking/reconciliation?account=${account.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Reconcile
                </Link>
                <button onClick={() => openTransferModal(account.id)}
                  className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Transfer From">
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => openEditModal(account)}
                  className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(account)}
                  className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredAccounts.length === 0 && !loading && (
        <div className="text-center py-16">
          {accounts.length === 0 ? (
            <>
              <Landmark className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="font-medium text-gray-600 dark:text-gray-400">No bank accounts yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create your first account to start tracking cash &amp; bank balances</p>
              <button onClick={openCreateModal}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                <Plus className="w-4 h-4 inline mr-1" /> Add Your First Account
              </button>
            </>
          ) : (
            <>
              <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No accounts match your filters</p>
            </>
          )}
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href={`/${orgSlug}/banking/reconciliation`}
          className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-green-300 dark:hover:border-green-700 transition-colors group">
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Reconcile Accounts</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Match bank statements with ERP records</div>
          </div>
        </Link>
        <Link href={`/${orgSlug}/bank-feeds`}
          className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Bank Feeds</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Import and categorize bank transactions</div>
          </div>
        </Link>
        <Link href={`/${orgSlug}/reports/balance-sheet`}
          className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors group">
          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Balance Sheet</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Cash &amp; equivalents summary report</div>
          </div>
        </Link>
      </div>

      {/* ════ ADD / EDIT ACCOUNT MODAL ════ */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAccountModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Bank Account' : 'Add New Account'}
              </h2>
              <button onClick={() => setShowAccountModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAccountSubmit} className="p-5 space-y-4">
              {/* Account Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Type *</label>
                <select value={form.accountType} onChange={e => setForm({ ...form, accountType: e.target.value })}
                  className={INPUT_CLS} required>
                  {ACCOUNT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Name *</label>
                  <input type="text" value={form.accountName}
                    onChange={e => setForm({ ...form, accountName: e.target.value })}
                    placeholder={isMobileMoney ? 'MTN Merchant Account' : 'Main Business Account'}
                    className={INPUT_CLS} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isMobileMoney ? 'Telecom Provider' : 'Bank Name'} *
                  </label>
                  <input type="text" value={form.bankName}
                    onChange={e => setForm({ ...form, bankName: e.target.value })}
                    placeholder={isMobileMoney ? 'MTN Mobile Money' : 'Stanbic Bank'}
                    className={INPUT_CLS} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isMobileMoney ? 'Phone Number' : 'Account Number'} *
                  </label>
                  <input type="text" value={form.accountNumber}
                    onChange={e => setForm({ ...form, accountNumber: e.target.value })}
                    placeholder={isMobileMoney ? '+256 770 123456' : '1234567890'}
                    className={INPUT_CLS} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GL Account (Chart of Accounts) *</label>
                  <select value={form.glAccountId}
                    onChange={e => setForm({ ...form, glAccountId: e.target.value })}
                    className={INPUT_CLS} required disabled={isEditing}>
                    <option value="">Select GL Account...</option>
                    {availableGLAccounts.map(g => (
                      <option key={g.id} value={g.id}>{g.code} - {g.accountName || g.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-0.5">Each bank account maps to a unique ASSET GL code</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency *</label>
                  <select value={form.currency}
                    onChange={e => setForm({ ...form, currency: e.target.value })}
                    className={INPUT_CLS} required>
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Opening Balance</label>
                  <input type="number" step="0.01" value={form.openingBalance}
                    onChange={e => setForm({ ...form, openingBalance: e.target.value })}
                    placeholder="0.00" className={INPUT_CLS} disabled={isEditing} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select value={form.isActive ? 'true' : 'false'}
                    onChange={e => setForm({ ...form, isActive: e.target.value === 'true' })}
                    className={INPUT_CLS}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Conditional: Bank fields */}
              {!isMobileMoney && form.accountType !== 'CASH' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Routing / Sort Code</label>
                    <input type="text" value={form.routingNumber}
                      onChange={e => setForm({ ...form, routingNumber: e.target.value })}
                      placeholder="021000021" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SWIFT / BIC Code</label>
                    <input type="text" value={form.swiftCode}
                      onChange={e => setForm({ ...form, swiftCode: e.target.value })}
                      placeholder="SBICUGKX" className={INPUT_CLS} />
                  </div>
                </div>
              )}

              {/* Conditional: Mobile Money fields */}
              {isMobileMoney && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg space-y-3">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400 flex items-center gap-2">
                    <Smartphone className="w-4 h-4" /> Mobile Money Details
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Merchant ID</label>
                      <input type="text" value={form.mobileMerchantId}
                        onChange={e => setForm({ ...form, mobileMerchantId: e.target.value })}
                        placeholder="MTN-MERCHANT-12345" className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Shortcode</label>
                      <input type="text" value={form.mobileShortcode}
                        onChange={e => setForm({ ...form, mobileShortcode: e.target.value })}
                        placeholder="*165*3#" className={INPUT_CLS} />
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional notes about this account..."
                  rows={2} className={`${INPUT_CLS} h-auto`} />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'Saving...' : isEditing ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════ TRANSFER FUNDS MODAL ════ */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTransferModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-500" /> Transfer Funds
              </h2>
              <button onClick={() => setShowTransferModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Account *</label>
                <select value={transferForm.fromBankAccountId}
                  onChange={e => setTransferForm({ ...transferForm, fromBankAccountId: e.target.value })}
                  className={INPUT_CLS} required>
                  <option value="">Select source...</option>
                  {accounts.filter(a => a.isActive).map(a => (
                    <option key={a.id} value={a.id} disabled={a.id === transferForm.toBankAccountId}>
                      {a.accountName} — {formatCurrency(a.currentBalance, a.currency)}
                    </option>
                  ))}
                </select>
                {fromAcct && (
                  <p className="text-xs text-gray-400 mt-1">
                    Available: {formatCurrency(fromAcct.currentBalance, fromAcct.currency)}
                  </p>
                )}
              </div>

              <div className="flex justify-center">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Account *</label>
                <select value={transferForm.toBankAccountId}
                  onChange={e => setTransferForm({ ...transferForm, toBankAccountId: e.target.value })}
                  className={INPUT_CLS} required>
                  <option value="">Select destination...</option>
                  {accounts.filter(a => a.isActive && a.id !== transferForm.fromBankAccountId).map(a => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} — {formatCurrency(a.currentBalance, a.currency)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
                  <input type="number" step="0.01" min="0.01" value={transferForm.amount}
                    onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })}
                    placeholder="0.00" className={INPUT_CLS} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                  <input type="date" value={transferForm.transferDate}
                    onChange={e => setTransferForm({ ...transferForm, transferDate: e.target.value })}
                    className={INPUT_CLS} required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference</label>
                <input type="text" value={transferForm.reference}
                  onChange={e => setTransferForm({ ...transferForm, reference: e.target.value })}
                  placeholder="Optional reference number" className={INPUT_CLS} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea value={transferForm.notes}
                  onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })}
                  placeholder="Optional notes..." rows={2} className={`${INPUT_CLS} h-auto`} />
              </div>

              {/* Transfer Summary */}
              {fromAcct && toAcct && transferForm.amount && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Transfer Summary</p>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">From</span>
                      <span className="font-medium text-gray-900 dark:text-gray-200">{fromAcct.accountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">To</span>
                      <span className="font-medium text-gray-900 dark:text-gray-200">{toAcct.accountName}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-blue-200 dark:border-blue-800">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Amount</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(parseFloat(transferForm.amount) || 0, fromAcct.currency)}
                      </span>
                    </div>
                  </div>
                  {fromAcct.glAccountCode && toAcct.glAccountCode && (
                    <p className="text-xs text-gray-400 pt-1">
                      GL: DR {toAcct.glAccountCode}, CR {fromAcct.glAccountCode}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'Processing...' : 'Complete Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
