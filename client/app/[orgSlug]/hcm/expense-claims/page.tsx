'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';
import {
  Receipt, Plus, Search, Filter, Clock, CheckCircle2, XCircle, Ban,
  Users, AlertTriangle, Paperclip, Send, Eye, X, ArrowLeft,
  CalendarDays, DollarSign, Upload, Trash2, FileText, Building2,
  ChevronDown, ChevronUp, Image, CreditCard, Wallet, Banknote,
  BarChart3, TrendingUp, ShieldCheck, MessageSquare, RefreshCw,
} from 'lucide-react';

/* ═══════════ TYPES ═══════════ */
interface ExpenseItem {
  id?: string;
  expenseDate: string;
  categoryId?: string;
  category: string;
  description: string;
  amount: number;
  taxInclusive?: boolean;
  taxRate?: number;
  taxAmount?: number;
  netAmount?: number;
  receiptUrl?: string;
  receiptName?: string;
  merchantName?: string;
  notes?: string;
}

interface ExpenseClaim {
  id: string;
  claimNumber: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department?: string | null;
  managerName?: string | null;
  claimDate: string;
  totalAmount: number;
  totalTax: number;
  netAmount: number;
  currency: string;
  exchangeRate: number;
  amountInBase: number;
  paymentMethod?: string;
  merchantName?: string;
  status: string;
  purpose?: string;
  rejectionReason?: string;
  submittedAt?: string;
  approvedBy?: string | null;
  approvedAt?: string;
  paidBy?: string | null;
  paidAt?: string;
  paidViaPayroll?: boolean;
  itemCount: number;
  items: ExpenseItem[];
  createdAt: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  department?: { name: string } | null;
}

interface GLAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
}

interface Metrics {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
  paid: number;
  queried: number;
  pendingReimbursement: number;
  pendingAmount: number;
  paidAmount: number;
}

/* ═══════════ CONSTANTS ═══════════ */
const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT:              { label: 'Draft',       color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',          icon: <FileText className="w-3 h-3" /> },
  SUBMITTED:          { label: 'Submitted',   color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',   icon: <Send className="w-3 h-3" /> },
  APPROVED:           { label: 'Approved',    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',       icon: <CheckCircle2 className="w-3 h-3" /> },
  ACCOUNTING_REVIEW:  { label: 'Acctg Review',color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',icon: <ShieldCheck className="w-3 h-3" /> },
  QUERIED:            { label: 'Queried',     color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',icon: <MessageSquare className="w-3 h-3" /> },
  REJECTED:           { label: 'Rejected',    color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',           icon: <XCircle className="w-3 h-3" /> },
  PAID:               { label: 'Paid',        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',    icon: <DollarSign className="w-3 h-3" /> },
};

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', icon: <Banknote className="w-4 h-4" /> },
  { value: 'PERSONAL_CARD', label: 'Personal Card', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: <Wallet className="w-4 h-4" /> },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: <Building2 className="w-4 h-4" /> },
];

const INPUT_CLS = 'px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-full';
const LABEL_CLS = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider';
const TAB_CLS = (active: boolean) =>
  `flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
    active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
  }`;

type Tab = 'claims' | 'new' | 'approvals';

/* ═══════════ METRIC CARD ═══════════ */
function MetricCard({ label, value, color, amount, currency, active, onClick }: {
  label: string; value: number; color: string; amount?: number; currency?: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`text-left p-4 rounded-xl border transition-all ${
        active ? 'ring-2 ring-blue-500 border-blue-300 dark:border-blue-700'
               : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      } bg-white dark:bg-gray-900`}>
      <div className={`text-xs font-semibold uppercase tracking-wider text-${color}-600 dark:text-${color}-400`}>{label}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</div>
      {amount !== undefined && currency && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatCurrency(amount, currency)}</div>
      )}
    </button>
  );
}

/* ═══════════ STATUS BADGE ═══════════ */
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || { label: status, color: 'bg-gray-100 dark:bg-gray-800 text-gray-600', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

/* ═══════════ RECEIPT PREVIEWER ═══════════ */
function ReceiptPreview({ url, name, onClose }: { url: string; name?: string; onClose: () => void }) {
  const isPdf = url.toLowerCase().endsWith('.pdf');
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Image className="w-5 h-5 text-blue-500" /> Receipt Preview
          </h3>
          <div className="flex items-center gap-2">
            {name && <span className="text-sm text-gray-500 dark:text-gray-400">{name}</span>}
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-auto max-h-[75vh] flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          {isPdf ? (
            <iframe src={url} className="w-full h-[70vh] border-0 rounded-lg" title="Receipt PDF" />
          ) : (
            <img src={url} alt="Receipt" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg" />
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ MAIN PAGE ═══════════ */
export default function ExpenseClaimsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const router = useRouter();
  const { organization } = useOrganization();
  const baseCurrency = organization?.baseCurrency || 'USD';

  const [activeTab, setActiveTab] = useState<Tab>('claims');
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [glAccounts, setGLAccounts] = useState<GLAccount[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, draft: 0, submitted: 0, approved: 0, rejected: 0, paid: 0, queried: 0, pendingReimbursement: 0, pendingAmount: 0, paidAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Detail
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [previewReceipt, setPreviewReceipt] = useState<{ url: string; name?: string } | null>(null);

  // New claim form
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formCurrency, setFormCurrency] = useState('');
  const [formExchangeRate, setFormExchangeRate] = useState('1');
  const [formPaymentMethod, setFormPaymentMethod] = useState('CASH');
  const [formMerchant, setFormMerchant] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<ExpenseItem[]>([
    { expenseDate: new Date().toISOString().slice(0, 10), category: '', description: '', amount: 0, taxInclusive: false, taxRate: 0 },
  ]);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  /* ── Load Data ── */
  const loadClaims = useCallback(async () => {
    if (!orgSlug) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);
      const res = await fetch(`/api/${orgSlug}/hcm/expense-claims?${qs}`);
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setClaims(json.data || []);
      if (json.metrics) setMetrics(json.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expense claims');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, statusFilter]);

  const loadRefs = useCallback(async () => {
    if (!orgSlug) return;
    try {
      const [empRes, acctRes] = await Promise.all([
        fetch(`/api/${orgSlug}/hcm/employees`),
        fetch(`/api/${orgSlug}/general-ledger/accounts?type=EXPENSE`),
      ]);
      if (empRes.ok) {
        const d = await empRes.json();
        setEmployees(d.data || []);
      }
      if (acctRes.ok) {
        const d = await acctRes.json();
        setGLAccounts((d.data || d.accounts || []).filter((a: any) => a.accountType === 'EXPENSE' && a.isActive !== false));
      }
    } catch { /* silently fail, not critical */ }
  }, [orgSlug]);

  useEffect(() => { loadClaims(); }, [loadClaims]);
  useEffect(() => { loadRefs(); }, [loadRefs]);
  useEffect(() => { if (formCurrency === '' && baseCurrency) setFormCurrency(baseCurrency); }, [baseCurrency, formCurrency]);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); } }, [success]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(null), 6000); return () => clearTimeout(t); } }, [error]);

  /* ── Filtered Claims ── */
  const filtered = useMemo(() => {
    if (!search) return claims;
    const q = search.toLowerCase();
    return claims.filter(c =>
      c.claimNumber.toLowerCase().includes(q) ||
      c.employeeName.toLowerCase().includes(q) ||
      c.employeeNumber.toLowerCase().includes(q) ||
      (c.purpose || '').toLowerCase().includes(q) ||
      (c.merchantName || '').toLowerCase().includes(q)
    );
  }, [claims, search]);

  const pendingApprovals = useMemo(() => claims.filter(c => c.status === 'SUBMITTED'), [claims]);

  /* ── Form Helpers ── */
  const addItem = () => {
    setFormItems(prev => [
      ...prev,
      { expenseDate: new Date().toISOString().slice(0, 10), category: '', description: '', amount: 0, taxInclusive: false, taxRate: 0 },
    ]);
  };

  const removeItem = (idx: number) => {
    if (formItems.length <= 1) return;
    setFormItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const formTotal = useMemo(() => formItems.reduce((s, i) => s + (i.amount || 0), 0), [formItems]);
  const formTotalTax = useMemo(() =>
    formItems.reduce((s, i) => {
      if (!i.taxRate) return s;
      const rate = i.taxRate / 100;
      return s + (i.taxInclusive ? i.amount - (i.amount / (1 + rate)) : i.amount * rate);
    }, 0),
    [formItems]
  );

  /* ── Upload Receipt ── */
  const handleUpload = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/${orgSlug}/hcm/expense-claims/upload`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const json = await res.json();
      updateItem(idx, 'receiptUrl', json.data?.fileUrl || json.fileUrl || json.url);
      updateItem(idx, 'receiptName', file.name);
    } catch {
      setError('Failed to upload receipt');
    } finally {
      setUploadingIdx(null);
    }
  };

  /* ── Submit New Claim ── */
  const handleSubmitClaim = async (submitImmediately: boolean) => {
    if (!formEmployeeId) { setError('Please select an employee'); return; }
    if (formItems.some(i => !i.description || !i.amount)) { setError('All items must have a description and amount'); return; }

    setFormSubmitting(true);
    try {
      const res = await fetch(`/api/${orgSlug}/hcm/expense-claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: formEmployeeId,
          claimDate: new Date().toISOString(),
          currency: formCurrency || baseCurrency,
          exchangeRate: parseFloat(formExchangeRate) || 1,
          paymentMethod: formPaymentMethod,
          merchantName: formMerchant || undefined,
          purpose: formPurpose || undefined,
          notes: formNotes || undefined,
          submitImmediately,
          items: formItems.map(i => ({
            expenseDate: i.expenseDate || new Date().toISOString(),
            categoryId: i.categoryId || undefined,
            category: i.category || 'General',
            description: i.description,
            amount: i.amount,
            taxInclusive: i.taxInclusive,
            taxRate: i.taxRate || 0,
            receiptUrl: i.receiptUrl,
            receiptName: i.receiptName,
            merchantName: i.merchantName || formMerchant || undefined,
            notes: i.notes,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create claim');

      setSuccess(`Claim ${json.data?.claimNumber || ''} ${submitImmediately ? 'submitted' : 'saved as draft'} successfully`);
      // Reset form
      setFormEmployeeId('');
      setFormPurpose('');
      setFormMerchant('');
      setFormNotes('');
      setFormItems([{ expenseDate: new Date().toISOString().slice(0, 10), category: '', description: '', amount: 0, taxInclusive: false, taxRate: 0 }]);
      setActiveTab('claims');
      loadClaims();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  /* ── Claim Actions ── */
  const handleAction = async (claimId: string, action: string, payload: any = {}) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/${orgSlug}/hcm/expense-claims/${claimId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Failed to ${action} claim`);

      setSuccess(`Claim ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'submit' ? 'submitted' : action === 'mark_paid' ? 'marked as paid' : 'updated'} successfully`);
      setSelectedClaim(null);
      setActionReason('');
      loadClaims();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  /* ═══════════════════════════════════════════════════════
     CLAIMS TAB
     ═══════════════════════════════════════════════════════ */
  function ClaimsTab() {
    return (
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <MetricCard label="All" value={metrics.total} color="blue" active={!statusFilter} onClick={() => setStatusFilter('')} />
          <MetricCard label="Draft" value={metrics.draft} color="gray" active={statusFilter === 'DRAFT'} onClick={() => setStatusFilter(statusFilter === 'DRAFT' ? '' : 'DRAFT')} />
          <MetricCard label="Submitted" value={metrics.submitted} color="amber" active={statusFilter === 'SUBMITTED'} onClick={() => setStatusFilter(statusFilter === 'SUBMITTED' ? '' : 'SUBMITTED')} />
          <MetricCard label="Approved" value={metrics.approved} color="blue" amount={metrics.pendingAmount} currency={baseCurrency} active={statusFilter === 'APPROVED'} onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? '' : 'APPROVED')} />
          <MetricCard label="Rejected" value={metrics.rejected} color="red" active={statusFilter === 'REJECTED'} onClick={() => setStatusFilter(statusFilter === 'REJECTED' ? '' : 'REJECTED')} />
          <MetricCard label="Queried" value={metrics.queried} color="orange" active={statusFilter === 'QUERIED'} onClick={() => setStatusFilter(statusFilter === 'QUERIED' ? '' : 'QUERIED')} />
          <MetricCard label="Paid" value={metrics.paid} color="green" amount={metrics.paidAmount} currency={baseCurrency} active={statusFilter === 'PAID'} onClick={() => setStatusFilter(statusFilter === 'PAID' ? '' : 'PAID')} />
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by claim #, employee, purpose..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className={`${INPUT_CLS} pl-10`} />
          </div>
          <button onClick={() => { setStatusFilter(''); setSearch(''); }}
            className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            Clear
          </button>
          <button onClick={loadClaims} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Claim #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Purpose</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-200">{c.claimNumber}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{c.employeeName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{c.department || c.employeeNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {new Date(c.claimDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(c.totalAmount, c.currency)}
                    {c.currency !== baseCurrency && (
                      <div className="text-xs font-normal text-gray-400">≈ {formatCurrency(c.amountInBase, baseCurrency)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                    {c.purpose || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{c.itemCount}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedClaim(c)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    {search || statusFilter ? 'No claims match your filters.' : 'No expense claims yet. Create one to get started.'}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     NEW CLAIM TAB
     ═══════════════════════════════════════════════════════ */
  function NewClaimTab() {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Claim Form */}
        <div className="xl:col-span-2 space-y-6">
          {/* General Info */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-500" /> Claim Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Employee *</label>
                <select value={formEmployeeId} onChange={(e) => setFormEmployeeId(e.target.value)} className={INPUT_CLS}>
                  <option value="">Select employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeNumber})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Purpose / Business Reason</label>
                <input type="text" value={formPurpose} onChange={(e) => setFormPurpose(e.target.value)}
                  placeholder="e.g. Client meeting, fuel for field visit"
                  className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(pm => (
                    <button key={pm.value} type="button" onClick={() => setFormPaymentMethod(pm.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${
                        formPaymentMethod === pm.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}>
                      {pm.icon} {pm.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>Merchant / Vendor</label>
                <input type="text" value={formMerchant} onChange={(e) => setFormMerchant(e.target.value)}
                  placeholder="Who was paid?"
                  className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Currency</label>
                <input type="text" value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)}
                  placeholder={baseCurrency}
                  className={INPUT_CLS} />
              </div>
              {formCurrency !== baseCurrency && (
                <div>
                  <label className={LABEL_CLS}>Exchange Rate (1 {formCurrency} = ? {baseCurrency})</label>
                  <input type="number" step="0.0001" min="0.0001" value={formExchangeRate}
                    onChange={(e) => setFormExchangeRate(e.target.value)}
                    className={INPUT_CLS} />
                </div>
              )}
            </div>

            <div>
              <label className={LABEL_CLS}>Additional Notes</label>
              <textarea rows={2} value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Any additional context..." className={INPUT_CLS} />
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" /> Expense Items
              </h3>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40">
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            {formItems.map((item, idx) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 relative">
                {formItems.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)}
                    className="absolute top-3 right-3 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="text-xs font-semibold text-gray-400 dark:text-gray-500">Item {idx + 1}</div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Date *</label>
                    <input type="date" value={item.expenseDate}
                      onChange={(e) => updateItem(idx, 'expenseDate', e.target.value)}
                      className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Expense Category</label>
                    <select value={item.categoryId || ''}
                      onChange={(e) => {
                        const acct = glAccounts.find(a => a.id === e.target.value);
                        updateItem(idx, 'categoryId', e.target.value || undefined);
                        if (acct) updateItem(idx, 'category', acct.name);
                      }}
                      className={INPUT_CLS}>
                      <option value="">Select category...</option>
                      {glAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Merchant</label>
                    <input type="text" value={item.merchantName || ''}
                      onChange={(e) => updateItem(idx, 'merchantName', e.target.value)}
                      placeholder="Who was paid?"
                      className={INPUT_CLS} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className={LABEL_CLS}>Description *</label>
                    <input type="text" value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      placeholder="What was purchased?"
                      className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Amount ({formCurrency}) *</label>
                    <input type="number" step="0.01" min="0" value={item.amount || ''}
                      onChange={(e) => updateItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                      className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>VAT Rate %</label>
                    <div className="flex items-center gap-2">
                      <input type="number" step="0.5" min="0" max="100" value={item.taxRate || ''}
                        onChange={(e) => updateItem(idx, 'taxRate', parseFloat(e.target.value) || 0)}
                        className={`${INPUT_CLS} flex-1`} />
                      <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        <input type="checkbox" checked={item.taxInclusive || false}
                          onChange={(e) => updateItem(idx, 'taxInclusive', e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-600" />
                        Incl.
                      </label>
                    </div>
                  </div>
                </div>

                {/* Receipt Upload */}
                <div className="flex items-center gap-3">
                  {item.receiptUrl ? (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <button type="button" onClick={() => setPreviewReceipt({ url: item.receiptUrl!, name: item.receiptName })}
                        className="text-blue-600 dark:text-blue-400 hover:underline">
                        {item.receiptName || 'View Receipt'}
                      </button>
                      <button type="button" onClick={() => { updateItem(idx, 'receiptUrl', undefined); updateItem(idx, 'receiptName', undefined); }}
                        className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 cursor-pointer transition-colors">
                      {uploadingIdx === idx ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload className="w-4 h-4" /> Attach Receipt (Photo/PDF)</>
                      )}
                      <input type="file" className="hidden" accept="image/*,.pdf"
                        onChange={(e) => { if (e.target.files?.[0]) handleUpload(idx, e.target.files[0]); }} />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-6 py-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {formItems.length} item{formItems.length > 1 ? 's' : ''} &bull; Total: <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(formTotal, formCurrency || baseCurrency)}</span>
              {formTotalTax > 0 && <span className="ml-2">(VAT: {formatCurrency(formTotalTax, formCurrency || baseCurrency)})</span>}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => handleSubmitClaim(false)} disabled={formSubmitting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
                Save as Draft
              </button>
              <button type="button" onClick={() => handleSubmitClaim(true)} disabled={formSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 shadow-sm">
                {formSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit for Approval
              </button>
            </div>
          </div>
        </div>

        {/* Right: Summary Sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 sticky top-6 space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Claim Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Items</span>
                <span className="font-medium text-gray-900 dark:text-white">{formItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(formTotal - formTotalTax, formCurrency || baseCurrency)}</span>
              </div>
              {formTotalTax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">VAT (Recoverable)</span>
                  <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(formTotalTax, formCurrency || baseCurrency)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                <span className="font-bold text-lg text-gray-900 dark:text-white">{formatCurrency(formTotal, formCurrency || baseCurrency)}</span>
              </div>
              {formCurrency && formCurrency !== baseCurrency && (
                <div className="flex justify-between text-xs text-gray-400">
                  <span>In {baseCurrency}</span>
                  <span>{formatCurrency(formTotal * (parseFloat(formExchangeRate) || 1), baseCurrency)}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <CreditCard className="w-3.5 h-3.5" /> {PAYMENT_METHODS.find(p => p.value === formPaymentMethod)?.label || formPaymentMethod}
              </div>
              {formMerchant && (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Building2 className="w-3.5 h-3.5" /> {formMerchant}
                </div>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400">
              <strong>Accounting Impact:</strong>
              <div className="mt-1 space-y-0.5">
                <div>DR: Expense Account(s)</div>
                {formTotalTax > 0 && <div>DR: Input VAT (Recoverable)</div>}
                <div>CR: Employee Reimbursements Payable</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     APPROVALS TAB
     ═══════════════════════════════════════════════════════ */
  function ApprovalsTab() {
    if (pendingApprovals.length === 0) {
      return (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-400" />
          <p className="text-lg font-medium">All caught up!</p>
          <p className="text-sm">No pending expense claims to review.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pendingApprovals.map((c) => (
          <div key={c.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-sm text-gray-500 dark:text-gray-400">{c.claimNumber}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{c.employeeName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{c.department || c.employeeNumber}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(c.totalAmount, c.currency)}</div>
                {c.currency !== baseCurrency && (
                  <div className="text-xs text-gray-400">≈ {formatCurrency(c.amountInBase, baseCurrency)}</div>
                )}
              </div>
            </div>

            {c.purpose && (
              <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                {c.purpose}
              </div>
            )}

            {/* Line items summary */}
            <div className="space-y-1">
              {c.items.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 truncate mr-2">
                    {item.description}
                    {item.receiptUrl && <Paperclip className="w-3 h-3 inline ml-1 text-green-500" />}
                  </span>
                  <span className="text-gray-900 dark:text-gray-200 font-medium whitespace-nowrap">{formatCurrency(item.amount, c.currency)}</span>
                </div>
              ))}
              {c.items.length > 3 && (
                <div className="text-xs text-gray-400">+ {c.items.length - 3} more items</div>
              )}
            </div>

            {/* Policy alerts */}
            {c.totalAmount > 500000 && (
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                High-value claim — please verify receipts carefully.
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button type="button" onClick={() => setSelectedClaim(c)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-gray-200 dark:border-gray-700 text-sm rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                <Eye className="w-3.5 h-3.5" /> Review
              </button>
              <button type="button" onClick={() => handleAction(c.id, 'approve')}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </button>
              <button type="button" onClick={() => { setSelectedClaim(c); setActionReason(''); }}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg font-medium hover:bg-red-700">
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     DETAIL MODAL
     ═══════════════════════════════════════════════════════ */
  function DetailModal() {
    if (!selectedClaim) return null;
    const c = selectedClaim;

    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 pt-8 overflow-y-auto"
        onClick={() => { setSelectedClaim(null); setActionReason(''); }}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl"
          onClick={(e) => e.stopPropagation()}>
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {c.claimNumber}
                <StatusBadge status={c.status} />
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                By {c.employeeName} &bull; {new Date(c.claimDate).toLocaleDateString()}
              </p>
            </div>
            <button type="button" onClick={() => { setSelectedClaim(null); setActionReason(''); }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Claim Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total Amount</div>
                <div className="font-bold text-gray-900 dark:text-white text-lg">{formatCurrency(c.totalAmount, c.currency)}</div>
                {c.currency !== baseCurrency && (
                  <div className="text-xs text-gray-400">≈ {formatCurrency(c.amountInBase, baseCurrency)}</div>
                )}
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">VAT</div>
                <div className="font-medium text-gray-900 dark:text-white">{formatCurrency(c.totalTax, c.currency)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Payment Method</div>
                <div className="font-medium text-gray-900 dark:text-white">{
                  PAYMENT_METHODS.find(p => p.value === c.paymentMethod)?.label || c.paymentMethod || '—'
                }</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Merchant</div>
                <div className="font-medium text-gray-900 dark:text-white">{c.merchantName || '—'}</div>
              </div>
            </div>

            {c.purpose && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                <strong>Purpose:</strong> {c.purpose}
              </div>
            )}

            {c.rejectionReason && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-400">
                <strong>Rejection Reason:</strong> {c.rejectionReason}
              </div>
            )}

            {/* Line Items with Receipt Previewer */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> Expense Items ({c.items.length})
              </h4>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Description</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Category</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Amount</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">VAT</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {c.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                          {new Date(item.expenseDate).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-200">
                          <div>{item.description}</div>
                          {item.merchantName && <div className="text-xs text-gray-400">{item.merchantName}</div>}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.category}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-200">
                          {formatCurrency(item.amount, c.currency)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">
                          {item.taxRate ? `${item.taxRate}%${item.taxInclusive ? ' incl.' : ''}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.receiptUrl ? (
                            <button type="button" onClick={() => setPreviewReceipt({ url: item.receiptUrl!, name: item.receiptName })}
                              className="text-blue-600 dark:text-blue-400 hover:underline text-xs flex items-center gap-1 justify-center">
                              <Image className="w-3 h-3" /> View
                            </button>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600 text-xs">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white text-right">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(c.totalAmount, c.currency)}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">{formatCurrency(c.totalTax, c.currency)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Audit Trail */}
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
              <span>Created: {new Date(c.createdAt).toLocaleString()}</span>
              {c.submittedAt && <span>Submitted: {new Date(c.submittedAt).toLocaleString()}</span>}
              {c.approvedBy && <span>Approved by {c.approvedBy}: {c.approvedAt ? new Date(c.approvedAt).toLocaleString() : ''}</span>}
              {c.paidBy && <span>Paid by {c.paidBy}: {c.paidAt ? new Date(c.paidAt).toLocaleString() : ''}</span>}
            </div>

            {/* Accounting Impact */}
            {(c.status === 'APPROVED' || c.status === 'PAID') && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm space-y-1">
                <div className="font-semibold text-blue-700 dark:text-blue-400">Journal Entry Posted</div>
                <div className="text-blue-600 dark:text-blue-400 text-xs space-y-0.5">
                  <div>DR: Expense Account(s) — {formatCurrency(c.netAmount || c.totalAmount, c.currency)}</div>
                  {c.totalTax > 0 && <div>DR: Input VAT Recoverable — {formatCurrency(c.totalTax, c.currency)}</div>}
                  <div>CR: Employee Reimbursements Payable — {formatCurrency(c.totalAmount, c.currency)}</div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              {c.status === 'DRAFT' && (
                <div className="flex gap-3">
                  <button type="button" onClick={() => handleAction(c.id, 'submit')} disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                    <Send className="w-4 h-4" /> Submit for Approval
                  </button>
                </div>
              )}

              {c.status === 'SUBMITTED' && (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button type="button" onClick={() => handleAction(c.id, 'approve')} disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                    <button type="button" onClick={() => handleAction(c.id, 'query', { queryNotes: actionReason })}
                      disabled={actionLoading || !actionReason}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
                      <MessageSquare className="w-4 h-4" /> Query
                    </button>
                    <button type="button" onClick={() => handleAction(c.id, 'reject', { reason: actionReason })}
                      disabled={actionLoading || !actionReason}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                  <textarea value={actionReason} onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Reason for rejection or query (required for Reject/Query)..."
                    rows={2} className={INPUT_CLS} />
                </div>
              )}

              {c.status === 'APPROVED' && (
                <div className="flex gap-3">
                  <button type="button" onClick={() => handleAction(c.id, 'mark_paid', { paidViaPayroll: false })} disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
                    <DollarSign className="w-4 h-4" /> Mark Paid (Bank Transfer)
                  </button>
                  <button type="button" onClick={() => handleAction(c.id, 'mark_paid', { paidViaPayroll: true })} disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">
                    <Wallet className="w-4 h-4" /> Add to Payroll
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     MAIN RETURN
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* HCM Navigation Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="px-6 py-2.5 flex items-center gap-3">
          <button type="button" onClick={() => router.push(`/${orgSlug}`)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Back to Dashboard">
            <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
          <nav className="flex items-center gap-1">
            <Link href={`/${orgSlug}/hcm/employees`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Users className="w-3.5 h-3.5" /> Employees
            </Link>
            <Link href={`/${orgSlug}/hcm/leave-requests`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <CalendarDays className="w-3.5 h-3.5" /> Leave
            </Link>
            <Link href={`/${orgSlug}/hcm/expense-claims`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
              <Receipt className="w-3.5 h-3.5" /> Expenses
            </Link>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Expense Claims
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Submit, approve &amp; reimburse employee expenses — {metrics.total} total claims
              {metrics.pendingReimbursement > 0 && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">
                  &bull; {metrics.pendingReimbursement} pending reimbursement
                </span>
              )}
            </p>
          </div>
          <button type="button" onClick={() => setActiveTab('new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm">
            <Plus className="w-4 h-4" /> New Claim
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Toasts */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="ml-2 hover:underline">Dismiss</button>
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm flex items-center justify-between">
            <span>{success}</span>
            <button type="button" onClick={() => setSuccess(null)} className="ml-2 hover:underline">Dismiss</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" className={TAB_CLS(activeTab === 'claims')} onClick={() => setActiveTab('claims')}>
            <FileText className="w-4 h-4" /> All Claims
          </button>
          <button type="button" className={TAB_CLS(activeTab === 'new')} onClick={() => setActiveTab('new')}>
            <Plus className="w-4 h-4" /> New Claim
          </button>
          <button type="button" className={TAB_CLS(activeTab === 'approvals')} onClick={() => setActiveTab('approvals')}>
            <ShieldCheck className="w-4 h-4" /> Approvals
            {pendingApprovals.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingApprovals.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'claims' && <ClaimsTab />}
        {activeTab === 'new' && <NewClaimTab />}
        {activeTab === 'approvals' && <ApprovalsTab />}
      </div>

      {/* Modals */}
      {selectedClaim && <DetailModal />}
      {previewReceipt && (
        <ReceiptPreview url={previewReceipt.url} name={previewReceipt.name}
          onClose={() => setPreviewReceipt(null)} />
      )}
    </div>
  );
}
