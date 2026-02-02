'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import Loading from '@/components/ui/loading';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/utils';

interface Customer {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface BankAccount {
  id: string;
  code: string;
  name: string;
}

interface Transaction {
  id: string;
  transactionNumber: string;
  status: string;
}

interface Payment {
  id: string;
  paymentType: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  customer: Customer | null;
  vendor: Vendor | null;
  bankAccount: BankAccount;
  transaction: Transaction;
  allocations: any[];
}

interface Stats {
  total: number;
  customerPaymentCount: number;
  customerPaymentAmount: number;
  vendorPaymentCount: number;
  vendorPaymentAmount: number;
  netCashFlow: number;
}

export default function PaymentsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { currency } = useOrganization();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, [orgSlug, typeFilter]);

  async function fetchPayments() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'all') {
        params.append('paymentType', typeFilter);
      }

      const response = await fetch(
        `/api/orgs/${orgSlug}/payments?${params.toString()}`
      );
      if (!response.ok) throw new Error('Failed to fetch payments');
      const data = await response.json();
      setPayments(data.payments);
      setStats(data.stats);
    } catch (err) {
      setError('Failed to load payments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      CASH: 'Cash',
      CHECK: 'Check',
      CARD: 'Card',
      ACH: 'ACH',
      WIRE: 'Wire',
      OTHER: 'Other',
    };
    return labels[method] || method;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Payments</h1>
        <div className="flex gap-2">
          <Link href={`/${orgSlug}/payments/customer`}>
            <Button>Record Customer Payment</Button>
          </Link>
          <Link href={`/${orgSlug}/payments/vendor`}>
            <Button variant="outline">Record Vendor Payment</Button>
          </Link>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Money In (Customer Payments)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.customerPaymentAmount, currency)}
              </p>
              <p className="text-xs text-gray-500">
                {stats.customerPaymentCount} payment
                {stats.customerPaymentCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Money Out (Vendor Payments)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.vendorPaymentAmount, currency)}
              </p>
              <p className="text-xs text-gray-500">
                {stats.vendorPaymentCount} payment
                {stats.vendorPaymentCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Net Cash Flow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${
                  stats.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(stats.netCashFlow, currency)}
              </p>
              <p className="text-xs text-gray-500">
                {stats.total} total payment{stats.total !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium">Filter by Type:</Label>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-64"
            >
              <option value="all">All Payments</option>
              <option value="CUSTOMER_PAYMENT">Customer Payments (Money In)</option>
              <option value="VENDOR_PAYMENT">Vendor Payments (Money Out)</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent className="pt-6">
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {typeFilter !== 'all'
                  ? 'No payments found matching your criteria'
                  : 'No payments recorded yet. Record your first payment to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 font-medium">Date</th>
                    <th className="text-left py-3 font-medium">Type</th>
                    <th className="text-left py-3 font-medium">
                      Customer/Vendor
                    </th>
                    <th className="text-left py-3 font-medium">Method</th>
                    <th className="text-left py-3 font-medium">Reference</th>
                    <th className="text-left py-3 font-medium">Bank Account</th>
                    <th className="text-right py-3 font-medium">Amount</th>
                    <th className="text-left py-3 font-medium">Allocations</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            payment.paymentType === 'CUSTOMER_PAYMENT'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {payment.paymentType === 'CUSTOMER_PAYMENT'
                            ? 'Money In'
                            : 'Money Out'}
                        </span>
                      </td>
                      <td className="py-3">
                        {payment.customer ? (
                          <Link
                            href={`/${orgSlug}/accounts-receivable/customers/${payment.customer.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {payment.customer.name}
                          </Link>
                        ) : payment.vendor ? (
                          <Link
                            href={`/${orgSlug}/accounts-payable/vendors/${payment.vendor.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {payment.vendor.name}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3">
                        {getPaymentMethodLabel(payment.paymentMethod)}
                      </td>
                      <td className="py-3 text-gray-600">
                        {payment.referenceNumber || '—'}
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {payment.bankAccount.code} - {payment.bankAccount.name}
                      </td>
                      <td
                        className={`py-3 text-right font-medium ${
                          payment.paymentType === 'CUSTOMER_PAYMENT'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {payment.paymentType === 'CUSTOMER_PAYMENT' ? '+' : '-'}
                        {formatCurrency(payment.amount, currency)}
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/${orgSlug}/payments/${payment.id}`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {payment.allocations.length} invoice
                          {payment.allocations.length !== 1 ? 's' : ''}/bill
                          {payment.allocations.length !== 1 ? 's' : ''}
                        </Link>
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

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-sm ${className}`}>{children}</span>;
}
