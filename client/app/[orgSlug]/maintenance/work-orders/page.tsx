'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface MaintenanceWorkOrder {
  id: string;
  workOrderNumber: string;
  assetName?: string;
  assetNumber?: string;
  maintenanceType: string;
  priority: string;
  status: string;
  scheduledDate?: string;
  technicianName?: string;
  description: string;
  totalCost?: number;
  downtimeHours?: number;
  createdAt: string;
}

export default function MaintenanceWorkOrdersPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${orgSlug}/maintenance/work-orders`);
      if (!res.ok) throw new Error('Failed to load maintenance work orders');
      const json = await res.json();
      setWorkOrders(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load maintenance work orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgSlug) load();
  }, [orgSlug]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Maintenance Work Orders</h1>
        <p className="text-gray-600">Manage asset maintenance and repairs</p>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}

      <div className="overflow-auto border border-gray-200 rounded-md bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">WO #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Asset</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Scheduled</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Technician</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Downtime</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {workOrders.map((wo) => (
              <tr key={wo.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono">{wo.workOrderNumber}</td>
                <td className="px-4 py-3 text-sm">
                  {wo.assetName ? (
                    <>
                      <div className="font-medium">{wo.assetName}</div>
                      <div className="text-xs text-gray-500">{wo.assetNumber}</div>
                    </>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-sm">{wo.maintenanceType}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    wo.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                    wo.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                    wo.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {wo.priority}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    wo.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    wo.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                    wo.status === 'SCHEDULED' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {wo.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {wo.scheduledDate ? new Date(wo.scheduledDate).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-sm">{wo.technicianName || 'Unassigned'}</td>
                <td className="px-4 py-3 text-sm">
                  {wo.downtimeHours ? `${wo.downtimeHours}h` : '—'}
                </td>
              </tr>
            ))}
            {workOrders.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-4 text-sm text-gray-600" colSpan={8}>No maintenance work orders yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
