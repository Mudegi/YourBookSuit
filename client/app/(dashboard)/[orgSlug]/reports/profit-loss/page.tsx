'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Printer, TrendingUp, TrendingDown,
  ChevronDown, ChevronRight, Filter, BarChart3, DollarSign, Percent,
  ArrowUpRight, ArrowDownRight, Minus, Building, FileSpreadsheet,
  RefreshCw, Eye, Layers, Info
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';

/* ─────────── Types ─────────── */

interface PLAccount {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  accountSubType?: string;
  balance: string;
  debit: string;
  credit: string;
  transactionCount: number;
}

interface ReportSection {
  title: string;
  accounts: PLAccount[];
  subtotal: string;
  children?: ReportSection[];
}

interface ComparisonSection {
  current: string;
  prior: string;
  variance: string;
  variancePercent: string;
}

interface PLReport {
  organizationId: string;
  startDate: string;
  endDate: string;
  basis: string;
  revenue: ReportSection;
  costOfGoodsSold: ReportSection;
  grossProfit: string;
  operatingExpenses: ReportSection;
  operatingIncome: string;
  otherIncome: ReportSection;
  otherExpenses: ReportSection;
  netIncome: string;
  comparison?: {
    startDate: string;
    endDate: string;
    revenue: ComparisonSection;
    costOfGoodsSold: ComparisonSection;
    grossProfit: ComparisonSection;
    operatingExpenses: ComparisonSection;
    operatingIncome: ComparisonSection;
    otherIncome: ComparisonSection;
    otherExpenses: ComparisonSection;
    netIncome: ComparisonSection;
  };
}

interface Branch {
  id: string;
  code: string;
  name: string;
}

/* ─────────── Date Presets ─────────── */

function getDatePresets() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const lastDay = (yr: number, mo: number) => new Date(yr, mo + 1, 0);

  return [
    { label: 'This Month', start: fmt(new Date(y, m, 1)), end: fmt(now) },
    { label: 'Last Month', start: fmt(new Date(y, m - 1, 1)), end: fmt(lastDay(y, m - 1)) },
    { label: 'This Quarter', start: fmt(new Date(y, Math.floor(m / 3) * 3, 1)), end: fmt(now) },
    { label: 'Last Quarter', start: fmt(new Date(y, Math.floor(m / 3) * 3 - 3, 1)), end: fmt(lastDay(y, Math.floor(m / 3) * 3 - 1)) },
    { label: 'This Year', start: fmt(new Date(y, 0, 1)), end: fmt(now) },
    { label: 'Last Year', start: fmt(new Date(y - 1, 0, 1)), end: fmt(new Date(y - 1, 11, 31)) },
    { label: 'Last 12 Months', start: fmt(new Date(y - 1, m, now.getDate())), end: fmt(now) },
  ];
}

/* ─────────── Component ─────────── */

export default function ProfitLossPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const { organization, currency: orgCurrency } = useOrganization();
  const baseCurrency = orgCurrency || 'UGX';

  // ── State ──
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [basis, setBasis] = useState<'ACCRUAL' | 'CASH'>('ACCRUAL');
  const [includeComparison, setIncludeComparison] = useState(false);
  const [branchId, setBranchId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activePreset, setActivePreset] = useState('This Month');

  const [report, setReport] = useState<PLReport | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Collapsible sections
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Fetch Branches ──
  useEffect(() => {
    fetch(`/api/orgs/${orgSlug}/branches`)
      .then(r => r.json())
      .then(d => { if (d.branches) setBranches(d.branches); })
      .catch(() => {});
  }, [orgSlug]);

  // ── Fetch Report ──
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const qs = new URLSearchParams({
        startDate,
        endDate,
        basis,
        includeComparison: String(includeComparison),
      });
      if (branchId) qs.set('branchId', branchId);

      const res = await fetch(`/api/orgs/${orgSlug}/reports/profit-loss?${qs}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load');
      setReport(data.report);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, startDate, endDate, basis, includeComparison, branchId]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // ── Date Preset ──
  const applyPreset = (label: string, start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setActivePreset(label);
  };

  // ── Computed Metrics ──
  const metrics = useMemo(() => {
    if (!report) return null;
    const rev = parseFloat(report.revenue.subtotal) || 0;
    const gp = parseFloat(report.grossProfit) || 0;
    const opInc = parseFloat(report.operatingIncome) || 0;
    const ni = parseFloat(report.netIncome) || 0;
    const cogs = parseFloat(report.costOfGoodsSold.subtotal) || 0;
    const opex = parseFloat(report.operatingExpenses.subtotal) || 0;

    return {
      grossMargin: rev > 0 ? (gp / rev) * 100 : 0,
      operatingMargin: rev > 0 ? (opInc / rev) * 100 : 0,
      netMargin: rev > 0 ? (ni / rev) * 100 : 0,
      expenseRatio: rev > 0 ? (opex / rev) * 100 : 0,
      cogsRatio: rev > 0 ? (cogs / rev) * 100 : 0,
      revenue: rev,
      grossProfit: gp,
      operatingIncome: opInc,
      netIncome: ni,
    };
  }, [report]);

  // ── Export to CSV ──
  const handleExport = (format: 'csv' | 'print') => {
    if (format === 'print') { window.print(); return; }
    if (!report) return;
    const rows: string[][] = [
      ['Profit & Loss Statement'],
      [`Period: ${startDate} to ${endDate}`],
      [`Basis: ${basis}`],
      [''],
      ['Account Code', 'Account Name', 'Amount'],
    ];
    const addSection = (section: ReportSection) => {
      rows.push(['', section.title.toUpperCase(), '']);
      section.accounts.forEach(a => rows.push([a.accountCode, a.accountName, a.balance]));
      rows.push(['', `Total ${section.title}`, section.subtotal]);
      rows.push(['']);
    };
    addSection(report.revenue);
    addSection(report.costOfGoodsSold);
    rows.push(['', 'GROSS PROFIT', report.grossProfit], ['']);
    addSection(report.operatingExpenses);
    rows.push(['', 'OPERATING INCOME', report.operatingIncome], ['']);
    addSection(report.otherIncome);
    addSection(report.otherExpenses);
    rows.push(['', 'NET INCOME', report.netIncome]);

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-loss-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Drill-Down ──
  const drillDown = (accountId: string) => {
    router.push(`/${orgSlug}/reports/general-ledger?accountId=${accountId}&startDate=${startDate}&endDate=${endDate}`);
  };

  // ── Variance Badge ──
  const VarianceBadge = ({ comp, inverted = false }: { comp: ComparisonSection; inverted?: boolean }) => {
    const pct = parseFloat(comp.variancePercent);
    const variance = parseFloat(comp.variance);
    if (variance === 0) return <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1"><Minus className="h-3 w-3" /> 0%</span>;
    const isPositive = inverted ? variance < 0 : variance > 0;
    return (
      <span className={`text-xs font-medium flex items-center gap-0.5 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {Math.abs(pct).toFixed(1)}%
      </span>
    );
  };

  // ── Render Hierarchical Section ──
  const renderSection = (
    section: ReportSection,
    sectionKey: string,
    compData?: ComparisonSection,
    options?: { colorClass?: string; invertVariance?: boolean }
  ) => {
    const isCollapsed = collapsed[sectionKey];
    const hasAccounts = section.accounts.length > 0;
    const hasChildren = section.children && section.children.length > 0;

    return (
      <div key={sectionKey} className="mb-1">
        {/* Section Header */}
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition rounded-lg group"
        >
          {isCollapsed
            ? <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            : <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          }
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide flex-1 text-left">
            {section.title}
          </span>
          {includeComparison && compData && (
            <div className="flex items-center gap-4 mr-2">
              <span className="text-xs text-gray-400 dark:text-gray-500 w-28 text-right font-mono">
                {formatCurrency(parseFloat(compData.prior), baseCurrency)}
              </span>
              <VarianceBadge comp={compData} inverted={options?.invertVariance} />
            </div>
          )}
          <span className={`text-sm font-bold font-mono w-36 text-right ${options?.colorClass || 'text-gray-900 dark:text-white'}`}>
            {formatCurrency(parseFloat(section.subtotal), baseCurrency)}
          </span>
        </button>

        {/* Section Body */}
        {!isCollapsed && hasAccounts && (
          <div className="ml-6 border-l-2 border-gray-100 dark:border-gray-700">
            {hasChildren ? (
              <>
                {section.children!.map((child, ci) => (
                  <div key={ci} className="mb-1">
                    <div className="px-4 py-1.5 flex items-center">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex-1">
                        {child.title}
                      </span>
                      <span className="text-xs font-semibold font-mono text-gray-600 dark:text-gray-400 w-36 text-right">
                        {formatCurrency(parseFloat(child.subtotal), baseCurrency)}
                      </span>
                    </div>
                    {child.accounts.map(acct => (
                      <button key={acct.accountId} onClick={() => drillDown(acct.accountId)}
                        className="w-full flex items-center px-4 py-1.5 pl-8 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition group/row">
                        <span className="font-mono text-xs text-gray-400 dark:text-gray-500 w-16 flex-shrink-0">{acct.accountCode}</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 text-left flex items-center gap-1">
                          {acct.accountName}
                          <Eye className="h-3 w-3 text-blue-400 opacity-0 group-hover/row:opacity-100 transition" />
                        </span>
                        {includeComparison && <span className="w-28" />}
                        <span className="text-sm font-mono text-gray-800 dark:text-gray-200 w-36 text-right">
                          {formatCurrency(parseFloat(acct.balance), baseCurrency)}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
                {/* Ungrouped accounts not in any child */}
                {(() => {
                  const childIds = new Set(section.children!.flatMap(c => c.accounts.map(a => a.accountId)));
                  const ungrouped = section.accounts.filter(a => !childIds.has(a.accountId));
                  return ungrouped.map(acct => (
                    <button key={acct.accountId} onClick={() => drillDown(acct.accountId)}
                      className="w-full flex items-center px-4 py-1.5 pl-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition group/row">
                      <span className="font-mono text-xs text-gray-400 dark:text-gray-500 w-16 flex-shrink-0">{acct.accountCode}</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 text-left flex items-center gap-1">
                        {acct.accountName}
                        <Eye className="h-3 w-3 text-blue-400 opacity-0 group-hover/row:opacity-100 transition" />
                      </span>
                      {includeComparison && <span className="w-28" />}
                      <span className="text-sm font-mono text-gray-800 dark:text-gray-200 w-36 text-right">
                        {formatCurrency(parseFloat(acct.balance), baseCurrency)}
                      </span>
                    </button>
                  ));
                })()}
              </>
            ) : (
              section.accounts.map(acct => (
                <button key={acct.accountId} onClick={() => drillDown(acct.accountId)}
                  className="w-full flex items-center px-4 py-1.5 pl-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition group/row">
                  <span className="font-mono text-xs text-gray-400 dark:text-gray-500 w-16 flex-shrink-0">{acct.accountCode}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 text-left flex items-center gap-1">
                    {acct.accountName}
                    <Eye className="h-3 w-3 text-blue-400 opacity-0 group-hover/row:opacity-100 transition" />
                  </span>
                  {includeComparison && <span className="w-28" />}
                  <span className="text-sm font-mono text-gray-800 dark:text-gray-200 w-36 text-right">
                    {formatCurrency(parseFloat(acct.balance), baseCurrency)}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {!isCollapsed && !hasAccounts && (
          <div className="ml-6 px-4 py-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">No transactions in this period</p>
          </div>
        )}
      </div>
    );
  };

  // ── Subtotal Row ──
  const SubtotalRow = ({
    label, amount, comp, highlight, invertVariance,
  }: {
    label: string; amount: string; comp?: ComparisonSection;
    highlight?: 'blue' | 'green' | 'amber'; invertVariance?: boolean;
  }) => {
    const val = parseFloat(amount);
    const bgMap = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    };
    const textMap = {
      blue: 'text-blue-900 dark:text-blue-300',
      green: val >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400',
      amber: 'text-amber-900 dark:text-amber-300',
    };

    return (
      <div className={`flex items-center px-4 py-3 rounded-lg border ${highlight ? bgMap[highlight] : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'} my-2`}>
        <span className={`text-sm font-bold flex-1 ${highlight ? textMap[highlight] : 'text-gray-900 dark:text-white'}`}>
          {label}
        </span>
        {includeComparison && comp && (
          <div className="flex items-center gap-4 mr-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 w-28 text-right font-mono">
              {formatCurrency(parseFloat(comp.prior), baseCurrency)}
            </span>
            <VarianceBadge comp={comp} inverted={invertVariance} />
          </div>
        )}
        <span className={`text-sm font-bold font-mono w-36 text-right ${
          highlight ? textMap[highlight] : (val >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400')
        }`}>
          {formatCurrency(val, baseCurrency)}
        </span>
      </div>
    );
  };

  /* ───────── Render ───────── */

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Generating Profit & Loss Statement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto print:max-w-none">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/${orgSlug}/reports`)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              Profit & Loss Statement
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Income Statement — Business Performance Overview</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchReport()}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            title="Refresh">
            <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => handleExport('print')}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 transition">
            <Printer className="h-4 w-4" /> Print
          </button>
          <button onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition">
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Date Presets ── */}
      <div className="print:hidden">
        <div className="flex flex-wrap gap-2">
          {getDatePresets().map(p => (
            <button key={p.label} onClick={() => applyPreset(p.label, p.start, p.end)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                activePreset === p.label
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}>
              {p.label}
            </button>
          ))}
          <button onClick={() => { setActivePreset('Custom'); setShowFilters(true); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              activePreset === 'Custom'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}>
            Custom Range
          </button>
        </div>
      </div>

      {/* ── Filters Panel ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 print:hidden">
        <button onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition rounded-xl">
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Filter className="h-4 w-4" /> Filters & Options
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {startDate} — {endDate} · {basis} · {branchId ? 'Branch filtered' : 'All branches'}
              {includeComparison ? ' · Comparison ON' : ''}
            </span>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition ${showFilters ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {showFilters && (
          <div className="px-5 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
              <input type="date" value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setActivePreset('Custom'); }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End Date</label>
              <input type="date" value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setActivePreset('Custom'); }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Accounting Method</label>
              <select value={basis} onChange={(e) => setBasis(e.target.value as 'ACCRUAL' | 'CASH')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500">
                <option value="ACCRUAL">Accrual Basis</option>
                <option value="CASH">Cash Basis</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Branch</label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500">
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {/* Comparison Toggle */}
            <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={includeComparison}
                  onChange={(e) => setIncludeComparison(e.target.checked)}
                  className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-sm text-gray-700 dark:text-gray-300">Compare with Previous Period</span>
              {includeComparison && report?.comparison && (
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                  vs. {new Date(report.comparison.startDate).toLocaleDateString()} – {new Date(report.comparison.endDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-5 py-4 flex items-center gap-3">
          <Info className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          <button onClick={fetchReport} className="ml-auto text-xs text-red-600 hover:underline">Retry</button>
        </div>
      )}

      {report && (
        <>
          {/* ── KPI Summary Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
            {/* Revenue */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                  <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</span>
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                {formatCurrency(metrics?.revenue || 0, baseCurrency)}
              </div>
              {includeComparison && report.comparison && (
                <div className="mt-1"><VarianceBadge comp={report.comparison.revenue} /></div>
              )}
            </div>

            {/* Gross Profit */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/40">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Gross Profit</span>
              </div>
              <div className={`text-xl font-bold font-mono ${(metrics?.grossProfit || 0) >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(metrics?.grossProfit || 0, baseCurrency)}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Margin: {(metrics?.grossMargin || 0).toFixed(1)}%</div>
            </div>

            {/* Operating Income */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                  <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Operating Income</span>
              </div>
              <div className={`text-xl font-bold font-mono ${(metrics?.operatingIncome || 0) >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(metrics?.operatingIncome || 0, baseCurrency)}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Margin: {(metrics?.operatingMargin || 0).toFixed(1)}%</div>
            </div>

            {/* Net Income */}
            <div className={`rounded-xl border p-4 ${
              (metrics?.netIncome || 0) >= 0
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${(metrics?.netIncome || 0) >= 0 ? 'bg-green-200 dark:bg-green-900/60' : 'bg-red-200 dark:bg-red-900/60'}`}>
                  {(metrics?.netIncome || 0) >= 0
                    ? <TrendingUp className="h-4 w-4 text-green-700 dark:text-green-400" />
                    : <TrendingDown className="h-4 w-4 text-red-700 dark:text-red-400" />}
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Net Income</span>
              </div>
              <div className={`text-xl font-bold font-mono ${(metrics?.netIncome || 0) >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {formatCurrency(metrics?.netIncome || 0, baseCurrency)}
              </div>
              {includeComparison && report.comparison && (
                <div className="mt-1"><VarianceBadge comp={report.comparison.netIncome} /></div>
              )}
            </div>
          </div>

          {/* ── Report Body ── */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            {/* Report Title */}
            <div className="text-center px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {organization?.name || 'Organization'} — Profit & Loss Statement
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                For the period {new Date(report.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                {' '}to {new Date(report.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {basis === 'ACCRUAL' ? 'Accrual Basis' : 'Cash Basis'}
                </span>
                {branchId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    <Building className="h-3 w-3" /> {branches.find(b => b.id === branchId)?.name}
                  </span>
                )}
              </div>

              {includeComparison && report.comparison && (
                <div className="flex items-center justify-end gap-4 mt-4 px-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 w-28 text-right">Previous Period</span>
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 w-12 text-center">Chg</span>
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 w-36 text-right">Current Period</span>
                </div>
              )}
            </div>

            {/* Sections */}
            <div className="px-4 py-4 space-y-1">
              {renderSection(report.revenue, 'revenue', report.comparison?.revenue)}
              {renderSection(report.costOfGoodsSold, 'cogs', report.comparison?.costOfGoodsSold, { invertVariance: true })}
              <SubtotalRow label="GROSS PROFIT" amount={report.grossProfit} comp={report.comparison?.grossProfit} highlight="blue" />

              {renderSection(report.operatingExpenses, 'opex', report.comparison?.operatingExpenses, { invertVariance: true })}
              <SubtotalRow label="OPERATING INCOME" amount={report.operatingIncome} comp={report.comparison?.operatingIncome} highlight="amber" />

              {renderSection(report.otherIncome, 'other-income', report.comparison?.otherIncome)}
              {renderSection(report.otherExpenses, 'other-expenses', report.comparison?.otherExpenses, { invertVariance: true })}

              {/* ═══ NET INCOME ═══ */}
              <div className={`flex items-center px-5 py-4 rounded-xl border-2 mt-4 ${
                parseFloat(report.netIncome) >= 0
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-300 dark:border-green-700'
                  : 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 border-red-300 dark:border-red-700'
              }`}>
                <span className="text-base font-extrabold flex-1 text-gray-900 dark:text-white">
                  NET INCOME (BOTTOM LINE)
                </span>
                {includeComparison && report.comparison && (
                  <div className="flex items-center gap-4 mr-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400 w-28 text-right font-mono font-bold">
                      {formatCurrency(parseFloat(report.comparison.netIncome.prior), baseCurrency)}
                    </span>
                    <VarianceBadge comp={report.comparison.netIncome} />
                  </div>
                )}
                <span className={`text-lg font-extrabold font-mono w-40 text-right ${
                  parseFloat(report.netIncome) >= 0
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-700 dark:text-red-400'
                }`}>
                  {formatCurrency(parseFloat(report.netIncome), baseCurrency)}
                </span>
              </div>

              {/* Formula */}
              <div className="mt-3 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center font-mono">
                  Revenue ({formatCurrency(parseFloat(report.revenue.subtotal), baseCurrency)})
                  {' − '}COGS ({formatCurrency(parseFloat(report.costOfGoodsSold.subtotal), baseCurrency)})
                  {' = '}GP ({formatCurrency(parseFloat(report.grossProfit), baseCurrency)})
                  {' − '}OPEX ({formatCurrency(parseFloat(report.operatingExpenses.subtotal), baseCurrency)})
                  {' + '}Other ({formatCurrency(parseFloat(report.otherIncome.subtotal), baseCurrency)})
                  {' − '}Other Exp ({formatCurrency(parseFloat(report.otherExpenses.subtotal), baseCurrency)})
                  {' = '}<strong>{formatCurrency(parseFloat(report.netIncome), baseCurrency)}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* ── Income Analytics ── */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 print:break-before-page">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Percent className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Income Analytics
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'Gross Margin', value: metrics?.grossMargin || 0, goodThreshold: 30, warnThreshold: 15 },
                { label: 'Operating Margin', value: metrics?.operatingMargin || 0, goodThreshold: 20, warnThreshold: 10 },
                { label: 'Net Margin', value: metrics?.netMargin || 0, goodThreshold: 15, warnThreshold: 5 },
                { label: 'Expense Ratio', value: metrics?.expenseRatio || 0, goodThreshold: 40, warnThreshold: 60, inverted: true },
                { label: 'COGS Ratio', value: metrics?.cogsRatio || 0, goodThreshold: 50, warnThreshold: 70, inverted: true },
              ].map((m: any, i) => {
                const isGood = m.inverted ? m.value <= m.goodThreshold : m.value >= m.goodThreshold;
                const isWarn = m.inverted ? m.value <= m.warnThreshold : m.value >= m.warnThreshold;
                const color = isGood ? 'green' : isWarn ? 'amber' : 'red';
                const colorMap: Record<string, string> = { green: 'text-green-600 dark:text-green-400', amber: 'text-amber-600 dark:text-amber-400', red: 'text-red-600 dark:text-red-400' };
                const barMap: Record<string, string> = { green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500' };

                return (
                  <div key={i} className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium mb-1">{m.label}</div>
                    <div className={`text-2xl font-bold font-mono ${colorMap[color]}`}>
                      {m.value.toFixed(1)}%
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barMap[color]}`}
                        style={{ width: `${Math.min(Math.max(Math.abs(m.value), 0), 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Profitability Waterfall */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Profitability Waterfall</h4>
              <div className="space-y-2">
                {[
                  { label: 'Revenue', value: metrics?.revenue || 0, pct: 100 },
                  { label: 'Less: COGS', value: -(parseFloat(report.costOfGoodsSold.subtotal) || 0), pct: -(metrics?.cogsRatio || 0) },
                  { label: '= Gross Profit', value: metrics?.grossProfit || 0, pct: metrics?.grossMargin || 0, isSub: true },
                  { label: 'Less: Operating Expenses', value: -(parseFloat(report.operatingExpenses.subtotal) || 0), pct: -(metrics?.expenseRatio || 0) },
                  { label: '= Operating Income', value: metrics?.operatingIncome || 0, pct: metrics?.operatingMargin || 0, isSub: true },
                  {
                    label: 'Net Other',
                    value: (parseFloat(report.otherIncome.subtotal) || 0) - (parseFloat(report.otherExpenses.subtotal) || 0),
                    pct: metrics?.revenue ? (((parseFloat(report.otherIncome.subtotal) || 0) - (parseFloat(report.otherExpenses.subtotal) || 0)) / metrics.revenue) * 100 : 0,
                  },
                  { label: '= Net Income', value: metrics?.netIncome || 0, pct: metrics?.netMargin || 0, isFinal: true },
                ].map((row: any, i) => (
                  <div key={i} className={`flex items-center gap-3 px-3 py-1.5 rounded-lg ${
                    row.isFinal ? 'bg-gray-100 dark:bg-gray-700' : row.isSub ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                  }`}>
                    <span className={`text-sm flex-1 ${row.isFinal ? 'font-bold text-gray-900 dark:text-white' : row.isSub ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'}`}>
                      {row.label}
                    </span>
                    <span className={`text-xs font-mono w-16 text-right ${row.pct < 0 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                      {row.pct.toFixed(1)}%
                    </span>
                    <span className={`text-sm font-mono w-36 text-right ${
                      row.isFinal ? (row.value >= 0 ? 'font-bold text-green-700 dark:text-green-400' : 'font-bold text-red-700 dark:text-red-400')
                        : row.value < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'
                    }`}>
                      {formatCurrency(row.value, baseCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Print Footer */}
          <div className="hidden print:block text-center text-xs text-gray-400 mt-8 pt-4 border-t">
            <p>Generated on {new Date().toLocaleDateString()} — {organization?.name || orgSlug}</p>
          </div>
        </>
      )}
    </div>
  );
}
