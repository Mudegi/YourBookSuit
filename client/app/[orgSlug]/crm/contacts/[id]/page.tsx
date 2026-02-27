'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, Phone, Mail, MessageCircle, Building2, Edit3, Save, X,
  Star, Shield, Clock, ExternalLink, Linkedin, Users, Circle,
  PhoneCall, Calendar, FileText, Bell,
} from 'lucide-react';

/* ───── Types ───── */
interface ContactData {
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
  branchId: string | null;
  optOutMarketing: boolean;
  sendInvoicesWhatsApp: boolean;
  lastInteractionAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string; name: string; type: string; lifecycleStage: string;
    email: string | null; phone: string | null; industry: string | null;
    city: string | null; country: string | null; outstandingBalance: number;
  } | null;
  branch: { id: string; name: string; code: string } | null;
  activities: Activity[];
  _count: { activities: number };
}

interface Activity {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  createdAt: string;
  createdByUser: { id: string; firstName: string; lastName: string };
}

/* ───── Constants ───── */
const ROLES = ['GENERAL', 'BILLING', 'SALES', 'TECHNICAL', 'EXECUTIVE'] as const;

const ROLE_COLORS: Record<string, string> = {
  BILLING: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  SALES: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TECHNICAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  EXECUTIVE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  GENERAL: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const ACTIVITY_ICONS: Record<string, any> = {
  CALL: PhoneCall,
  EMAIL: Mail,
  MEETING: Calendar,
  NOTE: FileText,
  SYSTEM: Bell,
};
const ACTIVITY_COLORS: Record<string, string> = {
  CALL: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  EMAIL: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  MEETING: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  NOTE: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  SYSTEM: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function whatsappLink(wa: string | null, contactName: string, orgName?: string): string | null {
  if (!wa) return null;
  const num = wa.replace(/[^0-9+]/g, '');
  const msg = encodeURIComponent(`Hello ${contactName}, this is ${orgName || 'our team'} regarding...`);
  return `https://wa.me/${num}?text=${msg}`;
}

/* ───── Page ───── */
export default function ContactProfilePage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const contactId = params?.id as string;
  const router = useRouter();

  const [contact, setContact] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'activity' | 'preferences'>('activity');

  const loadContact = useCallback(async () => {
    try {
      const res = await fetch(`/api/${orgSlug}/crm/contacts/${contactId}`);
      if (!res.ok) throw new Error('Contact not found');
      const data = await res.json();
      setContact(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contact');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, contactId]);

  useEffect(() => { loadContact(); }, [loadContact]);

  async function handleSave() {
    if (!editData) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/${orgSlug}/crm/contacts/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Update failed'); }
      setEditing(false);
      setEditData(null);
      loadContact();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally { setSaving(false); }
  }

  function openEdit() {
    if (!contact) return;
    setEditData({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email || '',
      phone: contact.phone || '',
      whatsapp: contact.whatsapp || '',
      extension: contact.extension || '',
      linkedIn: contact.linkedIn || '',
      title: contact.title || '',
      department: contact.department || '',
      contactRole: contact.contactRole,
      isPrimary: contact.isPrimary,
      isDecisionMaker: contact.isDecisionMaker,
      optOutMarketing: contact.optOutMarketing,
      sendInvoicesWhatsApp: contact.sendInvoicesWhatsApp,
      notes: contact.notes || '',
    });
    setEditing(true);
  }

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl mb-6" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="p-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="p-8 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <p className="text-red-500">{error || 'Contact not found'}</p>
        </div>
      </div>
    );
  }

  const waLink = whatsappLink(contact.whatsapp || contact.phone, contact.firstName, orgSlug);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Back */}
      <button onClick={() => router.push(`/${orgSlug}/crm/contacts`)}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Contacts
      </button>

      {/* Hero Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xl font-bold">
              {contact.firstName[0]}{contact.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {contact.firstName} {contact.lastName}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[contact.contactRole] || ROLE_COLORS.GENERAL}`}>
                  {contact.contactRole}
                </span>
                {contact.isPrimary && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <Star className="w-3 h-3" /> Primary
                  </span>
                )}
                {contact.isDecisionMaker && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <Shield className="w-3 h-3" /> Decision Maker
                  </span>
                )}
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {[contact.title, contact.department].filter(Boolean).join(' · ') || 'No title set'}
              </p>
              {contact.company && (
                <button onClick={() => router.push(`/${orgSlug}/crm/companies/${contact.company!.id}`)}
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1">
                  <Building2 className="w-3 h-3" /> {contact.company.name}
                  {contact.company.industry && <span className="text-gray-400 dark:text-gray-500 ml-1">({contact.company.industry})</span>}
                </button>
              )}
              {!contact.company && <p className="text-sm text-gray-400 italic mt-1">Independent Contact (B2C)</p>}
            </div>
          </div>
          <button onClick={openEdit}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <Edit3 className="w-4 h-4" /> Edit
          </button>
        </div>

        {/* Quick Contact Actions */}
        <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
          {contact.email && (
            <a href={`mailto:${contact.email}`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 rounded-lg text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition">
              <Mail className="w-4 h-4" /> {contact.email}
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}${contact.extension ? `,${contact.extension}` : ''}`}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm hover:bg-green-100 dark:hover:bg-green-900/30 transition">
              <Phone className="w-4 h-4" /> {contact.phone}{contact.extension ? ` ext. ${contact.extension}` : ''}
            </a>
          )}
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          )}
          {contact.linkedIn && (
            <a href={contact.linkedIn} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition">
              <Linkedin className="w-4 h-4" /> LinkedIn
            </a>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tabs */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex gap-1 mb-4">
            {(['activity', 'preferences'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                {tab === 'activity' ? 'Activity History' : 'Communication Preferences'}
              </button>
            ))}
          </div>

          {activeTab === 'activity' && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Activity Timeline ({contact._count.activities} interactions)
              </h3>
              {contact.activities.length === 0 ? (
                <div className="p-8 text-center">
                  <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No interactions logged yet</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                  <div className="space-y-4">
                    {contact.activities.map(a => {
                      const Icon = ACTIVITY_ICONS[a.type] || Circle;
                      const color = ACTIVITY_COLORS[a.type] || ACTIVITY_COLORS.SYSTEM;
                      return (
                        <div key={a.id} className="relative flex items-start gap-4 pl-0">
                          <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{a.subject}</p>
                              <span className="text-[10px] text-gray-400 shrink-0 ml-2">{timeAgo(a.createdAt)}</span>
                            </div>
                            {a.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{a.description}</p>}
                            <p className="text-[10px] text-gray-400 mt-2">by {a.createdByUser.firstName} {a.createdByUser.lastName}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Communication Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Opt-Out of Marketing</p>
                    <p className="text-xs text-gray-400 mt-0.5">This person will not receive marketing communications</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${contact.optOutMarketing
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                    {contact.optOutMarketing ? 'Opted Out' : 'Subscribed'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Send Invoices via WhatsApp</p>
                    <p className="text-xs text-gray-400 mt-0.5">Invoices will be sent to their WhatsApp number</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${contact.sendInvoicesWhatsApp
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {contact.sendInvoicesWhatsApp ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Billing Contact</p>
                    <p className="text-xs text-gray-400 mt-0.5">Invoices and receipts from the system are routed to this person</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${contact.contactRole === 'BILLING'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {contact.contactRole === 'BILLING' ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Personal Info */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Personal Info</h3>
            <div className="space-y-2.5 text-sm">
              <InfoRow label="Phone" value={contact.phone ? `${contact.phone}${contact.extension ? ` ext. ${contact.extension}` : ''}` : null} />
              <InfoRow label="Email" value={contact.email} />
              <InfoRow label="WhatsApp" value={contact.whatsapp} />
              <InfoRow label="LinkedIn" value={contact.linkedIn} isLink />
              <InfoRow label="Department" value={contact.department} />
              <InfoRow label="Role" value={contact.contactRole} />
            </div>
          </div>

          {/* Company Context */}
          {contact.company && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Parent Company</h3>
              <button onClick={() => router.push(`/${orgSlug}/crm/companies/${contact.company!.id}`)}
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm mb-3">
                <Building2 className="w-4 h-4" /> {contact.company.name}
                <ExternalLink className="w-3 h-3" />
              </button>
              <div className="space-y-2 text-sm">
                <InfoRow label="Type" value={contact.company.type} />
                <InfoRow label="Stage" value={contact.company.lifecycleStage} />
                <InfoRow label="Industry" value={contact.company.industry} />
                <InfoRow label="Location" value={[contact.company.city, contact.company.country].filter(Boolean).join(', ') || null} />
              </div>
            </div>
          )}

          {/* Branch */}
          {contact.branch && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Branch</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">{contact.branch.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{contact.branch.code}</p>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Notes</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Record Info</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Created" value={new Date(contact.createdAt).toLocaleDateString()} />
              <InfoRow label="Updated" value={new Date(contact.updatedAt).toLocaleDateString()} />
              <InfoRow label="Last Interaction" value={contact.lastInteractionAt ? new Date(contact.lastInteractionAt).toLocaleDateString() : 'Never'} />
              <InfoRow label="Activities" value={String(contact._count.activities)} />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Contact</h2>
              <button onClick={() => setEditing(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <EditField label="First Name" value={editData.firstName} onChange={(v) => setEditData({ ...editData, firstName: v })} />
                <EditField label="Last Name" value={editData.lastName} onChange={(v) => setEditData({ ...editData, lastName: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <EditField label="Email" value={editData.email} onChange={(v) => setEditData({ ...editData, email: v })} />
                <EditField label="Phone" value={editData.phone} onChange={(v) => setEditData({ ...editData, phone: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <EditField label="WhatsApp" value={editData.whatsapp} onChange={(v) => setEditData({ ...editData, whatsapp: v })} placeholder="+256700123456" />
                <EditField label="Extension" value={editData.extension} onChange={(v) => setEditData({ ...editData, extension: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <EditField label="Job Title" value={editData.title} onChange={(v) => setEditData({ ...editData, title: v })} />
                <EditField label="Department" value={editData.department} onChange={(v) => setEditData({ ...editData, department: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <EditField label="LinkedIn Profile" value={editData.linkedIn} onChange={(v) => setEditData({ ...editData, linkedIn: v })} placeholder="https://linkedin.com/in/..." />
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Role</label>
                  <select value={editData.contactRole} onChange={(e) => setEditData({ ...editData, contactRole: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <input type="checkbox" checked={editData.isPrimary} onChange={(e) => setEditData({ ...editData, isPrimary: e.target.checked })} className="rounded border-gray-300" />
                  Primary Contact
                </label>
                <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <input type="checkbox" checked={editData.isDecisionMaker} onChange={(e) => setEditData({ ...editData, isDecisionMaker: e.target.checked })} className="rounded border-gray-300" />
                  Decision Maker
                </label>
                <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <input type="checkbox" checked={editData.optOutMarketing} onChange={(e) => setEditData({ ...editData, optOutMarketing: e.target.checked })} className="rounded border-gray-300" />
                  Opt-Out of Marketing
                </label>
                <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <input type="checkbox" checked={editData.sendInvoicesWhatsApp} onChange={(e) => setEditData({ ...editData, sendInvoicesWhatsApp: e.target.checked })} className="rounded border-gray-300" />
                  Send Invoices via WhatsApp
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                <textarea value={editData.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows={3} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditing(false)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── Sub-Components ───── */
function InfoRow({ label, value, isLink }: { label: string; value: string | null; isLink?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      {value ? (
        isLink ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[200px]">
            View <ExternalLink className="w-3 h-3 inline" />
          </a>
        ) : (
          <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]">{value}</span>
        )
      ) : (
        <span className="text-gray-400 dark:text-gray-500">—</span>
      )}
    </div>
  );
}

function EditField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
    </div>
  );
}
