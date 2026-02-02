'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

interface BillItem {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  totalAmount: number;
  account: Account;
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

interface Vendor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
}

interface PaymentAllocation {
  id: string;
  amount: number;
  payment: {
    id: string;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber: string | null;
  };
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
  notes: string | null;
  referenceNumber: string | null;
  vendor: Vendor;
  items: BillItem[];
  transaction: Transaction | null;
  paymentAllocations?: PaymentAllocation[];
}

export default function BillDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const billId = params.id as string;
  const { currency } = useOrganization();

  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchBill();
  }, [billId]);

  async function fetchBill() {
    try {
      setLoading(true);
      const response = await fetch(`/api/orgs/${orgSlug}/bills/${billId}`);
      if (!response.ok) throw new Error('Failed to fetch bill');
      const data = await response.json();
      setBill(data);
    } catch (err) {
      setError('Failed to load bill details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(newStatus: string) {
    if (!bill) return;

    try {
      setUpdating(true);
      setError(null);

      const response = await fetch(`/api/orgs/${orgSlug}/bills/${billId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      setSuccess(`Bill status updated to ${newStatus}`);
      fetchBill();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setUpdating(false);
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

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error || 'Bill not found'}</Alert>
        <Link href={`/${orgSlug}/accounts-payable/bills`}>
          <Button variant="outline">Back to Bills</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start print:hidden">
        <div>
          <Link
            href={`/${orgSlug}/accounts-payable/bills`}
            className="text-blue-600 hover:underline text-sm"
          >
            ← Back to Bills
          </Link>
          <h1 className="text-3xl font-bold mt-2">Bill {bill.billNumber}</h1>
          <span
            className={`inline-block mt-2 px-3 py-1 text-sm rounded ${getStatusColor(
              bill.status
            )}`}
          >
            {bill.status}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            Print
          </Button>
          {bill.status === 'DRAFT' && (
            <Link href={`/${orgSlug}/accounts-payable/bills/${billId}/edit`}>
              <Button variant="default">Edit</Button>
            </Link>
          )}
          {bill.status === 'DRAFT' && (
            <Button
              onClick={() => handleStatusUpdate('SENT')}
              disabled={updating}
            >
              Mark as Sent
            </Button>
          )}
          {(bill.status === 'SENT' || bill.status === 'OVERDUE') && (
            <>
              <Link href={`/${orgSlug}/payments/vendor?vendorId=${bill.vendor.id}&billId=${bill.id}`}>
                <Button variant="default">
                  Record Payment
                </Button>
              </Link>
              <Button
                onClick={() => handleStatusUpdate('PAID')}
                disabled={updating}
                variant="outline"
              >
                ✓ Mark as Paid
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Payment Summary */}
      {bill.paymentAllocations && bill.paymentAllocations.length > 0 && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6 mb-4">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(bill.totalAmount, currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    bill.paymentAllocations.reduce((sum, p) => sum + p.amount, 0),
                    currency
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount Due</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(
                    bill.totalAmount -
                      bill.paymentAllocations.reduce((sum, p) => sum + p.amount, 0),
                    currency
                  )}
                </p>
              </div>
            </div>

            <h3 className="text-md font-semibold text-gray-900 mb-3 mt-6">Payment History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Date</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Method</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Reference</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">Amount</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bill.paymentAllocations.map((allocation) => (
                    <tr key={allocation.id}>
                      <td className="px-4 py-2 text-gray-900">
                        {new Date(allocation.payment.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-gray-900">
                        {allocation.payment.paymentMethod}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {allocation.payment.referenceNumber || '—'}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-green-600">
                        {formatCurrency(allocation.amount, currency)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Link
                          href={`/${orgSlug}/payments/${allocation.payment.id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bill Preview */}
      <Card className="print:shadow-none">
        <CardContent className="p-8">
          {/* Header */}
          <div className="border-b pb-6 mb-6">
            <h2 className="text-3xl font-bold">BILL</h2>
            <p className="text-gray-600 mt-1">Bill Number: {bill.billNumber}</p>
            {bill.referenceNumber && (
              <p className="text-gray-600">Reference: {bill.referenceNumber}</p>
            )}
          </div>

          {/* Vendor and Bill Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Bill To:</h3>
              <div className="text-gray-900">
                <p className="font-semibold">{bill.vendor.name}</p>
                {bill.vendor.billingAddress && (
                  <>
                    <p>{bill.vendor.billingAddress}</p>
                    <p>
                      {bill.vendor.billingCity}
                      {bill.vendor.billingState && `, ${bill.vendor.billingState}`}{' '}
                      {bill.vendor.billingPostalCode}
                    </p>
                    {bill.vendor.billingCountry && <p>{bill.vendor.billingCountry}</p>}
                  </>
                )}
                {bill.vendor.email && (
                  <p className="mt-2 text-sm">Email: {bill.vendor.email}</p>
                )}
                {bill.vendor.phone && (
                  <p className="text-sm">Phone: {bill.vendor.phone}</p>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="space-y-1">
                <div>
                  <span className="text-gray-600">Bill Date: </span>
                  <span className="font-medium">
                    {new Date(bill.billDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Due Date: </span>
                  <span className="font-medium">
                    {new Date(bill.dueDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-gray-600">Status: </span>
                  <span
                    className={`px-2 py-1 text-xs rounded ${getStatusColor(
                      bill.status
                    )}`}
                  >
                    {bill.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 font-semibold">Description</th>
                  <th className="text-left py-3 font-semibold">Account</th>
                  <th className="text-right py-3 font-semibold">Qty</th>
                  <th className="text-right py-3 font-semibold">Unit Price</th>
                  <th className="text-right py-3 font-semibold">Tax</th>
                  <th className="text-right py-3 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3">{item.description}</td>
                    <td className="py-3 text-sm text-gray-600">
                      {item.account ? (
                        <>
                          {item.account.code} - {item.account.name}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 text-right">{item.quantity}</td>
                    <td className="py-3 text-right">
                      {formatCurrency(item.unitPrice, currency)}
                    </td>
                    <td className="py-3 text-right">
                      {formatCurrency(item.taxAmount, currency)}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {formatCurrency(item.totalAmount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span>{formatCurrency(bill.subtotalAmount, currency)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Tax:</span>
                <span>{formatCurrency(bill.taxAmount, currency)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t-2 pt-2">
                <span>Total:</span>
                <span>{formatCurrency(bill.totalAmount, currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {bill.notes && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-700 mb-2">Notes:</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{bill.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GL Posting Details */}
      {bill.transaction && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>General Ledger Posting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">Transaction:</span>
                <Link
                  href={`/${orgSlug}/general-ledger/journal-entries/list?transactionId=${bill.transaction.id}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {bill.transaction.transactionNumber}
                </Link>
                <span className="text-gray-600">•</span>
                <span className="text-gray-600">
                  Date:{' '}
                  {new Date(bill.transaction.transactionDate).toLocaleDateString()}
                </span>
                <span className="text-gray-600">•</span>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    bill.transaction.status === 'POSTED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {bill.transaction.status}
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
                    {bill.transaction.entries.map((entry) => (
                      <tr key={entry.id} className="border-b">
                        <td className="py-2">
                          <Link
                            href={`/${orgSlug}/general-ledger/chart-of-accounts/${entry.account.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {entry.account.code} - {entry.account.name}
                          </Link>
                        </td>
                        <td className="py-2 text-gray-600">{entry.description}</td>
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
                          bill.transaction.entries.reduce((sum, e) => sum + e.debit, 0),
                          currency
                        )}
                      </td>
                      <td className="py-2 text-right text-red-600">
                        {formatCurrency(
                          bill.transaction.entries.reduce((sum, e) => sum + e.credit, 0),
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
