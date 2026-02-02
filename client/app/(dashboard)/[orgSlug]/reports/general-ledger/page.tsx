'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';
import Link from 'next/link';
import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import Loading from '@/components/ui/loading';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Account {
  id: string;
  code: string;
  name: string;
  accountType: string;
}

interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string | null;
  transaction: {
    id: string;
    transactionDate: Date;
    reference: string | null;
    description: string;
    transactionType: string;
    status: string;
  };
}

interface GLReportData {
  account: Account;
  entries: LedgerEntry[];
  summary: {
    openingBalance: number;
    totalDebits: number;
    totalCredits: number;
    closingBalance: number;
    entryCount: number;
  };
}

export default function GeneralLedgerPage() {
  // Onboarding guard - redirects if setup incomplete
  const onboardingCheck = useOnboardingGuard();
  
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { currency } = useOrganization();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [reportData, setReportData] = useState<GLReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchGeneralLedger();
    }
  }, [selectedAccountId, startDate, endDate]);

  async function fetchAccounts() {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/chart-of-accounts`);
      if (!response.ok) throw new Error('Failed to fetch accounts');
      
      const data = await response.json();
      const activeAccounts = data.accounts.filter((a: Account) => a.accountType);
      setAccounts(activeAccounts);
      
      // Auto-select first account if available
      if (activeAccounts.length > 0) {
        setSelectedAccountId(activeAccounts[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load accounts');
    }
  }

  async function fetchGeneralLedger() {
    try {
      setLoading(true);
      setError(null);
      
      const url = `/api/orgs/${orgSlug}/chart-of-accounts/${selectedAccountId}?startDate=${startDate}&endDate=${endDate}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error('Failed to fetch general ledger');
      
      const data = await response.json();
      
      // Calculate running balance
      let runningBalance = 0;
      const accountType = data.account.accountType;
      const isDebitNormal = ['ASSET', 'EXPENSE'].includes(accountType);
      
      // Calculate opening balance (transactions before start date)
      const openingResponse = await fetch(
        `/api/orgs/${orgSlug}/chart-of-accounts/${selectedAccountId}?endDate=${new Date(new Date(startDate).getTime() - 86400000).toISOString().split('T')[0]}`
      );
      
      let openingBalance = 0;
      if (openingResponse.ok) {
        const openingData = await openingResponse.json();
        openingBalance = openingData.balance || 0;
      }
      
      runningBalance = openingBalance;
      
      // Add running balance to each entry
      const entriesWithBalance = data.transactions.map((entry: LedgerEntry) => {
        const amount = entry.amount;
        if (entry.entryType === 'DEBIT') {
          runningBalance += isDebitNormal ? amount : -amount;
        } else {
          runningBalance += isDebitNormal ? -amount : amount;
        }
        
        return {
          ...entry,
          runningBalance,
        };
      });
      
      // Calculate summary
      const totalDebits = data.transactions
        .filter((e: LedgerEntry) => e.entryType === 'DEBIT')
        .reduce((sum: number, e: LedgerEntry) => sum + e.amount, 0);
      
      const totalCredits = data.transactions
        .filter((e: LedgerEntry) => e.entryType === 'CREDIT')
        .reduce((sum: number, e: LedgerEntry) => sum + e.amount, 0);
      
      setReportData({
        account: data.account,
        entries: entriesWithBalance,
        summary: {
          openingBalance,
          totalDebits,
          totalCredits,
          closingBalance: runningBalance,
          entryCount: data.transactions.length,
        },
      });
    } catch (err) {
      setError('Failed to load general ledger report');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start print:hidden">
        <div>
          <h1 className="text-3xl font-bold">General Ledger Report</h1>
          <p className="text-gray-600 mt-1">Detailed transaction history by account</p>
        </div>
        <Button variant="outline" onClick={handlePrint} disabled={!reportData}>
          Print Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="account">Account:</Label>
              <select
                id="account"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an account...</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="startDate">Start Date:</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date:</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      )}

      {/* Report */}
      {!loading && reportData && (
        <Card>
          <CardHeader>
            <div className="text-center">
              <CardTitle className="text-2xl">General Ledger Report</CardTitle>
              <p className="text-gray-600 mt-1">
                Account: {reportData.account.code} - {reportData.account.name}
              </p>
              <p className="text-sm text-gray-500">
                {new Date(startDate).toLocaleDateString()} -{' '}
                {new Date(endDate).toLocaleDateString()}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded">
                  <p className="text-xs text-gray-600">Opening Balance</p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(reportData.summary.openingBalance, currency)}
                  </p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <p className="text-xs text-gray-600">Total Debits</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(reportData.summary.totalDebits, currency)}
                  </p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded">
                  <p className="text-xs text-gray-600">Total Credits</p>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(reportData.summary.totalCredits, currency)}
                  </p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded">
                  <p className="text-xs text-gray-600">Closing Balance</p>
                  <p className="text-lg font-bold text-purple-600">
                    {formatCurrency(reportData.summary.closingBalance, currency)}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600">Transactions</p>
                  <p className="text-lg font-bold text-gray-700">
                    {reportData.summary.entryCount}
                  </p>
                </div>
              </div>

              {/* Transactions Table */}
              {reportData.entries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-2">Date</th>
                        <th className="text-left py-3 px-2">Reference</th>
                        <th className="text-left py-3 px-2">Description</th>
                        <th className="text-left py-3 px-2">Type</th>
                        <th className="text-right py-3 px-2">Debit</th>
                        <th className="text-right py-3 px-2">Credit</th>
                        <th className="text-right py-3 px-2">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.summary.openingBalance !== 0 && (
                        <tr className="border-b border-gray-100 bg-blue-50">
                          <td className="py-2 px-2" colSpan={4}>
                            <span className="font-semibold">Opening Balance</span>
                          </td>
                          <td className="py-2 px-2 text-right"></td>
                          <td className="py-2 px-2 text-right"></td>
                          <td className="py-2 px-2 text-right font-semibold">
                            {formatCurrency(reportData.summary.openingBalance, currency)}
                          </td>
                        </tr>
                      )}
                      {reportData.entries.map((entry: any) => (
                        <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-2">
                            {new Date(entry.transaction.transactionDate).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-2">
                            <Link
                              href={`/${orgSlug}/general-ledger/transactions/${entry.transactionId}`}
                              className="text-blue-600 hover:underline"
                            >
                              {entry.transaction.reference || entry.transactionId.slice(0, 8)}
                            </Link>
                          </td>
                          <td className="py-2 px-2">
                            {entry.description || entry.transaction.description}
                          </td>
                          <td className="py-2 px-2">
                            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                              {entry.transaction.transactionType}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right">
                            {entry.entryType === 'DEBIT' ? (
                              <span className="text-green-600 font-medium">
                                {formatCurrency(entry.amount, currency)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {entry.entryType === 'CREDIT' ? (
                              <span className="text-red-600 font-medium">
                                {formatCurrency(entry.amount, currency)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right font-medium">
                            {formatCurrency(entry.runningBalance, currency)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                        <td className="py-3 px-2" colSpan={4}>
                          Closing Balance
                        </td>
                        <td className="py-3 px-2 text-right text-green-600">
                          {formatCurrency(reportData.summary.totalDebits, currency)}
                        </td>
                        <td className="py-3 px-2 text-right text-red-600">
                          {formatCurrency(reportData.summary.totalCredits, currency)}
                        </td>
                        <td className="py-3 px-2 text-right text-purple-600">
                          {formatCurrency(reportData.summary.closingBalance, currency)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No transactions found for the selected period</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Try adjusting the date range or selecting a different account
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Account Selected */}
      {!loading && !reportData && !error && !selectedAccountId && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Please select an account to view the general ledger</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
