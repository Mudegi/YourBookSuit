'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  Lock,
  Unlock,
  Shield,
  Eye,
  EyeOff,
  Globe,
  FolderTree,
  List,
  X,
  AlertTriangle,
  Loader2,
  BookOpen,
  Landmark,
  PiggyBank,
  TrendingUp,
  Receipt,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  accountSubType: string | null;
  description: string | null;
  isActive: boolean;
  isSystem: boolean;
  balance: number;
  foreignBalance: number | null;
  currency: string;
  parentId: string | null;
  level: number;
  hasChildren: boolean;
  allowManualJournal: boolean;
  isBankAccount: boolean;
  tags: string[];
  parent?: { id: string; code: string; name: string } | null;
  _count?: { ledgerEntries: number; children: number };
}

interface FlatNode {
  account: ChartOfAccount;
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ACCOUNT_TYPES = [
  { value: 'ALL', label: 'All Types' },
  { value: 'ASSET', label: 'Assets' },
  { value: 'LIABILITY', label: 'Liabilities' },
  { value: 'EQUITY', label: 'Equity' },
  { value: 'REVENUE', label: 'Revenue' },
  { value: 'EXPENSE', label: 'Expenses' },
  { value: 'COST_OF_SALES', label: 'Cost of Sales' },
];

const TYPE_CONFIG: Record<string, { bg: string; text: string; darkBg: string; darkText: string; icon: any; label: string }> = {
  ASSET: { bg: 'bg-blue-100', text: 'text-blue-800', darkBg: 'dark:bg-blue-900/40', darkText: 'dark:text-blue-300', icon: Landmark, label: 'Asset' },
  LIABILITY: { bg: 'bg-red-100', text: 'text-red-800', darkBg: 'dark:bg-red-900/40', darkText: 'dark:text-red-300', icon: Receipt, label: 'Liability' },
  EQUITY: { bg: 'bg-purple-100', text: 'text-purple-800', darkBg: 'dark:bg-purple-900/40', darkText: 'dark:text-purple-300', icon: PiggyBank, label: 'Equity' },
  REVENUE: { bg: 'bg-green-100', text: 'text-green-800', darkBg: 'dark:bg-green-900/40', darkText: 'dark:text-green-300', icon: TrendingUp, label: 'Revenue' },
  EXPENSE: { bg: 'bg-orange-100', text: 'text-orange-800', darkBg: 'dark:bg-orange-900/40', darkText: 'dark:text-orange-300', icon: DollarSign, label: 'Expense' },
  COST_OF_SALES: { bg: 'bg-amber-100', text: 'text-amber-800', darkBg: 'dark:bg-amber-900/40', darkText: 'dark:text-amber-300', icon: BarChart3, label: 'Cost of Sales' },
};

const CODE_HINTS: Record<string, string> = {
  ASSET: '1000–1999',
  LIABILITY: '2000–2999',
  EQUITY: '3000–3999',
  REVENUE: '4000–4999',
  COST_OF_SALES: '5000–5999',
  EXPENSE: '6000–9999',
};

// ─── Helper Functions ────────────────────────────────────────────────────────

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.ASSET;
}

function getNormalBalanceDirection(type: string): 'DR' | 'CR' {
  return ['ASSET', 'EXPENSE', 'COST_OF_SALES'].includes(type) ? 'DR' : 'CR';
}

function getBalanceColor(balance: number, type: string): string {
  if (balance === 0) return 'text-gray-500 dark:text-gray-400';
  const normalDR = getNormalBalanceDirection(type) === 'DR';
  const isNormal = normalDR ? balance > 0 : balance < 0;
  return isNormal
    ? 'text-gray-900 dark:text-white'
    : 'text-red-600 dark:text-red-400';
}

// ─── Tree Building ───────────────────────────────────────────────────────────

function buildTree(accounts: ChartOfAccount[]): ChartOfAccount[] {
  const map = new Map<string, ChartOfAccount>();
  const roots: ChartOfAccount[] = [];

  accounts.forEach((a) => map.set(a.id, { ...a, children: [] }));

  accounts.forEach((a) => {
    const node = map.get(a.id)!;
    if (a.parentId && map.has(a.parentId)) {
      const parent = map.get(a.parentId)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  function sortTree(nodes: ChartOfAccount[]) {
    nodes.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    nodes.forEach((n) => { if (n.children?.length) sortTree(n.children); });
  }
  sortTree(roots);

  return roots;
}

function flattenTree(
  nodes: ChartOfAccount[],
  expandedIds: Set<string>,
  depth = 0
): FlatNode[] {
  const result: FlatNode[] = [];
  for (const node of nodes) {
    const hasChildren = (node.children?.length || 0) > 0 || node.hasChildren;
    const isExpanded = expandedIds.has(node.id);
    result.push({ account: node, depth, isExpanded, hasChildren });

    if (isExpanded && node.children?.length) {
      result.push(...flattenTree(node.children, expandedIds, depth + 1));
    }
  }
  return result;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ChartOfAccountsPage() {
  const onboardingCheck = useOnboardingGuard();
  const { currency } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showInactive, setShowInactive] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editAccount, setEditAccount] = useState<ChartOfAccount | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setError('');
      const qp = new URLSearchParams();
      if (!showInactive) qp.set('isActive', 'true');
      const res = await fetch(`/api/orgs/${orgSlug}/chart-of-accounts?${qp}`);
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data);
      } else {
        setError(data.error || 'Failed to fetch accounts');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, showInactive]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const filtered = useMemo(() => {
    let list = accounts;
    if (typeFilter !== 'ALL') {
      list = list.filter((a) => a.accountType === typeFilter);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.code.toLowerCase().includes(s) ||
          a.name.toLowerCase().includes(s) ||
          (a.description && a.description.toLowerCase().includes(s))
      );
    }
    return list;
  }, [accounts, typeFilter, search]);

  const tree = useMemo(() => buildTree(filtered), [filtered]);

  const flatList = useMemo(
    () => flattenTree(tree, expandedIds),
    [tree, expandedIds]
  );

  const summaryByType = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const a of accounts) {
      if (!a.isActive) continue;
      if (!map[a.accountType]) map[a.accountType] = { count: 0, total: 0 };
      map[a.accountType].count++;
      map[a.accountType].total += a.balance;
    }
    return map;
  }, [accounts]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(accounts.filter((a) => a.hasChildren || (a._count?.children ?? 0) > 0).map((a) => a.id)));
  };

  const collapseAll = () => setExpandedIds(new Set());

  const handleDelete = async (id: string) => {
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/chart-of-accounts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setDeleteConfirm(null);
      fetchAccounts();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const toggleManualJournal = async (account: ChartOfAccount) => {
    try {
      await fetch(`/api/orgs/${orgSlug}/chart-of-accounts/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: account.code,
          name: account.name,
          accountType: account.accountType,
          accountSubType: account.accountSubType,
          currency: account.currency,
          allowManualJournal: !account.allowManualJournal,
        }),
      });
      fetchAccounts();
    } catch {}
  };

  // Wait for onboarding check to complete
  if (onboardingCheck.loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Checking setup…</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading chart of accounts…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BookOpen className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            Chart of Accounts
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {accounts.length} accounts &middot; {accounts.filter((a) => a.isActive).length} active
          </p>
        </div>
        <button
          onClick={() => { setEditAccount(null); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors"
        >
          <Plus className="h-5 w-5" />
          New Account
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
          const stats = summaryByType[type];
          const Icon = cfg.icon;
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? 'ALL' : type)}
              className={`rounded-xl p-4 text-left transition-all border ${
                typeFilter === type
                  ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              } bg-white dark:bg-gray-800`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${cfg.bg} ${cfg.darkBg}`}>
                  <Icon className={`h-4 w-4 ${cfg.text} ${cfg.darkText}`} />
                </div>
                <span className={`text-xs font-semibold ${cfg.text} ${cfg.darkText}`}>
                  {cfg.label}
                </span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {stats ? formatCurrency(stats.total, currency) : formatCurrency(0, currency)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {stats?.count || 0} accounts
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-0 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code, name, or description…"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
        >
          {ACCOUNT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
            title="Expand All"
          >
            <FolderTree className="h-4 w-4" />
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
            title="Collapse All"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
              showInactive
                ? 'border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {showInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showInactive ? 'Showing Inactive' : 'Active Only'}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Account Tree Table ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <div className="col-span-5">Account</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-1 text-center">Currency</div>
          <div className="col-span-2 text-right">Balance</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {flatList.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <BookOpen className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {search || typeFilter !== 'ALL' ? 'No accounts match your filters' : 'No accounts found'}
            </p>
            {(search || typeFilter !== 'ALL') && (
              <button
                onClick={() => { setSearch(''); setTypeFilter('ALL'); }}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {flatList.map(({ account, depth, isExpanded, hasChildren }) => {
              const cfg = getTypeConfig(account.accountType);
              const inactive = !account.isActive;
              return (
                <div
                  key={account.id}
                  className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center transition-colors group ${
                    inactive
                      ? 'opacity-50 bg-gray-50/50 dark:bg-gray-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  }`}
                >
                  {/* Account Code & Name */}
                  <div className="col-span-5 flex items-center min-w-0" style={{ paddingLeft: `${depth * 24}px` }}>
                    {hasChildren ? (
                      <button
                        onClick={() => toggleExpand(account.id)}
                        className="p-1 mr-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        )}
                      </button>
                    ) : (
                      <span className="w-7 flex-shrink-0" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/${orgSlug}/general-ledger/chart-of-accounts/${account.id}`)}
                          className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {account.code}
                        </button>
                        {account.isSystem && (
                          <span title="System Account – Protected" className="flex-shrink-0">
                            <Shield className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                          </span>
                        )}
                        {account.isBankAccount && (
                          <span title="Bank Account" className="flex-shrink-0">
                            <Landmark className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => router.push(`/${orgSlug}/general-ledger/chart-of-accounts/${account.id}`)}
                        className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white truncate block max-w-full text-left"
                      >
                        {account.name}
                      </button>
                    </div>
                  </div>

                  {/* Type Badge */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} ${cfg.darkBg} ${cfg.darkText}`}>
                      {cfg.label}
                    </span>
                    {account.accountSubType && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                        {account.accountSubType}
                      </div>
                    )}
                  </div>

                  {/* Currency */}
                  <div className="col-span-1 text-center">
                    <span className={`text-xs font-medium ${
                      account.currency !== currency
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {account.currency}
                    </span>
                    {account.currency !== currency && (
                      <Globe className="h-3 w-3 text-amber-500 dark:text-amber-400 mx-auto mt-0.5" />
                    )}
                  </div>

                  {/* Balance */}
                  <div className="col-span-2 text-right">
                    <span className={`text-sm font-medium tabular-nums ${getBalanceColor(account.balance, account.accountType)}`}>
                      {formatCurrency(Math.abs(account.balance), currency)}
                    </span>
                    {account.balance !== 0 && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                        {account.balance > 0 ? 'DR' : 'CR'}
                      </span>
                    )}
                    {account.foreignBalance !== null && account.foreignBalance !== 0 && account.currency !== currency && (
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {formatCurrency(Math.abs(account.foreignBalance), account.currency)}
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="col-span-1 flex items-center justify-center gap-1">
                    <button
                      onClick={() => toggleManualJournal(account)}
                      title={account.allowManualJournal ? 'Manual journal allowed' : 'Manual journal locked'}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      {account.allowManualJournal ? (
                        <Unlock className="h-3.5 w-3.5 text-green-500 dark:text-green-400" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                    {hasChildren && (
                      <span title="Parent account" className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                        P
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditAccount(account); setShowModal(true); }}
                      className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {!account.isSystem && (
                      <button
                        onClick={() => { setDeleteConfirm(account.id); setDeleteError(''); }}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 dark:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Dialog ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Account</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              Are you sure you want to delete this account? This action cannot be undone.
            </p>
            {deleteError && (
              <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                {deleteError}
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <AccountFormModal
          account={editAccount}
          orgSlug={orgSlug}
          currency={currency}
          accounts={accounts}
          onClose={() => { setShowModal(false); setEditAccount(null); }}
          onSuccess={() => { setShowModal(false); setEditAccount(null); fetchAccounts(); }}
        />
      )}
    </div>
  );
}

// ─── Account Form Modal ──────────────────────────────────────────────────────

function AccountFormModal({
  account,
  orgSlug,
  currency,
  accounts,
  onClose,
  onSuccess,
}: {
  account: ChartOfAccount | null;
  orgSlug: string;
  currency: string;
  accounts: ChartOfAccount[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!account;

  const [formData, setFormData] = useState({
    code: account?.code || '',
    name: account?.name || '',
    accountType: account?.accountType || 'ASSET',
    accountSubType: account?.accountSubType || '',
    parentId: account?.parentId || '',
    currency: account?.currency || currency || 'USD',
    description: account?.description || '',
    isActive: account?.isActive ?? true,
    allowManualJournal: account?.allowManualJournal ?? true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parentOptions = useMemo(() => {
    const sameType = accounts.filter(
      (a) => a.accountType === formData.accountType && a.isActive && a.id !== account?.id
    );
    return sameType.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [accounts, formData.accountType, account?.id]);

  useEffect(() => {
    if (!isEdit) {
      setFormData((prev) => ({ ...prev, parentId: '' }));
    }
  }, [formData.accountType, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEdit
        ? `/api/orgs/${orgSlug}/chart-of-accounts/${account!.id}`
        : `/api/orgs/${orgSlug}/chart-of-accounts`;

      const body: any = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        accountType: formData.accountType,
        accountSubType: formData.accountSubType || undefined,
        currency: formData.currency,
        description: formData.description || undefined,
      };

      if (!isEdit && formData.parentId) {
        body.parentId = formData.parentId;
      }

      if (isEdit) {
        body.isActive = formData.isActive;
        body.allowManualJournal = formData.allowManualJournal;
      }

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save account');

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const codeHint = CODE_HINTS[formData.accountType] || '';
  const cfg = getTypeConfig(formData.accountType);

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${cfg.bg} ${cfg.darkBg}`}>
              <BookOpen className={`h-5 w-5 ${cfg.text} ${cfg.darkText}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {isEdit ? 'Edit Account' : 'New Account'}
              </h2>
              {isEdit && account?.isSystem && (
                <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  <Shield className="h-3 w-3" />
                  System account – some fields are protected
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Row 1: Code + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Account Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isEdit && account?.isSystem}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                placeholder={codeHint || '1000'}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
              {codeHint && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Standard range: {codeHint}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Account Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                disabled={isEdit && account?.isSystem}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                value={formData.accountType}
                onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
              >
                {ACCOUNT_TYPES.filter((t) => t.value !== 'ALL').map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Account Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="e.g. Cash at Bank"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Row 3: SubType + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Category / Sub-Type
              </label>
              <input
                type="text"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="e.g. Current Assets"
                value={formData.accountSubType}
                onChange={(e) => setFormData({ ...formData, accountSubType: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Currency
              </label>
              <input
                type="text"
                maxLength={3}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm uppercase"
                placeholder={currency || 'USD'}
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          {/* Row 4: Parent Account */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Parent Account
              </label>
              <select
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={formData.parentId}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              >
                <option value="">— No parent (top-level) —</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} – {p.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Nest under a parent account for hierarchy. Same type required.
              </p>
            </div>
          )}

          {/* Row 5: Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
              placeholder="Optional notes about this account…"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Row 6: Toggles (edit mode) */}
          {isEdit && (
            <div className="flex items-center gap-6 py-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  disabled={account?.isSystem}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowManualJournal}
                  onChange={(e) => setFormData({ ...formData, allowManualJournal: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Allow Manual Journal</span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
