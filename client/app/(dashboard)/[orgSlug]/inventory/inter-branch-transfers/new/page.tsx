'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

interface Branch { id: string; name: string; code: string }
interface Product { id: string; name: string; sku: string }
interface LineItem { productId: string; quantity: string; unitCost: string }

export default function NewInterBranchTransferPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([{ productId: '', quantity: '1', unitCost: '0' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/${orgSlug}/branches?isActive=true`).then((r) => r.json()),
      fetch(`/api/${orgSlug}/products?limit=500`).then((r) => r.json()),
    ]).then(([b, p]) => {
      setBranches(Array.isArray(b) ? b : []);
      // Products API may return { products: [...] } or plain array
      setProducts(Array.isArray(p) ? p : (p?.products ?? []));
    });
  }, [orgSlug]);

  const addLine = () => setLines((prev) => [...prev, { productId: '', quantity: '1', unitCost: '0' }]);
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));
  const updateLine = (index: number, field: keyof LineItem, value: string) =>
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));

  const totalValue = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitCost) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fromBranchId || !toBranchId) { setError('Select both branches'); return; }
    if (fromBranchId === toBranchId) { setError('Source and destination must differ'); return; }
    const validLines = lines.filter((l) => l.productId);
    if (!validLines.length) { setError('Add at least one product'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/${orgSlug}/inter-branch-transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromBranchId,
          toBranchId,
          notes: notes || undefined,
          items: validLines.map((l) => ({
            productId: l.productId,
            quantity: parseFloat(l.quantity),
            unitCost: parseFloat(l.unitCost),
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create transfer');
      }
      router.push(`/${orgSlug}/inventory/inter-branch-transfers`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${orgSlug}/inventory/inter-branch-transfers`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Inter-Branch Transfer</h1>
          <p className="text-gray-600 mt-1">Create a stock transfer request between branches</p>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branches */}
        <Card>
          <CardHeader>
            <CardTitle>Transfer Route</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Branch *</label>
              <select
                value={fromBranchId}
                onChange={(e) => setFromBranchId(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Select source branch…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Branch *</label>
              <select
                value={toBranchId}
                onChange={(e) => setToBranchId(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Select destination branch…</option>
                {branches
                  .filter((b) => b.id !== fromBranchId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full border rounded px-3 py-2 resize-none"
                placeholder="Optional notes…"
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Items</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={addLine}>
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase px-1">
                <div className="col-span-6">Product</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-3">Unit Cost</div>
                <div className="col-span-1" />
              </div>

              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <select
                      value={line.productId}
                      onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    >
                      <option value="">Choose product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} — {p.sku}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0.0001"
                      step="any"
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={line.unitCost}
                      onChange={(e) => updateLine(idx, 'unitCost', e.target.value)}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="border-t pt-3 flex justify-end">
                <div className="text-sm font-medium text-gray-700">
                  Transfer Value:&nbsp;
                  <span className="text-lg font-bold text-gray-900">
                    {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Transfer (Draft)'}
          </Button>
          <Link href={`/${orgSlug}/inventory/inter-branch-transfers`}>
            <Button type="button" variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
