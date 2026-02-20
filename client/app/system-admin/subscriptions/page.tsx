'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-client';

interface Org {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  subscriptionStatus: string;
  trialStartDate: string | null;
  trialEndDate: string | null;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  approvedAt: string | null;
  createdAt: string;
  _count: { users: number; invoices: number; transactions: number };
}

const STATUS_COLORS: Record<string, string> = {
  TRIAL: 'bg-amber-100 text-amber-800',
  TRIAL_EXPIRED: 'bg-red-100 text-red-800',
  PENDING_APPROVAL: 'bg-orange-100 text-orange-800',
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-gray-200 text-gray-800',
  CANCELLED: 'bg-red-50 text-red-700',
};

export default function SubscriptionsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    try {
      const res = await fetchWithAuth('/api/system-admin/organizations');
      const data = await res.json();
      if (data.success) setOrgs(data.data);
    } catch {
      console.error('Failed to fetch orgs');
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (orgId: string, action: string) => {
    try {
      const res = await fetchWithAuth('/api/system-admin/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId, action }),
      });
      const data = await res.json();
      if (data.success) await fetchOrgs();
      else alert(data.error);
    } catch {
      alert('Network error');
    }
  };

  const daysLeft = (end: string | null) => {
    if (!end) return null;
    return Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / 86400000));
  };

  // Summary counts
  const counts = orgs.reduce((acc, o) => {
    acc[o.subscriptionStatus] = (acc[o.subscriptionStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Subscriptions</h2>
        <p className="text-sm text-gray-500 mt-1">Overview of all subscription states across the platform.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { key: 'TRIAL', label: 'Trial', icon: '⏳' },
          { key: 'TRIAL_EXPIRED', label: 'Expired', icon: '⚠️' },
          { key: 'PENDING_APPROVAL', label: 'Pending', icon: '🔔' },
          { key: 'ACTIVE', label: 'Active', icon: '✅' },
          { key: 'SUSPENDED', label: 'Suspended', icon: '🚫' },
          { key: 'CANCELLED', label: 'Cancelled', icon: '❌' },
        ].map((s) => (
          <div key={s.key} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-xl">{s.icon}</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{counts[s.key] || 0}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Subscription lifecycle table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">All Subscriptions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3 font-medium">Organization</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Trial Period</th>
                <th className="px-5 py-3 font-medium">Subscription Start</th>
                <th className="px-5 py-3 font-medium">Approved</th>
                <th className="px-5 py-3 font-medium">Usage</th>
                <th className="px-5 py-3 font-medium text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => {
                const days = daysLeft(org.trialEndDate);
                return (
                  <tr key={org.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{org.name}</div>
                      <div className="text-xs text-gray-400">{org.slug}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[org.subscriptionStatus] || 'bg-gray-100'}`}>
                        {org.subscriptionStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600">
                      {org.trialStartDate && (
                        <div>
                          <div>{new Date(org.trialStartDate).toLocaleDateString()} — {org.trialEndDate ? new Date(org.trialEndDate).toLocaleDateString() : '?'}</div>
                          {org.subscriptionStatus === 'TRIAL' && days !== null && (
                            <span className={`font-medium ${days <= 2 ? 'text-red-600' : 'text-amber-600'}`}>{days}d remaining</span>
                          )}
                        </div>
                      )}
                      {!org.trialStartDate && <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600">
                      {org.subscriptionStartDate ? new Date(org.subscriptionStartDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600">
                      {org.approvedAt ? new Date(org.approvedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600">
                      {org._count.users} users · {org._count.invoices} inv · {org._count.transactions} txn
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {org.subscriptionStatus === 'PENDING_APPROVAL' && (
                          <button onClick={() => performAction(org.id, 'APPROVE')} className="px-2.5 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition">
                            Approve
                          </button>
                        )}
                        {(org.subscriptionStatus === 'TRIAL' || org.subscriptionStatus === 'TRIAL_EXPIRED') && (
                          <button onClick={() => performAction(org.id, 'EXTEND_TRIAL')} className="px-2.5 py-1 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition">
                            +7 days
                          </button>
                        )}
                        {org.subscriptionStatus === 'SUSPENDED' && (
                          <button onClick={() => performAction(org.id, 'REACTIVATE')} className="px-2.5 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition">
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {orgs.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">No organizations</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
