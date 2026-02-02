"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import Loading from "@/components/ui/loading";

interface OrgMember {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    lastLoginAt?: string | null;
  };
  legacyRole?: string;
  roles: { id: string; name: string }[];
  createdAt: string;
  isActive: boolean;
}

interface Role {
  id: string;
  name: string;
  description?: string | null;
}

interface Invite {
  id: string;
  email: string;
  status: string;
  token: string;
  role?: { id: string; name: string } | null;
  createdAt: string;
  expiresAt?: string | null;
}

export default function UsersSettingsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'roles' | 'invites' | 'audit'>('members');
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [inviteForm, setInviteForm] = useState({ email: '', roleId: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/orgs/${orgSlug}/users`);
        const data = await res.json();
        if (!res.ok || data.success === false) throw new Error(data.error || "Failed to load users");
        setMembers(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    const fetchRoles = async () => {
      try {
        const res = await fetch(`/api/orgs/${orgSlug}/roles`);
        const data = await res.json();
        if (!res.ok || data.success === false) throw new Error(data.error || "Failed to load roles");
        setRoles(data.data);
      } catch (err) {
        console.warn(err);
      }
    };
    const fetchInvites = async () => {
      try {
        const res = await fetch(`/api/orgs/${orgSlug}/invites`);
        const data = await res.json();
        if (res.ok && data.success !== false) setInvites(data.data);
      } catch (err) {
        console.warn(err);
      }
    };
    if (orgSlug) {
      fetchMembers();
      fetchRoles();
      fetchInvites();
    }
  }, [orgSlug]);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users & Roles</h1>
        <p className="text-gray-600 mt-1">Manage organization users and their access.</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      <div className="flex space-x-2">
        <button className={`px-3 py-2 border rounded ${activeTab==='members' ? 'bg-gray-100' : ''}`} onClick={()=>setActiveTab('members')}>Members</button>
        <button className={`px-3 py-2 border rounded ${activeTab==='roles' ? 'bg-gray-100' : ''}`} onClick={()=>setActiveTab('roles')}>Roles & Permissions</button>
        <button className={`px-3 py-2 border rounded ${activeTab==='invites' ? 'bg-gray-100' : ''}`} onClick={()=>setActiveTab('invites')}>Invites</button>
        <button className={`px-3 py-2 border rounded ${activeTab==='audit' ? 'bg-gray-100' : ''}`} onClick={()=>setActiveTab('audit')}>Audit Log</button>
      </div>

      {activeTab === 'members' && (
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">Email</th>
                    <th className="text-left px-3 py-2">Roles</th>
                    <th className="text-left px-3 py-2">Last Login</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {members.map((m, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        {(m.user.firstName || m.user.lastName) ? (
                          <span>{m.user.firstName} {m.user.lastName}</span>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">{m.user.email}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center space-x-2">
                          <select
                            className="border rounded px-2 py-1"
                            value=""
                            onChange={async (e)=>{
                              const roleId = e.target.value;
                              if (!roleId) return;
                              const res = await fetch(`/api/orgs/${orgSlug}/members/${m.user.id}/roles`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ roleIds: [roleId] }),
                              });
                              if (res.ok) {
                                const updated = await fetch(`/api/orgs/${orgSlug}/users`);
                                const d = await updated.json();
                                if (updated.ok) setMembers(d.data);
                              }
                            }}
                          >
                            <option value="">Assign role…</option>
                            {roles.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                          <div className="text-gray-700">
                            {m.roles && m.roles.length > 0 ? m.roles.map(r=>r.name).join(', ') : (m.legacyRole || '—')}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">{m.user.lastLoginAt ? new Date(m.user.lastLoginAt).toLocaleString() : '—'}</td>
                      <td className="px-3 py-2">
                        <span className={m.isActive ? "text-green-700" : "text-gray-500"}>
                          {m.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2">{new Date(m.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-500" colSpan={6}>No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'roles' && (
        <Card>
          <CardHeader>
            <CardTitle>Roles & Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex space-x-2"
              onSubmit={async (e)=>{
                e.preventDefault();
                const res = await fetch(`/api/orgs/${orgSlug}/roles`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(newRole)
                });
                if (res.ok) {
                  setNewRole({ name: '', description: '' });
                  const r = await fetch(`/api/orgs/${orgSlug}/roles`);
                  const data = await r.json();
                  if (r.ok) setRoles(data.data);
                }
              }}
            >
              <input className="border px-2 py-1 rounded" placeholder="Role name" value={newRole.name} onChange={(e)=>setNewRole(prev=>({...prev, name: e.target.value}))} />
              <input className="border px-2 py-1 rounded" placeholder="Description" value={newRole.description} onChange={(e)=>setNewRole(prev=>({...prev, description: e.target.value}))} />
              <button className="px-3 py-1 border rounded">Create Role</button>
            </form>

            <div className="grid md:grid-cols-2 gap-4">
              {roles.map(role => (
                <div key={role.id} className="border rounded p-3">
                  <div className="font-medium">{role.name}</div>
                  <div className="text-sm text-gray-600">{role.description || '—'}</div>
                  <div className="mt-2 text-xs text-gray-700">Assign granular permissions in a dedicated editor (to be expanded).</div>
                </div>
              ))}
              {roles.length === 0 && <div className="text-gray-500">No roles yet.</div>}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'invites' && (
        <Card>
          <CardHeader>
            <CardTitle>Invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex space-x-2"
              onSubmit={async (e)=>{
                e.preventDefault();
                const res = await fetch(`/api/orgs/${orgSlug}/invites`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(inviteForm)
                });
                if (res.ok) {
                  setInviteForm({ email: '', roleId: '' });
                  const r = await fetch(`/api/orgs/${orgSlug}/invites`);
                  const data = await r.json();
                  if (r.ok) setInvites(data.data);
                }
              }}
            >
              <input className="border px-2 py-1 rounded" placeholder="Email" value={inviteForm.email} onChange={(e)=>setInviteForm(prev=>({...prev, email: e.target.value}))} />
              <select className="border px-2 py-1 rounded" value={inviteForm.roleId} onChange={(e)=>setInviteForm(prev=>({...prev, roleId: e.target.value}))}>
                <option value="">Select role (optional)</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <button className="px-3 py-1 border rounded">Send Invite</button>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-3 py-2">Email</th>
                    <th className="text-left px-3 py-2">Role</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Created</th>
                    <th className="text-left px-3 py-2">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invites.map((i) => (
                    <tr key={i.id}>
                      <td className="px-3 py-2">{i.email}</td>
                      <td className="px-3 py-2">{i.role?.name || '—'}</td>
                      <td className="px-3 py-2">{i.status}</td>
                      <td className="px-3 py-2">{new Date(i.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2">{i.expiresAt ? new Date(i.expiresAt).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                  {invites.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>No invites.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'audit' && (
        <AuditLogView orgSlug={orgSlug} />
      )}
    </div>
  );
}

function AuditLogView({ orgSlug }: { orgSlug: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/orgs/${orgSlug}/audit-logs?scope=sensitive`);
        const data = await res.json();
        if (res.ok) setLogs(data.data);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [orgSlug]);

  if (loading) return <Loading />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left px-3 py-2">Timestamp</th>
                <th className="text-left px-3 py-2">User</th>
                <th className="text-left px-3 py-2">Entity</th>
                <th className="text-left px-3 py-2">Action</th>
                <th className="text-left px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((l, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2">{new Date(l.timestamp).toLocaleString()}</td>
                  <td className="px-3 py-2">{l.user?.email || '—'}</td>
                  <td className="px-3 py-2">{l.entityType} / {l.entityId}</td>
                  <td className="px-3 py-2">{l.action}</td>
                  <td className="px-3 py-2"><pre className="text-xs whitespace-pre-wrap">{l.changes ? JSON.stringify(l.changes, null, 2) : '—'}</pre></td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>No audit events.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
