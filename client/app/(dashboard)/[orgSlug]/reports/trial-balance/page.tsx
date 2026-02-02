'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, Download, Printer, CheckCircle, XCircle } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';

interface Account {
  id: string;
  code: string;
  name: string;
  accountType: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: string;
}

interface TrialBalanceData {
  accounts: {
    ASSET: Account[];
    LIABILITY: Account[];
    EQUITY: Account[];
    REVENUE: Account[];
    EXPENSE: Account[];
  };
  summary: {
    totalDebits: number;
    totalCredits: number;
    difference: number;
    isBalanced: boolean;
    asOfDate: string;
    accountCount: number;
  };
}

export default function TrialBalancePage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { currency } = useOrganization();

  const [data, setData] = useState<TrialBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchTrialBalance();
  }, [orgSlug, asOfDate]);

  const fetchTrialBalance = async () => {
    try {
      const response = await fetch(
        `/api/orgs/{formatCurrency(orgSlug, currency)}/reports/trial-balance?asOfDate={formatCurrency(asOfDate, currency)}`
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching trial balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderAccountGroup = (title: string, accounts: Account[]) => {
    if (accounts.length === 0) return null;

    const groupTotalDebit = accounts.reduce((sum, a) => sum + a.debit, 0);
    const groupTotalCredit = accounts.reduce((sum, a) => sum + a.credit, 0);

    return (
      <>
        <tr className="bg-gray-100">
          <td colSpan={3} className="px-6 py-3 text-sm font-bold text-gray-900">
            {title}
          </td>
          <td className="px-6 py-3"></td>
          <td className="px-6 py-3"></td>
        </tr>
        {accounts.map((account) => (
          <tr key={account.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {account.code}
            </td>
            <td className="px-6 py-4 text-sm text-gray-900">{account.name}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
              {account.accountType}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
              {account.debit > 0 ? (
                <span className="text-gray-900">{formatCurrency(account.debit, currency)}</span>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
              {account.credit > 0 ? (
                <span className="text-gray-900">{formatCurrency(account.credit, currency)}</span>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </td>
          </tr>
        ))}
        <tr className="bg-gray-50 font-semibold">
          <td colSpan={3} className="px-6 py-3 text-sm text-gray-900">
            {title} Total
          </td>
          <td className="px-6 py-3 text-sm text-right text-gray-900">
            {formatCurrency(groupTotalDebit, currency)}
          </td>
          <td className="px-6 py-3 text-sm text-right text-gray-900">
            {formatCurrency(groupTotalCredit, currency)}
          </td>
        </tr>
      </>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating trial balance...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load trial balance</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trial Balance</h1>
          <p className="text-gray-600 mt-1">
            Verify accounting equation: Assets = Liabilities + Equity
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <Printer className="h-5 w-5 mr-2" />
            Print
          </button>
          <button className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Balance Status */}
      <div
        className={`rounded-lg p-6 ${
          data.summary.isBalanced
            ? 'bg-green-50 border-2 border-green-200'
            : 'bg-red-50 border-2 border-red-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {data.summary.isBalanced ? (
              <CheckCircle className="h-8 w-8 text-green-600" />
            ) : (
              <XCircle className="h-8 w-8 text-red-600" />
            )}
            <div>
              <div
                className={`text-lg font-bold ${
                  data.summary.isBalanced ? 'text-green-900' : 'text-red-900'
                }`}
              >
                {data.summary.isBalanced ? 'Books are Balanced!' : 'Out of Balance!'}
              </div>
              <div
                className={`text-sm ${
                  data.summary.isBalanced ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {data.summary.isBalanced
                  ? 'Total debits equal total credits'
                  : `Difference: ${formatCurrency(data.summary.difference, currency)}`}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(data.summary.totalDebits, currency)}
            </div>
            <div className="text-sm text-gray-600">Total Debits = Total Credits</div>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5 text-gray-400" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              As of Date
            </label>
            <input
              type="date"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
            />
          </div>
          <div className="ml-auto text-sm text-gray-600">
            {data.summary.accountCount} accounts included
          </div>
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Trial Balance Report
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            As of {new Date(data.summary.asOfDate).toLocaleDateString()}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Debit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credit
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {renderAccountGroup('Assets', data.accounts.ASSET)}
              {renderAccountGroup('Liabilities', data.accounts.LIABILITY)}
              {renderAccountGroup('Equity', data.accounts.EQUITY)}
              {renderAccountGroup('Revenue', data.accounts.REVENUE)}
              {renderAccountGroup('Expenses', data.accounts.EXPENSE)}

              {/* Grand Total */}
              <tr className="bg-blue-50 border-t-2 border-blue-300 font-bold text-lg">
                <td colSpan={3} className="px-6 py-4 text-blue-900">
                  TOTAL
                </td>
                <td className="px-6 py-4 text-right text-blue-900">
                  {formatCurrency(data.summary.totalDebits, currency)}
                </td>
                <td className="px-6 py-4 text-right text-blue-900">
                  {formatCurrency(data.summary.totalCredits, currency)}
                </td>
              </tr>

              {/* Difference Row (if out of balance) */}
              {!data.summary.isBalanced && (
                <tr className="bg-red-50 font-bold">
                  <td colSpan={3} className="px-6 py-4 text-red-900">
                    DIFFERENCE (Out of Balance)
                  </td>
                  <td colSpan={2} className="px-6 py-4 text-right text-red-900">
                    {formatCurrency(data.summary.difference, currency)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Notes */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <p className="font-semibold mb-2">Notes:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            This report shows the balance of all active accounts as of{' '}
            {new Date(data.summary.asOfDate).toLocaleDateString()}.
          </li>
          <li>
            In double-entry bookkeeping, total debits must always equal total credits.
          </li>
          <li>
            Assets and Expenses normally have debit balances; Liabilities, Equity, and Revenue
            normally have credit balances.
          </li>
          <li>Only accounts with activity are shown in this report.</li>
        </ul>
      </div>
    </div>
  );
}
