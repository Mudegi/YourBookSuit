'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Printer, Trash2 } from 'lucide-react';

export default function SalesReceiptDetailPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const id = params.id as string;
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const response = await fetch(
          `/api/orgs/${orgSlug}/sales-receipts/${id}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load sales receipt');
        }
        const data = await response.json();
        console.log('Receipt data:', data);
        setReceipt(data.data || data.salesReceipt || data);
      } catch (err) {
        console.error('Error fetching receipt:', err);
        setError(err instanceof Error ? err.message : 'Failed to load receipt');
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [orgSlug, id]);

  const handlePrint = () => {
    window.open(`/(dashboard)/${orgSlug}/accounts-receivable/sales-receipts/${id}/print`, '_blank');
  };

  const handleVoid = async () => {
    if (!confirm('Are you sure you want to void this sales receipt? This will reverse the inventory and accounting entries.')) {
      return;
    }

    setIsVoiding(true);
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/sales-receipts/${id}/void`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Failed to void receipt');
      }

      // Reload the page
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to void receipt');
    } finally {
      setIsVoiding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading sales receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Link href={`/(dashboard)/${orgSlug}/accounts-receivable/sales-receipts`}>
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sales Receipts
          </Button>
        </Link>
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">{error || 'Sales receipt not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href={`/(dashboard)/${orgSlug}/accounts-receivable/sales-receipts`}>
              <Button variant="outline" size="sm" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Sales Receipt</h1>
            <p className="text-gray-600">{receipt.receiptNumber}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
            {receipt.status !== 'VOIDED' && (
              <Button
                onClick={handleVoid}
                variant="destructive"
                disabled={isVoiding}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isVoiding ? 'Voiding...' : 'Void'}
              </Button>
            )}
          </div>
        </div>

        {/* Main Receipt Card */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <CardDescription className="text-gray-600">Receipt Number</CardDescription>
                <p className="text-lg font-semibold text-gray-900">{receipt.receiptNumber}</p>
              </div>
              <div>
                <CardDescription className="text-gray-600">Status</CardDescription>
                <p className={`text-lg font-semibold ${
                  receipt.status === 'COMPLETED' ? 'text-green-600' :
                  receipt.status === 'VOIDED' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {receipt.status}
                </p>
              </div>
              <div>
                <CardDescription className="text-gray-600">Receipt Date</CardDescription>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(receipt.receiptDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <CardDescription className="text-gray-600">Customer</CardDescription>
                <p className="text-lg font-semibold text-gray-900">
                  {receipt.customer?.name || 'Walk-in Customer'}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Line Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Description</th>
                    <th className="text-right py-3 px-4 font-semibold">Qty</th>
                    <th className="text-right py-3 px-4 font-semibold">Unit Price</th>
                    <th className="text-right py-3 px-4 font-semibold">Discount</th>
                    <th className="text-right py-3 px-4 font-semibold">Tax</th>
                    <th className="text-right py-3 px-4 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items?.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{item.description}</td>
                      <td className="text-right py-3 px-4">{Number(item.quantity).toFixed(2)}</td>
                      <td className="text-right py-3 px-4">{Number(item.unitPrice).toLocaleString('en-US', { style: 'currency', currency: receipt.currency || 'USD' })}</td>
                      <td className="text-right py-3 px-4">{Number(item.discount).toLocaleString('en-US', { style: 'currency', currency: receipt.currency || 'USD' })}</td>
                      <td className="text-right py-3 px-4">{Number(item.taxAmount).toLocaleString('en-US', { style: 'currency', currency: receipt.currency || 'USD' })}</td>
                      <td className="text-right py-3 px-4 font-semibold">{Number(item.lineTotal).toLocaleString('en-US', { style: 'currency', currency: receipt.currency || 'USD' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span>{Number(receipt.subtotal).toLocaleString('en-US', { style: 'currency', currency: receipt.currency || 'USD' })}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Total Discount</span>
                <span>-{Number(receipt.discountAmount).toLocaleString('en-US', { style: 'currency', currency: receipt.currency || 'USD' })}</span>
              </div>
              <div className="flex justify-between text-gray-700 border-t pt-3">
                <span>Tax</span>
                <span>{Number(receipt.taxAmount).toLocaleString('en-US', { style: 'currency', currency: receipt.currency || 'USD' })}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>Total</span>
                <span>{Number(receipt.total).toLocaleString('en-US', { style: 'currency', currency: receipt.currency || 'USD' })}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Payment Method</p>
                <p className="font-semibold">{receipt.paymentMethod}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Deposited To</p>
                <p className="font-semibold">{receipt.depositToAccount?.name}</p>
              </div>
              {receipt.referenceNumber && (
                <div>
                  <p className="text-sm text-gray-600">Reference Number</p>
                  <p className="font-semibold">{receipt.referenceNumber}</p>
                </div>
              )}
              {receipt.mobileNetwork && (
                <div>
                  <p className="text-sm text-gray-600">Mobile Network</p>
                  <p className="font-semibold">{receipt.mobileNetwork}</p>
                </div>
              )}
            </div>
            {receipt.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">Notes</p>
                <p className="text-gray-900">{receipt.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
