'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchWithAuth } from '@/lib/fetch-client';

interface Org {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  baseCurrency: string;
  subscriptionStatus: string;
  trialStartDate: string | null;
  trialEndDate: string | null;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  approvedAt: string | null;
  suspendedReason: string | null;
  onboardingCompleted: boolean;
  createdAt: string;
  _count: { users: number; invoices: number; transactions: number };
}

const STATUS_OPTIONS = ['ALL', 'TRIAL', 'TRIAL_EXPIRED', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED'];
const STATUS_COLORS: Record<string, string> = {
  TRIAL: 'bg-amber-100 text-amber-800',
  TRIAL_EXPIRED: 'bg-red-100 text-red-800',
  PENDING_APPROVAL: 'bg-orange-100 text-orange-800',
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-gray-200 text-gray-800',
  CANCELLED: 'bg-red-50 text-red-700',
};

export default function OrganizationsPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'ALL';
  
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendModal, setShowSuspendModal] = useState<string | null>(null);

  useEffect(() => {
    fetchOrgs();
  }, [statusFilter, search]);

  const fetchOrgs = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetchWithAuth(`/api/system-admin/organizations?${params}`);
      const data = await res.json();
      if (data.success) setOrgs(data.data);
    } catch (error) {
      console.error('Failed to fetch orgs:', error);
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (orgId: string, action: string, reason?: string) => {
    setActionLoading(orgId);
    try {
      const res = await fetchWithAuth('/api/system-admin/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId, action, reason }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchOrgs();
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (error) {
      alert('Network error');
    } finally {
      setActionLoading(null);
      setShowSuspendModal(null);
      setSuspendReason('');
    }
  };

  const deleteOrg = async (orgId: string) => {
    setActionLoading(orgId);
    try {
      const res = await fetchWithAuth(`/api/system-admin/organizations?id=${orgId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setOrgs(orgs.filter(o => o.id !== orgId));
      } else {
        alert(data.error || 'Delete failed');
      }
    } catch {
      alert('Network error');
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  };

  const daysRemaining = (trialEnd: string | null) => {
    if (!trialEnd) return null;
    const diff = new Date(trialEnd).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Organizations</h2>
        <p className="text-sm text-gray-500 mt-1">Manage all organizations registered on the platform.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by name, slug, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-72 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="flex gap-1 flex-wrap">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 font-medium">Organization</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Trial</th>
                  <th className="px-5 py-3 font-medium">Users</th>
                  <th className="px-5 py-3 font-medium">Invoices</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => {
                  const days = daysRemaining(org.trialEndDate);
                  return (
                    <tr key={org.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900">{org.name}</div>
                        <div className="text-xs text-gray-400">{org.slug}{org.email ? ` • ${org.email}` : ''}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[org.subscriptionStatus] || 'bg-gray-100'}`}>
                          {org.subscriptionStatus.replace('_', ' ')}
                        </span>
                        {org.suspendedReason && (
                          <div className="text-xs text-red-500 mt-1">{org.suspendedReason}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {org.subscriptionStatus === 'TRIAL' && days !== null ? (
                          <span className={`text-xs font-medium ${days <= 2 ? 'text-red-600' : 'text-amber-600'}`}>
                            {days} day{days !== 1 ? 's' : ''} left
                          </span>
                        ) : org.subscriptionStatus === 'TRIAL_EXPIRED' ? (
                          <span className="text-xs font-medium text-red-600">Expired</span>
                        ) : org.approvedAt ? (
                          <span className="text-xs text-green-600">Approved</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-600">{org._count.users}</td>
                      <td className="px-5 py-4 text-gray-600">{org._count.invoices}</td>
                      <td className="px-5 py-4 text-gray-500 text-xs">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Approve */}
                          {(org.subscriptionStatus === 'PENDING_APPROVAL' || org.subscriptionStatus === 'TRIAL_EXPIRED') && (
                            <button
                              onClick={() => performAction(org.id, 'APPROVE')}
                              disabled={actionLoading === org.id}
                              className="px-2.5 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                            >
                              Approve
                            </button>
                          )}

                          {/* Extend Trial */}
                          {(org.subscriptionStatus === 'TRIAL' || org.subscriptionStatus === 'TRIAL_EXPIRED') && (
                            <button
                              onClick={() => performAction(org.id, 'EXTEND_TRIAL')}
                              disabled={actionLoading === org.id}
                              className="px-2.5 py-1 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition disabled:opacity-50"
                            >
                              +7 days
                            </button>
                          )}

                          {/* Suspend */}
                          {(org.subscriptionStatus === 'ACTIVE' || org.subscriptionStatus === 'TRIAL') && (
                            <button
                              onClick={() => setShowSuspendModal(org.id)}
                              disabled={actionLoading === org.id}
                              className="px-2.5 py-1 bg-gray-500 text-white text-xs rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
                            >
                              Suspend
                            </button>
                          )}

                          {/* Reactivate */}
                          {(org.subscriptionStatus === 'SUSPENDED' || org.subscriptionStatus === 'CANCELLED') && (
                            <button
                              onClick={() => performAction(org.id, 'REACTIVATE')}
                              disabled={actionLoading === org.id}
                              className="px-2.5 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                            >
                              Reactivate
                            </button>
                          )}

                          {/* Delete */}
                          {confirmDelete === org.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => deleteOrg(org.id)}
                                disabled={actionLoading === org.id}
                                className="px-2.5 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-2.5 py-1 bg-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-300 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(org.id)}
                              className="px-2.5 py-1 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 transition"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {orgs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                      No organizations found{statusFilter !== 'ALL' ? ` with status "${statusFilter.replace('_', ' ')}"` : ''}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Suspend Organization</h3>
            <p className="text-sm text-gray-500 mb-4">This will disable access for all users in this organization.</p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Reason for suspension (optional)..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowSuspendModal(null); setSuspendReason(''); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => performAction(showSuspendModal, 'SUSPEND', suspendReason)}
                disabled={actionLoading === showSuspendModal}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
