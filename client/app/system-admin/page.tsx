'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-client';

interface Stats {
  totalUsers: number;
  totalOrgs: number;
  activeOrgs: number;
  trialOrgs: number;
  trialExpiredOrgs: number;
  pendingApprovalOrgs: number;
  suspendedOrgs: number;
  cancelledOrgs: number;
}

interface RecentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isSystemAdmin: boolean;
  createdAt: string;
  organizations: {
    organization: { name: string; slug: string; subscriptionStatus: string };
  }[];
}

export default function SystemAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetchWithAuth('/api/system-admin');
      const data = await res.json();
      if (data.success) {
        setStats(data.data.stats);
        setRecentUsers(data.data.recentUsers);
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, color: 'blue', icon: '👥' },
    { label: 'Total Organizations', value: stats?.totalOrgs ?? 0, color: 'indigo', icon: '🏢' },
    { label: 'Active Subscriptions', value: stats?.activeOrgs ?? 0, color: 'green', icon: '✅' },
    { label: 'On Trial', value: stats?.trialOrgs ?? 0, color: 'amber', icon: '⏳' },
    { label: 'Pending Approval', value: stats?.pendingApprovalOrgs ?? 0, color: 'orange', icon: '🔔' },
    { label: 'Trial Expired', value: stats?.trialExpiredOrgs ?? 0, color: 'red', icon: '⚠️' },
    { label: 'Suspended', value: stats?.suspendedOrgs ?? 0, color: 'gray', icon: '🚫' },
    { label: 'Cancelled', value: stats?.cancelledOrgs ?? 0, color: 'slate', icon: '❌' },
  ];

  const statusColors: Record<string, string> = {
    TRIAL: 'bg-amber-100 text-amber-800',
    TRIAL_EXPIRED: 'bg-red-100 text-red-800',
    PENDING_APPROVAL: 'bg-orange-100 text-orange-800',
    ACTIVE: 'bg-green-100 text-green-800',
    SUSPENDED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Platform Overview</h2>
        <p className="text-sm text-gray-500 mt-1">Monitor all organizations, users, and subscriptions across the platform.</p>
      </div>

      {/* Alert for pending approvals */}
      {(stats?.pendingApprovalOrgs ?? 0) > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="font-semibold text-orange-900">
                {stats!.pendingApprovalOrgs} organization{stats!.pendingApprovalOrgs > 1 ? 's' : ''} awaiting approval
              </p>
              <p className="text-sm text-orange-700">These users have paid and are waiting for you to activate their accounts.</p>
            </div>
          </div>
          <Link
            href="/system-admin/organizations?status=PENDING_APPROVAL"
            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 transition"
          >
            Review Now
          </Link>
        </div>
      )}

      {/* Trial expired alert */}
      {(stats?.trialExpiredOrgs ?? 0) > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-red-900">
                {stats!.trialExpiredOrgs} expired trial{stats!.trialExpiredOrgs > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-red-700">These organizations&apos; 7-day trial has ended.</p>
            </div>
          </div>
          <Link
            href="/system-admin/organizations?status=TRIAL_EXPIRED"
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
          >
            View
          </Link>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{card.icon}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-sm text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link
          href="/system-admin/organizations"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="text-2xl mb-2">🏢</div>
          <h3 className="font-bold text-gray-900 group-hover:text-blue-600">Manage Organizations</h3>
          <p className="text-sm text-gray-500 mt-1">View, approve, suspend, or delete organizations</p>
        </Link>
        <Link
          href="/system-admin/users"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="text-2xl mb-2">👥</div>
          <h3 className="font-bold text-gray-900 group-hover:text-blue-600">Manage Users</h3>
          <p className="text-sm text-gray-500 mt-1">Activate, deactivate, or remove platform users</p>
        </Link>
        <Link
          href="/system-admin/subscriptions"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="text-2xl mb-2">💳</div>
          <h3 className="font-bold text-gray-900 group-hover:text-blue-600">Subscriptions</h3>
          <p className="text-sm text-gray-500 mt-1">Review trials, extend periods, manage billing</p>
        </Link>
      </div>

      {/* Recent Users */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Recent Users</h3>
          <Link href="/system-admin/users" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Organization</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {u.firstName} {u.lastName}
                    {u.isSystemAdmin && (
                      <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded font-semibold">ADMIN</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{u.email}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {u.organizations[0]?.organization.name || '—'}
                  </td>
                  <td className="px-5 py-3">
                    {u.organizations[0]?.organization.subscriptionStatus ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[u.organizations[0].organization.subscriptionStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {u.organizations[0].organization.subscriptionStatus.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {recentUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">No users yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
