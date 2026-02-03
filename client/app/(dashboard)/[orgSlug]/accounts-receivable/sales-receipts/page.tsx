'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Eye } from 'lucide-react';

export default function SalesReceiptsListPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchReceipts();
  }, [page, orgSlug]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/orgs/${orgSlug}/sales-receipts?page=${page}&limit=${limit}`
      );
      if (!response.ok) {
        throw new Error('Failed to load sales receipts');
      }
      const data = await response.json();
      setReceipts(data.data?.salesReceipts || data.salesReceipts || []);
      setTotal(data.data?.total || data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading sales receipts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Sales Receipts</h1>
            <p className="text-gray-600 mt-2">Instant cash and mobile money sales</p>
          </div>
          <Link href={`/(dashboard)/${orgSlug}/accounts-receivable/sales-receipts/new`}>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Receipt
            </Button>
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {receipts.length === 0 ? (
          <Card>
            <CardContent className="pt-12 text-center">
              <p className="text-gray-600 mb-4">No sales receipts yet</p>
              <Link href={`/(dashboard)/${orgSlug}/accounts-receivable/sales-receipts/new`}>
                <Button>Create Your First Receipt</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Receipts Table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Receipts</CardTitle>
                <CardDescription>
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} receipts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold">Receipt #</th>
                        <th className="text-left py-3 px-4 font-semibold">Customer</th>
                        <th className="text-left py-3 px-4 font-semibold">Date</th>
                        <th className="text-left py-3 px-4 font-semibold">Payment Method</th>
                        <th className="text-right py-3 px-4 font-semibold">Amount</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                        <th className="text-left py-3 px-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipts.map((receipt: any) => (
                        <tr key={receipt.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-semibold text-blue-600">
                            <Link href={`/(dashboard)/${orgSlug}/accounts-receivable/sales-receipts/${receipt.id}`}>
                              {receipt.receiptNumber}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            {receipt.customer?.name || 'Walk-in Customer'}
                          </td>
                          <td className="py-3 px-4">
                            {new Date(receipt.receiptDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                              {receipt.paymentMethod.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="text-right py-3 px-4 font-semibold">
                            {Number(receipt.total).toLocaleString('en-US', {
                              style: 'currency',
                              currency: receipt.currency || 'USD',
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                receipt.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-800'
                                  : receipt.status === 'VOIDED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {receipt.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/(dashboard)/${orgSlug}/accounts-receivable/sales-receipts/${receipt.id}`}>
                              <Button variant="ghost" size="sm" className="gap-2">
                                <Eye className="w-4 h-4" />
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Page {page} of {Math.ceil(total / limit)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= Math.ceil(total / limit)}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
