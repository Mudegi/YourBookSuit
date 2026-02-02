'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function DisposeAssetPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const assetId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    disposalDate: new Date().toISOString().split('T')[0],
    disposalMethod: 'SALE',
    disposalPrice: '',
    buyer: '',
    buyerTIN: '',
    disposalInvoiceNo: '',
    reason: '',
    notes: '',
    autoPost: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!confirm('Are you sure you want to dispose this asset? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/${orgSlug}/assets/${assetId}/dispose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          disposalPrice: parseFloat(formData.disposalPrice) || 0,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Asset disposed successfully!\nGain/Loss: ${data.data.summary.gainLossType} of ${data.data.summary.gainLoss.toLocaleString()} UGX`);
        router.push(`/${orgSlug}/fixed-assets/${assetId}`);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error disposing asset:', error);
      alert('Failed to dispose asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/${orgSlug}/fixed-assets/${assetId}`}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Asset
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-red-900">Dispose Asset</h1>
            <p className="text-red-700 text-sm mt-1">
              This will permanently mark the asset as disposed and calculate gain/loss on disposal.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Disposal Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Disposal Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.disposalDate}
                onChange={(e) => setFormData({ ...formData, disposalDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Disposal Method <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.disposalMethod}
                onChange={(e) => setFormData({ ...formData, disposalMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="SALE">Sale</option>
                <option value="TRADE_IN">Trade-in</option>
                <option value="SCRAP">Scrap</option>
                <option value="DONATION">Donation</option>
                <option value="LOST">Lost/Stolen</option>
                <option value="WRITE_OFF">Write-off</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Disposal Price (UGX)
              </label>
              <input
                type="number"
                value={formData.disposalPrice}
                onChange={(e) => setFormData({ ...formData, disposalPrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the sale price if disposing via sale or trade-in. Leave as 0 for scrap, donation, or write-off.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="Reason for disposal"
              />
            </div>
          </div>
        </div>

        {/* Buyer Information (for sales) */}
        {(formData.disposalMethod === 'SALE' || formData.disposalMethod === 'TRADE_IN') && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Buyer Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Name</label>
                <input
                  type="text"
                  value={formData.buyer}
                  onChange={(e) => setFormData({ ...formData, buyer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Buyer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buyer TIN (Uganda)
                </label>
                <input
                  type="text"
                  value={formData.buyerTIN}
                  onChange={(e) => setFormData({ ...formData, buyerTIN: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="1234567890"
                />
                <p className="text-xs text-gray-500 mt-1">Required for URA compliance</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={formData.disposalInvoiceNo}
                  onChange={(e) => setFormData({ ...formData, disposalInvoiceNo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="INV-2024-0001"
                />
              </div>
            </div>
          </div>
        )}

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            rows={3}
            placeholder="Any additional notes about the disposal"
          />
        </div>

        {/* Auto Post Option */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoPost"
            checked={formData.autoPost}
            onChange={(e) => setFormData({ ...formData, autoPost: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor="autoPost" className="text-sm text-gray-700">
            Automatically post disposal entry to General Ledger
          </label>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Link
            href={`/${orgSlug}/fixed-assets/${assetId}`}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 'Dispose Asset'}
          </button>
        </div>
      </form>
    </div>
  );
}
