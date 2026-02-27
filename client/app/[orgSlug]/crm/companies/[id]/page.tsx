'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Edit3,
  Save,
  X,
  Users,
  TrendingUp,
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  Circle,
  PhoneCall,
  MessageSquare,
  Calendar,
  StickyNote,
  Plus,
  ChevronUp,
  AlertCircle,
  Star,
  ArrowUpRight,
  Hash,
  Briefcase,
} from 'lucide-react';

type Tab = 'overview' | 'activities' | 'contacts' | 'deals' | 'financials' | 'tasks';

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
  branch: { id: string; name: string } | null;
}

interface Activity {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  createdAt: string;
  createdByUser: { firstName: string; lastName: string };
  contact: { firstName: string; lastName: string } | null;
}

interface Opportunity {
  id: string;
  name: string;
  value: number | null;
  currency: string;
  stage: string;
  probability: number;
  createdAt: string;
}

interface CrmTask {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: string;
  status: string;
  assignedUser: { firstName: string; lastName: string } | null;
}

interface FinancialStats {
  totalRevenue: number;
  outstandingBalance: number;
  invoiceCount: number;
  estimateCount: number;
  paymentCount: number;
  lastInvoiceDate: string | null;
  lastPaymentDate: string | null;
}

interface CompanyData {
  id: string;
  name: string;
  type: string;
  lifecycleStage: string;
  industry: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  taxId: string | null;
  status: string;
  defaultCurrency: string | null;
  defaultPaymentTerms: number | null;
  lastContactedAt: string | null;
  lifetimeValue: number;
  outstandingBalance: number;
  notes: string | null;
  accountManager: { id: string; firstName: string; lastName: string; email: string } | null;
  branch: { id: string; name: string; code: string } | null;
  contacts: Contact[];
  opportunities: Opportunity[];
  activities: Activity[];
  crmTasks: CrmTask[];
  financialStats: FinancialStats;
  _count: { contacts: number; opportunities: number; activities: number; crmTasks: number };
}

const STAGE_PROGRESSION = ['LEAD', 'PROSPECT', 'CUSTOMER', 'DORMANT'];

const ACTIVITY_ICONS: Record<string, any> = {
  CALL: PhoneCall,
  EMAIL: MessageSquare,
  MEETING: Calendar,
  NOTE: StickyNote,
  TASK: CheckCircle2,
  SYSTEM: Circle,
};

const ACTIVITY_COLORS: Record<string, string> = {
  CALL: 'text-green-500 bg-green-50 dark:bg-green-900/30',
  EMAIL: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
  MEETING: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30',
  NOTE: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30',
  TASK: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30',
  SYSTEM: 'text-gray-400 bg-gray-50 dark:bg-gray-800',
};

const STAGE_COLORS: Record<string, string> = {
  QUALIFICATION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PROSPECT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  QUALIFIED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  PROPOSAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  NEGOTIATION: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  WON: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  LOST: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-gray-500 dark:text-gray-400',
  MEDIUM: 'text-blue-500 dark:text-blue-400',
  HIGH: 'text-orange-500 dark:text-orange-400',
  URGENT: 'text-red-600 dark:text-red-400 font-bold',
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function daysSince(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 30) return `${diff} days ago`;
  return `${Math.floor(diff / 30)}mo ago`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function CompanyProfilePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const companyId = params?.id as string;

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});

  // Activity logging
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityForm, setActivityForm] = useState({ type: 'NOTE', subject: '', description: '' });

  // Contact adding
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ firstName: '', lastName: '', email: '', phone: '', whatsapp: '', title: '', department: '', contactRole: 'GENERAL', isPrimary: false, isDecisionMaker: false });

  // Task adding
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', dueDate: '', priority: 'MEDIUM' });

  const loadCompany = useCallback(async () => {
    try {
      const res = await fetch(`/api/${orgSlug}/crm/companies/${companyId}`);
      if (!res.ok) throw new Error('Failed to load company');
      const data = await res.json();
      setCompany(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, companyId]);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  async function handleSave() {
    try {
      const res = await fetch(`/api/${orgSlug}/crm/companies/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error('Save failed');
      setEditing(false);
      loadCompany();
    } catch (err) {
      alert('Failed to save');
    }
  }

  async function handlePromote(stage: string) {
    try {
      await fetch(`/api/${orgSlug}/crm/companies/${companyId}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      loadCompany();
    } catch {}
  }

  async function handleLogActivity() {
    if (!activityForm.subject) return;
    try {
      await fetch(`/api/${orgSlug}/crm/companies/${companyId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityForm),
      });
      setShowActivityForm(false);
      setActivityForm({ type: 'NOTE', subject: '', description: '' });
      loadCompany();
    } catch {}
  }

  async function handleAddContact() {
    if (!contactForm.firstName || !contactForm.lastName) return;
    try {
      await fetch(`/api/${orgSlug}/crm/companies/${companyId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      setShowContactForm(false);
      setContactForm({ firstName: '', lastName: '', email: '', phone: '', whatsapp: '', title: '', department: '', contactRole: 'GENERAL', isPrimary: false, isDecisionMaker: false });
      loadCompany();
    } catch {}
  }

  async function handleAddTask() {
    if (!taskForm.title) return;
    try {
      await fetch(`/api/${orgSlug}/crm/companies/${companyId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskForm),
      });
      setShowTaskForm(false);
      setTaskForm({ title: '', description: '', dueDate: '', priority: 'MEDIUM' });
      loadCompany();
    } catch {}
  }

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
        <div className="h-36 bg-gray-200 dark:bg-gray-700 rounded-xl mb-6" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="p-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-600 mb-4 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-xl border">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-500">{error || 'Company not found'}</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: any; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: Building2 },
    { key: 'activities', label: 'Timeline', icon: Clock, count: company._count.activities },
    { key: 'contacts', label: 'People', icon: Users, count: company._count.contacts },
    { key: 'deals', label: 'Deals', icon: TrendingUp, count: company._count.opportunities },
    { key: 'tasks', label: 'Tasks', icon: CheckCircle2, count: company._count.crmTasks },
    { key: 'financials', label: 'Financials', icon: DollarSign },
  ];

  const currentStageIdx = STAGE_PROGRESSION.indexOf(company.lifecycleStage);
  const nextStage = currentStageIdx >= 0 && currentStageIdx < STAGE_PROGRESSION.length - 1
    ? STAGE_PROGRESSION[currentStageIdx + 1]
    : null;

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Back Button */}
      <button onClick={() => router.push(`/${orgSlug}/crm/companies`)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-4 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Companies
      </button>

      {/* Company Header Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{company.name}</h1>
              {/* Lifecycle Stage Progression */}
              <div className="flex items-center gap-1">
                {STAGE_PROGRESSION.map((stage, idx) => (
                  <button
                    key={stage}
                    onClick={() => handlePromote(stage)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full transition ${
                      idx <= currentStageIdx
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title={`Set to ${stage}`}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              {company.industry && <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {company.industry}</span>}
              {company.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {company.email}</span>}
              {company.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {company.phone}</span>}
              {company.website && <a href={company.website} target="_blank" rel="noopener" className="flex items-center gap-1 text-blue-500 hover:underline"><Globe className="w-3.5 h-3.5" /> {company.website}</a>}
              {(company.city || company.country) && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {[company.city, company.country].filter(Boolean).join(', ')}</span>}
              {company.taxId && <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> TIN: {company.taxId}</span>}
            </div>

            {company.accountManager && (
              <div className="mt-2 text-xs text-gray-400">
                <Star className="w-3 h-3 inline mr-1 text-yellow-500" />
                Account Manager: <span className="font-medium text-gray-600 dark:text-gray-300">{company.accountManager.firstName} {company.accountManager.lastName}</span>
                {company.branch && <span className="ml-2">• Branch: {company.branch.name}</span>}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {nextStage && (
              <button onClick={() => handlePromote(nextStage)}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                <ChevronUp className="w-4 h-4" /> Promote to {nextStage}
              </button>
            )}
            <button onClick={() => { setEditing(true); setEditData(company); }}
              className="flex items-center gap-1 px-3 py-2 border border-gray-200 dark:border-gray-700 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              <Edit3 className="w-4 h-4" /> Edit
            </button>
          </div>
        </div>

        {/* Financial Snapshot */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
          <MiniStat label="Total Revenue" value={`${formatCurrency(company.financialStats.totalRevenue)}`} color="text-green-600" />
          <MiniStat label="Outstanding" value={`${formatCurrency(company.financialStats.outstandingBalance)}`}
            color={company.financialStats.outstandingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'} />
          <MiniStat label="Invoices" value={company.financialStats.invoiceCount.toString()} />
          <MiniStat label="Last Contacted" value={daysSince(company.lastContactedAt)}
            color={!company.lastContactedAt || (Date.now() - new Date(company.lastContactedAt).getTime()) > 30 * 86400000 ? 'text-red-500 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'} />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab company={company} />}
      {activeTab === 'activities' && (
        <ActivitiesTab
          activities={company.activities}
          showForm={showActivityForm}
          onToggleForm={() => setShowActivityForm(!showActivityForm)}
          form={activityForm}
          onFormChange={setActivityForm}
          onSubmit={handleLogActivity}
        />
      )}
      {activeTab === 'contacts' && (
        <ContactsTab
          contacts={company.contacts}
          showForm={showContactForm}
          onToggleForm={() => setShowContactForm(!showContactForm)}
          form={contactForm}
          onFormChange={setContactForm}
          onSubmit={handleAddContact}
        />
      )}
      {activeTab === 'deals' && (
        <DealsTab opportunities={company.opportunities} orgSlug={orgSlug} companyId={company.id} />
      )}
      {activeTab === 'tasks' && (
        <TasksTab
          tasks={company.crmTasks}
          showForm={showTaskForm}
          onToggleForm={() => setShowTaskForm(!showTaskForm)}
          form={taskForm}
          onFormChange={setTaskForm}
          onSubmit={handleAddTask}
        />
      )}
      {activeTab === 'financials' && (
        <FinancialsTab company={company} orgSlug={orgSlug} />
      )}

      {/* Edit Modal */}
      {editing && (
        <EditModal
          data={editData}
          onChange={setEditData}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

/* ───────────────── Sub‑components ───────────────── */

function MiniStat({ label, value, color = 'text-gray-800 dark:text-gray-200' }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 font-medium">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

function OverviewTab({ company }: { company: CompanyData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Details */}
      <div className="lg:col-span-2 space-y-6">
        {company.notes && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Notes</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{company.notes}</p>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          {company.activities.length === 0 ? (
            <p className="text-sm text-gray-400">No activities yet</p>
          ) : (
            <div className="space-y-3">
              {company.activities.slice(0, 5).map((a) => {
                const Icon = ACTIVITY_ICONS[a.type] || Circle;
                const color = ACTIVITY_COLORS[a.type] || ACTIVITY_COLORS.SYSTEM;
                return (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{a.subject}</p>
                      {a.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{a.description}</p>}
                      <p className="text-[10px] text-gray-400 mt-1">
                        {a.createdByUser.firstName} {a.createdByUser.lastName} • {timeAgo(a.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar: Key Contacts + Deals Summary */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Key Contacts</h3>
          {company.contacts.length === 0 ? (
            <p className="text-sm text-gray-400">No contacts added</p>
          ) : (
            <div className="space-y-3">
              {company.contacts.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-xs font-bold">
                    {c.firstName[0]}{c.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {c.firstName} {c.lastName}
                      {c.isPrimary && <span className="ml-1 text-xs text-yellow-500 dark:text-yellow-400">(Primary)</span>}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{c.title || c.email || ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Default Settings</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Currency</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">{company.defaultCurrency || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Payment Terms</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">{company.defaultPaymentTerms ? `${company.defaultPaymentTerms} days` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Tax ID (TIN)</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">{company.taxId || '—'}</span>
            </div>
          </div>
        </div>

        {/* Open Tasks */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Upcoming Tasks</h3>
          {company.crmTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length === 0 ? (
            <p className="text-sm text-gray-400">No open tasks</p>
          ) : (
            <div className="space-y-2">
              {company.crmTasks
                .filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
                .slice(0, 4)
                .map((t) => (
                  <div key={t.id} className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      t.priority === 'URGENT' ? 'bg-red-500' : t.priority === 'HIGH' ? 'bg-orange-400' : 'bg-blue-400'
                    }`} />
                    <div>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{t.title}</p>
                      {t.dueDate && (
                        <p className="text-[10px] text-gray-400">Due: {new Date(t.dueDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivitiesTab({
  activities,
  showForm,
  onToggleForm,
  form,
  onFormChange,
  onSubmit,
}: {
  activities: Activity[];
  showForm: boolean;
  onToggleForm: () => void;
  form: { type: string; subject: string; description: string };
  onFormChange: (f: any) => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Activity Timeline</h3>
        <button onClick={onToggleForm}
          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Log Activity
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
              <select value={form.type} onChange={(e) => onFormChange({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm">
                <option value="CALL">Call</option>
                <option value="EMAIL">Email</option>
                <option value="MEETING">Meeting</option>
                <option value="NOTE">Note</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Subject *</label>
              <input type="text" value={form.subject} onChange={(e) => onFormChange({ ...form, subject: e.target.value })}
                placeholder="e.g., Discussed furniture quote"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
            <textarea value={form.description} onChange={(e) => onFormChange({ ...form, description: e.target.value })}
              rows={3} placeholder="Any additional details..."
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={onSubmit} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Save</button>
            <button onClick={onToggleForm} className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-gray-400 pl-10">No activities logged yet. Start by logging a call or note!</p>
          ) : (
            activities.map((a) => {
              const Icon = ACTIVITY_ICONS[a.type] || Circle;
              const color = ACTIVITY_COLORS[a.type] || ACTIVITY_COLORS.SYSTEM;
              return (
                <div key={a.id} className="relative flex items-start gap-4 pl-0">
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{a.subject}</p>
                      <span className="text-[10px] text-gray-400 shrink-0 ml-2">{timeAgo(a.createdAt)}</span>
                    </div>
                    {a.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{a.description}</p>}
                    <p className="text-[10px] text-gray-400 mt-2">
                      by {a.createdByUser.firstName} {a.createdByUser.lastName}
                      {a.contact && <span> • with {a.contact.firstName} {a.contact.lastName}</span>}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function ContactsTab({
  contacts,
  showForm,
  onToggleForm,
  form,
  onFormChange,
  onSubmit,
}: {
  contacts: Contact[];
  showForm: boolean;
  onToggleForm: () => void;
  form: any;
  onFormChange: (f: any) => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Contact People</h3>
        <button onClick={onToggleForm}
          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">First Name *</label>
              <input type="text" value={form.firstName} onChange={(e) => onFormChange({ ...form, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Last Name *</label>
              <input type="text" value={form.lastName} onChange={(e) => onFormChange({ ...form, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Title / Role</label>
              <input type="text" value={form.title} onChange={(e) => onFormChange({ ...form, title: e.target.value })}
                placeholder="e.g., Procurement Manager"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Department</label>
              <input type="text" value={form.department} onChange={(e) => onFormChange({ ...form, department: e.target.value })}
                placeholder="e.g., Finance"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => onFormChange({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">WhatsApp</label>
              <input type="text" value={form.whatsapp} onChange={(e) => onFormChange({ ...form, whatsapp: e.target.value })}
                placeholder="+256700000000"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Contact Role</label>
              <select value={form.contactRole} onChange={(e) => onFormChange({ ...form, contactRole: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm">
                <option value="GENERAL">General</option>
                <option value="BILLING">Billing</option>
                <option value="SALES">Sales</option>
                <option value="TECHNICAL">Technical</option>
                <option value="EXECUTIVE">Executive</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mb-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isPrimary} onChange={(e) => onFormChange({ ...form, isPrimary: e.target.checked })}
                className="rounded border-gray-300" />
              <span className="text-gray-600 dark:text-gray-400">Primary contact</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isDecisionMaker} onChange={(e) => onFormChange({ ...form, isDecisionMaker: e.target.checked })}
                className="rounded border-gray-300" />
              <span className="text-gray-600 dark:text-gray-400">Decision maker</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={onSubmit} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Add Contact</button>
            <button onClick={onToggleForm} className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
          </div>
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No contacts added yet</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Phone</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{c.firstName} {c.lastName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{c.title || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      c.contactRole === 'BILLING' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      c.contactRole === 'EXECUTIVE' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                      c.contactRole === 'SALES' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                      c.contactRole === 'TECHNICAL' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>{c.contactRole}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{c.email || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400">{c.phone || '—'}</span>
                      {c.whatsapp && (
                        <a href={`https://wa.me/${c.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700" title="WhatsApp">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {c.isPrimary && <Star className="w-4 h-4 text-yellow-500" title="Primary" />}
                      {c.isDecisionMaker && <span className="w-4 h-4 text-[10px] font-bold text-purple-600 dark:text-purple-400" title="Decision Maker">DM</span>}
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

function DealsTab({ opportunities, orgSlug, companyId }: { opportunities: Opportunity[]; orgSlug: string; companyId: string }) {
  const router = useRouter();
  const totalValue = opportunities.reduce((sum, o) => sum + Number(o.value || 0), 0);
  const weighted = opportunities.reduce((sum, o) => sum + Number(o.value || 0) * (Number(o.probability) / 100), 0);
  const wonDeals = opportunities.filter((o) => o.stage === 'WON');
  const conversionRate = opportunities.length > 0 ? ((wonDeals.length / opportunities.length) * 100).toFixed(0) : '0';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Opportunities / Deals</h3>
        <button onClick={() => router.push(`/${orgSlug}/crm/opportunities/new?companyId=${companyId}`)}
          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Deal
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Total Pipeline</p>
          <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{formatCurrency(totalValue)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Weighted Value</p>
          <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(weighted)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Conversion Rate</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{conversionRate}%</p>
        </div>
      </div>

      {opportunities.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <TrendingUp className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No deals yet</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Deal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Stage</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Value</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Probability</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {opportunities.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => router.push(`/${orgSlug}/crm/opportunities/${o.id}`)}>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{o.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[o.stage] || 'bg-gray-100 text-gray-700'}`}>
                      {o.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{o.value ? `${o.currency} ${formatCurrency(Number(o.value))}` : '—'}</td>
                  <td className="px-4 py-3 text-right">{Number(o.probability)}%</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TasksTab({
  tasks,
  showForm,
  onToggleForm,
  form,
  onFormChange,
  onSubmit,
}: {
  tasks: CrmTask[];
  showForm: boolean;
  onToggleForm: () => void;
  form: any;
  onFormChange: (f: any) => void;
  onSubmit: () => void;
}) {
  const openTasks = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Tasks & Reminders</h3>
        <button onClick={onToggleForm}
          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Title *</label>
              <input type="text" value={form.title} onChange={(e) => onFormChange({ ...form, title: e.target.value })}
                placeholder="e.g., Follow up on furniture quote"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Due Date</label>
              <input type="date" value={form.dueDate} onChange={(e) => onFormChange({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => onFormChange({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
              <input type="text" value={form.description} onChange={(e) => onFormChange({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onSubmit} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Create Task</button>
            <button onClick={onToggleForm} className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
          </div>
        </div>
      )}

      {openTasks.length === 0 && completedTasks.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <CheckCircle2 className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No tasks yet. Add a follow-up reminder!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {openTasks.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Open ({openTasks.length})</h4>
              <div className="space-y-2">
                {openTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${PRIORITY_COLORS[t.priority] || ''}`}>{t.title}</p>
                      {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
                    </div>
                    {t.dueDate && (
                      <span className={`text-xs shrink-0 ${new Date(t.dueDate) < new Date() ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        {new Date(t.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {t.assignedUser && (
                      <span className="text-xs text-gray-400 shrink-0">{t.assignedUser.firstName}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedTasks.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 opacity-60">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Completed ({completedTasks.length})</h4>
              <div className="space-y-2">
                {completedTasks.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <p className="text-sm text-gray-400 line-through">{t.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FinancialsTab({ company, orgSlug }: { company: CompanyData; orgSlug: string }) {
  const router = useRouter();
  const stats = company.financialStats;

  return (
    <div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Financial Integration</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.totalRevenue)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Outstanding</p>
          <p className={`text-2xl font-bold ${stats.outstandingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
            {formatCurrency(stats.outstandingBalance)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Invoices</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{stats.invoiceCount}</p>
          {stats.lastInvoiceDate && <p className="text-xs text-gray-400 mt-1">Last: {new Date(stats.lastInvoiceDate).toLocaleDateString()}</p>}
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Payments</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{stats.paymentCount}</p>
          {stats.lastPaymentDate && <p className="text-xs text-gray-400 mt-1">Last: {new Date(stats.lastPaymentDate).toLocaleDateString()}</p>}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Quick Links</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={() => router.push(`/${orgSlug}/accounts-receivable/invoices?search=${company.name}`)}
            className="flex items-center gap-2 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition">
            <FileText className="w-4 h-4 text-blue-500" /> View Invoices
          </button>
          <button onClick={() => router.push(`/${orgSlug}/accounts-receivable/estimates?search=${company.name}`)}
            className="flex items-center gap-2 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition">
            <FileText className="w-4 h-4 text-purple-500" /> View Estimates
          </button>
          <button onClick={() => router.push(`/${orgSlug}/payments?search=${company.name}`)}
            className="flex items-center gap-2 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 transition">
            <DollarSign className="w-4 h-4 text-green-500" /> View Payments
          </button>
          <button onClick={() => router.push(`/${orgSlug}/accounts-receivable/statements/new?customer=${company.name}`)}
            className="flex items-center gap-2 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition">
            <Mail className="w-4 h-4 text-orange-500" /> Send Statement
          </button>
        </div>
      </div>

      {/* Default Settings that auto-fill */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mt-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Auto-Fill Settings</h4>
        <p className="text-xs text-gray-400 mb-3">These fields auto-populate when creating Invoices or Estimates for this company.</p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Default Currency</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">{company.defaultCurrency || 'Not set'}</p>
          </div>
          <div>
            <p className="text-gray-400">Payment Terms</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">{company.defaultPaymentTerms ? `Net ${company.defaultPaymentTerms}` : 'Not set'}</p>
          </div>
          <div>
            <p className="text-gray-400">Tax ID (TIN)</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">{company.taxId || 'Not set'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ data, onChange, onSave, onCancel }: {
  data: any; onChange: (d: any) => void; onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Company</h2>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company Name" value={data.name} onChange={(v) => onChange({ ...data, name: v })} />
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Lifecycle Stage</label>
              <select value={data.lifecycleStage || 'LEAD'} onChange={(e) => onChange({ ...data, lifecycleStage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm">
                <option value="LEAD">Lead</option>
                <option value="PROSPECT">Prospect</option>
                <option value="CUSTOMER">Customer</option>
                <option value="DORMANT">Dormant</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" value={data.email || ''} onChange={(v) => onChange({ ...data, email: v })} />
            <Field label="Phone" value={data.phone || ''} onChange={(v) => onChange({ ...data, phone: v })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Website" value={data.website || ''} onChange={(v) => onChange({ ...data, website: v })} />
            <Field label="Industry" value={data.industry || ''} onChange={(v) => onChange({ ...data, industry: v })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Address" value={data.address || ''} onChange={(v) => onChange({ ...data, address: v })} />
            <Field label="City" value={data.city || ''} onChange={(v) => onChange({ ...data, city: v })} />
            <Field label="Country" value={data.country || ''} onChange={(v) => onChange({ ...data, country: v })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Tax ID (TIN)" value={data.taxId || ''} onChange={(v) => onChange({ ...data, taxId: v })} />
            <Field label="Default Currency" value={data.defaultCurrency || ''} onChange={(v) => onChange({ ...data, defaultCurrency: v })} placeholder="e.g., USD" />
            <Field label="Payment Terms (days)" value={data.defaultPaymentTerms?.toString() || ''} onChange={(v) => onChange({ ...data, defaultPaymentTerms: v })} placeholder="e.g., 30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
            <textarea value={data.notes || ''} onChange={(e) => onChange({ ...data, notes: e.target.value })}
              rows={3} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Save className="w-4 h-4" /> Save Changes
          </button>
          <button onClick={onCancel} className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm" />
    </div>
  );
}
