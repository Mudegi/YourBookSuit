'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, PlusCircle } from 'lucide-react';

interface ReorderForm {
  productId: string;
  warehouseId: string;
  policyType: string;
  reorderPoint: string;
  minQuantity: string;
  maxQuantity: string;
  orderQuantity: string;
  leadTimeDays: string;
  reviewPeriodDays: string;
  isActive: boolean;
  notes: string;
}

const policyOptions = [
  { value: 'MIN_MAX', label: 'Min/Max' },
  { value: 'REORDER_POINT', label: 'Reorder Point' },
  { value: 'PERIODIC_REVIEW', label: 'Periodic Review' },
];

export default function NewReorderPolicyPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [form, setForm] = useState<ReorderForm>({
    productId: '',
    warehouseId: '',
    policyType: policyOptions[0].value,
    reorderPoint: '',
    minQuantity: '',
    maxQuantity: '',
    orderQuantity: '',
    leadTimeDays: '',
    reviewPeriodDays: '',
    isActive: true,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof ReorderForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        productId: form.productId.trim(),
        warehouseId: form.warehouseId.trim() || undefined,
        policyType: form.policyType,
        reorderPoint: form.reorderPoint ? Number(form.reorderPoint) : undefined,
        minQuantity: form.minQuantity ? Number(form.minQuantity) : undefined,
        maxQuantity: form.maxQuantity ? Number(form.maxQuantity) : undefined,
        orderQuantity: form.orderQuantity ? Number(form.orderQuantity) : undefined,
        leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : undefined,
        reviewPeriodDays: form.reviewPeriodDays ? Number(form.reviewPeriodDays) : undefined,
        isActive: form.isActive,
      };

      if (form.notes) payload.notes = form.notes;

      const res = await fetch(`/api/${orgSlug}/planning/reorder-policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create reorder policy');
      }

      router.push(`/${orgSlug}/planning/reorder-policies`);
    } catch (err: any) {
      setError(err.message || 'Failed to create reorder policy');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Reorder Policy</h1>
            <p className="text-gray-500">Configure automated replenishment rules</p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => router.push(`/${orgSlug}/planning/reorder-policies`)}>
          Cancel
        </Button>
      </div>

      <Card className="p-6 space-y-6">
        {error && <div className="text-sm text-red-600">{error}</div>}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="productId">Product ID</Label>
              <Input
                id="productId"
                value={form.productId}
                onChange={(e) => handleChange('productId', e.target.value)}
                placeholder="prd_..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouseId">Warehouse ID (optional)</Label>
              <Input
                id="warehouseId"
                value={form.warehouseId}
                onChange={(e) => handleChange('warehouseId', e.target.value)}
                placeholder="wh_..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policyType">Policy Type</Label>
              <select
                id="policyType"
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                value={form.policyType}
                onChange={(e) => handleChange('policyType', e.target.value)}
              >
                {policyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderPoint">Reorder Point</Label>
              <Input
                id="reorderPoint"
                type="number"
                min="0"
                step="0.01"
                value={form.reorderPoint}
                onChange={(e) => handleChange('reorderPoint', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minQuantity">Min Quantity</Label>
              <Input
                id="minQuantity"
                type="number"
                min="0"
                step="0.01"
                value={form.minQuantity}
                onChange={(e) => handleChange('minQuantity', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxQuantity">Max Quantity</Label>
              <Input
                id="maxQuantity"
                type="number"
                min="0"
                step="0.01"
                value={form.maxQuantity}
                onChange={(e) => handleChange('maxQuantity', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderQuantity">Order Quantity / EOQ</Label>
              <Input
                id="orderQuantity"
                type="number"
                min="0"
                step="0.01"
                value={form.orderQuantity}
                onChange={(e) => handleChange('orderQuantity', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadTimeDays">Lead Time (days)</Label>
              <Input
                id="leadTimeDays"
                type="number"
                min="0"
                step="1"
                value={form.leadTimeDays}
                onChange={(e) => handleChange('leadTimeDays', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewPeriodDays">Review Period (days)</Label>
              <Input
                id="reviewPeriodDays"
                type="number"
                min="0"
                step="1"
                value={form.reviewPeriodDays}
                onChange={(e) => handleChange('reviewPeriodDays', e.target.value)}
              />
            </div>
            <div className="space-y-2 flex items-center gap-3">
              <input
                id="isActive"
                type="checkbox"
                className="h-4 w-4"
                checked={form.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
              />
              <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Add constraints, supplier notes, seasonality"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push(`/${orgSlug}/planning/reorder-policies`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              {submitting ? 'Saving...' : 'Create Policy'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
