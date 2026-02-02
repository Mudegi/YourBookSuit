'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface BomLineInput {
  componentId: string;
  quantityPer: number;
  scrapPercent?: number;
  backflush?: boolean;
  operationSeq?: number;
}

interface Bom {
  id: string;
  productId: string;
  productSku?: string;
  productName?: string;
  name: string;
  version: string;
  status: string;
  isDefault: boolean;
  lines: {
    id: string;
    componentId: string;
    componentSku?: string;
    componentName?: string;
    quantityPer: number;
    scrapPercent: number;
    backflush: boolean;
  }[];
  createdAt: string;
}

export default function BomsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [boms, setBoms] = useState<Bom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    productId: '',
    name: '',
    version: '1.0',
    status: 'DRAFT',
    isDefault: false,
    yieldPercent: 100,
    scrapPercent: 0,
    lines: [{ componentId: '', quantityPer: 1, scrapPercent: 0, backflush: true }] as BomLineInput[],
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${orgSlug}/manufacturing/boms`);
      if (!res.ok) throw new Error('Failed to load BOMs');
      const json = await res.json();
      setBoms(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load BOMs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgSlug) load();
  }, [orgSlug]);

  const handleLineChange = (idx: number, field: keyof BomLineInput, value: string) => {
    const updated = [...form.lines];
    if (field === 'quantityPer') {
      updated[idx].quantityPer = Number(value);
    } else if (field === 'componentId') {
      updated[idx].componentId = value;
    } else if (field === 'scrapPercent') {
      updated[idx].scrapPercent = Number(value);
    } else if (field === 'operationSeq') {
      updated[idx].operationSeq = value ? Number(value) : undefined;
    } else if (field === 'backflush') {
      updated[idx].backflush = value === 'true';
    }
    setForm({ ...form, lines: updated });
  };

  const addLine = () =>
    setForm({
      ...form,
      lines: [...form.lines, { componentId: '', quantityPer: 1, scrapPercent: 0, backflush: true }],
    });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/${orgSlug}/manufacturing/boms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: form.productId,
          name: form.name,
          version: form.version,
          status: form.status,
          isDefault: form.isDefault,
          yieldPercent: form.yieldPercent,
          scrapPercent: form.scrapPercent,
          lines: form.lines.map((l) => ({
            componentId: l.componentId,
            quantityPer: l.quantityPer,
            scrapPercent: l.scrapPercent || 0,
            backflush: l.backflush ?? true,
            operationSeq: l.operationSeq,
          })),
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to create BOM');
      }
      setForm({
        productId: '',
        name: '',
        version: '1.0',
        status: 'DRAFT',
        isDefault: false,
        yieldPercent: 100,
        scrapPercent: 0,
        lines: [{ componentId: '', quantityPer: 1, scrapPercent: 0, backflush: true }],
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create BOM');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bills of Material</h1>
        <p className="text-gray-600">Define component structures and yields.</p>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3 bg-white border border-gray-200 rounded-md p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Finished Good Product ID
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
              required
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            BOM Name
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Version
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Status
            <select
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </label>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            />
            <span>Set as default</span>
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Components</h3>
            <button type="button" onClick={addLine} className="text-sm text-blue-600 hover:underline">
              Add component
            </button>
          </div>
          {form.lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-gray-50 p-3 rounded border border-gray-200">
              <label className="flex flex-col text-xs font-medium text-gray-700">
                Component ID
                <input
                  className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
                  value={line.componentId}
                  onChange={(e) => handleLineChange(idx, 'componentId', e.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col text-xs font-medium text-gray-700">
                Qty per FG
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
                  value={line.quantityPer}
                  onChange={(e) => handleLineChange(idx, 'quantityPer', e.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col text-xs font-medium text-gray-700">
                Scrap %
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
                  value={line.scrapPercent || 0}
                  onChange={(e) => handleLineChange(idx, 'scrapPercent', e.target.value)}
                />
              </label>
              <label className="flex flex-col text-xs font-medium text-gray-700">
                Operation Seq (optional)
                <input
                  type="number"
                  className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
                  value={line.operationSeq || ''}
                  onChange={(e) => handleLineChange(idx, 'operationSeq', e.target.value)}
                />
              </label>
              <label className="flex flex-col text-xs font-medium text-gray-700">
                Backflush
                <select
                  className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
                  value={line.backflush ? 'true' : 'false'}
                  onChange={(e) => handleLineChange(idx, 'backflush', e.target.value)}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? 'Saving...' : 'Create BOM'}
        </button>
      </form>

      <div className="overflow-auto border border-gray-200 rounded-md bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">FG</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Version</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Default</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Components</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {boms.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-800">{b.productSku || b.productId}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{b.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{b.version}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{b.status}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{b.isDefault ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3 text-xs text-gray-700">
                  <ul className="space-y-1">
                    {b.lines.map((l) => (
                      <li key={l.id}>
                        <span className="font-mono">{l.componentSku || l.componentId}</span> × {l.quantityPer}
                        {l.scrapPercent ? ` (scrap ${l.scrapPercent}%)` : ''}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{new Date(b.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {boms.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-4 text-sm text-gray-600" colSpan={7}>
                  No BOMs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
