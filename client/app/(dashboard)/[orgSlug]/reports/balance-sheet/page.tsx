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

interface BalanceSheetAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  balance: number;
}

interface BalanceSheetData {
  asOfDate: string;
  assets: {
    currentAssets: BalanceSheetAccount[];
    fixedAssets: BalanceSheetAccount[];
    otherAssets: BalanceSheetAccount[];
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: BalanceSheetAccount[];
    longTermLiabilities: BalanceSheetAccount[];
    totalLiabilities: number;
  };
  equity: {
    equityAccounts: BalanceSheetAccount[];
    retainedEarnings: number;
    totalEquity: number;
  };
  isBalanced: boolean;
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
      const url = `/api/orgs/{formatCurrency(orgSlug, currency)}/reports/balance-sheet?asOfDate={formatCurrency(asOfDate, currency)}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error('Failed to fetch balance sheet');
      
      const data = await response.json();
      setBalanceSheet(data);
    } catch (err) {
      setError('Failed to load balance sheet');
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
        <Link href={`/{formatCurrency(orgSlug, currency)}/reports`}>
          <Button variant="outline">Back to Reports</Button>
        </Link>
      </div>
    );
  }

  const difference = balanceSheet.assets.totalAssets - 
    (balanceSheet.liabilities.totalLiabilities + balanceSheet.equity.totalEquity);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start print:hidden">
        <div>
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
      {!balanceSheet.isBalanced && (
        <Alert variant="error">
          ⚠️ Balance Sheet is out of balance by ${Math.abs(difference).toFixed(2)}
          <br />
          Assets should equal Liabilities + Equity
        </Alert>
      )}

      {balanceSheet.isBalanced && (
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
              {balanceSheet.assets.currentAssets.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-2">Current Assets</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {balanceSheet.assets.currentAssets.map((account) => (
                        <tr key={account.id}>
                          <td className="py-1 pl-4">
                            <Link
                              href={`/{formatCurrency(orgSlug, currency)}/general-ledger/chart-of-accounts/{formatCurrency(account.id, currency)}`}
                              className="text-blue-600 hover:underline"
                            >
                              {account.code} - {account.name}
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
                          $
                          {balanceSheet.assets.currentAssets
                            .reduce((sum, a) => sum + a.balance, 0)
                            .toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Fixed Assets */}
              {balanceSheet.assets.fixedAssets.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-2">Fixed Assets</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {balanceSheet.assets.fixedAssets.map((account) => (
                        <tr key={account.id}>
                          <td className="py-1 pl-4">
                            <Link
                              href={`/{formatCurrency(orgSlug, currency)}/general-ledger/chart-of-accounts/{formatCurrency(account.id, currency)}`}
                              className="text-blue-600 hover:underline"
                            >
                              {account.code} - {account.name}
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
                          $
                          {balanceSheet.assets.fixedAssets
                            .reduce((sum, a) => sum + a.balance, 0)
                            .toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Other Assets */}
              {balanceSheet.assets.otherAssets.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-2">Other Assets</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {balanceSheet.assets.otherAssets.map((account) => (
                        <tr key={account.id}>
                          <td className="py-1 pl-4">
                            <Link
                              href={`/{formatCurrency(orgSlug, currency)}/general-ledger/chart-of-accounts/{formatCurrency(account.id, currency)}`}
                              className="text-blue-600 hover:underline"
                            >
                              {account.code} - {account.name}
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
                          $
                          {balanceSheet.assets.otherAssets
                            .reduce((sum, a) => sum + a.balance, 0)
                            .toFixed(2)}
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
              {balanceSheet.liabilities.currentLiabilities.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-2">
                    Current Liabilities
                  </h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {balanceSheet.liabilities.currentLiabilities.map((account) => (
                        <tr key={account.id}>
                          <td className="py-1 pl-4">
                            <Link
                              href={`/{formatCurrency(orgSlug, currency)}/general-ledger/chart-of-accounts/{formatCurrency(account.id, currency)}`}
                              className="text-blue-600 hover:underline"
                            >
                              {account.code} - {account.name}
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
                          $
                          {balanceSheet.liabilities.currentLiabilities
                            .reduce((sum, a) => sum + a.balance, 0)
                            .toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Long-term Liabilities */}
              {balanceSheet.liabilities.longTermLiabilities.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-2">
                    Long-term Liabilities
                  </h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {balanceSheet.liabilities.longTermLiabilities.map((account) => (
                        <tr key={account.id}>
                          <td className="py-1 pl-4">
                            <Link
                              href={`/{formatCurrency(orgSlug, currency)}/general-ledger/chart-of-accounts/{formatCurrency(account.id, currency)}`}
                              className="text-blue-600 hover:underline"
                            >
                              {account.code} - {account.name}
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
                          $
                          {balanceSheet.liabilities.longTermLiabilities
                            .reduce((sum, a) => sum + a.balance, 0)
                            .toFixed(2)}
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
                    {balanceSheet.equity.equityAccounts.map((account) => (
                      <tr key={account.id}>
                        <td className="py-1 pl-4">
                          <Link
                            href={`/{formatCurrency(orgSlug, currency)}/general-ledger/chart-of-accounts/{formatCurrency(account.id, currency)}`}
                            className="text-blue-600 hover:underline"
                          >
                            {account.code} - {account.name}
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
                        $
                        {(
                          balanceSheet.liabilities.totalLiabilities +
                          balanceSheet.equity.totalEquity
                        ).toFixed(2)}
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
              {balanceSheet.isBalanced ? (
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
