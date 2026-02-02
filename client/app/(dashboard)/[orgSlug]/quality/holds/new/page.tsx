'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Upload, X } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface Inspection {
  id: string;
  inspectionNumber: string;
  product: { name: string; sku: string };
}

interface HoldFormData {
  productId: string;
  warehouseId: string;
  inspectionId: string;
  quantity: number;
  holdType: string;
  reason: string;
  lotNumber: string;
  batchNumber: string;
  serialNumber: string;
  notes: string;
  metadata: {
    unbsCaseNumber?: string;
    regulatoryReference?: string;
    complianceCertificate?: string;
  };
  attachments: File[];
}

const HOLD_TYPES = [
  { value: 'QUALITY', label: 'Quality Issue' },
  { value: 'SAFETY', label: 'Safety Concern' },
  { value: 'REGULATORY', label: 'Regulatory Hold' },
  { value: 'SUPPLIER_RECALL', label: 'Supplier Recall' },
  { value: 'CUSTOMER_COMPLAINT', label: 'Customer Complaint' },
  { value: 'INTERNAL_REVIEW', label: 'Internal Review' },
];

const REASON_CODES = [
  'Label mismatch',
  'COA missing',
  'Contamination suspected',
  'Damaged packaging',
  'Expired product',
  'Incorrect specifications',
  'Supplier quality issue',
  'Regulatory non-compliance',
  'Customer complaint',
  'Internal audit finding',
  'UNBS compliance issue',
  'PVoC requirement',
];

export default function NewQualityHoldPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug as string;
  const { organization } = useOrganization();

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<HoldFormData>({
    productId: '',
    warehouseId: '',
    inspectionId: '',
    quantity: 0,
    holdType: 'QUALITY',
    reason: '',
    lotNumber: '',
    batchNumber: '',
    serialNumber: '',
    notes: '',
    metadata: {},
    attachments: [],
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!organization?.id) return;

      setLoading(true);
      try {
        // Load products
        const productsResponse = await fetch(`/api/${orgSlug}/inventory/products`);
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData.data || []);
        }

        // Load warehouses
        const warehousesResponse = await fetch(`/api/${orgSlug}/warehouse/warehouses`);
        if (warehousesResponse.ok) {
          const warehousesData = await warehousesResponse.json();
          setWarehouses(warehousesData.data || []);
        }

        // Load recent inspections
        const inspectionsResponse = await fetch(`/api/${orgSlug}/quality/inspections?status=PENDING&status=IN_PROGRESS`);
        if (inspectionsResponse.ok) {
          const inspectionsData = await inspectionsResponse.json();
          setInspections(inspectionsData.data || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organization?.id, orgSlug]);

  // Handle resolution parameter from URL
  useEffect(() => {
    const resolution = searchParams.get('resolution');
    if (resolution) {
      // Pre-select reason based on resolution type
      switch (resolution) {
        case 'release':
          setFormData(prev => ({
            ...prev,
            holdType: 'QUALITY',
            reason: 'Pending release decision'
          }));
          break;
        case 'scrap':
          setFormData(prev => ({
            ...prev,
            holdType: 'QUALITY',
            reason: 'Product requires scrapping'
          }));
          break;
        case 'rtv':
          setFormData(prev => ({
            ...prev,
            holdType: 'SUPPLIER_RECALL',
            reason: 'Return to vendor required'
          }));
          break;
        case 'rework':
          setFormData(prev => ({
            ...prev,
            holdType: 'QUALITY',
            reason: 'Product requires rework'
          }));
          break;
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productId || !formData.reason || formData.quantity <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const submitData = new FormData();

      // Add basic fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'attachments') return; // Handle separately
        if (key === 'metadata') {
          submitData.append(key, JSON.stringify(value));
        } else if (typeof value === 'number') {
          submitData.append(key, value.toString());
        } else if (typeof value === 'string') {
          submitData.append(key, value);
        }
      });

      // Add attachments
      formData.attachments.forEach((file, index) => {
        submitData.append(`attachments`, file);
      });

      const response = await fetch(`/api/${orgSlug}/quality/holds`, {
        method: 'POST',
        body: submitData,
      });

      if (response.ok) {
        const result = await response.json();
        router.push(`/${orgSlug}/quality/holds`);
      } else {
        const error = await response.json();
        alert(`Error creating hold: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating hold:', error);
      alert('Failed to create quality hold');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof HoldFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleMetadataChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]: value,
      },
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files],
    }));
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/${orgSlug}/quality/holds`}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quality Holds
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h1 className="text-2xl font-bold">New Quality Hold</h1>
          <p className="text-gray-600 mt-1">Place inventory on hold for quality concerns</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Product and Warehouse */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product *
              </label>
              <select
                value={formData.productId}
                onChange={(e) => handleInputChange('productId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warehouse
              </label>
              <select
                value={formData.warehouseId}
                onChange={(e) => handleInputChange('warehouseId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select warehouse (optional)</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hold Type and Quantity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hold Type
              </label>
              <select
                value={formData.holdType}
                onChange={(e) => handleInputChange('holdType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {HOLD_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity to Hold *
              </label>
              <input
                type="number"
                value={formData.quantity || ''}
                onChange={(e) => handleInputChange('quantity', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                min="0.01"
                step="0.01"
                required
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason *
            </label>
            <select
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              required
            >
              <option value="">Select a reason</option>
              {REASON_CODES.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Or enter custom reason"
            />
          </div>

          {/* Lot/Batch/Serial */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lot Number
              </label>
              <input
                type="text"
                value={formData.lotNumber}
                onChange={(e) => handleInputChange('lotNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Lot number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch Number
              </label>
              <input
                type="text"
                value={formData.batchNumber}
                onChange={(e) => handleInputChange('batchNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Batch number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Serial Number
              </label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Serial number"
              />
            </div>
          </div>

          {/* Related Inspection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Related Inspection
            </label>
            <select
              value={formData.inspectionId}
              onChange={(e) => handleInputChange('inspectionId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select inspection (optional)</option>
              {inspections.map((inspection) => (
                <option key={inspection.id} value={inspection.id}>
                  {inspection.inspectionNumber} - {inspection.product.name}
                </option>
              ))}
            </select>
          </div>

          {/* Compliance Metadata */}
          {(formData.holdType === 'REGULATORY' || formData.holdType === 'SAFETY') && (
            <div className="bg-blue-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 mb-3">Compliance Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    UNBS Case Number
                  </label>
                  <input
                    type="text"
                    value={formData.metadata.unbsCaseNumber || ''}
                    onChange={(e) => handleMetadataChange('unbsCaseNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="UNBS case reference"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Regulatory Reference
                  </label>
                  <input
                    type="text"
                    value={formData.metadata.regulatoryReference || ''}
                    onChange={(e) => handleMetadataChange('regulatoryReference', e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Certificate or reference number"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional details about the hold..."
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments
            </label>
            <div className="space-y-2">
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
              >
                <Upload className="w-4 h-4" />
                Upload Files (COA, Photos, Documents)
              </label>

              {formData.attachments.length > 0 && (
                <div className="space-y-1">
                  {formData.attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="flex-1">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <Link
              href={`/${orgSlug}/quality/holds`}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Hold...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Place on Hold
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}