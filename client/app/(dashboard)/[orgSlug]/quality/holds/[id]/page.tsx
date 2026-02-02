'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Ban,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Tag,
  MapPin,
  DollarSign
} from 'lucide-react';

interface QualityHold {
  id: string;
  number: string;
  product: { name: string; sku: string };
  lotNumber?: string;
  batchNumber?: string;
  serialNumber?: string;
  quantityHeld: number;
  unitOfMeasure: string;
  holdType: string;
  reason: string;
  status: string;
  disposition?: string;
  createdBy: { name: string };
  createdAt: string;
  metadata?: any;
  attachments?: any[];
}

const sampleHolds: QualityHold[] = [
  {
    id: 'qh-001',
    number: 'QH-2025-0001',
    product: { name: 'Steel Rods 1/2"', sku: 'RM-001' },
    lotNumber: 'LOT-9921',
    batchNumber: 'BATCH-2025-001',
    quantityHeld: 250,
    unitOfMeasure: 'pieces',
    holdType: 'REGULATORY',
    reason: 'UNBS compliance issue',
    status: 'ACTIVE',
    createdBy: { name: 'Quality - J. Singh' },
    createdAt: '2025-12-18',
    metadata: { unbsCaseNumber: 'UNBS-2025-0456' },
  },
  {
    id: 'qh-002',
    number: 'QH-2025-0002',
    product: { name: 'Aluminum Sheets 0.125"', sku: 'RM-002' },
    lotNumber: 'LOT-8819',
    quantityHeld: 120,
    unitOfMeasure: 'sheets',
    holdType: 'QUALITY',
    reason: 'COA missing',
    status: 'RELEASED',
    disposition: 'Released after COA uploaded',
    createdBy: { name: 'Receiving - M. Okello' },
    createdAt: '2025-12-16',
  },
  {
    id: 'qh-003',
    number: 'QH-2025-0003',
    product: { name: 'Packaging Box Small', sku: 'PKG-001' },
    serialNumber: 'SN-2025-0789',
    quantityHeld: 50,
    unitOfMeasure: 'pieces',
    holdType: 'SAFETY',
    reason: 'Damaged packaging',
    status: 'SCRAPPED',
    disposition: 'Scrapped due to damage',
    createdBy: { name: 'Warehouse - A. Patel' },
    createdAt: '2025-12-15',
  },
];

export default function QualityHoldDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const holdId = params.id as string;
  const [hold, setHold] = useState<QualityHold | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHoldDetails();
  }, [holdId, orgSlug]);

  const fetchHoldDetails = async () => {
    try {
      setLoading(true);
      // Try to fetch from API first
      const response = await fetch(`/api/${orgSlug}/quality/holds/${holdId}`);
      if (response.ok) {
        const data = await response.json();
        setHold(data);
      } else {
        // Fall back to sample data
        const sampleHold = sampleHolds.find(h => h.id === holdId);
        if (sampleHold) {
          setHold(sampleHold);
        }
      }
    } catch (error) {
      console.error('Error fetching hold details, using sample data:', error);
      const sampleHold = sampleHolds.find(h => h.id === holdId);
      if (sampleHold) {
        setHold(sampleHold);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseHold = async () => {
    if (!hold) return;

    try {
      const response = await fetch(`/api/${orgSlug}/quality/holds/${holdId}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disposition: 'RELEASE',
          notes: 'Released via UI'
        }),
      });

      if (response.ok) {
        // Refresh the hold data
        fetchHoldDetails();
      } else {
        console.error('Failed to release hold');
      }
    } catch (error) {
      console.error('Error releasing hold:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!hold) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Hold Not Found</h2>
          <p className="text-gray-600 mb-4">The quality hold you're looking for doesn't exist.</p>
          <Button onClick={() => router.push(`/${orgSlug}/quality/holds`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Holds
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/${orgSlug}/quality/holds`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Holds
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{hold.number}</h1>
            <p className="text-gray-500">Quality Hold Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={hold.status === 'ACTIVE' ? 'danger' : hold.status === 'RELEASED' ? 'success' : 'default'}>
            {hold.status}
          </Badge>
          {hold.status === 'ACTIVE' && (
            <Button onClick={handleReleaseHold} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Release Hold
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Product</label>
                  <p className="text-lg font-semibold">{hold.product.name}</p>
                  <p className="text-sm text-gray-600">SKU: {hold.product.sku}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Quantity Held</label>
                  <p className="text-lg font-semibold">{hold.quantityHeld} {hold.unitOfMeasure}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 my-4"></div>

              <div className="grid grid-cols-2 gap-4">
                {hold.lotNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Lot Number</label>
                    <p className="font-mono text-sm">{hold.lotNumber}</p>
                  </div>
                )}
                {hold.batchNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Batch Number</label>
                    <p className="font-mono text-sm">{hold.batchNumber}</p>
                  </div>
                )}
                {hold.serialNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Serial Number</label>
                    <p className="font-mono text-sm">{hold.serialNumber}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Hold Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Hold Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Hold Type</label>
                  <Badge variant="outline">
                    {hold.holdType.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Reason</label>
                  <p className="text-sm">{hold.reason}</p>
                </div>
              </div>

              {hold.disposition && (
                <>
                  <div className="border-t border-gray-200 my-4"></div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Disposition</label>
                    <p className="text-sm">{hold.disposition}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Compliance Information */}
          {hold.metadata && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Compliance Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {hold.metadata.unbsCaseNumber && (
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">UNBS Case: {hold.metadata.unbsCaseNumber}</span>
                    </div>
                  )}
                  {hold.metadata.regulatoryReference && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Regulatory Ref: {hold.metadata.regulatoryReference}</span>
                    </div>
                  )}
                  {hold.metadata.complianceNotes && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Notes: {hold.metadata.complianceNotes}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Hold Created</p>
                    <p className="text-xs text-gray-500">
                      {new Date(hold.createdAt).toLocaleDateString()} at {new Date(hold.createdAt).toLocaleTimeString()}
                    </p>
                    <p className="text-xs text-gray-600">by {hold.createdBy.name}</p>
                  </div>
                </div>

                {hold.status !== 'ACTIVE' && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Hold {hold.status}</p>
                      <p className="text-xs text-gray-500">Resolution completed</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {hold.status === 'ACTIVE' && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={handleReleaseHold}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Release to Stock
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/${orgSlug}/quality/holds/${holdId}/scrap`)}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Scrap/Write-off
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/${orgSlug}/quality/holds/${holdId}/rtv`)}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Return to Vendor
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Financial Impact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Impact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  ${((hold.quantityHeld * 10) || 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">Estimated value on hold</p>
                {hold.status === 'SCRAPPED' && (
                  <p className="text-sm text-red-600 mt-2">GL journal entry created</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}