'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ban, Package, Clock, CheckCircle, Plus } from 'lucide-react';

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

export default function QualityHoldsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug;
  const [holds, setHolds] = useState(sampleHolds);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHolds();
  }, [orgSlug]);

  const fetchHolds = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/${orgSlug}/quality/holds`);
      if (response.ok) {
        const data = await response.json();
        const records = data?.data || data;
        if (Array.isArray(records)) {
          setHolds(records);
        }
      }
    } catch (error) {
      console.error('Error fetching quality holds, showing sample data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalHolds = holds.length;
  const activeHolds = holds.filter(h => h.status === 'ACTIVE').length;
  const releasedHolds = holds.filter(h => h.status === 'RELEASED').length;
  const totalQtyHeld = holds
    .filter(h => h.status === 'ACTIVE')
    .reduce((sum, h) => sum + h.quantityHeld, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-red-100 text-red-800';
      case 'RELEASED':
        return 'bg-green-100 text-green-800';
      case 'SCRAPPED':
        return 'bg-gray-100 text-gray-800';
      case 'REWORKED':
        return 'bg-blue-100 text-blue-800';
      case 'RETURNED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getHoldTypeColor = (type: string) => {
    switch (type) {
      case 'QUALITY':
        return 'bg-orange-100 text-orange-800';
      case 'SAFETY':
        return 'bg-red-100 text-red-800';
      case 'REGULATORY':
        return 'bg-purple-100 text-purple-800';
      case 'SUPPLIER_RECALL':
        return 'bg-yellow-100 text-yellow-800';
      case 'CUSTOMER_COMPLAINT':
        return 'bg-pink-100 text-pink-800';
      case 'INTERNAL_REVIEW':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleReleaseHold = async (hold: QualityHold) => {
    // TODO: Implement hold release logic
    console.log('Releasing hold:', hold.id);
  };

  const [selectedHold, setSelectedHold] = useState(null);

  if (loading) {
    return (
      <div>Loading...</div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quality Holds</h1>
          <p className="text-gray-500">Manage inventory holds and dispositions</p>
        </div>
        <Button
          onClick={() => router.push(`/${orgSlug}/quality/holds/new`)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Quality Hold
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Holds</p>
              <p className="text-2xl font-bold">{totalHolds}</p>
            </div>
            <Ban className="h-8 w-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Holds</p>
              <p className="text-2xl font-bold">{activeHolds}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Released</p>
              <p className="text-2xl font-bold">{releasedHolds}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Quantity Held</p>
              <p className="text-2xl font-bold">{totalQtyHeld}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Reason Code Library */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Reason Code Library</h3>
          <p className="text-sm text-gray-600 mb-4">
            Standardized reasons for quality holds to enable cost of poor quality reporting.
          </p>
          <div className="space-y-2">
            {[
              'Label mismatch',
              'COA missing',
              'Contamination suspected',
              'Damaged packaging',
              'Expired product',
              'Incorrect specifications',
              'Supplier quality issue',
              'Regulatory non-compliance',
              'UNBS compliance issue',
              'PVoC requirement',
            ].map((reason, index) => (
              <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <span className="text-sm">{reason}</span>
                <span className="text-xs text-gray-500">Code: QH-{String(index + 1).padStart(3, '0')}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Resolution Center */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Resolution Center</h3>
          <p className="text-sm text-gray-600 mb-4">
            Quick access to hold resolution workflows and automated actions.
          </p>
          <div className="space-y-3">
            <div
              className="flex items-center gap-3 p-3 bg-green-50 rounded cursor-pointer hover:bg-green-100 transition-colors"
              onClick={() => router.push(`/${orgSlug}/quality/holds/new?resolution=release`)}
            >
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Release to Stock</p>
                <p className="text-xs text-gray-600">No GL impact - restore inventory</p>
              </div>
              <span className="text-xs text-green-600 font-medium">→</span>
            </div>
            <div
              className="flex items-center gap-3 p-3 bg-red-50 rounded cursor-pointer hover:bg-red-100 transition-colors"
              onClick={() => router.push(`/${orgSlug}/quality/holds/new?resolution=scrap`)}
            >
              <Ban className="h-5 w-5 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Scrap/Write-off</p>
                <p className="text-xs text-gray-600">Creates GL entry - inventory loss</p>
              </div>
              <span className="text-xs text-red-600 font-medium">→</span>
            </div>
            <div
              className="flex items-center gap-3 p-3 bg-blue-50 rounded cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={() => router.push(`/${orgSlug}/quality/holds/new?resolution=rtv`)}
            >
              <Package className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Return to Vendor</p>
                <p className="text-xs text-gray-600">Creates GL entry - RTV expense</p>
              </div>
              <span className="text-xs text-blue-600 font-medium">→</span>
            </div>
            <div
              className="flex items-center gap-3 p-3 bg-yellow-50 rounded cursor-pointer hover:bg-yellow-100 transition-colors"
              onClick={() => router.push(`/${orgSlug}/quality/holds/new?resolution=rework`)}
            >
              <Clock className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Rework</p>
                <p className="text-xs text-gray-600">Creates GL entry - rework expense</p>
              </div>
              <span className="text-xs text-yellow-600 font-medium">→</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Quality Holds Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hold Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product & Lot
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type & Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compliance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {holds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No quality holds found. Create your first quality hold.
                  </td>
                </tr>
              ) : (
                holds.map((hold) => (
                  <tr
                    key={hold.id}
                    onClick={() => router.push(`/${orgSlug}/quality/holds/${hold.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {hold.number}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(hold.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {hold.product.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        SKU: {hold.product.sku}
                      </div>
                      <div className="text-sm text-gray-500">
                        Lot: {hold.lotNumber || 'N/A'}
                      </div>
                      {hold.batchNumber && (
                        <div className="text-sm text-gray-500">
                          Batch: {hold.batchNumber}
                        </div>
                      )}
                      {hold.serialNumber && (
                        <div className="text-sm text-gray-500">
                          Serial: {hold.serialNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {hold.quantityHeld} {hold.unitOfMeasure}
                      </div>
                      <div className="text-sm text-gray-500">
                        Available: {hold.product.quantityAvailable || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {hold.holdType.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {hold.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          hold.status
                        )}`}
                      >
                        {hold.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {hold.metadata?.unbsReference && (
                        <div className="text-sm text-gray-900">
                          UNBS: {hold.metadata.unbsReference}
                        </div>
                      )}
                      {hold.metadata?.regulatoryReference && (
                        <div className="text-sm text-gray-500">
                          Reg: {hold.metadata.regulatoryReference}
                        </div>
                      )}
                      {hold.metadata?.complianceNotes && (
                        <div className="text-sm text-gray-500">
                          Notes: {hold.metadata.complianceNotes.substring(0, 20)}...
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHold(hold);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View Details
                        </button>
                        {hold.status === 'ACTIVE' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReleaseHold(hold);
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            Release
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Resolution Center */}
      <div className="mt-8">
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Resolution Center</h2>
            <p className="text-gray-600 mb-4">
              Quick access to hold resolution workflows with automated financial and inventory actions.
            </p>
            <div className="space-y-4">
              <div
                className="flex items-center justify-between p-4 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                onClick={() => router.push(`/${orgSlug}/quality/holds/new?resolution=release`)}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">Release to Stock</h3>
                    <p className="text-sm text-gray-600">Restore inventory availability for sale</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-green-600 font-medium">No GL Impact</span>
                  <div className="text-xs text-green-600 mt-1">→ Create Hold</div>
                </div>
              </div>
              <div
                className="flex items-center justify-between p-4 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                onClick={() => router.push(`/${orgSlug}/quality/holds/new?resolution=scrap`)}
              >
                <div className="flex items-center gap-3">
                  <Ban className="h-6 w-6 text-red-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">Scrap/Write-off</h3>
                    <p className="text-sm text-gray-600">Remove from inventory with cost recognition</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-red-600 font-medium">Creates GL Entry</span>
                  <div className="text-xs text-red-600 mt-1">→ Create Hold</div>
                </div>
              </div>
              <div
                className="flex items-center justify-between p-4 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => router.push(`/${orgSlug}/quality/holds/new?resolution=rtv`)}
              >
                <div className="flex items-center gap-3">
                  <Package className="h-6 w-6 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">Return to Vendor</h3>
                    <p className="text-sm text-gray-600">Initiate RTV process with supplier</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-blue-600 font-medium">RTV Workflow</span>
                  <div className="text-xs text-blue-600 mt-1">→ Create Hold</div>
                </div>
              </div>
              <div
                className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                onClick={() => router.push(`/${orgSlug}/quality/holds/new?resolution=rework`)}
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-yellow-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">Rework</h3>
                    <p className="text-sm text-gray-600">Send to production for rework</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-yellow-600 font-medium">Production Order</span>
                  <div className="text-xs text-yellow-600 mt-1">→ Create Hold</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
