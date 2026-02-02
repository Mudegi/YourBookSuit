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
import { useOrganization } from '@/hooks/useOrganization';

interface BalanceSheetAccount {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  accountCategory?: string;
  debit: string;
  credit: string;
  balance: string;
  transactionCount: number;
}

interface BalanceSheetData {
  organizationId: string;
  asOfDate: string;
  basis: 'ACCRUAL' | 'CASH';
  assets: {
    currentAssets: {
      title: string;
      accounts: BalanceSheetAccount[];
      subtotal: string;
    };
    fixedAssets: {
      title: string;
      accounts: BalanceSheetAccount[];
      subtotal: string;
    };
    otherAssets: {
      title: string;
      accounts: BalanceSheetAccount[];
      subtotal: string;
    };
    totalAssets: string;
  };
  liabilities: {
    currentLiabilities: {
      title: string;
      accounts: BalanceSheetAccount[];
      subtotal: string;
    };
    longTermLiabilities: {
      title: string;
      accounts: BalanceSheetAccount[];
      subtotal: string;
    };
    totalLiabilities: string;
  };
  equity: {
    retainedEarnings: string;
    currentYearEarnings: string;
    otherEquity: {
      title: string;
      accounts: BalanceSheetAccount[];
      subtotal: string;
    };
    totalEquity: string;
  };
  totalLiabilitiesAndEquity: string;
}

export default function BalanceSheetPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { currency } = useOrganization();

  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchBalanceSheet();
  }, [asOfDate]);

  async function fetchBalanceSheet() {
    try {
      setLoading(true);
      const url = `/api/orgs/${orgSlug}/reports/balance-sheet?asOfDate=${asOfDate}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error('Failed to fetch balance sheet');
      
      const data = await response.json();
      if (data.success && data.report) {
        setBalanceSheet(data.report);
      } else {
        throw new Error(data.error || 'Failed to load balance sheet');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load balance sheet');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !balanceSheet) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error || 'Failed to load balance sheet'}</Alert>
        <Link href={`/${orgSlug}/reports`}>
          <Button variant="outline">Back to Reports</Button>
        </Link>
      </div>
    );
  }

  const formatCurrency = (value: string, currencyCode?: string) => {
    return parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const difference = parseFloat(balanceSheet.assets.totalAssets) - 
    parseFloat(balanceSheet.totalLiabilitiesAndEquity);
  
  const isBalanced = Math.abs(difference) < 0.01; // Consider balanced if difference is less than 1 cent

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start print:hidden">
        <div>
          <Link href={`/${orgSlug}/reports`}>
            <Button variant="ghost" className="mb-2">
              ← Back to Reports
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Balance Sheet</h1>
          <p className="text-gray-600 mt-1">
            As of {new Date(balanceSheet.asOfDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2 items-end">
          <div>
            <Label htmlFor="asOfDate">As of Date:</Label>
            <Input
              id="asOfDate"
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button variant="outline" onClick={handlePrint}>
            Print Report
          </Button>
        </div>
      </div>

      {/* Balance Status */}
      {!isBalanced && (
        <Alert variant="error">
          ⚠️ Balance Sheet is out of balance by ${Math.abs(difference).toFixed(2)}
          <br />
          Assets should equal Liabilities + Equity
        </Alert>
      )}

      {isBalanced && (
        <Alert variant="success">
          ✓ Balance Sheet is balanced - Assets = Liabilities + Equity
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="text-center">
            <CardTitle className="text-2xl">Balance Sheet</CardTitle>
            <p className="text-gray-600">
              As of {new Date(balanceSheet.asOfDate).toLocaleDateString()}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* ASSETS */}
            <div>
              <h2 className="text-xl font-bold border-b-2 pb-2 mb-4">ASSETS</h2>

              {/* Current Assets */}
              {balanceSheet.assets.currentAssets.accounts.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-2">Current Assets</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {balanceSheet.assets.currentAssets.accounts.map((account) => (
                        <tr key={account.accountId}>
                          <td className="py-1 pl-4">
                            <Link
                              href={`/${orgSlug}/general-ledger/chart-of-accounts/${account.accountId}`}
                              className="text-blue-600 hover:underline"
                            >
                              {account.accountCode} - {account.accountName}
                            </Link>
                          </td>
                          <td className="py-1 text-right pr-4">
                            {formatCurrency(account.balance, currency)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t font-semibold">
                        <td className="py-2 pl-8">Total Current Assets</td>
                        <td className="py-2 text-right pr-4">
                          {formatCurrency(balanceSheet.assets.currentAssets.subtotal, currency)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Fixed Assets */}
              {balanceSheet.assets.fixedAssets.accounts.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-2">Fixed Assets</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {balanceSheet.assets.fixedAssets.accounts.map((account) => (
                        <tr key={account.accountId}>
                          <td className="py-1 pl-4">
                            <Link
                              href={`/${orgSlug}/general-ledger/chart-of-accounts/${account.accountId}`}
                              className="text-blue-600 hover:underline"
                            >
                              {account.accountCode} - {account.accountName}
                            </Link>
                          </td>
                          <td className="py-1 text-right pr-4">
                            {formatCurrency(account.balance, currency)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t font-semibold">
                        <td className="py-2 pl-8">Total Fixed Assets</td>
                        <td className="py-2 text-right pr-4">
                          {formatCurrency(balanceSheet.assets.fixedAssets.subtotal, currency)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Other Assets */}
              {balanceSheet.assets.otherAssets.accounts.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-2">Other Assets</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {balanceSheet.assets.otherAssets.accounts.map((account) => (
                        <tr key={account.accountId}>
                          <td className="py-1 pl-4">
                            <Link
                              href={`/${orgSlug}/general-ledger/chart-of-accounts/${account.accountId}`}
                              className="text-blue-600 hover:underline"
                            >
                              {account.accountCode} - {account.accountName}
                            </Link>
                          </td>
                          <td className="py-1 text-right pr-4">
                            {formatCurrency(account.balance, currency)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t font-semibold">
                        <td className="py-2 pl-8">Total Other Assets</td>
                        <td className="py-2 text-right pr-4">
                          {formatCurrency(balanceSheet.assets.otherAssets.subtotal, currency)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Total Assets */}
              <div className="border-t-2 border-gray-800 pt-2">
                <table className="w-full">
                  <tbody>
                    <tr className="text-lg font-bold">
                      <td className="py-2">TOTAL ASSETS</td>
                      <td className="py-2 text-right pr-4">
                        {formatCurrency(balanceSheet.assets.totalAssets, currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* LIABILITIES & EQUITY */}
            <div>
              <h2 className="text-xl font-bold border-b-2 pb-2 mb-4">
                LIABILITIES & EQUITY
              </h2>

              {/* Current Liabilities */}
              {balanceSheet.liabilities.currentLiabilities.accounts.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-2">
                    Current Liabilities
                  </h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {balanceSheet.liabilities.currentLiabilities.accounts.map((account) => (
                        <tr key={account.accountId}>
                          <td className="py-1 pl-4">
                            <Link
                              href={`/${orgSlug}/general-ledger/chart-of-accounts/${account.accountId}`}
                              className="text-blue-600 hover:underline"
                            >
                              {account.accountCode} - {account.accountName}
                            </Link>
                          </td>
                          <td className="py-1 text-right pr-4">
                            {formatCurrency(account.balance, currency)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t font-semibold">
                        <td className="py-2 pl-8">Total Current Liabilities</td>
                        <td className="py-2 text-right pr-4">
                          {formatCurrency(balanceSheet.liabilities.currentLiabilities.subtotal, currency)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Long-term Liabilities */}
              {balanceSheet.liabilities.longTermLiabilities.accounts.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-2">
                    Long-term Liabilities
                  </h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {balanceSheet.liabilities.longTermLiabilities.accounts.map((account) => (
                        <tr key={account.accountId}>
                          <td className="py-1 pl-4">
                            <Link
                              href={`/${orgSlug}/general-ledger/chart-of-accounts/${account.accountId}`}
                              className="text-blue-600 hover:underline"
                            >
                              {account.accountCode} - {account.accountName}
                            </Link>
                          </td>
                          <td className="py-1 text-right pr-4">
                            {formatCurrency(account.balance, currency)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t font-semibold">
                        <td className="py-2 pl-8">Total Long-term Liabilities</td>
                        <td className="py-2 text-right pr-4">
                          {formatCurrency(balanceSheet.liabilities.longTermLiabilities.subtotal, currency)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Total Liabilities */}
              <div className="border-t pt-2 mb-6">
                <table className="w-full">
                  <tbody>
                    <tr className="font-bold">
                      <td className="py-2">Total Liabilities</td>
                      <td className="py-2 text-right pr-4">
                        {formatCurrency(balanceSheet.liabilities.totalLiabilities, currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Equity */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">Equity</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {balanceSheet.equity.otherEquity.accounts.map((account) => (
                      <tr key={account.accountId}>
                        <td className="py-1 pl-4">
                          <Link
                            href={`/${orgSlug}/general-ledger/chart-of-accounts/${account.accountId}`}
                            className="text-blue-600 hover:underline"
                          >
                            {account.accountCode} - {account.accountName}
                          </Link>
                        </td>
                        <td className="py-1 text-right pr-4">
                          {formatCurrency(account.balance, currency)}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="py-1 pl-4">Retained Earnings</td>
                      <td className="py-1 text-right pr-4">
                        {formatCurrency(balanceSheet.equity.retainedEarnings, currency)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 pl-4">Current Year Earnings</td>
                      <td className="py-1 text-right pr-4">
                        {formatCurrency(balanceSheet.equity.currentYearEarnings, currency)}
                      </td>
                    </tr>
                    <tr className="border-t font-semibold">
                      <td className="py-2 pl-8">Total Equity</td>
                      <td className="py-2 text-right pr-4">
                        {formatCurrency(balanceSheet.equity.totalEquity, currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total Liabilities & Equity */}
              <div className="border-t-2 border-gray-800 pt-2">
                <table className="w-full">
                  <tbody>
                    <tr className="text-lg font-bold">
                      <td className="py-2">TOTAL LIABILITIES & EQUITY</td>
                      <td className="py-2 text-right pr-4">
                        {formatCurrency(balanceSheet.totalLiabilitiesAndEquity, currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Accounting Equation */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-center mb-2">Accounting Equation</h3>
              <p className="text-center text-lg">
                <span className="font-bold">Assets</span> = <span className="font-bold">Liabilities</span> + <span className="font-bold">Equity</span>
              </p>
              <p className="text-center text-xl font-bold text-blue-600 mt-2">
                {formatCurrency(balanceSheet.assets.totalAssets, currency)} ={' '}
                {formatCurrency(balanceSheet.liabilities.totalLiabilities, currency)} +{' '}
                {formatCurrency(balanceSheet.equity.totalEquity, currency)}
              </p>
              {isBalanced ? (
                <p className="text-center text-green-600 font-semibold mt-2">
                  ✓ Balanced
                </p>
              ) : (
                <p className="text-center text-red-600 font-semibold mt-2">
                  ✗ Out of Balance by ${Math.abs(difference).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
