'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, Building2, MapPin, CreditCard, Calendar, DollarSign, FileText } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/utils';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  totalAmount: number;
}

interface Customer {
  id: string;
  name?: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  taxIdNumber: string | null;
  billingAddress: any;
  shippingAddress: any;
  notes: string | null;
  creditLimit: number | null;
  paymentTerms: number;
  isActive: boolean;
  createdAt: string;
  invoices: Invoice[];
  totalOwed: number;
  totalPaid: number;
  _count: {
    invoices: number;
  };
}

export default function CustomerDetailsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const customerId = params.id as string;
  const { currency } = useOrganization();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  const fetchCustomer = async () => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/customers/${customerId}`);
      const data = await response.json();

      if (data.success) {
        setCustomer(data.data);
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Customer not found</p>
        <Link
          href={`/${orgSlug}/accounts-receivable/customers`}
          className="text-blue-600 hover:text-blue-700 mt-4 inline-block"
        >
          Back to Customers
        </Link>
      </div>
    );
  }

  const formatPaymentTerms = (terms: number) => {
    return terms === 0 ? 'Due on Receipt' : `Net ${terms}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      case 'SENT':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const displayName = (customer?.name || `${customer?.firstName ?? ''} ${customer?.lastName ?? ''}`).trim();

  const formatAddress = (address: any) => {
    if (!address) return '';
    if (typeof address === 'string') return address;
    if (typeof address === 'object') {
      return [address.street, address.city, address.state, address.zip, address.country]
        .filter(Boolean)
        .join('\n');
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/${orgSlug}/accounts-receivable/customers`}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
            {customer.companyName && (
              <p className="text-gray-600 mt-1">{customer.companyName}</p>
            )}
          </div>
        </div>
        <span
          className={`px-3 py-1 text-sm font-semibold rounded-full ${
            customer.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {customer.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Total Outstanding</div>
            <DollarSign className="h-5 w-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(customer.totalOwed, currency)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Total Paid</div>
            <DollarSign className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(customer.totalPaid, currency)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Total Invoices</div>
            <FileText className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {customer._count.invoices}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Credit Limit</div>
            <CreditCard className="h-5 w-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {customer.creditLimit ? formatCurrency(customer.creditLimit, currency) : 'Unlimited'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information */}
        <div className="lg:col-span-1 space-y-6">
          {/* Contact Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-3">
              {customer.email && (
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <div className="text-sm text-gray-500">Email</div>
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {customer.email}
                    </a>
                  </div>
                </div>
              )}

              {customer.phone && (
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <div className="text-sm text-gray-500">Phone</div>
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {customer.phone}
                    </a>
                  </div>
                </div>
              )}

              {customer.taxIdNumber && (
                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <div className="text-sm text-gray-500">Tax ID</div>
                    <div className="text-gray-900">{customer.taxIdNumber}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Addresses */}
          {(customer.billingAddress || customer.shippingAddress) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Addresses</h2>
              <div className="space-y-4">
                {customer.billingAddress && (
                  <div>
                    <div className="flex items-center mb-2">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                      <div className="text-sm font-medium text-gray-700">Billing Address</div>
                    </div>
                    <div className="text-gray-900 whitespace-pre-line pl-6">
                      {formatAddress(customer.billingAddress)}
                    </div>
                  </div>
                )}

                {customer.shippingAddress && (
                  <div>
                    <div className="flex items-center mb-2">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                      <div className="text-sm font-medium text-gray-700">Shipping Address</div>
                    </div>
                    <div className="text-gray-900 whitespace-pre-line pl-6">
                      {formatAddress(customer.shippingAddress)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Terms */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Terms</h2>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <div className="text-sm text-gray-500">Default Terms</div>
                <div className="text-gray-900 font-medium">
                  {formatPaymentTerms(customer.paymentTerms)}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {customer.notes && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
              <p className="text-gray-700 whitespace-pre-line">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>
                <Link
                  href={`/${orgSlug}/accounts-receivable/invoices/new?customerId=${customer.id}`}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Create Invoice
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              {customer.invoices.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No invoices yet</p>
                  <Link
                    href={`/${orgSlug}/accounts-receivable/invoices/new?customerId=${customer.id}`}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Create first invoice
                  </Link>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customer.invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(invoice.invoiceDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(invoice.totalAmount, currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              invoice.status
                            )}`}
                          >
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Link
                            href={`/${orgSlug}/accounts-receivable/invoices/${invoice.id}`}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
