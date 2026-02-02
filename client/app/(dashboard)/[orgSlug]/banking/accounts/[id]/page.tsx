'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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

interface Transaction {
  id: string;
  transactionNumber: string;
  transactionDate: string;
  description: string;
  reference: string;
  status: string;
}

interface LedgerEntry {
  id: string;
  debit: number;
  credit: number;
  description: string;
  account: Account;
  transaction: Transaction;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  routingNumber: string | null;
  currency: string;
  currentBalance: number;
  isActive: boolean;
  lastReconciledDate: string | null;
  lastReconciledBalance: number | null;
  account: Account;
  transactions: LedgerEntry[];
}

export default function BankAccountDetailsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const accountId = params.id as string;

  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchBankAccount();
  }, [startDate, endDate]);

  async function fetchBankAccount() {
    try {
      setLoading(true);
      const url = new URL(`/api/orgs/${orgSlug}/bank-accounts/${accountId}`, window.location.origin);
      url.searchParams.append('includeTransactions', 'true');
      if (startDate) url.searchParams.append('startDate', startDate);
      if (endDate) url.searchParams.append('endDate', endDate);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch bank account');
      const data = await response.json();
      setBankAccount(data);
    } catch (err) {
      setError('Failed to load bank account details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function calculateRunningBalance(transactions: LedgerEntry[]): LedgerEntry[] {
    let balance = 0;
    return transactions.map((entry) => {
      balance += entry.debit - entry.credit;
      return { ...entry, runningBalance: balance };
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !bankAccount) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error || 'Bank account not found'}</Alert>
        <Link href={`/${orgSlug}/banking/accounts`}>
          <Button variant="outline">Back to Bank Accounts</Button>
        </Link>
      </div>
    );
  }

  const transactionsWithBalance = calculateRunningBalance(bankAccount.transactions || []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/${orgSlug}/banking/accounts`}
          className="text-blue-600 hover:underline text-sm"
        >
          ← Back to Bank Accounts
        </Link>
        <h1 className="text-3xl font-bold mt-2">{bankAccount.bankName}</h1>
        <p className="text-gray-600 mt-1">
          Account ending in ****{bankAccount.accountNumber.slice(-4)}
        </p>
      </div>

      {/* Account Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              ${bankAccount.currentBalance.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{bankAccount.currency}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Account Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Type:</span>{' '}
                <span className="font-medium">{bankAccount.accountType}</span>
              </div>
              {bankAccount.routingNumber && (
                <div>
                  <span className="text-gray-600">Routing:</span>{' '}
                  <span className="font-mono">{bankAccount.routingNumber}</span>
                </div>
              )}
              <div>
                <span className="text-gray-600">Status:</span>{' '}
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    bankAccount.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {bankAccount.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">GL Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/${orgSlug}/general-ledger/chart-of-accounts/${bankAccount.account.id}`}
              className="text-blue-600 hover:underline"
            >
              <p className="font-medium">{bankAccount.account.code}</p>
              <p className="text-sm text-gray-600">{bankAccount.account.name}</p>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Link href={`/${orgSlug}/banking/transfers?from=${accountId}`}>
          <Button variant="outline">Transfer Funds</Button>
        </Link>
        <Link href={`/${orgSlug}/banking/reconciliation?account=${accountId}`}>
          <Button variant="outline">Reconcile Account</Button>
        </Link>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Transaction History</CardTitle>
            <div className="flex gap-2 items-center">
              <Label htmlFor="startDate" className="text-sm">
                From:
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
              <Label htmlFor="endDate" className="text-sm">
                To:
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transactionsWithBalance.length === 0 ? (
            <p className="text-center text-gray-600 py-8">No transactions found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm">
                    <th className="py-2">Date</th>
                    <th className="py-2">Transaction</th>
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Debit</th>
                    <th className="py-2 text-right">Credit</th>
                    <th className="py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsWithBalance.map((entry: any) => (
                    <tr key={entry.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 text-sm">
                        {new Date(entry.transaction.transactionDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-sm">
                        <Link
                          href={`/${orgSlug}/general-ledger/journal-entries/list?transactionId=${entry.transaction.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {entry.transaction.transactionNumber}
                        </Link>
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {entry.description || entry.transaction.description}
                      </td>
                      <td className="py-3 text-sm text-right text-green-600">
                        {entry.debit > 0 ? `$${entry.debit.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 text-sm text-right text-red-600">
                        {entry.credit > 0 ? `$${entry.credit.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 text-sm text-right font-medium">
                        ${entry.runningBalance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {bankAccount.lastReconciledDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Last Reconciliation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Date:</span>{' '}
                <span className="font-medium">
                  {new Date(bankAccount.lastReconciledDate).toLocaleDateString()}
                </span>
              </div>
              {bankAccount.lastReconciledBalance !== null && (
                <div>
                  <span className="text-gray-600">Reconciled Balance:</span>{' '}
                  <span className="font-medium">
                    ${bankAccount.lastReconciledBalance.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
