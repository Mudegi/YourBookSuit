'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import Loading from '@/components/ui/loading';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProfitLossAccount {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  balance: string;
}

interface ReportSection {
  title: string;
  accounts: ProfitLossAccount[];
  subtotal: string;
}

interface ProfitLossData {
  organizationId: string;
  startDate: string;
  endDate: string;
  basis: string;
  revenue: ReportSection;
  costOfGoodsSold: ReportSection;
  grossProfit: string;
  operatingExpenses: ReportSection;
  operatingIncome: string;
  otherIncome: ReportSection;
  otherExpenses: ReportSection;
  netIncome: string;
}

export default function ProfitLossPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { currency } = useOrganization();

  const [profitLoss, setProfitLoss] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default to current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  useEffect(() => {
    fetchProfitLoss();
  }, [startDate, endDate]);

  async function fetchProfitLoss() {
    try {
      setLoading(true);
      const url = `/api/orgs/${orgSlug}/reports/profit-loss?startDate=${startDate}&endDate=${endDate}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error('Failed to fetch profit & loss');
      
      const data = await response.json();
      if (data.success && data.report) {
        setProfitLoss(data.report);
      } else {
        throw new Error(data.error || 'Failed to load profit & loss');
      }
    } catch (err) {
      setError('Failed to load profit & loss statement');
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

  if (error || !profitLoss) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error || 'Failed to load profit & loss statement'}</Alert>
        <Link href={`/${orgSlug}/reports`}>
          <Button variant="outline">Back to Reports</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start print:hidden">
        <div>
          <h1 className="text-3xl font-bold">Profit & Loss Statement</h1>
          <p className="text-gray-600 mt-1">Income Statement</p>
        </div>
        <div className="flex gap-2 items-end">
          <div>
            <Label htmlFor="startDate">Start Date:</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <Label htmlFor="endDate">End Date:</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button variant="outline" onClick={handlePrint}>
            Print Report
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="text-center">
            <CardTitle className="text-2xl">Profit & Loss Statement</CardTitle>
            <p className="text-gray-600">
              {new Date(profitLoss.startDate).toLocaleDateString()} -{' '}
              {new Date(profitLoss.endDate).toLocaleDateString()}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* REVENUE */}
            <div>
              <h2 className="text-xl font-bold border-b-2 pb-2 mb-4">REVENUE</h2>
              {profitLoss.revenue.accounts.length > 0 ? (
                <table className="w-full text-sm">
                  <tbody>
                    {profitLoss.revenue.accounts.map((account) => (
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
                    <tr className="border-t-2 font-bold text-lg">
                      <td className="py-2 pl-4">Total Revenue</td>
                      <td className="py-2 text-right pr-4">
                        {formatCurrency(profitLoss.revenue.subtotal, currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-600 text-center py-4">No revenue recorded</p>
              )}
            </div>

            {/* COST OF GOODS SOLD */}
            {profitLoss.costOfGoodsSold.accounts.length > 0 && (
              <div>
                <h2 className="text-xl font-bold border-b-2 pb-2 mb-4">
                  COST OF GOODS SOLD
                </h2>
                <table className="w-full text-sm">
                  <tbody>
                    {profitLoss.costOfGoodsSold.accounts.map((account) => (
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
                    <tr className="border-t-2 font-bold">
                      <td className="py-2 pl-4">Total Cost of Goods Sold</td>
                      <td className="py-2 text-right pr-4">
                        {formatCurrency(profitLoss.costOfGoodsSold.subtotal, currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* GROSS PROFIT */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <table className="w-full">
                <tbody>
                  <tr className="text-xl font-bold">
                    <td>GROSS PROFIT</td>
                    <td className="text-right">
                      <span
                        className={
                          profitLoss.grossProfit >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {formatCurrency(profitLoss.grossProfit, currency)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* OPERATING EXPENSES */}
            <div>
              <h2 className="text-xl font-bold border-b-2 pb-2 mb-4">
                OPERATING EXPENSES
              </h2>
              {profitLoss.operatingExpenses.accounts.length > 0 ? (
                <table className="w-full text-sm">
                  <tbody>
                    {profitLoss.operatingExpenses.accounts.map((account) => (
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
                    <tr className="border-t-2 font-bold">
                      <td className="py-2 pl-4">Total Operating Expenses</td>
                      <td className="py-2 text-right pr-4">
                        {formatCurrency(profitLoss.operatingExpenses.subtotal, currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-600 text-center py-4">No expenses recorded</p>
              )}
            </div>

            {/* NET INCOME */}
            <div className="bg-gradient-to-r from-blue-100 to-blue-50 p-6 rounded-lg border-2 border-blue-200">
              <table className="w-full">
                <tbody>
                  <tr className="text-2xl font-bold">
                    <td>NET INCOME</td>
                    <td className="text-right">
                      <span
                        className={
                          profitLoss.netIncome >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {formatCurrency(profitLoss.netIncome, currency)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-4 text-sm text-gray-700 text-center">
                <p>Revenue - COGS = Gross Profit - Expenses = Net Income</p>
                <p className="mt-1">
                  {formatCurrency(profitLoss.revenue.subtotal, currency)} -{' '}
                  {formatCurrency(profitLoss.costOfGoodsSold.subtotal, currency)} ={' '}
                  {formatCurrency(profitLoss.grossProfit, currency)} -{' '}
                  {formatCurrency(profitLoss.operatingExpenses.subtotal, currency)} ={' '}
                  <span className="font-bold">{formatCurrency(profitLoss.netIncome, currency)}</span>
                </p>
              </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Gross Profit Margin</p>
                <p className="text-2xl font-bold">
                  {parseFloat(profitLoss.revenue.subtotal) > 0
                    ? ((parseFloat(profitLoss.grossProfit) / parseFloat(profitLoss.revenue.subtotal)) * 100).toFixed(1)
                    : '0.0'}
                  %
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Operating Margin</p>
                <p className="text-2xl font-bold">
                  {parseFloat(profitLoss.revenue.subtotal) > 0
                    ? ((parseFloat(profitLoss.netIncome) / parseFloat(profitLoss.revenue.subtotal)) * 100).toFixed(1)
                    : '0.0'}
                  %
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Expense Ratio</p>
                <p className="text-2xl font-bold">
                  {parseFloat(profitLoss.revenue.subtotal) > 0
                    ? ((parseFloat(profitLoss.operatingExpenses.subtotal) / parseFloat(profitLoss.revenue.subtotal)) * 100).toFixed(1)
                    : '0.0'}
                  %
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
