'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface LeaveRequest {
  id: string;
  employeeName: string;
  employeeNumber: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  status: string;
  reason?: string;
  approvedBy?: string;
  createdAt: string;
}

export default function LeaveRequestsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${orgSlug}/hcm/leave-requests`);
      if (!res.ok) throw new Error('Failed to load leave requests');
      const json = await res.json();
      setRequests(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leave requests');
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
        <h1 className="text-3xl font-bold">Leave Requests</h1>
        <p className="text-gray-600">Manage employee leave and time off</p>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}

      <div className="overflow-auto border border-gray-200 rounded-md bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Leave Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Start Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">End Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Days</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Approved By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium">{req.employeeName}</div>
                  <div className="text-xs text-gray-500">{req.employeeNumber}</div>
                </td>
                <td className="px-4 py-3 text-sm">{req.leaveTypeName}</td>
                <td className="px-4 py-3 text-sm">{new Date(req.startDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm">{new Date(req.endDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm font-medium">{req.daysRequested}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    req.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    req.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {req.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{req.approvedBy || '—'}</td>
              </tr>
            ))}
            {requests.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-4 text-sm text-gray-600" colSpan={7}>No leave requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
