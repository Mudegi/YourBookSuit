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

interface Bill {
  id: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  totalAmount: number;
  status: string;
  transaction: {
    id: string;
    transactionNumber: string;
    status: string;
  } | null;
}

interface Vendor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  taxId: string | null;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  paymentTerms: string;
  notes: string | null;
  isActive: boolean;
  totalOwed: number;
  totalPaid: number;
  bills: Bill[];
  _count: { bills: number };
}

export default function VendorDetailsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const vendorId = params.id as string;
  const { currency } = useOrganization();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVendor();
  }, [vendorId]);

  async function fetchVendor() {
    try {
      setLoading(true);
      const response = await fetch(`/api/orgs/${orgSlug}/vendors/${vendorId}`);
      if (!response.ok) throw new Error('Failed to fetch vendor');
      const data = await response.json();
      setVendor(data);
    } catch (err) {
      setError('Failed to load vendor details');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error || 'Vendor not found'}</Alert>
        <Link href={`/${orgSlug}/accounts-payable/vendors`}>
          <Button variant="outline">Back to Vendors</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link
            href={`/${orgSlug}/accounts-payable/vendors`}
            className="text-blue-600 hover:underline text-sm"
          >
            ← Back to Vendors
          </Link>
          <h1 className="text-3xl font-bold mt-2">{vendor.name}</h1>
          <span
            className={`inline-block mt-2 px-3 py-1 text-sm rounded ${
              vendor.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {vendor.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="flex gap-2">
          <Link href={`/${orgSlug}/accounts-payable/bills/new?vendorId=${vendor.id}`}>
            <Button>Create Bill</Button>
          </Link>
          <Link href={`/${orgSlug}/accounts-payable/vendors`}>
            <Button variant="outline">Edit Vendor</Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Owed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(vendor.totalOwed, currency)}
            </p>
            <p className="text-xs text-gray-500">unpaid bills</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(vendor.totalPaid, currency)}
            </p>
            <p className="text-xs text-gray-500">paid bills</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{vendor._count.bills}</p>
            <p className="text-xs text-gray-500">all time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Payment Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {vendor.paymentTerms} days
            </p>
            <p className="text-xs text-gray-500">standard terms</p>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vendor.email && (
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{vendor.email}</p>
              </div>
            )}
            {vendor.phone && (
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{vendor.phone}</p>
              </div>
            )}
            {vendor.website && (
              <div>
                <p className="text-sm text-gray-600">Website</p>
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline"
                >
                  {vendor.website}
                </a>
              </div>
            )}
            {vendor.taxId && (
              <div>
                <p className="text-sm text-gray-600">Tax ID</p>
                <p className="font-medium">{vendor.taxId}</p>
              </div>
            )}
            {vendor.contactPerson && (
              <div>
                <p className="text-sm text-gray-600">Contact Person</p>
                <p className="font-medium">{vendor.contactPerson}</p>
                {vendor.contactEmail && (
                  <p className="text-sm text-gray-600">{vendor.contactEmail}</p>
                )}
                {vendor.contactPhone && (
                  <p className="text-sm text-gray-600">{vendor.contactPhone}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Address</CardTitle>
          </CardHeader>
          <CardContent>
            {vendor.billingAddress ? (
              <div className="space-y-1">
                <p>{vendor.billingAddress}</p>
                <p>
                  {vendor.billingCity}
                  {vendor.billingState && `, ${vendor.billingState}`}{' '}
                  {vendor.billingPostalCode}
                </p>
                {vendor.billingCountry && <p>{vendor.billingCountry}</p>}
              </div>
            ) : (
              <p className="text-gray-500 italic">No billing address provided</p>
            )}
            {vendor.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600">Notes</p>
                <p className="mt-1 text-sm">{vendor.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Bills */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Recent Bills</CardTitle>
            <Link href={`/${orgSlug}/accounts-payable/bills?vendorId=${vendor.id}`}>
              <Button variant="outline" size="sm">
                View All Bills
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {vendor.bills.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No bills yet. Create a bill to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Bill #</th>
                    <th className="text-left py-2 font-medium">Date</th>
                    <th className="text-left py-2 font-medium">Due Date</th>
                    <th className="text-right py-2 font-medium">Amount</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-left py-2 font-medium">Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {vendor.bills.map((bill) => (
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
                        {new Date(bill.billDate).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        {new Date(bill.dueDate).toLocaleDateString()}
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
                      <td className="py-3">
                        {bill.transaction ? (
                          <Link
                            href={`/${orgSlug}/general-ledger/journal-entries/list?transactionId=${bill.transaction.id}`}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            {bill.transaction.transactionNumber}
                          </Link>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
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
