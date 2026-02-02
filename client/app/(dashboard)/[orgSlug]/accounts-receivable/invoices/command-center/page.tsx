'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Search, Filter, Download, Mail, DollarSign,
  TrendingUp, AlertCircle, Clock, CheckCircle, Eye,
  FileText, Send, MoreVertical, Calendar
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/utils';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  total: number;
  amountDue: number;
  baseCurrencyTotal?: number;
  currency: string;
  customerName: string;
  daysOverdue: number;
  customer: {
    id: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    email?: string;
  };
  Branch?: {
    id: string;
    name: string;
  };
  efrisFDN?: string;
}

interface InvoiceMetrics {
  totalOutstanding: number;
  overdueTotal: number;
  daysToOverdue: number;
  averageDSO: number;
  totalInvoices: number;
  agingBuckets: Array<{
    bucket: string;
    count: number;
    totalAmount: number;
    percentage: number;
  }>;
}

export default function InvoiceCommandCenter() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const { organization, currency: baseCurrency } = useOrganization();

  // Data state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [metrics, setMetrics] = useState<InvoiceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

  // Filter state
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [agingFilter, setAgingFilter] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchData();
  }, [orgSlug, statusFilter, agingFilter, searchTerm, page]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch metrics and invoices in parallel
      const [metricsRes, invoicesRes] = await Promise.all([
        fetch(`/api/orgs/${orgSlug}/invoices/analytics`),
        fetch(buildQueryUrl()),
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices(invoicesData.invoices || []);
        setTotalPages(invoicesData.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildQueryUrl = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.append('status', statusFilter);
    if (agingFilter) params.append('agingDays', agingFilter.toString());
    if (searchTerm) params.append('search', searchTerm);
    params.append('page', page.toString());
    params.append('limit', '50');

    return `/api/orgs/${orgSlug}/invoices?${params.toString()}`;
  };

  const getStatusBadge = (status: string, daysOverdue: number) => {
    if (daysOverdue > 0 && status !== 'PAID') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Overdue ({daysOverdue}d)
        </span>
      );
    }

    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800', icon: FileText },
      ISSUED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Send },
      SENT: { bg: 'bg-purple-100', text: 'text-purple-800', icon: Mail },
      PARTIAL: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      PAID: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      VOID: { bg: 'bg-gray-100', text: 'text-gray-500', icon: FileText },
    };

    const badge = badges[status] || badges.DRAFT;
    const Icon = badge.icon;

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badge.bg} ${badge.text} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    );
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      newSelected.add(invoiceId);
    }
    setSelectedInvoices(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.size === invoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(invoices.map(inv => inv.id)));
    }
  };

  const handleBulkReminders = async () => {
    if (selectedInvoices.size === 0) return;

    if (!confirm(`Send payment reminders to ${selectedInvoices.size} customers?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/orgs/${orgSlug}/invoices/bulk-reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceIds: Array.from(selectedInvoices) }),
      });

      if (res.ok) {
        alert(`Reminders sent to ${selectedInvoices.size} customers`);
        setSelectedInvoices(new Set());
      }
    } catch (error) {
      alert('Failed to send reminders');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice command center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoice Command Center</h1>
          <p className="text-gray-600 mt-1">Monitor, collect, and manage revenue</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/${orgSlug}/accounts-receivable/invoices/new`}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Basic Invoice
          </Link>
          <Link
            href={`/${orgSlug}/accounts-receivable/invoices/new-intelligent`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Smart Invoice
          </Link>
        </div>
      </div>

      {/* KPI Summary Bar */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Outstanding */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-blue-100 text-sm font-medium">Total Outstanding</div>
              <DollarSign className="w-5 h-5 text-blue-200" />
            </div>
            <div className="text-3xl font-bold">{formatCurrency(metrics.totalOutstanding, baseCurrency)}</div>
            <div className="text-blue-100 text-sm mt-1">{metrics.totalInvoices} invoices</div>
          </div>

          {/* Overdue Total */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-red-100 text-sm font-medium">Overdue Total</div>
              <AlertCircle className="w-5 h-5 text-red-200" />
            </div>
            <div className="text-3xl font-bold">{formatCurrency(metrics.overdueTotal, baseCurrency)}</div>
            <div className="text-red-100 text-sm mt-1">
              {metrics.overdueTotal > 0 ? `Avg ${metrics.daysToOverdue} days late` : 'All current!'}
            </div>
          </div>

          {/* Average DSO */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-purple-100 text-sm font-medium">Average DSO</div>
              <Clock className="w-5 h-5 text-purple-200" />
            </div>
            <div className="text-3xl font-bold">{metrics.averageDSO} days</div>
            <div className="text-purple-100 text-sm mt-1">Days Sales Outstanding</div>
          </div>

          {/* Collection Rate */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-green-100 text-sm font-medium">Collection Health</div>
              <TrendingUp className="w-5 h-5 text-green-200" />
            </div>
            <div className="text-3xl font-bold">
              {metrics.totalOutstanding > 0
                ? Math.round(((metrics.totalOutstanding - metrics.overdueTotal) / metrics.totalOutstanding) * 100)
                : 100}%
            </div>
            <div className="text-green-100 text-sm mt-1">Current invoices</div>
          </div>
        </div>
      )}

      {/* Aging Buckets */}
      {metrics && metrics.agingBuckets.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Aging Analysis</h2>
          <div className="grid grid-cols-4 gap-4">
            {metrics.agingBuckets.map((bucket, index) => (
              <button
                key={index}
                onClick={() => {
                  if (bucket.bucket.includes('31-60')) setAgingFilter(31);
                  else if (bucket.bucket.includes('61-90')) setAgingFilter(61);
                  else if (bucket.bucket.includes('Over 90')) setAgingFilter(90);
                  else setAgingFilter(null);
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  (agingFilter === 31 && bucket.bucket.includes('31-60')) ||
                  (agingFilter === 61 && bucket.bucket.includes('61-90')) ||
                  (agingFilter === 90 && bucket.bucket.includes('Over 90')) ||
                  (agingFilter === null && bucket.bucket.includes('Current'))
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-sm text-gray-600 mb-1">{bucket.bucket}</div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(bucket.totalAmount, baseCurrency)}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {bucket.count} invoices ({bucket.percentage.toFixed(1)}%)
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoices, customers..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ISSUED">Issued</option>
            <option value="SENT">Sent</option>
            <option value="PARTIAL">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="VOID">Void</option>
          </select>

          {/* Bulk Actions */}
          {selectedInvoices.size > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleBulkReminders}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Send Reminders ({selectedInvoices.size})
              </button>
              <button
                onClick={() => alert('Bulk PDF generation coming soon')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDFs
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.size === invoices.length && invoices.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance Due
                </th>
                {organization?.homeCountry === 'UG' && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fiscal Ref
                  </th>
                )}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    invoice.daysOverdue > 0 && invoice.status !== 'PAID' ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.has(invoice.id)}
                      onChange={() => toggleInvoiceSelection(invoice.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/${orgSlug}/accounts-receivable/invoices/${invoice.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900">{invoice.customerName}</div>
                    {invoice.customer.email && (
                      <div className="text-sm text-gray-500">{invoice.customer.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {getStatusBadge(invoice.status, invoice.daysOverdue)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {formatDate(invoice.invoiceDate)}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <div className={invoice.daysOverdue > 0 && invoice.status !== 'PAID' ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                      {formatDate(invoice.dueDate)}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-right font-medium text-gray-900">
                    {formatCurrency(invoice.baseCurrencyTotal || invoice.total, invoice.currency)}
                    {invoice.currency !== baseCurrency && (
                      <div className="text-xs text-gray-500">
                        ≈ {formatCurrency(invoice.baseCurrencyTotal || invoice.total, baseCurrency)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-right font-semibold">
                    <div className={invoice.amountDue > 0 ? 'text-orange-600' : 'text-green-600'}>
                      {formatCurrency(invoice.amountDue, invoice.currency)}
                    </div>
                  </td>
                  {organization?.homeCountry === 'UG' && (
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {invoice.efrisFDN || '-'}
                    </td>
                  )}
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/${orgSlug}/accounts-receivable/invoices/${invoice.id}`}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => alert('Quick pay modal coming soon')}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Record Payment"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => alert('Send reminder coming soon')}
                        className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                        title="Send Reminder"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => alert('Download PDF coming soon')}
                        className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {!loading && invoices.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter !== 'ALL'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first invoice'}
          </p>
          <Link
            href={`/${orgSlug}/accounts-receivable/invoices/new-intelligent`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Link>
        </div>
      )}
    </div>
  );
}
