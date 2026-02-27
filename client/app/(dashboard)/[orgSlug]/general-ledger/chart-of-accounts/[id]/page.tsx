'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  BookOpen,
  Shield,
  Landmark,
  Lock,
  Unlock,
  Activity,
  X,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LedgerEntry {
  id: string;
  entryType: string;
  amount: number;
  amountInBase: number;
  currency: string;
  balance: number;
  transaction: {
    id: string;
    transactionDate: string;
    transactionNumber: string;
    description: string;
    transactionType: string;
  };
}

interface ChildAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  balance: number;
  isActive: boolean;
}

interface Account {
  id: string;
  code: string;
  name: string;
  accountType: string;
  accountSubType: string | null;
  description: string | null;
  isActive: boolean;
  isSystem: boolean;
  allowManualJournal: boolean;
  isBankAccount: boolean;
  balance: number;
  foreignBalance: number | null;
  currency: string;
  level: number;
  hasChildren: boolean;
  parent?: { id: string; code: string; name: string } | null;
  children?: ChildAccount[];
  _count: {
    ledgerEntries: number;
    children: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  ASSET: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  LIABILITY: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  EQUITY: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  REVENUE: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  EXPENSE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  COST_OF_SALES: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

function getAmountSize(formatted: string): string {
  const len = formatted.length;
  if (len <= 12) return 'text-2xl';
  if (len <= 18) return 'text-xl';
  return 'text-lg';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AccountDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const accountId = params.id as string;
  const { currency } = useOrganization();

  const [account, setAccount] = useState<Account | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchAccountDetails();
  }, [accountId, startDate, endDate]);

  const fetchAccountDetails = async () => {
    try {
      const qp = new URLSearchParams();
      if (startDate) qp.append('startDate', startDate);
      if (endDate) qp.append('endDate', endDate);

      const res = await fetch(`/api/orgs/${orgSlug}/chart-of-accounts/${accountId}?${qp}`);
      const data = await res.json();

      if (data.success) {
        setAccount(data.data.account);
        setEntries(data.data.ledgerEntries);
      }
    } catch (error) {
      console.error('Error fetching account details:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = (() => {
    if (!entries.length) return { totalDebits: 0, totalCredits: 0, netChange: 0 };
    const totalDebits = entries
      .filter((e) => e.entryType === 'DEBIT')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const totalCredits = entries
      .filter((e) => e.entryType === 'CREDIT')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return { totalDebits, totalCredits, netChange: totalDebits - totalCredits };
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading account details…</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-16">
        <BookOpen className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">Account not found</p>
        <Link
          href={`/${orgSlug}/general-ledger/chart-of-accounts`}
          className="text-blue-600 dark:text-blue-400 hover:underline mt-3 inline-block text-sm"
        >
          Back to Chart of Accounts
        </Link>
      </div>
    );
  }

  const typeColor = TYPE_COLORS[account.accountType] || TYPE_COLORS.ASSET;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push(`/${orgSlug}/general-ledger/chart-of-accounts`)}
            className="mt-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            {/* Breadcrumb */}
            {account.parent && (
              <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-1">
                <Link
                  href={`/${orgSlug}/general-ledger/chart-of-accounts/${account.parent.id}`}
                  className="hover:text-blue-500 dark:hover:text-blue-400"
                >
                  {account.parent.code} {account.parent.name}
                </Link>
                <ChevronRight className="h-3 w-3" />
              </div>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {account.code} – {account.name}
              </h1>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${typeColor}`}>
                {account.accountType.replace(/_/g, ' ')}
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                account.isActive
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {account.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              {account.isSystem && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Shield className="h-3.5 w-3.5" /> System
                </span>
              )}
              {account.isBankAccount && (
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Landmark className="h-3.5 w-3.5" /> Bank
                </span>
              )}
              <span className="flex items-center gap-1">
                {account.allowManualJournal ? (
                  <><Unlock className="h-3.5 w-3.5 text-green-500" /> Manual allowed</>
                ) : (
                  <><Lock className="h-3.5 w-3.5 text-gray-400" /> System-controlled</>
                )}
              </span>
              <span>{account._count.ledgerEntries} entries</span>
              {account.description && (
                <span className="hidden lg:inline">&middot; {account.description}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Balance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Balance</span>
            <Activity className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          </div>
          <div className={`${getAmountSize(formatCurrency(Number(account.balance), currency))} font-bold text-gray-900 dark:text-white`}>
            {formatCurrency(Math.abs(Number(account.balance)), currency)}
          </div>
          {Number(account.balance) !== 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {Number(account.balance) > 0 ? 'Debit' : 'Credit'} balance
            </span>
          )}
          {account.foreignBalance && Number(account.foreignBalance) !== 0 && account.currency !== currency && (
            <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {formatCurrency(Math.abs(Number(account.foreignBalance)), account.currency)} ({account.currency})
            </div>
          )}
        </div>

        {/* Total Debits */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Debits</span>
            <TrendingUp className="h-5 w-5 text-green-500 dark:text-green-400" />
          </div>
          <div className={`${getAmountSize(formatCurrency(stats.totalDebits, currency))} font-bold text-green-600 dark:text-green-400`}>
            {formatCurrency(stats.totalDebits, currency)}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {entries.filter((e) => e.entryType === 'DEBIT').length} entries
          </span>
        </div>

        {/* Total Credits */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Credits</span>
            <TrendingDown className="h-5 w-5 text-red-500 dark:text-red-400" />
          </div>
          <div className={`${getAmountSize(formatCurrency(stats.totalCredits, currency))} font-bold text-red-600 dark:text-red-400`}>
            {formatCurrency(stats.totalCredits, currency)}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {entries.filter((e) => e.entryType === 'CREDIT').length} entries
          </span>
        </div>

        {/* Net Change */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Change</span>
            <Calendar className="h-5 w-5 text-purple-500 dark:text-purple-400" />
          </div>
          <div className={`${getAmountSize(formatCurrency(Math.abs(stats.netChange), currency))} font-bold ${
            stats.netChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {formatCurrency(Math.abs(stats.netChange), currency)}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {stats.netChange >= 0 ? 'Net Debit' : 'Net Credit'}
          </span>
        </div>
      </div>

      {/* ── Child Accounts ── */}
      {account.children && account.children.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Child Accounts ({account.children.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {account.children.map((child) => (
              <Link
                key={child.id}
                href={`/${orgSlug}/general-ledger/chart-of-accounts/${child.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {child.code}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{child.name}</span>
                  {!child.isActive && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">(Inactive)</span>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white tabular-nums">
                  {formatCurrency(Math.abs(child.balance), currency)}
                  {child.balance !== 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                      {child.balance > 0 ? 'DR' : 'CR'}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Date Filters ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                End Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Transaction History ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Transaction History
            {entries.length > 0 && (
              <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-2">
                ({entries.length} entries)
              </span>
            )}
          </h2>
        </div>

        {entries.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Activity className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear date filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Debit
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Credit
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(entry.transaction.transactionDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <Link
                        href={`/${orgSlug}/general-ledger/journal-entries/list`}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-mono"
                      >
                        {entry.transaction.transactionNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-900 dark:text-gray-200 max-w-xs truncate">
                      {entry.transaction.description}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-right tabular-nums">
                      {entry.entryType === 'DEBIT' ? (
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(Number(entry.amount), currency)}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-right tabular-nums">
                      {entry.entryType === 'CREDIT' ? (
                        <span className="font-medium text-red-600 dark:text-red-400">
                          {formatCurrency(Number(entry.amount), currency)}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white tabular-nums">
                      {formatCurrency(Math.abs(Number(entry.balance)), currency)}
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                        {Number(entry.balance) >= 0 ? 'DR' : 'CR'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
