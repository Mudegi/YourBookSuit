'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface TransferLineInput {
  productId: string;
  quantity: number;
  lotId?: string;
  unitOfMeasure?: string;
  notes?: string;
}

interface TransferOrder {
  id: string;
  status: string;
  fromWarehouseCode?: string;
  toWarehouseCode?: string;
  expectedShipDate?: string;
  expectedReceiveDate?: string;
  shippedAt?: string;
  receivedAt?: string;
  lines: {
    id: string;
    productId: string;
    productSku?: string;
    productName?: string;
    quantity: number;
    lotNumber?: string;
    unitOfMeasure: string;
  }[];
  createdAt: string;
}

export default function TransferOrdersPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [orders, setOrders] = useState<TransferOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    expectedShipDate: '',
    expectedReceiveDate: '',
    reference: '',
    notes: '',
    lines: [{ productId: '', quantity: 1, unitOfMeasure: 'unit', lotId: '', notes: '' }] as TransferLineInput[],
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${orgSlug}/warehouse/transfer-orders`);
      if (!res.ok) throw new Error('Failed to load transfer orders');
      const json = await res.json();
      setOrders(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transfer orders');
    } finally {
      setLoading(false);
    }
  };

  const handleShip = async (orderId: string) => {
    if (!confirm('Ship this transfer order? This will deduct inventory from the source warehouse.')) return;
    setError(null);
    try {
      const res = await fetch(`/api/${orgSlug}/warehouse/transfer-orders/${orderId}/ship`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to ship transfer order');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ship transfer order');
    }
  };

  const handleReceive = async (orderId: string) => {
    if (!confirm('Receive this transfer order? This will add inventory to the destination warehouse.')) return;
    setError(null);
    try {
      const res = await fetch(`/api/${orgSlug}/warehouse/transfer-orders/${orderId}/receive`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to receive transfer order');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to receive transfer order');
    }
  };

  useEffect(() => {
    if (orgSlug) load();
  }, [orgSlug]);

  const handleLineChange = (idx: number, field: keyof TransferLineInput, value: string) => {
    const updated = [...form.lines];
    if (field === 'quantity') {
      updated[idx].quantity = Number(value);
    } else if (field === 'productId') {
      updated[idx].productId = value;
    } else if (field === 'lotId') {
      updated[idx].lotId = value || undefined;
    } else if (field === 'unitOfMeasure') {
      updated[idx].unitOfMeasure = value || 'unit';
    } else if (field === 'notes') {
      updated[idx].notes = value;
    }
    setForm({ ...form, lines: updated });
  };

  const addLine = () => setForm({ ...form, lines: [...form.lines, { productId: '', quantity: 1, unitOfMeasure: 'unit' }] });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/${orgSlug}/warehouse/transfer-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromWarehouseId: form.fromWarehouseId,
          toWarehouseId: form.toWarehouseId,
          expectedShipDate: form.expectedShipDate || undefined,
          expectedReceiveDate: form.expectedReceiveDate || undefined,
          reference: form.reference || undefined,
          notes: form.notes || undefined,
          lines: form.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitOfMeasure: l.unitOfMeasure || 'unit',
            lotId: l.lotId || undefined,
            notes: l.notes || undefined,
          })),
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to create transfer order');
      }
      setForm({
        fromWarehouseId: '',
        toWarehouseId: '',
        expectedShipDate: '',
        expectedReceiveDate: '',
        reference: '',
        notes: '',
        lines: [{ productId: '', quantity: 1, unitOfMeasure: 'unit', lotId: '', notes: '' }],
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transfer order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transfer Orders</h1>
        <p className="text-gray-600">Plan and track inter-warehouse moves.</p>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3 bg-white border border-gray-200 rounded-md p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            From Warehouse ID
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.fromWarehouseId}
              onChange={(e) => setForm({ ...form, fromWarehouseId: e.target.value })}
              required
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            To Warehouse ID
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.toWarehouseId}
              onChange={(e) => setForm({ ...form, toWarehouseId: e.target.value })}
              required
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Expected Ship Date
            <input
              type="date"
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.expectedShipDate}
              onChange={(e) => setForm({ ...form, expectedShipDate: e.target.value })}
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Expected Receive Date
            <input
              type="date"
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.expectedReceiveDate}
              onChange={(e) => setForm({ ...form, expectedReceiveDate: e.target.value })}
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Reference (optional)
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Notes (optional)
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Lines</h3>
            <button type="button" onClick={addLine} className="text-sm text-blue-600 hover:underline">
              Add line
            </button>
          </div>
          {form.lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-gray-50 p-3 rounded border border-gray-200">
              <label className="flex flex-col text-xs font-medium text-gray-700">
                Product ID
                <input
                  className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
                  value={line.productId}
                  onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col text-xs font-medium text-gray-700">
                Quantity
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
                  value={line.quantity}
                  onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col text-xs font-medium text-gray-700">
                UoM
                <input
                  className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
                  value={line.unitOfMeasure || 'unit'}
                  onChange={(e) => handleLineChange(idx, 'unitOfMeasure', e.target.value)}
                />
              </label>
              <label className="flex flex-col text-xs font-medium text-gray-700">
                Lot ID (optional)
                <input
                  className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
                  value={line.lotId || ''}
                  onChange={(e) => handleLineChange(idx, 'lotId', e.target.value)}
                />
              </label>
              <label className="flex flex-col text-xs font-medium text-gray-700">
                Notes
                <input
                  className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
                  value={line.notes || ''}
                  onChange={(e) => handleLineChange(idx, 'notes', e.target.value)}
                />
              </label>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? 'Saving...' : 'Create Transfer Order'}
        </button>
      </form>

      <div className="overflow-auto border border-gray-200 rounded-md bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">From</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">To</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Lines</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Dates</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-800">{o.fromWarehouseCode}</td>
                <td className="px-4 py-3 text-sm font-mono text-gray-800">{o.toWarehouseCode}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      o.status === 'RECEIVED'
                        ? 'bg-green-100 text-green-800'
                        : o.status === 'IN_TRANSIT'
                        ? 'bg-blue-100 text-blue-800'
                        : o.status === 'CANCELLED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-700">
                  <ul className="space-y-1">
                    {o.lines.map((l) => (
                      <li key={l.id}>
                        <span className="font-mono">{l.productSku || l.productId}</span> × {l.quantity}
                        {l.lotNumber ? ` (Lot ${l.lotNumber})` : ''}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-4 py-3 text-xs text-gray-700">
                  {o.shippedAt && (
                    <div className="mb-1">
                      <span className="font-semibold">Shipped:</span> {new Date(o.shippedAt).toLocaleString()}
                    </div>
                  )}
                  {o.receivedAt && (
                    <div>
                      <span className="font-semibold">Received:</span> {new Date(o.receivedAt).toLocaleString()}
                    </div>
                  )}
                  {!o.shippedAt && !o.receivedAt && '—'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {(o.status === 'DRAFT' || o.status === 'REQUESTED') && (
                    <button
                      onClick={() => handleShip(o.id)}
                      className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Ship
                    </button>
                  )}
                  {o.status === 'IN_TRANSIT' && (
                    <button
                      onClick={() => handleReceive(o.id)}
                      className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      Receive
                    </button>
                  )}
                  {o.status === 'RECEIVED' && <span className="text-xs text-gray-500">Complete</span>}
                </td>
              </tr>
            ))}
            {orders.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-4 text-sm text-gray-600" colSpan={6}>
                  No transfer orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
