'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface CycleCount {
  id: string;
  countNumber: string;
  status: string;
  scheduledDate: string;
  countedDate: string | null;
  notes: string | null;
  warehouse: {
    code: string;
    name: string;
  } | null;
  assignedTo: {
    firstName: string;
    lastName: string;
  } | null;
  items: Array<{
    id: string;
    expectedQty: number;
    countedQty: number | null;
    variance: number | null;
    product: {
      sku: string;
      name: string;
    };
  }>;
}

export default function CycleCountsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [counts, setCounts] = useState<CycleCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchCounts();
  }, [orgSlug, filter]);

  const fetchCounts = async () => {
    try {
      const url = filter
        ? `/api/${orgSlug}/inventory/cycle-counts?status=${filter}`
        : `/api/${orgSlug}/inventory/cycle-counts`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setCounts(data.data);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to fetch cycle counts');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PLANNED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return badges[status] || badges.PLANNED;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cycle counts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cycle Counts</h1>
          <p className="text-gray-600 mt-1">
            Manage inventory cycle counting and accuracy verification
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Create Cycle Count
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilter('')}
          className={`px-4 py-2 rounded-lg ${
            filter === ''
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {['PLANNED', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {counts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No cycle counts found. Create your first cycle count.
          </div>
        ) : (
          counts.map((count) => (
            <div key={count.id} className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold">{count.countNumber}</h2>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                          count.status
                        )}`}
                      >
                        {count.status}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-4 text-sm text-gray-600">
                      {count.warehouse && (
                        <span>
                          Warehouse: {count.warehouse.code} - {count.warehouse.name}
                        </span>
                      )}
                      <span>
                        Scheduled: {new Date(count.scheduledDate).toLocaleDateString()}
                      </span>
                      {count.assignedTo && (
                        <span>
                          Assigned to: {count.assignedTo.firstName} {count.assignedTo.lastName}
                        </span>
                      )}
                    </div>
                    {count.notes && <p className="mt-2 text-sm text-gray-500">{count.notes}</p>}
                  </div>
                  <button className="px-4 py-2 text-sm border rounded hover:bg-gray-50">
                    View Details
                  </button>
                </div>
              </div>

              {count.items.length > 0 && (
                <div className="p-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Items ({count.items.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            SKU
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Product
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Expected
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Counted
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Variance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {count.items.slice(0, 5).map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {item.product.sku}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {item.product.name}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {item.expectedQty}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {item.countedQty !== null ? item.countedQty : '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-right">
                              {item.variance !== null ? (
                                <span
                                  className={
                                    item.variance > 0
                                      ? 'text-green-600'
                                      : item.variance < 0
                                      ? 'text-red-600'
                                      : 'text-gray-600'
                                  }
                                >
                                  {item.variance > 0 ? '+' : ''}
                                  {item.variance}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {count.items.length > 5 && (
                      <div className="mt-2 text-center text-sm text-gray-500">
                        +{count.items.length - 5} more items
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
