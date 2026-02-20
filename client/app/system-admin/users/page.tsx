'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-client';

interface PlatformUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  isSystemAdmin: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  organizations: {
    role: string;
    organization: { id: string; name: string; slug: string; subscriptionStatus: string };
  }[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetchWithAuth(`/api/system-admin/users?${params}`);
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (userId: string, action: string) => {
    setActionLoading(userId);
    try {
      const res = await fetchWithAuth('/api/system-admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchUsers();
      } else {
        alert(data.error || 'Action failed');
      }
    } catch {
      alert('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetchWithAuth(`/api/system-admin/users?id=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setUsers(users.filter(u => u.id !== userId));
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

  const STATUS_COLORS: Record<string, string> = {
    TRIAL: 'bg-amber-100 text-amber-700',
    TRIAL_EXPIRED: 'bg-red-100 text-red-700',
    PENDING_APPROVAL: 'bg-orange-100 text-orange-700',
    ACTIVE: 'bg-green-100 text-green-700',
    SUSPENDED: 'bg-gray-200 text-gray-700',
    CANCELLED: 'bg-red-50 text-red-600',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Users</h2>
        <p className="text-sm text-gray-500 mt-1">Manage all platform users across every organization.</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-80 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <span className="text-sm text-gray-400">{users.length} user{users.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Users Table */}
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
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Organization</th>
                  <th className="px-5 py-3 font-medium">Org Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Last Login</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">{u.firstName} {u.lastName}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {u.isSystemAdmin && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] rounded font-semibold">SYS ADMIN</span>
                            )}
                            {!u.isActive && (
                              <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-[10px] rounded font-semibold">INACTIVE</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{u.email}</td>
                    <td className="px-5 py-3">
                      {u.organizations.length > 0 ? (
                        <div>
                          <div className="text-gray-900 text-xs font-medium">{u.organizations[0].organization.name}</div>
                          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[u.organizations[0].organization.subscriptionStatus] || 'bg-gray-100'}`}>
                            {u.organizations[0].organization.subscriptionStatus.replace('_', ' ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">No org</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-xs">
                      {u.organizations[0]?.role || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {/* Toggle active */}
                        {u.isActive ? (
                          <button
                            onClick={() => performAction(u.id, 'DEACTIVATE')}
                            disabled={actionLoading === u.id}
                            className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => performAction(u.id, 'ACTIVATE')}
                            disabled={actionLoading === u.id}
                            className="px-2.5 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}

                        {/* Toggle admin */}
                        {!u.isSystemAdmin ? (
                          <button
                            onClick={() => performAction(u.id, 'GRANT_ADMIN')}
                            disabled={actionLoading === u.id}
                            className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
                          >
                            Make Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => performAction(u.id, 'REVOKE_ADMIN')}
                            disabled={actionLoading === u.id}
                            className="px-2.5 py-1 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                          >
                            Revoke Admin
                          </button>
                        )}

                        {/* Delete */}
                        {confirmDelete === u.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteUser(u.id)}
                              disabled={actionLoading === u.id}
                              className="px-2.5 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2.5 py-1 bg-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-300 transition"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(u.id)}
                            className="px-2.5 py-1 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 transition"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-gray-400">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
