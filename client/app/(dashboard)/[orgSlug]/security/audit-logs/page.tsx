'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Shield, Clock, Filter, FileText, RefreshCcw } from 'lucide-react';

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AuditLogsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [entityId, setEntityId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityType) params.set('entityType', entityType);
      if (action) params.set('action', action);
      if (userId) params.set('userId', userId);
      if (entityId) params.set('entityId', entityId);
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      params.set('limit', '100');

      const res = await fetch(`/api/${orgSlug}/security/audit-logs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  const total = logs.length;
  const approvals = logs.filter((l) => l.action === 'APPROVE').length;
  const updates = logs.filter((l) => l.action === 'UPDATE').length;

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500">Central trail of user actions with entity context</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button variant="outline" onClick={fetchLogs} className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Entity Type</p>
            <Select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="">All</option>
              <option value="Invoice">Invoice</option>
              <option value="Bill">Bill</option>
              <option value="Payment">Payment</option>
              <option value="Journal">Journal</option>
              <option value="Inventory">Inventory</option>
              <option value="Tax">Tax</option>
              <option value="Workflow">Workflow</option>
            </Select>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Action</p>
            <Select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="APPROVE">Approve</option>
              <option value="VOID">Void</option>
              <option value="EXPORT">Export</option>
              <option value="RECONCILE">Reconcile</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-sm text-gray-600 mb-1">From</p>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">To</p>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Entity ID</p>
            <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="e.g. INV-1001" />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">User ID / Email</p>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID or email" />
          </div>
          <div className="flex items-end">
            <Button onClick={fetchLogs} className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="h-4 w-4" />
              Apply Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Entries</p>
            <p className="text-2xl font-bold">{total}</p>
          </div>
          <Shield className="h-8 w-8 text-blue-500" />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Approvals</p>
            <p className="text-2xl font-bold">{approvals}</p>
          </div>
          <CheckMark />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Updates</p>
            <p className="text-2xl font-bold">{updates}</p>
          </div>
          <Clock className="h-8 w-8 text-orange-500" />
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP / Agent
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No audit entries found for the selected filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {log.user.firstName} {log.user.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{log.user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{log.entityType}</div>
                      <div className="text-xs text-gray-500">{log.entityId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{log.ipAddress || '—'}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">
                        {log.userAgent || '—'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function CheckMark() {
  return <FileText className="h-8 w-8 text-green-500" />;
}
