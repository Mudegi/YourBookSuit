'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Mail,
  Printer,
  CheckCircle,
  Calendar,
  Building2,
  Phone,
  DollarSign,
  Send,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/utils';
import { EfrisStatusBadge, EfrisStatusDetails } from '@/components/efris/EfrisStatus';
import { toast } from 'sonner';

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

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  notes: string | null;
  terms: string | null;
  reference?: string | null;
  taxCalculationMethod: string; // EXCLUSIVE or INCLUSIVE
  // EFRIS fields
  efrisFDN: string | null;
  efrisVerificationCode: string | null;
  efrisQRCode: string | null;
  eInvoiceStatus: string | null;
  eInvoiceSubmittedAt: string | null;
  // Optional transaction field
  transaction?: {
    transactionDate: string;
    reference: string;
    ledgerEntries: Array<{
      id: string;
      amount: number;
      entryType: string;
      account: {
        code: string;
        name: string;
      };
    }>;
  } | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    billingAddress: any;
  };
  items: {
    id: string;
    sortOrder: number;
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    taxLines?: any[];
    product?: {
      id: string;
      name: string;
      sku: string;
    };
  }[];
  payments?: PaymentAllocation[];
  Branch?: any;
  createdAt: string;
}

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [submittingToEfris, setSubmittingToEfris] = useState(false);
  const { currency } = useOrganization();

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/invoices/${invoiceId}`);
      const data = await response.json();

      if (data.success) {
        setInvoice(data.data);
      } else {
        console.error('[Frontend] API Error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to mark this invoice as ${newStatus}?`)) {
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        fetchInvoice();
      } else {
        alert(data.error || 'Failed to update invoice');
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('Failed to update invoice');
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmitToEfris = async () => {
    if (!confirm('Submit this invoice to EFRIS for fiscalization?')) {
      return;
    }

    setSubmittingToEfris(true);
    const toastId = toast.loading('Submitting invoice to EFRIS...');
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/invoices/${invoiceId}/efris`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Invoice fiscalized! FDN: ${data.fdn}`, { id: toastId, duration: 8000 });
        fetchInvoice();
      } else {
        toast.error(`EFRIS submission failed: ${data.error || 'Unknown error'}`, { id: toastId, duration: 10000 });
      }
    } catch (error: any) {
      console.error('Error submitting to EFRIS:', error);
      toast.error(error.name === 'AbortError' ? 'EFRIS request timed out — please try again' : 'Failed to submit to EFRIS', { id: toastId });
    } finally {
      setSubmittingToEfris(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      case 'SENT':
        return 'bg-blue-100 text-blue-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Invoice not found</p>
        <Link
          href={`/${orgSlug}/accounts-receivable/invoices`}
          className="text-blue-600 hover:text-blue-700 mt-4 inline-block"
        >
          Back to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/${orgSlug}/accounts-receivable/invoices`}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
            <p className="text-gray-600 mt-1">
              Created {new Date(invoice.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
            {invoice.status}
          </span>
          
          {invoice.eInvoiceStatus && (
            <EfrisStatusBadge status={invoice.eInvoiceStatus} />
          )}

          {invoice.status === 'DRAFT' && (
            <button
              onClick={() => handleStatusUpdate('SENT')}
              disabled={updating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Mark as Sent
            </button>
          )}

          {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && (
            <>
              <Link
                href={`/${orgSlug}/payments/customer?customerId=${invoice.customer.id}&invoiceId=${invoice.id}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Record Payment
              </Link>
              <button
                onClick={() => handleStatusUpdate('PAID')}
                disabled={updating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Paid
              </button>
            </>
          )}
          
          {!invoice.efrisFDN && invoice.status !== 'DRAFT' && (
            <button
              onClick={handleSubmitToEfris}
              disabled={submittingToEfris}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
            >
              <Send className="h-4 w-4 mr-2" />
              {submittingToEfris ? 'Submitting...' : 'Submit to EFRIS'}
            </button>
          )}
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="flex items-center text-gray-700 hover:text-gray-900">
              <Printer className="h-5 w-5 mr-2" />
              Print
            </button>
            <button className="flex items-center text-gray-700 hover:text-gray-900">
              <Download className="h-5 w-5 mr-2" />
              Download PDF
            </button>
            {invoice.customer.email && (
              <button className="flex items-center text-gray-700 hover:text-gray-900">
                <Mail className="h-5 w-5 mr-2" />
                Email to Customer
              </button>
            )}
          </div>

          <Link
            href={`/${orgSlug}/accounts-receivable/customers/${invoice.customer.id}`}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            View Customer
          </Link>
        </div>
      </div>

      {/* EFRIS Status */}
      <EfrisStatusDetails
        status={invoice.eInvoiceStatus}
        fdn={invoice.efrisFDN}
        verificationCode={invoice.efrisVerificationCode}
        submittedAt={invoice.eInvoiceSubmittedAt}
      />

      {/* Payment Summary */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h2>
          <div className="grid grid-cols-3 gap-6 mb-4">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(invoice.total, currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Amount Paid</p>
              <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      invoice.payments.reduce((sum, p) => sum + p.amount, 0),
                      currency
                    )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Amount Due</p>
              <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(
                      invoice.total -
                        invoice.payments.reduce((sum, p) => sum + p.amount, 0),
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
                {invoice.payments.map((allocation) => (
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
        </div>
      )}

      {/* Invoice Content */}
      <div className="bg-white rounded-lg shadow p-8">
        {/* Header Section */}
        <div className="flex justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">INVOICE</h2>
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                <span className="font-medium">Invoice #:</span> {invoice.invoiceNumber}
              </div>
              <div>
                <span className="font-medium">Date:</span>{' '}
                {new Date(invoice.invoiceDate).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">Due Date:</span>{' '}
                {new Date(invoice.dueDate).toLocaleDateString()}
              </div>
              {invoice.reference && (
                <div>
                  <span className="font-medium">Reference:</span> {invoice.reference}
                </div>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-bold text-blue-600 mb-2">YourBooks</div>
            <div className="text-sm text-gray-600">
              <div>Professional Accounting Software</div>
              <div>support@yourbooks.com</div>
            </div>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="mb-8">
          <div className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</div>
          <div className="text-gray-900">
            <div className="font-semibold text-lg">
              {invoice.customer.firstName} {invoice.customer.lastName}
            </div>
            {invoice.customer.companyName && (
              <div className="flex items-center text-gray-600 mt-1">
                <Building2 className="h-4 w-4 mr-2" />
                {invoice.customer.companyName}
              </div>
            )}
            {invoice.customer.email && (
              <div className="flex items-center text-gray-600 mt-1">
                <Mail className="h-4 w-4 mr-2" />
                {invoice.customer.email}
              </div>
            )}
            {invoice.customer.phone && (
              <div className="flex items-center text-gray-600 mt-1">
                <Phone className="h-4 w-4 mr-2" />
                {invoice.customer.phone}
              </div>
            )}
            {invoice.customer.billingAddress && (
              <div className="text-gray-600 mt-2">
                {typeof invoice.customer.billingAddress === 'string' 
                  ? invoice.customer.billingAddress 
                  : JSON.stringify(invoice.customer.billingAddress, null, 2)}
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="mb-8">
          <table className="w-full">
            <thead className="border-b-2 border-gray-300">
              <tr>
                <th className="text-left py-3 text-sm font-semibold text-gray-700">
                  Description
                </th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700 w-20">
                  Qty
                </th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700 w-32">
                  Unit Price
                </th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700 w-20">
                  Tax %
                </th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700 w-32">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.items.map((item) => {
                // For URA compliance: show tax-inclusive unit price when invoice is tax-inclusive
                const displayUnitPrice = invoice.taxCalculationMethod === 'INCLUSIVE'
                  ? item.unitPrice * (1 + item.taxRate / 100)
                  : item.unitPrice;
                
                // Debug log
                console.log('[Invoice Display]', {
                  description: item.description,
                  taxCalculationMethod: invoice.taxCalculationMethod,
                  storedUnitPrice: item.unitPrice,
                  taxRate: item.taxRate,
                  displayUnitPrice: displayUnitPrice,
                  isInclusive: invoice.taxCalculationMethod === 'INCLUSIVE',
                });
                
                return (
                  <tr key={item.id}>
                    <td className="py-3 text-gray-900">{item.description}</td>
                    <td className="py-3 text-right text-gray-900">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-900">
                      {formatCurrency(displayUnitPrice, currency)}
                      {invoice.taxCalculationMethod === 'INCLUSIVE' && (
                        <span className="text-xs text-gray-500 block">incl. tax</span>
                      )}
                    </td>
                    <td className="py-3 text-right text-gray-900">{item.taxRate}%</td>
                    <td className="py-3 text-right font-medium text-gray-900">
                      {formatCurrency(item.total, currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-80 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax:</span>
                <span className="font-medium">{formatCurrency(invoice.taxAmount, currency)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t-2 border-gray-300 pt-2">
              <span>Total:</span>
                <span className="text-blue-600">{formatCurrency(invoice.total, currency)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="border-t pt-6">
            <div className="text-sm font-semibold text-gray-500 uppercase mb-2">Notes</div>
            <p className="text-gray-700 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* GL Posting Info */}
      {invoice.transaction && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            General Ledger Posting
          </h2>
          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Transaction Date:</span>{' '}
              {new Date(invoice.transaction.transactionDate).toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Reference:</span> {invoice.transaction.reference}
            </div>

            <div className="mt-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Account</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">Debit</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoice.transaction.ledgerEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-2 text-gray-900">
                        {entry.account.code} - {entry.account.name}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-900">
                        {entry.entryType === 'DEBIT' ? formatCurrency(entry.amount, currency) : '-'}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-900">
                        {entry.entryType === 'CREDIT' ? formatCurrency(entry.amount, currency) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Created Info */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        Created on {new Date(invoice.createdAt).toLocaleString()}
      </div>
    </div>
  );
}
