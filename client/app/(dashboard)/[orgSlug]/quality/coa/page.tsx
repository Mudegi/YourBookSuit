'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileCheck2, UploadCloud, ShieldCheck } from 'lucide-react';

interface CoaForm {
  productId: string;
  lotNumber: string;
  supplier: string;
  manufactureDate: string;
  expiryDate: string;
  tests: string;
  attachments: File | null;
  notes: string;
}

export default function CertificateOfAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const [form, setForm] = useState<CoaForm>({
    productId: '',
    lotNumber: '',
    supplier: '',
    manufactureDate: '',
    expiryDate: '',
    tests: '',
    attachments: null,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (field: keyof CoaForm, value: string | File | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO: wire to backend COA endpoint
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSuccess('COA saved (sample). Wire backend to persist and store file.');
      setTimeout(() => router.push(`/${orgSlug}/quality/inspections`), 500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit COA');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileCheck2 className="h-8 w-8 text-emerald-700" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Certificate of Analysis</h1>
            <p className="text-gray-600">Capture COA data, attach lab results, and link to lots</p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => router.push(`/${orgSlug}/quality/inspections`)}>
          Cancel
        </Button>
      </div>

      <Card className="p-6 space-y-6">
        {error && <div className="text-sm text-red-600">{error}</div>}
        {success && <div className="text-sm text-green-700">{success}</div>}
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
              <Label htmlFor="lotNumber">Lot / Batch Number</Label>
              <Input
                id="lotNumber"
                value={form.lotNumber}
                onChange={(e) => handleChange('lotNumber', e.target.value)}
                placeholder="LOT-XXXX"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={form.supplier}
                onChange={(e) => handleChange('supplier', e.target.value)}
                placeholder="Supplier name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manufactureDate">Manufacture Date</Label>
              <Input
                id="manufactureDate"
                type="date"
                value={form.manufactureDate}
                onChange={(e) => handleChange('manufactureDate', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry / Retest Date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={form.expiryDate}
                onChange={(e) => handleChange('expiryDate', e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tests">Test Results / Specs</Label>
              <Textarea
                id="tests"
                value={form.tests}
                onChange={(e) => handleChange('tests', e.target.value)}
                placeholder="List tests, methods, results (e.g., assay %, moisture %, particle size)"
                rows={4}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Handling instructions, deviations, or comments"
            />
          </div>

          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="flex items-center gap-3 p-4 border rounded-md">
              <UploadCloud className="h-5 w-5 text-gray-500" />
              <div className="flex-1 text-sm text-gray-600">
                {form.attachments ? form.attachments.name : 'Upload lab report, COA PDF, or images'}
              </div>
              <input
                id="attachment"
                type="file"
                className="hidden"
                onChange={(e) => handleChange('attachments', e.target.files?.[0] || null)}
              />
              <Button type="button" variant="outline" onClick={() => document.getElementById('attachment')?.click()}>
                Choose File
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push(`/${orgSlug}/quality/inspections`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              {submitting ? 'Saving...' : 'Submit COA'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
