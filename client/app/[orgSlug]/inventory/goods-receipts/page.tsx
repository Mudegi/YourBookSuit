'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Package, CheckCircle, Clock, XCircle, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import Loading from '@/components/ui/loading';
import { formatCurrency, formatDate } from '@/lib/utils';

interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  vendorName: string;
  totalAmount: number;
  status: 'DRAFT' | 'RECEIVED' | 'QC_PENDING' | 'QC_PASSED' | 'QC_FAILED' | 'POSTED' | 'CANCELLED';
  efrisSubmitted: boolean;
  efrisStatus?: string;
  createdAt: string;
}

export default function GoodsReceiptsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReceipts();
  }, [orgSlug]);

  async function loadReceipts() {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/inventory/goods-receipts`);
      if (!response.ok) {
        throw new Error('Failed to load goods receipts');
      }
      const data = await response.json();
      setReceipts(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    const badges = {
      DRAFT: <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">Draft</span>,
      RECEIVED: <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">Received</span>,
      QC_PENDING: <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">QC Pending</span>,
      QC_PASSED: <span className="px-2 py-1 text-xs font-semibold rounded-full bg-teal-100 text-teal-700">QC Passed</span>,
      QC_FAILED: <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">QC Failed</span>,
      POSTED: <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Posted</span>,
      CANCELLED: <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">Cancelled</span>,
    };
    return badges[status as keyof typeof badges] || badges.DRAFT;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href={`/${orgSlug}/dashboard`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <Package className="w-10 h-10 text-blue-600" />
                Goods Receipts / Stock Purchases
              </h1>
              <p className="text-gray-600 mt-2">Receive stock from vendors and register with EFRIS</p>
            </div>
            <Link href={`/${orgSlug}/inventory/goods-receipts/new`}>
              <Button className="h-11 px-6">
                <Plus className="w-4 h-4 mr-2" />
                New Goods Receipt
              </Button>
            </Link>
          </div>
        </div>

        {error && <Alert variant="error" className="mb-6">{error}</Alert>}

        {/* Receipts List */}
        {receipts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No goods receipts yet</h3>
              <p className="text-gray-500 mb-6">
                Create your first goods receipt to record stock purchases and register with EFRIS
              </p>
              <Link href={`/${orgSlug}/inventory/goods-receipts/new`}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Goods Receipt
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {receipts.map((receipt) => (
              <Card
                key={receipt.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/${orgSlug}/inventory/goods-receipts/${receipt.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{receipt.receiptNumber}</h3>
                        {getStatusBadge(receipt.status)}
                        {receipt.efrisSubmitted && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            EFRIS Registered
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Vendor</p>
                          <p className="font-medium text-gray-900">{receipt.vendorName}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Receipt Date</p>
                          <p className="font-medium text-gray-900">{formatDate(receipt.receiptDate)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total Amount</p>
                          <p className="font-semibold text-gray-900">{formatCurrency(receipt.totalAmount)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Created</p>
                          <p className="font-medium text-gray-900">{formatDate(receipt.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
