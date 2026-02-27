'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Building2,
  Users,
  TrendingUp,
  Clock,
  Phone,
  Mail,
  MoreHorizontal,
  FileText,
  PhoneCall,
  ArrowUpRight,
  Star,
  ArrowLeft,
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  type: string;
  lifecycleStage: string;
  industry: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  lastContactedAt: string | null;
  lifetimeValue: number;
  outstandingBalance: number;
  accountManager: { id: string; firstName: string; lastName: string } | null;
  branch: { id: string; name: string; code: string } | null;
  _count: { contacts: number; opportunities: number; activities: number; crmTasks: number };
}

interface CrmStats {
  totalCompanies: number;
  leads: number;
  prospects: number;
  customers: number;
  dormant: number;
  openTasks: number;
  pipelineValue: number;
  pipelineDeals: number;
}

const LIFECYCLE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  LEAD: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-400' },
  PROSPECT: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-400' },
  CUSTOMER: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-400' },
  DORMANT: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
};

const TYPE_COLORS: Record<string, string> = {
  CLIENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  VENDOR: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  PARTNER: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  PROSPECT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function daysSince(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  if (diff < 30) return `${diff} days ago`;
  if (diff < 365) return `${Math.floor(diff / 30)}mo ago`;
  return `${Math.floor(diff / 365)}y ago`;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toLocaleString();
}

export default function CRMCompaniesPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<CrmStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [quickActionId, setQuickActionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const loadCompanies = useCallback(async () => {
    try {
      const url = new URL(`/api/${orgSlug}/crm/companies`, window.location.origin);
      if (search) url.searchParams.append('search', search);
      if (typeFilter) url.searchParams.append('type', typeFilter);
      if (stageFilter) url.searchParams.append('lifecycleStage', stageFilter);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to load companies');
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, search, typeFilter, stageFilter]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/${orgSlug}/crm/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch {}
  }, [orgSlug]);

  useEffect(() => {
    loadCompanies();
    loadStats();
  }, [loadCompanies, loadStats]);

  async function handleQuickLogCall(companyId: string, companyName: string) {
    const subject = prompt('Call subject:');
    if (!subject) return;

    try {
      await fetch(`/api/${orgSlug}/crm/companies/${companyId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'CALL', subject, description: `Quick call log for ${companyName}` }),
      });
      loadCompanies();
    } catch {}
    setQuickActionId(null);
  }

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.push(`/${orgSlug}/dashboard`)}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CRM Companies</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your business relationships — {stats?.totalCompanies || 0} companies
          </p>
        </div>
        <button
          onClick={() => router.push(`/${orgSlug}/crm/companies/new`)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Company
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <StatsCard label="Leads" value={stats.leads} color="text-yellow-600 dark:text-yellow-400" bgColor="bg-yellow-50 dark:bg-yellow-900/20"
            onClick={() => setStageFilter(stageFilter === 'LEAD' ? '' : 'LEAD')} active={stageFilter === 'LEAD'} />
          <StatsCard label="Prospects" value={stats.prospects} color="text-blue-600 dark:text-blue-400" bgColor="bg-blue-50 dark:bg-blue-900/20"
            onClick={() => setStageFilter(stageFilter === 'PROSPECT' ? '' : 'PROSPECT')} active={stageFilter === 'PROSPECT'} />
          <StatsCard label="Customers" value={stats.customers} color="text-green-600 dark:text-green-400" bgColor="bg-green-50 dark:bg-green-900/20"
            onClick={() => setStageFilter(stageFilter === 'CUSTOMER' ? '' : 'CUSTOMER')} active={stageFilter === 'CUSTOMER'} />
          <StatsCard label="Dormant" value={stats.dormant} color="text-gray-600 dark:text-gray-300" bgColor="bg-gray-50 dark:bg-gray-800"
            onClick={() => setStageFilter(stageFilter === 'DORMANT' ? '' : 'DORMANT')} active={stageFilter === 'DORMANT'} />
          <StatsCard label="Open Tasks" value={stats.openTasks} color="text-orange-600 dark:text-orange-400" bgColor="bg-orange-50 dark:bg-orange-900/20" />
          <StatsCard label="Pipeline" value={formatCurrency(stats.pipelineValue)} subValue={`${stats.pipelineDeals} deals`}
            color="text-purple-600 dark:text-purple-400" bgColor="bg-purple-50 dark:bg-purple-900/20" />
        </div>
      )}

      {/* Filters Row */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search companies, emails, TIN..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 placeholder-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm">
          <option value="">All Types</option>
          <option value="CLIENT">Client</option>
          <option value="VENDOR">Vendor</option>
          <option value="PARTNER">Partner</option>
          <option value="PROSPECT">Prospect</option>
        </select>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm">
          <option value="">All Stages</option>
          <option value="LEAD">Lead</option>
          <option value="PROSPECT">Prospect</option>
          <option value="CUSTOMER">Customer</option>
          <option value="DORMANT">Dormant</option>
        </select>
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button onClick={() => setViewMode('grid')}
            className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>
            Grid
          </button>
          <button onClick={() => setViewMode('table')}
            className={`px-3 py-2 text-sm ${viewMode === 'table' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>
            Table
          </button>
        </div>
      </div>

      {/* Company List */}
      {companies.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No companies found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add your first company to start building your CRM</p>
          <button onClick={() => router.push(`/${orgSlug}/crm/companies/new`)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4 inline mr-1" /> Add Company
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} orgSlug={orgSlug}
              onNavigate={() => router.push(`/${orgSlug}/crm/companies/${company.id}`)}
              onQuickAction={() => setQuickActionId(quickActionId === company.id ? null : company.id)}
              showQuickActions={quickActionId === company.id}
              onLogCall={() => handleQuickLogCall(company.id, company.name)}
              onCreateEstimate={() => router.push(`/${orgSlug}/accounts-receivable/estimates/new?company=${company.name}`)} />
          ))}
        </div>
      ) : (
        <CompanyTable companies={companies} orgSlug={orgSlug}
          onNavigate={(id) => router.push(`/${orgSlug}/crm/companies/${id}`)} />
      )}
    </div>
  );
}

function StatsCard({ label, value, subValue, color, bgColor, onClick, active }: {
  label: string; value: number | string; subValue?: string; color: string; bgColor: string;
  onClick?: () => void; active?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={`${bgColor} rounded-xl p-4 text-left transition ${active ? 'ring-2 ring-blue-500' : ''} ${onClick ? 'hover:shadow-md cursor-pointer' : 'cursor-default'}`}>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
    </button>
  );
}

function CompanyCard({ company, orgSlug, onNavigate, onQuickAction, showQuickActions, onLogCall, onCreateEstimate }: {
  company: Company; orgSlug: string; onNavigate: () => void; onQuickAction: () => void;
  showQuickActions: boolean; onLogCall: () => void; onCreateEstimate: () => void;
}) {
  const stage = LIFECYCLE_COLORS[company.lifecycleStage] || LIFECYCLE_COLORS.LEAD;
  const typeColor = TYPE_COLORS[company.type] || TYPE_COLORS.PROSPECT;
  const lastContact = daysSince(company.lastContactedAt);
  const isStale = company.lastContactedAt
    ? (Date.now() - new Date(company.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24) > 30
    : true;

  return (
    <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-lg transition group">
      {/* Quick Actions Button */}
      <div className="absolute top-3 right-3">
        <button onClick={(e) => { e.stopPropagation(); onQuickAction(); }}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition">
          <MoreHorizontal className="w-4 h-4 text-gray-400" />
        </button>
        {showQuickActions && (
          <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10 py-1 min-w-[180px]">
            <button onClick={(e) => { e.stopPropagation(); onLogCall(); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-green-500" /> Log Call
            </button>
            <button onClick={(e) => { e.stopPropagation(); onCreateEstimate(); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" /> Create Estimate
            </button>
            <button onClick={(e) => { e.stopPropagation(); onNavigate(); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-gray-500" /> View Profile
            </button>
          </div>
        )}
      </div>

      <div className="cursor-pointer" onClick={onNavigate}>
        <div className="mb-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate pr-8">{company.name}</h3>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stage.bg} ${stage.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />{company.lifecycleStage}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor}`}>{company.type}</span>
          </div>
        </div>

        <div className="space-y-1.5 text-sm text-gray-500 dark:text-gray-400 mb-3">
          {company.email && <div className="flex items-center gap-2 truncate"><Mail className="w-3.5 h-3.5 shrink-0" /> {company.email}</div>}
          {company.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 shrink-0" /> {company.phone}</div>}
          {company.industry && <div className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5 shrink-0" /> {company.industry}</div>}
        </div>

        <div className="grid grid-cols-2 gap-2 py-3 border-t border-gray-100 dark:border-gray-700">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">LTV</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(Number(company.lifetimeValue || 0))}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Balance</p>
            <p className={`text-sm font-semibold ${Number(company.outstandingBalance) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
              {formatCurrency(Number(company.outstandingBalance || 0))}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className={`w-3.5 h-3.5 ${isStale ? 'text-red-400' : 'text-gray-400'}`} />
            <span className={isStale ? 'text-red-500 dark:text-red-400 font-medium' : ''}>{lastContact}</span>
          </div>
          <div className="flex gap-3">
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {company._count.contacts}</span>
            <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {company._count.opportunities}</span>
          </div>
        </div>

        {company.accountManager && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400">
              <Star className="w-3 h-3 inline mr-1" />
              {company.accountManager.firstName} {company.accountManager.lastName}
              {company.branch && <span className="ml-2 text-gray-300 dark:text-gray-500">• {company.branch.name}</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyTable({ companies, orgSlug, onNavigate }: {
  companies: Company[]; orgSlug: string; onNavigate: (id: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900">
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Company</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Stage</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Account Manager</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">LTV</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Balance</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Last Contact</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Contacts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {companies.map((c) => {
              const stage = LIFECYCLE_COLORS[c.lifecycleStage] || LIFECYCLE_COLORS.LEAD;
              const isStale = c.lastContactedAt
                ? (Date.now() - new Date(c.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24) > 30
                : true;
              return (
                <tr key={c.id} onClick={() => onNavigate(c.id)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{c.name}</p>
                    {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stage.bg} ${stage.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />{c.lifecycleStage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.type}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {c.accountManager ? `${c.accountManager.firstName} ${c.accountManager.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-200">
                    {formatCurrency(Number(c.lifetimeValue || 0))}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${Number(c.outstandingBalance) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {formatCurrency(Number(c.outstandingBalance || 0))}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${isStale ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>{daysSince(c.lastContactedAt)}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{c._count.contacts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
