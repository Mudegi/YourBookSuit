'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, Search, Users, Phone, Mail, Star, Building2,
  MessageCircle, MoreHorizontal, Filter, UserCheck, Shield,
  Clock, ExternalLink, Briefcase,
} from 'lucide-react';

/* ───── Types ───── */
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  extension: string | null;
  linkedIn: string | null;
  title: string | null;
  department: string | null;
  contactRole: string;
  isPrimary: boolean;
  isDecisionMaker: boolean;
  optOutMarketing: boolean;
  sendInvoicesWhatsApp: boolean;
  lastInteractionAt: string | null;
  notes: string | null;
  createdAt: string;
  company: { id: string; name: string; type: string; lifecycleStage: string } | null;
  branch: { id: string; name: string; code: string } | null;
  _count: { activities: number };
}

interface CompanyOption { id: string; name: string }
interface BranchOption { id: string; name: string; code: string }

/* ───── Constants ───── */
const ROLES = ['GENERAL', 'BILLING', 'SALES', 'TECHNICAL', 'EXECUTIVE'] as const;

const ROLE_COLORS: Record<string, string> = {
  BILLING: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  SALES: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TECHNICAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  EXECUTIVE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  GENERAL: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const TAG_STYLES: Record<string, string> = {
  primary: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  decision: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 30) return `${diff}d ago`;
  if (diff < 365) return `${Math.floor(diff / 30)}mo ago`;
  return `${Math.floor(diff / 365)}y ago`;
}

function whatsappLink(wa: string | null, contactName: string, orgName?: string): string | null {
  if (!wa) return null;
  const num = wa.replace(/[^0-9+]/g, '');
  const msg = encodeURIComponent(`Hello ${contactName}, this is ${orgName || 'our team'} regarding...`);
  return `https://wa.me/${num}?text=${msg}`;
}

/* ───── Page ───── */
export default function ContactsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const router = useRouter();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', whatsapp: '',
    title: '', department: '', companyId: '', branchId: '',
    contactRole: 'GENERAL', isPrimary: false, isDecisionMaker: false, notes: '',
  });

  const loadContacts = useCallback(async () => {
    try {
      const url = new URL(`/api/${orgSlug}/crm/contacts`, window.location.origin);
      if (search) url.searchParams.append('search', search);
      if (roleFilter) url.searchParams.append('role', roleFilter);
      if (companyFilter) url.searchParams.append('companyId', companyFilter);
      if (branchFilter) url.searchParams.append('branchId', branchFilter);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to load contacts');
      const data = await res.json();
      setContacts(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, search, roleFilter, companyFilter, branchFilter]);

  const loadOptions = useCallback(async () => {
    try {
      const [companyRes, branchRes] = await Promise.all([
        fetch(`/api/${orgSlug}/crm/companies`),
        fetch(`/api/${orgSlug}/branches`),
      ]);
      if (companyRes.ok) {
        const json = await companyRes.json();
        setCompanies((json.companies || json.data || []).map((c: any) => ({ id: c.id, name: c.name })));
      }
      if (branchRes.ok) {
        const json = await branchRes.json();
        setBranches((json.branches || json.data || []).map((b: any) => ({ id: b.id, name: b.name, code: b.code || '' })));
      }
    } catch {}
  }, [orgSlug]);

  useEffect(() => { loadContacts(); }, [loadContacts]);
  useEffect(() => { loadOptions(); }, [loadOptions]);

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/${orgSlug}/crm/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          email: form.email || undefined,
          phone: form.phone || undefined,
          whatsapp: form.whatsapp || undefined,
          companyId: form.companyId || undefined,
          branchId: form.branchId || undefined,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to create'); }
      setForm({ firstName: '', lastName: '', email: '', phone: '', whatsapp: '', title: '', department: '', companyId: '', branchId: '', contactRole: 'GENERAL', isPrimary: false, isDecisionMaker: false, notes: '' });
      setShowAddForm(false);
      loadContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contact');
    } finally { setSaving(false); }
  }

  // Stats
  const totalContacts = contacts.length;
  const primaryContacts = contacts.filter(c => c.isPrimary).length;
  const billingContacts = contacts.filter(c => c.contactRole === 'BILLING').length;
  const recentlyActive = contacts.filter(c => {
    if (!c.lastInteractionAt) return false;
    return (Date.now() - new Date(c.lastInteractionAt).getTime()) < 7 * 86400000;
  }).length;

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Back */}
      <button onClick={() => router.push(`/${orgSlug}/dashboard`)}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CRM Contacts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Your people database — {totalContacts} contacts across all companies
          </p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm shadow-sm">
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Contacts" value={totalContacts} icon={Users} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-900/20" />
        <StatCard label="Primary Contacts" value={primaryContacts} icon={Star} color="text-yellow-600 dark:text-yellow-400" bg="bg-yellow-50 dark:bg-yellow-900/20" />
        <StatCard label="Billing Contacts" value={billingContacts} icon={Briefcase} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-900/20" />
        <StatCard label="Active (7d)" value={recentlyActive} icon={Clock} color="text-purple-600 dark:text-purple-400" bg="bg-purple-50 dark:bg-purple-900/20" />
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, company..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm transition ${showFilters ? 'border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
          <Filter className="w-4 h-4" /> Filters
          {(roleFilter || companyFilter || branchFilter) && <span className="w-2 h-2 rounded-full bg-blue-500" />}
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Role</label>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm">
              <option value="">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Company</label>
            <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm">
              <option value="">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Branch</label>
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm">
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Add Contact Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">New Contact</h2>
          <form onSubmit={handleAddContact}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <FormField label="First Name *" name="firstName" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
              <FormField label="Last Name *" name="lastName" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
              <FormField label="Job Title" name="title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="e.g., Procurement Manager" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <FormField label="Email" name="email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <FormField label="Phone" name="phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+256 700 123 456" />
              <FormField label="WhatsApp" name="whatsapp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="+256700123456" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Company</label>
                <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm">
                  <option value="">Independent (B2C)</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Role</label>
                <select value={form.contactRole} onChange={(e) => setForm({ ...form, contactRole: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <FormField label="Department" name="department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} placeholder="e.g., Finance" />
            </div>
            <div className="flex flex-wrap gap-4 mb-4 text-sm">
              <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} className="rounded border-gray-300" />
                Primary Contact
              </label>
              <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <input type="checkbox" checked={form.isDecisionMaker} onChange={(e) => setForm({ ...form, isDecisionMaker: e.target.checked })} className="rounded border-gray-300" />
                Decision Maker
              </label>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Add Contact'}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contact List */}
      {contacts.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No contacts found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add your first contact to get started</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Person</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Company</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Tags</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Quick Actions</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Last Interaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer group"
                  onClick={() => router.push(`/${orgSlug}/crm/contacts/${c.id}`)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {c.firstName} {c.lastName}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          {c.title || c.department || c.email || ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.company ? (
                      <button onClick={(e) => { e.stopPropagation(); router.push(`/${orgSlug}/crm/companies/${c.company!.id}`); }}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {c.company.name}
                      </button>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-sm italic">Independent</span>
                    )}
                    {c.branch && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{c.branch.name}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[c.contactRole] || ROLE_COLORS.GENERAL}`}>
                      {c.contactRole}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.isPrimary && <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${TAG_STYLES.primary}`}>Primary</span>}
                      {c.isDecisionMaker && <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${TAG_STYLES.decision}`}>Decision Maker</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {c.email && (
                        <a href={`mailto:${c.email}`} title={`Email ${c.email}`}
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-500 transition">
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                      {c.phone && (
                        <a href={`tel:${c.phone}`} title={`Call ${c.phone}`}
                          className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 text-green-500 transition">
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      {(c.whatsapp || c.phone) && (
                        <a href={whatsappLink(c.whatsapp || c.phone, c.firstName, orgSlug) || '#'}
                          target="_blank" rel="noopener noreferrer"
                          title={`WhatsApp ${c.whatsapp || c.phone}`}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 transition">
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className={`text-xs ${!c.lastInteractionAt ? 'text-gray-400 dark:text-gray-500' : (Date.now() - new Date(c.lastInteractionAt).getTime()) > 30 * 86400000 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {timeAgo(c.lastInteractionAt)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ───── Sub-Components ───── */
function StatCard({ label, value, icon: Icon, color, bg }: { label: string; value: number; icon: any; color: string; bg: string }) {
  return (
    <div className={`${bg} border border-gray-200 dark:border-gray-700 rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function FormField({ label, name, value, onChange, placeholder, type = 'text', required }: {
  label: string; name: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
    </div>
  );
}
