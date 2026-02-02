'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CheckCircle, Clock, XCircle, Loader2, Filter } from 'lucide-react';

interface ApprovalAction {
  id: string;
  action: string;
  comment?: string;
  createdAt: string;
  approver: { firstName: string; lastName: string; email: string };
}

interface ApprovalRequest {
  id: string;
  workflow: { name: string };
  entityType: string;
  entityId: string;
  status: string;
  priority: string;
  currentStepOrder: number;
  requestedBy: { firstName: string; lastName: string; email: string };
  actions: ApprovalAction[];
  createdAt: string;
}

const statusBadges: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export default function ApprovalsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [searchId, setSearchId] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, entityFilter]);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter) query.set('status', statusFilter);
      if (entityFilter) query.set('entityType', entityFilter);

      const res = await fetch(`/api/${orgSlug}/workflows/approval-requests?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const data: ApprovalRequest[] = json.data;
        const filtered = searchId
          ? data.filter((r) =>
              r.entityId.toLowerCase().includes(searchId.toLowerCase()) ||
              r.id.toLowerCase().includes(searchId.toLowerCase())
            )
          : data;
        setRequests(filtered);
      }
    } catch (err) {
      console.error('Failed to fetch approvals', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    id: string,
    action: 'APPROVE' | 'REJECT' | 'DELEGATE' | 'COMMENT',
    comment?: string
  ) => {
    try {
      setActionLoading(id + action);
      const res = await fetch(`/api/${orgSlug}/workflows/approval-requests/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment }),
      });
      if (res.ok) {
        await fetchApprovals();
      }
    } catch (err) {
      console.error('Failed to take action', err);
    } finally {
      setActionLoading(null);
    }
  };

  const pending = requests.filter((r) => r.status === 'PENDING').length;
  const inProgress = requests.filter((r) => r.status === 'IN_PROGRESS').length;
  const approved = requests.filter((r) => r.status === 'APPROVED').length;

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Approval Inbox</h1>
          <p className="text-gray-500">Review and action approval requests across modules</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Input
            placeholder="Search by request ID or entity ID"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="w-64"
          />
          <Button variant="outline" onClick={fetchApprovals} className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Apply
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-3">
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div>
            <p className="text-sm text-gray-500">Entity Type</p>
            <Select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
              <option value="">All</option>
              <option value="PURCHASE_ORDER">Purchase Order</option>
              <option value="BILL">Bill</option>
              <option value="PAYMENT">Payment</option>
              <option value="JOURNAL">Journal</option>
              <option value="EXPENSE_CLAIM">Expense Claim</option>
              <option value="CREDIT_NOTE">Credit Note</option>
              <option value="DEBIT_NOTE">Debit Note</option>
              <option value="TRANSFER">Transfer</option>
              <option value="INVOICE">Invoice</option>
            </Select>
          </div>
        </Card>
        <Card className="p-4 grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-2xl font-bold">{pending}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">In Progress</p>
            <p className="text-2xl font-bold">{inProgress}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Approved</p>
            <p className="text-2xl font-bold">{approved}</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workflow
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Loading approval requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No approval requests found.
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const lastAction = req.actions[0];
                  return (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{req.id}</div>
                        <div className="text-xs text-gray-500">
                          Step {req.currentStepOrder} • {new Date(req.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{req.workflow.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{req.entityType.replace('_', ' ')}</div>
                        <div className="text-xs text-gray-500">{req.entityId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {req.requestedBy.firstName} {req.requestedBy.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{req.requestedBy.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            statusBadges[req.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {req.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {lastAction ? (
                          <div className="text-sm text-gray-900">
                            {lastAction.action} • {new Date(lastAction.createdAt).toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No actions yet</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoading === req.id + 'APPROVE'}
                            onClick={() => handleAction(req.id, 'APPROVE')}
                          >
                            {actionLoading === req.id + 'APPROVE' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionLoading === req.id + 'REJECT'}
                            onClick={() => handleAction(req.id, 'REJECT')}
                          >
                            {actionLoading === req.id + 'REJECT' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-1" />
                            )}
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
