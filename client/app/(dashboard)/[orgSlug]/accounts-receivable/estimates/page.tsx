'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Search, Eye, Trash2, Copy, CheckCircle, XCircle,
  Send, Clock, AlertTriangle, FileText, TrendingUp, RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useOrganization } from '@/hooks/useOrganization';

interface EstimateCustomer {
  id: string; firstName: string; lastName: string;
  companyName: string | null; email: string | null;
}
interface Estimate {
  id: string; estimateNumber: string; estimateDate: string;
  expirationDate: string; status: string; subtotal: number;
  taxAmount: number; total: number; currency: string;
  versionNumber: number; customer: EstimateCustomer;
  items: { id: string; total: number; isOptional: boolean }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT:    { label: 'Draft',    color: 'bg-gray-100 text-gray-700',     icon: FileText },
  SENT:     { label: 'Sent',     color: 'bg-blue-100 text-blue-700',     icon: Send },
  ACCEPTED: { label: 'Accepted', color: 'bg-green-100 text-green-700',   icon: CheckCircle },
  DECLINED: { label: 'Declined', color: 'bg-red-100 text-red-700',       icon: XCircle },
  EXPIRED:  { label: 'Expired',  color: 'bg-orange-100 text-orange-700', icon: Clock },
  INVOICED: { label: 'Invoiced', color: 'bg-purple-100 text-purple-700', icon: TrendingUp },
};
const TABS = ['ALL','DRAFT','SENT','ACCEPTED','DECLINED','EXPIRED','INVOICED'];
const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
const custName  = (c: EstimateCustomer) => c.companyName || `${c.firstName} ${c.lastName}`.trim();

export default function EstimatesPage() {
  const params  = useParams();
  const router  = useRouter();
  const orgSlug = params.orgSlug as string;
  const { currency } = useOrganization();

  const [estimates,  setEstimates]  = useState<Estimate[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [activeTab,  setActiveTab]  = useState('ALL');
  const [busy,       setBusy]       = useState<string | null>(null);

  const fetchEstimates = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (activeTab !== 'ALL') q.set('status', activeTab);
      if (search) q.set('search', search);
      const res  = await fetch(`/api/orgs/${orgSlug}/estimates?${q}`);
      const data = await res.json();
      setEstimates(data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [orgSlug, activeTab, search]);

  useEffect(() => { fetchEstimates(); }, [fetchEstimates]);

  const statusChange = async (id: string, status: string) => {
    setBusy(id + status);
    await fetch(`/api/orgs/${orgSlug}/estimates/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setBusy(null); fetchEstimates();
  };

  const doDelete = async (id: string, num: string) => {
    if (!confirm(`Delete estimate ${num}?`)) return;
    setBusy(id + 'del');
    const res  = await fetch(`/api/orgs/${orgSlug}/estimates/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) alert(data.error || 'Delete failed');
    setBusy(null); fetchEstimates();
  };

  const doClone = async (id: string) => {
    setBusy(id + 'clone');
    const res  = await fetch(`/api/orgs/${orgSlug}/estimates/${id}/clone`, { method: 'POST' });
    const data = await res.json();
    setBusy(null);
    if (data.success) router.push(`/${orgSlug}/accounts-receivable/estimates/${data.data.id}`);
    else alert(data.error || 'Clone failed');
  };

  const doConvert = async (id: string) => {
    if (!confirm('Convert this estimate to an invoice?')) return;
    setBusy(id + 'conv');
    const res  = await fetch(`/api/orgs/${orgSlug}/estimates/${id}/convert`, { method: 'POST' });
    const data = await res.json();
    setBusy(null);
    if (data.success) router.push(`/${orgSlug}/accounts-receivable/invoices/${data.invoiceId}`);
    else alert(data.error || 'Conversion failed');
  };

  const pipelineTotal = estimates
    .filter(e => ['DRAFT','SENT','ACCEPTED'].includes(e.status))
    .reduce((s, e) => s + Number(e.total), 0);
  const expiringSoon = estimates.filter(e => {
    const d = daysUntil(e.expirationDate);
    return ['DRAFT','SENT'].includes(e.status) && d >= 0 && d <= 3;
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Estimates / Quotations</h1>
          <p className="text-sm text-gray-500 mt-1">Non-posting documents — no GL impact until converted to an invoice.</p>
        </div>
        <Link href={`/${orgSlug}/accounts-receivable/estimates/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition">
          <Plus className="w-4 h-4" /> New Estimate
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pipeline Value',   value: formatCurrency(pipelineTotal, currency),                    color: 'text-gray-900 dark:text-white' },
          { label: 'Open',             value: estimates.filter(e => ['DRAFT','SENT'].includes(e.status)).length, color: 'text-blue-600' },
          { label: 'Accepted',         value: estimates.filter(e => e.status === 'ACCEPTED').length,       color: 'text-green-600' },
          { label: 'Expiring (3 days)',value: expiringSoon.length,                                          color: expiringSoon.length > 0 ? 'text-amber-600' : 'text-gray-900 dark:text-white' },
        ].map(s => (
          <div key={s.label} className={`bg-white dark:bg-slate-800 rounded-xl border p-4 ${expiringSoon.length > 0 && s.label.startsWith('Expiring') ? 'border-amber-200' : 'border-gray-200 dark:border-slate-700'}`}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Expiry alerts */}
      {expiringSoon.filter(e => daysUntil(e.expirationDate) <= 1).map(e => (
        <div key={e.id} className="mb-3 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span><strong>{e.estimateNumber}</strong> for {custName(e.customer)} expires in <strong>{daysUntil(e.expirationDate)} day(s)</strong>.</span>
          <Link href={`/${orgSlug}/accounts-receivable/estimates/${e.id}`} className="ml-auto font-semibold hover:underline">View →</Link>
        </div>
      ))}

      {/* Table card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-100 dark:border-slate-700 px-4">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition -mb-px ${
                activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'
              }`}>
              {tab === 'ALL' ? 'All' : STATUS_CONFIG[tab]?.label || tab}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="flex items-center gap-3 p-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchEstimates()}
              placeholder="Search by number or customer…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={fetchEstimates} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
            Loading…
          </div>
        ) : estimates.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No estimates found</p>
            <Link href={`/${orgSlug}/accounts-receivable/estimates/new`}
              className="inline-flex items-center gap-1 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
              <Plus className="w-4 h-4" /> New Estimate
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  {['Estimate #','Customer','Date','Expires','Status','Total','Actions'].map(h => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ${h === 'Total' || h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {estimates.map(est => {
                  const cfg  = STATUS_CONFIG[est.status] || STATUS_CONFIG.DRAFT;
                  const Icon = cfg.icon;
                  const days = daysUntil(est.expirationDate);
                  return (
                    <tr key={est.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/${orgSlug}/accounts-receivable/estimates/${est.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                          {est.estimateNumber}
                        </Link>
                        {est.versionNumber > 1 && <span className="ml-1 text-xs text-gray-400">v{est.versionNumber}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{custName(est.customer)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{new Date(est.estimateDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={days < 0 && !['INVOICED','ACCEPTED','DECLINED'].includes(est.status) ? 'text-red-500' : 'text-gray-600 dark:text-slate-400'}>
                          {new Date(est.expirationDate).toLocaleDateString()}
                        </span>
                        {!['INVOICED','ACCEPTED','DECLINED'].includes(est.status) && (
                          <span className={`ml-1 text-xs ${days <= 3 && days >= 0 ? 'text-amber-600 font-semibold' : days < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                            {days < 0 ? '(Expired)' : `(${days}d)`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <Icon className="w-3 h-3" />{cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(Number(est.total), est.currency || currency)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/${orgSlug}/accounts-receivable/estimates/${est.id}`}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition" title="View">
                            <Eye className="w-4 h-4" />
                          </Link>
                          {est.status === 'DRAFT' && (
                            <button onClick={() => statusChange(est.id, 'SENT')} disabled={!!busy}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition" title="Mark as Sent">
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          {est.status === 'SENT' && (<>
                            <button onClick={() => statusChange(est.id, 'ACCEPTED')} disabled={!!busy}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="Mark Accepted">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => statusChange(est.id, 'DECLINED')} disabled={!!busy}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Mark Declined">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>)}
                          {est.status === 'ACCEPTED' && (
                            <button onClick={() => doConvert(est.id)} disabled={!!busy}
                              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition" title="Convert to Invoice">
                              <TrendingUp className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => doClone(est.id)} disabled={!!busy}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Clone / New Version">
                            <Copy className="w-4 h-4" />
                          </button>
                          {est.status !== 'INVOICED' && (
                            <button onClick={() => doDelete(est.id, est.estimateNumber)} disabled={!!busy}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pipeline note */}
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300">
        <strong>Sales Pipeline:</strong>{' '}
        {estimates.filter(e => ['DRAFT','SENT','ACCEPTED'].includes(e.status)).length} open estimate(s) worth{' '}
        <strong>{formatCurrency(pipelineTotal, currency)}</strong> may close this period.
        <span className="ml-2 opacity-75">📊 Estimates do not reduce stock or affect the GL until converted to an invoice.</span>
      </div>
    </div>
  );
}
