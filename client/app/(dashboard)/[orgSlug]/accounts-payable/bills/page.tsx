'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import Loading from '@/components/ui/loading';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/utils';

interface Vendor {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  transactionNumber: string;
  status: string;
}

interface Bill {
  id: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  vendor: Vendor;
  transaction: Transaction | null;
  _count: { items: number };
}

interface Stats {
  total: number;
  outstanding: number;
  outstandingAmount: number;
  totalAmount: number;
  paid: number;
  paidAmount: number;
  overdue: number;
  overdueAmount: number;
}

export default function BillsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug as string;
  const vendorIdFilter = searchParams.get('vendorId');
  const { currency } = useOrganization();

  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBills();
  }, [orgSlug, statusFilter, vendorIdFilter]);

  async function fetchBills() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter.toUpperCase());
      }
      if (vendorIdFilter) {
        params.append('vendorId', vendorIdFilter);
      }

      const response = await fetch(
        `/api/orgs/${orgSlug}/bills?${params.toString()}`
      );
      if (!response.ok) throw new Error('Failed to fetch bills');
      const data = await response.json();
      setBills(data.bills);
      setStats(data.stats);
    } catch (err) {
      setError('Failed to load bills');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'SENT':
        return 'bg-blue-100 text-blue-800';
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getDaysUntilDue(dueDate: string): string {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    return `Due in ${diffDays} days`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/${orgSlug}/accounts-payable`}
        className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Accounts Payable
      </Link>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Bills</h1>
        <Link href={`/${orgSlug}/accounts-payable/bills/new`}>
          <Button>Create Bill</Button>
        </Link>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.outstandingAmount, currency)}
              </p>
              <p className="text-xs text-gray-500">
                {stats.outstanding} bill{stats.outstanding !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Bills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount, currency)}</p>
              <p className="text-xs text-gray-500">
                {stats.total} bill{stats.total !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.paidAmount, currency)}
              </p>
              <p className="text-xs text-gray-500">
                {stats.paid} bill{stats.paid !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-700">
                {formatCurrency(stats.overdueAmount, currency)}
              </p>
              <p className="text-xs text-gray-500">
                {stats.overdue} bill{stats.overdue !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            {vendorIdFilter && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Filtered by vendor</span>
                <Link href={`/${orgSlug}/accounts-payable/bills`}>
                  <Button variant="outline" size="sm">
                    Clear Filter
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card>
        <CardContent className="pt-6">
          {bills.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {statusFilter !== 'all' || vendorIdFilter
                  ? 'No bills found matching your criteria'
                  : 'No bills yet. Create your first bill to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 font-medium">Bill #</th>
                    <th className="text-left py-3 font-medium">Vendor</th>
                    <th className="text-left py-3 font-medium">Date</th>
                    <th className="text-left py-3 font-medium">Due Date</th>
                    <th className="text-right py-3 font-medium">Amount</th>
                    <th className="text-left py-3 font-medium">Status</th>
                    <th className="text-left py-3 font-medium">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
                    <tr key={bill.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        <Link
                          href={`/${orgSlug}/accounts-payable/bills/${bill.id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {bill.billNumber}
                        </Link>
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/${orgSlug}/accounts-payable/vendors/${bill.vendor.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {bill.vendor.name}
                        </Link>
                      </td>
                      <td className="py-3">
                        {new Date(bill.billDate).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <div>
                          <div>{new Date(bill.dueDate).toLocaleDateString()}</div>
                          {bill.status === 'SENT' && (
                            <div className="text-xs text-gray-500">
                              {getDaysUntilDue(bill.dueDate)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-right font-medium">
                        {formatCurrency(bill.totalAmount, currency)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded ${getStatusColor(
                            bill.status
                          )}`}
                        >
                          {bill.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600">
                        {bill._count.items} item{bill._count.items !== 1 ? 's' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
