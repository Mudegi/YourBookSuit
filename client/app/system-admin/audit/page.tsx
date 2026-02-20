'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-client';

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: any;
  ipAddress: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string } | null;
  organization: { name: string; slug: string } | null;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetchWithAuth('/api/system-admin/audit');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setLogs(data.data);
      }
    } catch {
      // API may not exist yet — show empty state
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Audit Log</h2>
        <p className="text-sm text-gray-500 mt-1">Platform-wide activity log for compliance and security monitoring.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 font-medium">Timestamp</th>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Organization</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Entity</th>
                  <th className="px-5 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-5 py-3 text-gray-600">{log.user ? `${log.user.firstName} ${log.user.lastName}` : '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{log.organization?.name || '—'}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{log.action}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{log.entityType} #{log.entityId?.substring(0, 8)}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{log.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500 mb-1">No audit log entries yet</p>
            <p className="text-sm text-gray-400">Activity across all organizations will be recorded here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
