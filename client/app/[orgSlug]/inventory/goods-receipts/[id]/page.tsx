'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, CheckCircle, Calendar, User, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import Loading from '@/components/ui/loading';
import { formatCurrency, formatDate } from '@/lib/utils';

interface GoodsReceiptItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
}

interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  vendorName: string;
  referenceNumber?: string;
  notes?: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  status: string;
  efrisSubmitted: boolean;
  efrisStatus?: string;
  efrisReference?: string;
  createdAt: string;
  items: GoodsReceiptItem[];
}

export default function GoodsReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const receiptId = params.id as string;

  const [receipt, setReceipt] = useState<GoodsReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReceipt();
  }, [receiptId]);

  async function loadReceipt() {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/inventory/goods-receipts/${receiptId}`);
      if (!response.ok) {
        throw new Error('Failed to load goods receipt');
      }
      const data = await response.json();
      setReceipt(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <Alert variant="error">{error || 'Goods receipt not found'}</Alert>
          <Link href={`/${orgSlug}/inventory/goods-receipts`} className="mt-4 inline-block">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Goods Receipts
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/${orgSlug}/inventory/goods-receipts`}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Goods Receipts
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <Package className="w-10 h-10 text-blue-600" />
                {receipt.receiptNumber}
              </h1>
              <p className="text-gray-600 mt-1">Goods Receipt Details</p>
            </div>
            <div className="flex gap-2">
              {receipt.efrisSubmitted && (
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  EFRIS Registered
                </span>
              )}
              <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-700">
                {receipt.status}
              </span>
            </div>
          </div>
        </div>

        {/* Receipt Information */}
        <div className="grid gap-6 mb-6">
          <Card>
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="text-lg">Receipt Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Vendor</p>
                    <p className="font-semibold text-gray-900">{receipt.vendorName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Receipt Date</p>
                    <p className="font-semibold text-gray-900">{formatDate(receipt.receiptDate)}</p>
                  </div>
                </div>
                {receipt.referenceNumber && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Reference Number</p>
                      <p className="font-semibold text-gray-900">{receipt.referenceNumber}</p>
                    </div>
                  </div>
                )}
              </div>
              {receipt.notes && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-500 mb-2">Notes</p>
                  <p className="text-gray-900">{receipt.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* EFRIS Information */}
          {receipt.efrisSubmitted && (
            <Card>
              <CardHeader className="bg-green-50 border-b border-green-100">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  EFRIS Registration
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-semibold text-gray-900">{receipt.efrisStatus || 'SUBMITTED'}</p>
                  </div>
                  {receipt.efrisReference && (
                    <div>
                      <p className="text-sm text-gray-500">EFRIS Reference</p>
                      <p className="font-mono text-sm font-semibold text-gray-900">{receipt.efrisReference}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items */}
          <Card>
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="text-lg">Items</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm font-semibold text-gray-700">
                      <th className="pb-3">Product</th>
                      <th className="pb-3 text-right">Quantity</th>
                      <th className="pb-3 text-right">Unit Price</th>
                      <th className="pb-3 text-right">Tax Rate</th>
                      <th className="pb-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.items?.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-3 font-medium text-gray-900">{item.productName}</td>
                        <td className="py-3 text-right">{item.quantity}</td>
                        <td className="py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-3 text-right">{item.taxRate}%</td>
                        <td className="py-3 text-right font-semibold">{formatCurrency(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex justify-end">
                  <div className="w-full md:w-1/2 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(receipt.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax Amount:</span>
                      <span className="font-medium">{formatCurrency(receipt.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-3">
                      <span>Total:</span>
                      <span className="text-blue-600">{formatCurrency(receipt.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
