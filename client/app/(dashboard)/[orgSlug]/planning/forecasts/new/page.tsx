'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, PlusCircle } from 'lucide-react';

interface ForecastForm {
  productId: string;
  warehouseId: string;
  periodStart: string;
  periodEnd: string;
  forecastMethod: string;
  forecastQuantity: string;
  confidenceLower: string;
  confidenceUpper: string;
  accuracy: string;
  notes: string;
}

const methodOptions = [
  { value: 'MOVING_AVERAGE', label: 'Moving Average' },
  { value: 'EXPONENTIAL_SMOOTHING', label: 'Exponential Smoothing' },
  { value: 'LINEAR_REGRESSION', label: 'Linear Regression' },
  { value: 'SEASONAL', label: 'Seasonal' },
  { value: 'MANUAL', label: 'Manual' },
];

export default function NewForecastPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [form, setForm] = useState<ForecastForm>({
    productId: '',
    warehouseId: '',
    periodStart: '',
    periodEnd: '',
    forecastMethod: methodOptions[0].value,
    forecastQuantity: '',
    confidenceLower: '',
    confidenceUpper: '',
    accuracy: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof ForecastForm, value: string) => {
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
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        forecastMethod: form.forecastMethod,
        forecastQuantity: Number(form.forecastQuantity),
      };

      if (form.confidenceLower) payload.confidenceLower = Number(form.confidenceLower);
      if (form.confidenceUpper) payload.confidenceUpper = Number(form.confidenceUpper);
      if (form.accuracy) payload.accuracy = Number(form.accuracy);
      if (form.notes) payload.notes = form.notes;

      const res = await fetch(`/api/${orgSlug}/planning/forecasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create forecast');
      }

      router.push(`/${orgSlug}/planning/forecasts`);
    } catch (err: any) {
      setError(err.message || 'Failed to create forecast');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Demand Forecast</h1>
            <p className="text-gray-500">Capture forecasted demand and confidence intervals</p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => router.push(`/${orgSlug}/planning/forecasts`)}>
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
              <Label htmlFor="periodStart">Period Start</Label>
              <Input
                id="periodStart"
                type="date"
                value={form.periodStart}
                onChange={(e) => handleChange('periodStart', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd">Period End</Label>
              <Input
                id="periodEnd"
                type="date"
                value={form.periodEnd}
                onChange={(e) => handleChange('periodEnd', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forecastMethod">Forecast Method</Label>
              <select
                id="forecastMethod"
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                value={form.forecastMethod}
                onChange={(e) => handleChange('forecastMethod', e.target.value)}
              >
                {methodOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="forecastQuantity">Forecast Quantity</Label>
              <Input
                id="forecastQuantity"
                type="number"
                min="0"
                step="0.01"
                value={form.forecastQuantity}
                onChange={(e) => handleChange('forecastQuantity', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confidenceLower">Confidence Lower (optional)</Label>
              <Input
                id="confidenceLower"
                type="number"
                step="0.01"
                value={form.confidenceLower}
                onChange={(e) => handleChange('confidenceLower', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confidenceUpper">Confidence Upper (optional)</Label>
              <Input
                id="confidenceUpper"
                type="number"
                step="0.01"
                value={form.confidenceUpper}
                onChange={(e) => handleChange('confidenceUpper', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accuracy">Accuracy (0-1, optional)</Label>
              <Input
                id="accuracy"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={form.accuracy}
                onChange={(e) => handleChange('accuracy', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Add context on assumptions or adjustments"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push(`/${orgSlug}/planning/forecasts`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              {submitting ? 'Saving...' : 'Create Forecast'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
