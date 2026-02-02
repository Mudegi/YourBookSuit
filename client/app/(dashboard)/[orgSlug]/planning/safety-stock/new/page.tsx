'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShieldPlus, PlusCircle } from 'lucide-react';

interface SafetyStockForm {
  productId: string;
  warehouseId: string;
  calculationMethod: string;
  safetyStockQuantity: string;
  averageDemand: string;
  demandVariability: string;
  leadTimeDays: string;
  serviceLevel: string;
  notes: string;
}

const methodOptions = [
  { value: 'FIXED', label: 'Fixed' },
  { value: 'TIME_BASED', label: 'Time Based' },
  { value: 'STATISTICAL', label: 'Statistical' },
];

export default function NewSafetyStockPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [form, setForm] = useState<SafetyStockForm>({
    productId: '',
    warehouseId: '',
    calculationMethod: methodOptions[0].value,
    safetyStockQuantity: '',
    averageDemand: '',
    demandVariability: '',
    leadTimeDays: '',
    serviceLevel: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof SafetyStockForm, value: string) => {
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
        calculationMethod: form.calculationMethod,
        safetyStockQuantity: Number(form.safetyStockQuantity),
      };

      if (form.averageDemand) payload.averageDemand = Number(form.averageDemand);
      if (form.demandVariability) payload.demandVariability = Number(form.demandVariability);
      if (form.leadTimeDays) payload.leadTimeDays = Number(form.leadTimeDays);
      if (form.serviceLevel) payload.serviceLevel = Number(form.serviceLevel);
      if (form.notes) payload.notes = form.notes;

      const res = await fetch(`/api/${orgSlug}/planning/safety-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create safety stock rule');
      }

      router.push(`/${orgSlug}/planning/safety-stock`);
    } catch (err: any) {
      setError(err.message || 'Failed to create safety stock rule');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShieldPlus className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Safety Stock Rule</h1>
            <p className="text-gray-500">Define buffer inventory per product and warehouse</p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => router.push(`/${orgSlug}/planning/safety-stock`)}>
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
              <Label htmlFor="calculationMethod">Calculation Method</Label>
              <select
                id="calculationMethod"
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                value={form.calculationMethod}
                onChange={(e) => handleChange('calculationMethod', e.target.value)}
              >
                {methodOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="safetyStockQuantity">Safety Stock Quantity</Label>
              <Input
                id="safetyStockQuantity"
                type="number"
                min="0"
                step="0.01"
                value={form.safetyStockQuantity}
                onChange={(e) => handleChange('safetyStockQuantity', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="averageDemand">Average Demand (optional)</Label>
              <Input
                id="averageDemand"
                type="number"
                step="0.01"
                value={form.averageDemand}
                onChange={(e) => handleChange('averageDemand', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demandVariability">Demand Variability (optional)</Label>
              <Input
                id="demandVariability"
                type="number"
                step="0.01"
                value={form.demandVariability}
                onChange={(e) => handleChange('demandVariability', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadTimeDays">Lead Time (days, optional)</Label>
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
              <Label htmlFor="serviceLevel">Service Level % (optional)</Label>
              <Input
                id="serviceLevel"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.serviceLevel}
                onChange={(e) => handleChange('serviceLevel', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Assumptions, seasonality notes, overrides"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push(`/${orgSlug}/planning/safety-stock`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              {submitting ? 'Saving...' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
