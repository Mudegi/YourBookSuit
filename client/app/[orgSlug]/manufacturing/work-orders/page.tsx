'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  productId: string;
  productSku?: string;
  productName?: string;
  status: string;
  quantityPlanned: number;
  quantityCompleted: number;
  quantityScrapped: number;
  priority: number;
  bom?: { id: string; version: string; name: string } | null;
  routing?: { id: string; version: string; name: string } | null;
  createdAt: string;
}

export default function WorkOrdersPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    productId: '',
    quantityPlanned: 1,
    bomId: '',
    routingId: '',
    workCenterId: '',
    branchId: '',
    dueDate: '',
    priority: 3,
  });
  const [creating, setCreating] = useState(false);

  const [issueForm, setIssueForm] = useState({
    componentId: '',
    quantity: 0,
    lotId: '',
    binId: '',
    unitCost: '',
  });
  const [receiveForm, setReceiveForm] = useState({
    quantity: 0,
    lotId: '',
    lotNumber: '',
    warehouseId: '',
    binId: '',
    unitCost: '',
  });
  const [actionWoId, setActionWoId] = useState<string | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${orgSlug}/manufacturing/work-orders`);
      if (!res.ok) throw new Error('Failed to load work orders');
      const json = await res.json();
      setWorkOrders(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgSlug) load();
  }, [orgSlug]);

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/${orgSlug}/manufacturing/work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: createForm.productId,
          quantityPlanned: createForm.quantityPlanned,
          bomId: createForm.bomId || undefined,
          routingId: createForm.routingId || undefined,
          workCenterId: createForm.workCenterId || undefined,
          branchId: createForm.branchId || undefined,
          dueDate: createForm.dueDate || undefined,
          priority: createForm.priority,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to create work order');
      }
      setCreateForm({ productId: '', quantityPlanned: 1, bomId: '', routingId: '', workCenterId: '', branchId: '', dueDate: '', priority: 3 });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create work order');
    } finally {
      setCreating(false);
    }
  };

  const issueMaterial = async () => {
    if (!actionWoId) return;
    setActionSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/${orgSlug}/manufacturing/work-orders/${actionWoId}/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: [
            {
              componentId: issueForm.componentId,
              quantity: issueForm.quantity,
              lotId: issueForm.lotId || undefined,
              binId: issueForm.binId || undefined,
              unitCost: issueForm.unitCost ? Number(issueForm.unitCost) : undefined,
            },
          ],
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to issue');
      }
      setIssueForm({ componentId: '', quantity: 0, lotId: '', binId: '', unitCost: '' });
      setActionWoId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue materials');
    } finally {
      setActionSubmitting(false);
    }
  };

  const receiveFinished = async () => {
    if (!actionWoId) return;
    setActionSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/${orgSlug}/manufacturing/work-orders/${actionWoId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: receiveForm.quantity,
          lotId: receiveForm.lotId || undefined,
          lotNumber: receiveForm.lotNumber || undefined,
          warehouseId: receiveForm.warehouseId || undefined,
          binId: receiveForm.binId || undefined,
          unitCost: receiveForm.unitCost ? Number(receiveForm.unitCost) : undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to receive');
      }
      setReceiveForm({ quantity: 0, lotId: '', lotNumber: '', warehouseId: '', binId: '', unitCost: '' });
      setActionWoId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to receive finished goods');
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Work Orders</h1>
        <p className="text-gray-600">Plan, issue, and receive production.</p>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <form onSubmit={submitCreate} className="space-y-3 bg-white border border-gray-200 rounded-md p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Product ID
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={createForm.productId}
              onChange={(e) => setCreateForm({ ...createForm, productId: e.target.value })}
              required
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Quantity planned
            <input
              type="number"
              step="0.0001"
              min="0"
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={createForm.quantityPlanned}
              onChange={(e) => setCreateForm({ ...createForm, quantityPlanned: Number(e.target.value) })}
              required
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Due date
            <input
              type="date"
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={createForm.dueDate}
              onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            BOM ID (optional)
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={createForm.bomId}
              onChange={(e) => setCreateForm({ ...createForm, bomId: e.target.value })}
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Routing ID (optional)
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={createForm.routingId}
              onChange={(e) => setCreateForm({ ...createForm, routingId: e.target.value })}
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Work center ID (optional)
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={createForm.workCenterId}
              onChange={(e) => setCreateForm({ ...createForm, workCenterId: e.target.value })}
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Branch ID (optional)
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={createForm.branchId}
              onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })}
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Priority (1-5)
            <input
              type="number"
              min="1"
              max="5"
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={createForm.priority}
              onChange={(e) => setCreateForm({ ...createForm, priority: Number(e.target.value) })}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 disabled:opacity-60"
        >
          {creating ? 'Saving...' : 'Create Work Order'}
        </button>
      </form>

      <div className="overflow-auto border border-gray-200 rounded-md bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">WO</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Product</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Qty</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">BOM</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Routing</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {workOrders.map((wo) => (
              <tr key={wo.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-800">{wo.workOrderNumber}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{wo.productSku || wo.productId}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{wo.status}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {wo.quantityCompleted}/{wo.quantityPlanned}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{wo.priority}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{wo.bom ? wo.bom.version : '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{wo.routing ? wo.routing.version : '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-700 space-y-2">
                  <button
                    className="px-3 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200"
                    onClick={() => setActionWoId(wo.id)}
                  >
                    Select
                  </button>
                </td>
              </tr>
            ))}
            {workOrders.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-4 text-sm text-gray-600" colSpan={8}>
                  No work orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {actionWoId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Issue materials to WO</h3>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Component ID
              <input
                className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
                value={issueForm.componentId}
                onChange={(e) => setIssueForm({ ...issueForm, componentId: e.target.value })}
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Quantity
              <input
                type="number"
                step="0.0001"
                min="0"
                className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
                value={issueForm.quantity}
                onChange={(e) => setIssueForm({ ...issueForm, quantity: Number(e.target.value) })}
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Lot ID (optional)
              <input
                className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
                value={issueForm.lotId}
                onChange={(e) => setIssueForm({ ...issueForm, lotId: e.target.value })}
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Bin ID (optional)
              <input
                className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
                value={issueForm.binId}
                onChange={(e) => setIssueForm({ ...issueForm, binId: e.target.value })}
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Unit cost (optional)
              <input
                className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
                value={issueForm.unitCost}
                onChange={(e) => setIssueForm({ ...issueForm, unitCost: e.target.value })}
              />
            </label>
            <button
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 disabled:opacity-60"
              onClick={issueMaterial}
              disabled={actionSubmitting}
            >
              {actionSubmitting ? 'Working...' : 'Issue to WO'}
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Receive finished goods</h3>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Quantity
              <input
                type="number"
                step="0.0001"
                min="0"
                className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
                value={receiveForm.quantity}
                onChange={(e) => setReceiveForm({ ...receiveForm, quantity: Number(e.target.value) })}
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Lot ID (optional)
              <input
                className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
                value={receiveForm.lotId}
                onChange={(e) => setReceiveForm({ ...receiveForm, lotId: e.target.value })}
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Lot number (optional)
              <input
                className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
                value={receiveForm.lotNumber}
                onChange={(e) => setReceiveForm({ ...receiveForm, lotNumber: e.target.value })}
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Warehouse ID (optional)
              <input
                className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
                value={receiveForm.warehouseId}
                onChange={(e) => setReceiveForm({ ...receiveForm, warehouseId: e.target.value })}
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Bin ID (optional)
              <input
                className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
                value={receiveForm.binId}
                onChange={(e) => setReceiveForm({ ...receiveForm, binId: e.target.value })}
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Unit cost (optional)
              <input
                className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
                value={receiveForm.unitCost}
                onChange={(e) => setReceiveForm({ ...receiveForm, unitCost: e.target.value })}
              />
            </label>
            <button
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 disabled:opacity-60"
              onClick={receiveFinished}
              disabled={actionSubmitting}
            >
              {actionSubmitting ? 'Working...' : 'Receive FG'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
