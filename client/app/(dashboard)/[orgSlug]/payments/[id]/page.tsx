'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import Loading from '@/components/ui/loading';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/utils';

interface Account {
  id: string;
  code: string;
  name: string;
  accountType: string;
}

interface LedgerEntry {
  id: string;
  debit: number;
  credit: number;
  description: string;
  account: Account;
}

interface Transaction {
  id: string;
  transactionNumber: string;
  transactionDate: string;
  status: string;
  entries: LedgerEntry[];
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  customer: {
    id: string;
    name: string;
  };
}

interface Bill {
  id: string;
  billNumber: string;
  totalAmount: number;
  vendor: {
    id: string;
    name: string;
  };
}

interface Allocation {
  id: string;
  amount: number;
  invoice: Invoice | null;
  bill: Bill | null;
}

interface Payment {
  id: string;
  paymentType: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
  customer: { id: string; name: string } | null;
  vendor: { id: string; name: string } | null;
  bankAccount: Account;
  transaction: Transaction;
  allocations: Allocation[];
}

export default function PaymentDetailsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const paymentId = params.id as string;
  const { currency } = useOrganization();

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPayment();
  }, [paymentId]);

  async function fetchPayment() {
    try {
      setLoading(true);
      const response = await fetch(`/api/orgs/${orgSlug}/payments/${paymentId}`);
      if (!response.ok) throw new Error('Failed to fetch payment');
      const data = await response.json();
      setPayment(data);
    } catch (err) {
      setError('Failed to load payment details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      CASH: 'Cash',
      CHECK: 'Check',
      CARD: 'Credit/Debit Card',
      ACH: 'ACH Transfer',
      WIRE: 'Wire Transfer',
      OTHER: 'Other',
    };
    return labels[method] || method;
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

  if (error || !payment) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error || 'Payment not found'}</Alert>
        <Link href={`/${orgSlug}/payments`}>
          <Button variant="outline">Back to Payments</Button>
        </Link>
      </div>
    );
  }

  const isCustomerPayment = payment.paymentType === 'CUSTOMER_PAYMENT';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start print:hidden">
        <div>
          <Link
            href={`/${orgSlug}/payments`}
            className="text-blue-600 hover:underline text-sm"
          >
            ← Back to Payments
          </Link>
          <h1 className="text-3xl font-bold mt-2">
            {isCustomerPayment ? 'Customer Payment' : 'Vendor Payment'}
          </h1>
          <p className="text-gray-600 mt-1">
            {new Date(payment.paymentDate).toLocaleDateString()}
          </p>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          Print Receipt
        </Button>
      </div>

      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">
                {isCustomerPayment ? 'Received From' : 'Paid To'}
              </p>
              <p className="font-semibold text-lg">
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
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Amount</p>
              <p
                className={`font-bold text-2xl ${
                  isCustomerPayment ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(payment.amount, currency)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Payment Date</p>
              <p className="font-medium">
                {new Date(payment.paymentDate).toLocaleDateString()}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Payment Method</p>
              <p className="font-medium">
                {getPaymentMethodLabel(payment.paymentMethod)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">
                {isCustomerPayment ? 'Deposited To' : 'Paid From'}
              </p>
              <p className="font-medium">
                <Link
                  href={`/${orgSlug}/general-ledger/chart-of-accounts/${payment.bankAccount.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {payment.bankAccount.code} - {payment.bankAccount.name}
                </Link>
              </p>
            </div>

            {payment.referenceNumber && (
              <div>
                <p className="text-sm text-gray-600">Reference Number</p>
                <p className="font-medium">{payment.referenceNumber}</p>
              </div>
            )}
          </div>

          {payment.notes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">Notes</p>
              <p className="mt-1 text-sm">{payment.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allocations */}
      <Card>
        <CardHeader>
          <CardTitle>
            Applied to {isCustomerPayment ? 'Invoices' : 'Bills'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">
                    {isCustomerPayment ? 'Invoice #' : 'Bill #'}
                  </th>
                  <th className="text-left py-2">
                    {isCustomerPayment ? 'Customer' : 'Vendor'}
                  </th>
                  <th className="text-right py-2">Total Amount</th>
                  <th className="text-right py-2">Payment Applied</th>
                </tr>
              </thead>
              <tbody>
                {payment.allocations.map((allocation) => {
                  const document = allocation.invoice || allocation.bill;
                  const documentNumber = allocation.invoice
                    ? allocation.invoice.invoiceNumber
                    : allocation.bill?.billNumber;
                  const party = allocation.invoice
                    ? allocation.invoice.customer
                    : allocation.bill?.vendor;

                  return (
                    <tr key={allocation.id} className="border-b">
                      <td className="py-3">
                        <Link
                          href={
                            allocation.invoice
                              ? `/${orgSlug}/accounts-receivable/invoices/${allocation.invoice.id}`
                              : `/${orgSlug}/accounts-payable/bills/${allocation.bill?.id}`
                          }
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {documentNumber}
                        </Link>
                      </td>
                      <td className="py-3">{party?.name}</td>
                      <td className="py-3 text-right">
                        {document ? formatCurrency(document.totalAmount, currency) : '—'}
                      </td>
                      <td className="py-3 text-right font-semibold text-green-600">
                        {formatCurrency(allocation.amount, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td colSpan={3} className="py-3 text-right">
                    Total Payment:
                  </td>
                  <td className="py-3 text-right text-green-600">
                    {formatCurrency(payment.amount, currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* GL Posting Details */}
      {payment.transaction && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>General Ledger Posting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">Transaction:</span>
                <Link
                  href={`/${orgSlug}/general-ledger/journal-entries/list?transactionId=${payment.transaction.id}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {payment.transaction.transactionNumber}
                </Link>
                <span className="text-gray-600">•</span>
                <span className="text-gray-600">
                  Date:{' '}
                  {new Date(
                    payment.transaction.transactionDate
                  ).toLocaleDateString()}
                </span>
                <span className="text-gray-600">•</span>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    payment.transaction.status === 'POSTED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {payment.transaction.status}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Account</th>
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2">Debit</th>
                      <th className="text-right py-2">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payment.transaction.entries.map((entry) => (
                      <tr key={entry.id} className="border-b">
                        <td className="py-2">
                          <Link
                            href={`/${orgSlug}/general-ledger/chart-of-accounts/${entry.account.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {entry.account.code} - {entry.account.name}
                          </Link>
                        </td>
                        <td className="py-2 text-gray-600">
                          {entry.description}
                        </td>
                        <td className="py-2 text-right text-green-600">
                          {entry.debit > 0 ? formatCurrency(entry.debit, currency) : '—'}
                        </td>
                        <td className="py-2 text-right text-red-600">
                          {entry.credit > 0 ? formatCurrency(entry.credit, currency) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-semibold">
                      <td colSpan={2} className="py-2">
                        Total
                      </td>
                      <td className="py-2 text-right text-green-600">
                        {formatCurrency(
                          payment.transaction.entries.reduce((sum, e) => sum + e.debit, 0),
                          currency
                        )}
                      </td>
                      <td className="py-2 text-right text-red-600">
                        {formatCurrency(
                          payment.transaction.entries.reduce((sum, e) => sum + e.credit, 0),
                          currency
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
