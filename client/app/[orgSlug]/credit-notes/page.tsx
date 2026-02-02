'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, FileText, Filter, CheckCircle, Clock, XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface CreditNote {
  id: string;
  creditNoteNumber: string;
  creditDate: string;
  customer: {
    id: string;
    customerNumber: string;
    companyName: string | null;
    firstName: string;
    lastName: string;
  };
  invoice: {
    invoiceNumber: string;
    total: number;
  } | null;
  totalAmount: number;
  appliedAmount: number;
  remainingAmount: number;
  status: string;
  reason: string;
}

export default function CreditNotesPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: '',
    customerId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchCreditNotes();
  }, [filter]);

  const fetchCreditNotes = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filter.status) queryParams.append('status', filter.status);
      if (filter.customerId) queryParams.append('customerId', filter.customerId);
      if (filter.startDate) queryParams.append('startDate', filter.startDate);
      if (filter.endDate) queryParams.append('endDate', filter.endDate);

      const response = await fetch(`/api/${orgSlug}/credit-notes?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setCreditNotes(data.data);
      }
    } catch (error) {
      console.error('Error fetching credit notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
      DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock },
      PENDING_APPROVAL: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      APPLIED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
      PARTIALLY_APPLIED: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Clock },
      VOID: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    const Icon = config.icon;

    return (
      <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getReasonLabel = (reason: string) => {
    const reasons: Record<string, string> = {
      GOODS_RETURNED: 'Goods Returned',
      DAMAGED_GOODS: 'Damaged Goods',
      PRICING_ERROR: 'Pricing Error',
      BILLING_ERROR: 'Billing Error',
      DISCOUNT_ADJUSTMENT: 'Discount Adjustment',
      SERVICE_ISSUE: 'Service Issue',
      CANCELLATION: 'Cancellation',
      GOODWILL: 'Goodwill',
      OTHER: 'Other',
    };
    return reasons[reason] || reason;
  };

  // Calculate summary
  const summary = creditNotes.reduce(
    (acc, note) => ({
      totalAmount: acc.totalAmount + note.totalAmount,
      appliedAmount: acc.appliedAmount + note.appliedAmount,
      remainingAmount: acc.remainingAmount + note.remainingAmount,
    }),
    { totalAmount: 0, appliedAmount: 0, remainingAmount: 0 }
  );

  return (
    <div className="container mx-auto p-6">
      {/* Back Button */}
      <div className="mb-4">
        <Link
          href={`/${orgSlug}/dashboard`}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Credit Notes</h1>
          <p className="text-gray-600 mt-1">Manage customer credit notes and refunds</p>
        </div>
        <Link
          href={`/${orgSlug}/credit-notes/new`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Credit Note
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Credit Issued</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalAmount)}</div>
          <div className="text-xs text-gray-500 mt-1">{creditNotes.length} credit notes</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Applied to Invoices</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.appliedAmount)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {((summary.appliedAmount / (summary.totalAmount || 1)) * 100).toFixed(1)}% utilized
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Credit Balance Available</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.remainingAmount)}</div>
          <div className="text-xs text-gray-500 mt-1">Available for application</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="APPLIED">Applied</option>
            <option value="PARTIALLY_APPLIED">Partially Applied</option>
            <option value="VOID">Void</option>
          </select>
          <input
            type="date"
            value={filter.startDate}
            onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Start Date"
          />
          <input
            type="date"
            value={filter.endDate}
            onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="End Date"
          />
        </div>
      </div>

      {/* Credit Notes Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading credit notes...</div>
        ) : creditNotes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Credit Notes Found</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first credit note</p>
            <Link
              href={`/${orgSlug}/credit-notes/new`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Credit Note
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Credit Note #</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Customer</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Reason</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Original Invoice</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total Amount</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Applied</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Balance</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {creditNotes.map((note) => (
                <tr key={note.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/${orgSlug}/credit-notes/${note.id}`)}>
                  <td className="px-4 py-3">
                    <div className="font-mono text-blue-600 hover:text-blue-800">{note.creditNoteNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{formatDate(note.creditDate)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {note.customer.companyName || `${note.customer.firstName} ${note.customer.lastName}`}
                    </div>
                    <div className="text-xs text-gray-500">{note.customer.customerNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{getReasonLabel(note.reason)}</td>
                  <td className="px-4 py-3 text-sm">
                    {note.invoice ? note.invoice.invoiceNumber : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(note.totalAmount)}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(note.appliedAmount)}</td>
                  <td className="px-4 py-3 text-sm text-right text-blue-600 font-medium">
                    {formatCurrency(note.remainingAmount)}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(note.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
