'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';
import { ArrowLeft, AlertTriangle, TrendingDown, Users, DollarSign, FileText } from 'lucide-react';
import Link from 'next/link';

interface AgingBucket {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  total: number;
}

interface CustomerAging extends AgingBucket {
  customerId: string;
  customerNumber: string;
  customerName: string;
  customerEmail: string | null;
  company: string | null;
  currency: string;
  creditLimit: number | null;
  invoiceCount: number;
}

interface AgingSummary extends AgingBucket {
  totalCustomers: number;
  atRiskCustomers: number;
  totalInvoices: number;
  overdueInvoices: number;
}

interface AgingData {
  summary: AgingSummary;
  customers: CustomerAging[];
}

export default function CollectionsDashboard() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const { currency } = useOrganization();

  const [data, setData] = useState<AgingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBucket, setSelectedBucket] = useState<'all' | 'current' | '1-30' | '31-60' | '61-90' | '90+'>('all');

  useEffect(() => {
    fetchAgingData();
  }, [orgSlug, asOfDate]);

  const fetchAgingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/orgs/${orgSlug}/collections/aging?asOfDate=${asOfDate}`
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching aging data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = data?.customers.filter(customer => {
    if (selectedBucket === 'all') return true;
    if (selectedBucket === 'current') return customer.current > 0;
    if (selectedBucket === '1-30') return customer.days1to30 > 0;
    if (selectedBucket === '31-60') return customer.days31to60 > 0;
    if (selectedBucket === '61-90') return customer.days61to90 > 0;
    if (selectedBucket === '90+') return customer.days90plus > 0;
    return true;
  }) || [];

  // Dynamic font sizing based on amount length to prevent overflow
  const getAmountTextSize = (amount: number): string => {
    const formatted = formatCurrency(amount, currency);
    const length = formatted.length;
    
    if (length > 15) return 'text-base';
    if (length > 12) return 'text-lg';
    if (length > 9) return 'text-xl';
    return 'text-2xl';
  };

  const handleViewStatement = (customerId: string) => {
    // Calculate last 3 months for default statement period
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 3);

    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = toDate.toISOString().split('T')[0];

    // Open statement in new window for printing
    window.open(
      `/api/orgs/${orgSlug}/customers/${customerId}/statement?fromDate=${fromStr}&toDate=${toStr}`,
      '_blank'
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading collections data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-600">Failed to load collections dashboard</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Collections Dashboard</h1>
            <p className="text-gray-600 mt-1">Aged receivables and cash recovery tracking</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Outstanding</p>
              <p className={`${getAmountTextSize(data.summary.total)} font-bold text-gray-900 mt-1`}>
                {formatCurrency(data.summary.total, currency)}
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Customers w/ Balance</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.summary.totalCustomers}
              </p>
            </div>
            <Users className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">At Risk Customers</p>
              <p className="text-2xl font-bold text-red-900 mt-1">
                {data.summary.atRiskCustomers}
              </p>
            </div>
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue Invoices</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">
                {data.summary.overdueInvoices}
              </p>
            </div>
            <TrendingDown className="h-12 w-12 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Aging Buckets */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Aging Breakdown</h2>
        
        <div className="grid grid-cols-5 gap-4">
          <button
            onClick={() => setSelectedBucket('current')}
            className={`p-4 border-2 rounded-lg transition-colors ${
              selectedBucket === 'current'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <p className="text-sm text-gray-600">Current</p>
            <p className={`${getAmountTextSize(data.summary.current)} font-bold text-green-700 mt-1`}>
              {formatCurrency(data.summary.current, currency)}
            </p>
          </button>

          <button
            onClick={() => setSelectedBucket('1-30')}
            className={`p-4 border-2 rounded-lg transition-colors ${
              selectedBucket === '1-30'
                ? 'border-yellow-500 bg-yellow-50'
                : 'border-gray-200 hover:border-yellow-300'
            }`}
          >
            <p className="text-sm text-gray-600">1-30 Days</p>
            <p className={`${getAmountTextSize(data.summary.days1to30)} font-bold text-yellow-700 mt-1`}>
              {formatCurrency(data.summary.days1to30, currency)}
            </p>
          </button>

          <button
            onClick={() => setSelectedBucket('31-60')}
            className={`p-4 border-2 rounded-lg transition-colors ${
              selectedBucket === '31-60'
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-orange-300'
            }`}
          >
            <p className="text-sm text-gray-600">31-60 Days</p>
            <p className={`${getAmountTextSize(data.summary.days31to60)} font-bold text-orange-700 mt-1`}>
              {formatCurrency(data.summary.days31to60, currency)}
            </p>
          </button>

          <button
            onClick={() => setSelectedBucket('61-90')}
            className={`p-4 border-2 rounded-lg transition-colors ${
              selectedBucket === '61-90'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-red-300'
            }`}
          >
            <p className="text-sm text-gray-600">61-90 Days</p>
            <p className={`${getAmountTextSize(data.summary.days61to90)} font-bold text-red-700 mt-1`}>
              {formatCurrency(data.summary.days61to90, currency)}
            </p>
          </button>

          <button
            onClick={() => setSelectedBucket('90+')}
            className={`p-4 border-2 rounded-lg transition-colors ${
              selectedBucket === '90+'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300'
            }`}
          >
            <p className="text-sm text-gray-600">90+ Days</p>
            <p className={`${getAmountTextSize(data.summary.days90plus)} font-bold text-purple-700 mt-1`}>
              {formatCurrency(data.summary.days90plus, currency)}
            </p>
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Customer Aging ({filteredCustomers.length})
          </h2>
          <button
            onClick={() => setSelectedBucket('all')}
            className={`px-4 py-2 text-sm rounded-lg ${
              selectedBucket === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Show All
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Current
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  1-30
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  31-60
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  61-90
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  90+
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.customerId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link 
                      href={`/${orgSlug}/customers/${customer.customerId}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {customer.customerName}
                    </Link>
                    <p className="text-xs text-gray-500">{customer.customerNumber}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                    {customer.current > 0 ? formatCurrency(customer.current, currency) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-yellow-700">
                    {customer.days1to30 > 0 ? formatCurrency(customer.days1to30, currency) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-orange-700">
                    {customer.days31to60 > 0 ? formatCurrency(customer.days31to60, currency) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-red-700">
                    {customer.days61to90 > 0 ? formatCurrency(customer.days61to90, currency) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-purple-700 font-semibold">
                    {customer.days90plus > 0 ? formatCurrency(customer.days90plus, currency) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleViewStatement(customer.customerId)}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                      title="View Customer Statement"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Statement
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                    {formatCurrency(customer.total, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
