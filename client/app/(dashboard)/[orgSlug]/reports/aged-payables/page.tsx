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

interface Bill {
  id: string;
  billNumber: string;
  billDate: Date;
  dueDate: Date;
  totalAmount: number;
  vendorId: string;
  status: string;
  vendor: {
    id: string;
    name: string;
    email: string;
    company: string | null;
  };
}

interface VendorAging {
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  company: string | null;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  totalOutstanding: number;
  bills: Bill[];
}

interface AgingSummary {
  totalVendors: number;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  totalOutstanding: number;
}

export default function AgedPayablesPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { currency } = useOrganization();

  const [agingData, setAgingData] = useState<VendorAging[]>([]);
  const [summary, setSummary] = useState<AgingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchAgedPayables();
  }, [asOfDate]);

  async function fetchAgedPayables() {
    try {
      setLoading(true);
      setError(null);

      // Fetch all unpaid/overdue bills
      const response = await fetch(`/api/orgs/${orgSlug}/bills`);
      if (!response.ok) throw new Error('Failed to fetch bills');

      const data = await response.json();
      const unpaidBills = data.bills.filter(
        (bill: Bill) => bill.status === 'SENT' || bill.status === 'OVERDUE'
      );

      // Calculate aging
      const asOf = new Date(asOfDate);
      const vendorMap = new Map<string, VendorAging>();

      unpaidBills.forEach((bill: Bill) => {
        const dueDate = new Date(bill.dueDate);
        const daysOverdue = Math.floor((asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        // Get or create vendor entry
        let vendorAging = vendorMap.get(bill.vendorId);
        if (!vendorAging) {
          vendorAging = {
            vendorId: bill.vendorId,
            vendorName: bill.vendor.name,
            vendorEmail: bill.vendor.email,
            company: bill.vendor.company,
            current: 0,
            days1to30: 0,
            days31to60: 0,
            days61to90: 0,
            days90plus: 0,
            totalOutstanding: 0,
            bills: [],
          };
          vendorMap.set(bill.vendorId, vendorAging);
        }

        // Add to appropriate bucket
        const amount = bill.totalAmount;
        vendorAging.totalOutstanding += amount;
        vendorAging.bills.push(bill);

        if (daysOverdue < 0) {
          vendorAging.current += amount;
        } else if (daysOverdue <= 30) {
          vendorAging.days1to30 += amount;
        } else if (daysOverdue <= 60) {
          vendorAging.days31to60 += amount;
        } else if (daysOverdue <= 90) {
          vendorAging.days61to90 += amount;
        } else {
          vendorAging.days90plus += amount;
        }
      });

      // Convert to array and sort by total outstanding (descending)
      const agingArray = Array.from(vendorMap.values()).sort(
        (a, b) => b.totalOutstanding - a.totalOutstanding
      );

      // Calculate summary
      const summaryData: AgingSummary = {
        totalVendors: agingArray.length,
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days90plus: 0,
        totalOutstanding: 0,
      };

      agingArray.forEach((vendor) => {
        summaryData.current += vendor.current;
        summaryData.days1to30 += vendor.days1to30;
        summaryData.days31to60 += vendor.days31to60;
        summaryData.days61to90 += vendor.days61to90;
        summaryData.days90plus += vendor.days90plus;
        summaryData.totalOutstanding += vendor.totalOutstanding;
      });

      setAgingData(agingArray);
      setSummary(summaryData);
    } catch (err) {
      setError('Failed to load aged payables report');
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

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start print:hidden">
        <div>
          <h1 className="text-3xl font-bold">Aged Payables Report</h1>
          <p className="text-gray-600 mt-1">Vendor aging analysis by bill due date</p>
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

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Vendors</p>
                <p className="text-2xl font-bold text-gray-700">
                  {summary.totalVendors}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Current</p>
                <p className="text-lg font-bold text-green-600">
                  ${summary.current.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">1-30 Days</p>
                <p className="text-lg font-bold text-yellow-600">
                  ${summary.days1to30.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">31-60 Days</p>
                <p className="text-lg font-bold text-orange-600">
                  ${summary.days31to60.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">61-90 Days</p>
                <p className="text-lg font-bold text-red-600">
                  ${summary.days61to90.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">90+ Days</p>
                <p className="text-lg font-bold text-red-800">
                  ${summary.days90plus.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Report */}
      <Card>
        <CardHeader>
          <div className="text-center">
            <CardTitle className="text-2xl">Aged Payables Report</CardTitle>
            <p className="text-gray-600">As of {new Date(asOfDate).toLocaleDateString()}</p>
          </div>
        </CardHeader>
        <CardContent>
          {agingData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-2">Vendor</th>
                    <th className="text-right py-3 px-2">Current</th>
                    <th className="text-right py-3 px-2">1-30 Days</th>
                    <th className="text-right py-3 px-2">31-60 Days</th>
                    <th className="text-right py-3 px-2">61-90 Days</th>
                    <th className="text-right py-3 px-2">90+ Days</th>
                    <th className="text-right py-3 px-2 font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {agingData.map((vendor) => (
                    <tr key={vendor.vendorId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <Link
                          href={`/${orgSlug}/accounts-payable/vendors/${vendor.vendorId}`}
                          className="text-blue-600 hover:underline"
                        >
                          <div className="font-medium">{vendor.vendorName}</div>
                          {vendor.company && (
                            <div className="text-xs text-gray-500">{vendor.company}</div>
                          )}
                        </Link>
                      </td>
                      <td className="py-3 px-2 text-right text-green-600">
                        {vendor.current > 0 ? formatCurrency(vendor.current, currency) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right text-yellow-600">
                        {vendor.days1to30 > 0 ? formatCurrency(vendor.days1to30, currency) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right text-orange-600">
                        {vendor.days31to60 > 0 ? formatCurrency(vendor.days31to60, currency) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right text-red-600">
                        {vendor.days61to90 > 0 ? formatCurrency(vendor.days61to90, currency) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right text-red-800 font-medium">
                        {vendor.days90plus > 0 ? formatCurrency(vendor.days90plus, currency) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right font-bold">
                        {formatCurrency(vendor.totalOutstanding, currency)}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  {summary && (
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                      <td className="py-3 px-2">TOTAL</td>
                      <td className="py-3 px-2 text-right text-green-600">
                        {formatCurrency(summary.current, currency)}
                      </td>
                      <td className="py-3 px-2 text-right text-yellow-600">
                        {formatCurrency(summary.days1to30, currency)}
                      </td>
                      <td className="py-3 px-2 text-right text-orange-600">
                        {formatCurrency(summary.days31to60, currency)}
                      </td>
                      <td className="py-3 px-2 text-right text-red-600">
                        {formatCurrency(summary.days61to90, currency)}
                      </td>
                      <td className="py-3 px-2 text-right text-red-800">
                        {formatCurrency(summary.days90plus, currency)}
                      </td>
                      <td className="py-3 px-2 text-right text-blue-600">
                        {formatCurrency(summary.totalOutstanding, currency)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No outstanding payables found</p>
              <p className="text-sm text-gray-400 mt-1">All bills are paid or no bills exist</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aging Breakdown Chart */}
      {summary && summary.totalOutstanding > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Aging Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-green-700">Current (Not Overdue)</span>
                  <span className="font-medium">
                    ${summary.current.toFixed(2)} ({((summary.current / summary.totalOutstanding) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full"
                    style={{ width: `${(summary.current / summary.totalOutstanding) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-yellow-700">1-30 Days Overdue</span>
                  <span className="font-medium">
                    ${summary.days1to30.toFixed(2)} ({((summary.days1to30 / summary.totalOutstanding) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-yellow-500 h-3 rounded-full"
                    style={{ width: `${(summary.days1to30 / summary.totalOutstanding) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-orange-700">31-60 Days Overdue</span>
                  <span className="font-medium">
                    ${summary.days31to60.toFixed(2)} ({((summary.days31to60 / summary.totalOutstanding) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-orange-500 h-3 rounded-full"
                    style={{ width: `${(summary.days31to60 / summary.totalOutstanding) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-red-700">61-90 Days Overdue</span>
                  <span className="font-medium">
                    ${summary.days61to90.toFixed(2)} ({((summary.days61to90 / summary.totalOutstanding) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-red-500 h-3 rounded-full"
                    style={{ width: `${(summary.days61to90 / summary.totalOutstanding) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-red-900">90+ Days Overdue</span>
                  <span className="font-medium">
                    ${summary.days90plus.toFixed(2)} ({((summary.days90plus / summary.totalOutstanding) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-red-800 h-3 rounded-full"
                    style={{ width: `${(summary.days90plus / summary.totalOutstanding) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Priority Alert */}
      {summary && (summary.days61to90 > 0 || summary.days90plus > 0) && (
        <Alert variant="warning">
          <div className="font-semibold">Payment Priority Alert</div>
          <p className="text-sm mt-1">
            You have {formatCurrency(summary.days61to90 + summary.days90plus, currency)} in payables over 60 days old.
            Consider prioritizing payments for these overdue accounts to maintain good vendor relationships.
          </p>
        </Alert>
      )}

      {/* Cash Flow Insight */}
      {summary && summary.totalOutstanding > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">Cash Flow Insight</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              Total outstanding payables: <span className="font-bold">{formatCurrency(summary.totalOutstanding, currency)}</span>
            </p>
            <p className="text-sm text-gray-700 mt-2">
              This represents your current accounts payable balance. Managing payment timing helps optimize
              cash flow while maintaining positive vendor relationships.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
