'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import Loading from '@/components/ui/loading';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  totalAmount: number;
  customerId: string;
  status: string;
  customer: {
    id: string;
    name: string;
    email: string;
    company: string | null;
  };
}

interface CustomerAging {
  customerId: string;
  customerName: string;
  customerEmail: string;
  company: string | null;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  totalOutstanding: number;
  invoices: Invoice[];
}

interface AgingSummary {
  totalCustomers: number;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  totalOutstanding: number;
}

export default function AgedReceivablesPage() {
  const params = useParams();  const router = useRouter();  const orgSlug = params.orgSlug as string;
  const { currency } = useOrganization();

  const [agingData, setAgingData] = useState<CustomerAging[]>([]);
  const [summary, setSummary] = useState<AgingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchAgedReceivables();
  }, [asOfDate]);

  async function fetchAgedReceivables() {
    try {
      setLoading(true);
      setError(null);

      // Fetch all unpaid/overdue invoices
      const response = await fetch(`/api/orgs/${orgSlug}/invoices`);
      if (!response.ok) throw new Error('Failed to fetch invoices');

      const data = await response.json();
      const unpaidInvoices = data.invoices.filter(
        (inv: Invoice) => inv.status === 'SENT' || inv.status === 'OVERDUE'
      );

      // Calculate aging
      const asOf = new Date(asOfDate);
      const customerMap = new Map<string, CustomerAging>();

      unpaidInvoices.forEach((invoice: Invoice) => {
        const dueDate = new Date(invoice.dueDate);
        const daysOverdue = Math.floor((asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        // Get or create customer entry
        let customerAging = customerMap.get(invoice.customerId);
        if (!customerAging) {
          customerAging = {
            customerId: invoice.customerId,
            customerName: invoice.customer.name,
            customerEmail: invoice.customer.email,
            company: invoice.customer.company,
            current: 0,
            days1to30: 0,
            days31to60: 0,
            days61to90: 0,
            days90plus: 0,
            totalOutstanding: 0,
            invoices: [],
          };
          customerMap.set(invoice.customerId, customerAging);
        }

        // Add to appropriate bucket
        const amount = invoice.totalAmount;
        customerAging.totalOutstanding += amount;
        customerAging.invoices.push(invoice);

        if (daysOverdue < 0) {
          customerAging.current += amount;
        } else if (daysOverdue <= 30) {
          customerAging.days1to30 += amount;
        } else if (daysOverdue <= 60) {
          customerAging.days31to60 += amount;
        } else if (daysOverdue <= 90) {
          customerAging.days61to90 += amount;
        } else {
          customerAging.days90plus += amount;
        }
      });

      // Convert to array and sort by total outstanding (descending)
      const agingArray = Array.from(customerMap.values()).sort(
        (a, b) => b.totalOutstanding - a.totalOutstanding
      );

      // Calculate summary
      const summaryData: AgingSummary = {
        totalCustomers: agingArray.length,
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days90plus: 0,
        totalOutstanding: 0,
      };

      agingArray.forEach((customer) => {
        summaryData.current += customer.current;
        summaryData.days1to30 += customer.days1to30;
        summaryData.days31to60 += customer.days31to60;
        summaryData.days61to90 += customer.days61to90;
        summaryData.days90plus += customer.days90plus;
        summaryData.totalOutstanding += customer.totalOutstanding;
      });

      setAgingData(agingArray);
      setSummary(summaryData);
    } catch (err) {
      setError('Failed to load aged receivables report');
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
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Aged Receivables Report</h1>
            <p className="text-gray-600 mt-1">Customer aging analysis by invoice due date</p>
          </div>
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
                <p className="text-xs text-gray-600 mb-1">Customers</p>
                <p className="text-2xl font-bold text-gray-700">
                  {summary.totalCustomers}
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
            <CardTitle className="text-2xl">Aged Receivables Report</CardTitle>
            <p className="text-gray-600">As of {new Date(asOfDate).toLocaleDateString()}</p>
          </div>
        </CardHeader>
        <CardContent>
          {agingData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-2">Customer</th>
                    <th className="text-right py-3 px-2">Current</th>
                    <th className="text-right py-3 px-2">1-30 Days</th>
                    <th className="text-right py-3 px-2">31-60 Days</th>
                    <th className="text-right py-3 px-2">61-90 Days</th>
                    <th className="text-right py-3 px-2">90+ Days</th>
                    <th className="text-right py-3 px-2 font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {agingData.map((customer) => (
                    <tr key={customer.customerId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <Link
                          href={`/${orgSlug}/accounts-receivable/customers/${customer.customerId}`}
                          className="text-blue-600 hover:underline"
                        >
                          <div className="font-medium">{customer.customerName}</div>
                          {customer.company && (
                            <div className="text-xs text-gray-500">{customer.company}</div>
                          )}
                        </Link>
                      </td>
                      <td className="py-3 px-2 text-right text-green-600">
                        {customer.current > 0 ? formatCurrency(customer.current, currency) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right text-yellow-600">
                        {customer.days1to30 > 0 ? formatCurrency(customer.days1to30, currency) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right text-orange-600">
                        {customer.days31to60 > 0 ? formatCurrency(customer.days31to60, currency) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right text-red-600">
                        {customer.days61to90 > 0 ? formatCurrency(customer.days61to90, currency) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right text-red-800 font-medium">
                        {customer.days90plus > 0 ? formatCurrency(customer.days90plus, currency) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right font-bold">
                        {formatCurrency(customer.totalOutstanding, currency)}
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
              <p className="text-gray-500">No outstanding receivables found</p>
              <p className="text-sm text-gray-400 mt-1">All invoices are paid or no invoices exist</p>
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

      {/* Collection Priority Alert */}
      {summary && (summary.days61to90 > 0 || summary.days90plus > 0) && (
        <Alert variant="warning">
          <div className="font-semibold">Collection Priority Alert</div>
          <p className="text-sm mt-1">
            You have {formatCurrency(summary.days61to90 + summary.days90plus, currency)} in receivables over 60 days old.
            Consider prioritizing collection efforts for these overdue accounts.
          </p>
        </Alert>
      )}
    </div>
  );
}
