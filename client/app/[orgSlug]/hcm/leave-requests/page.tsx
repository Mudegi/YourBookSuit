'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrganization } from '@/hooks/useOrganization';
import {
  CalendarDays, Plus, Search, Filter, Clock, CheckCircle2, XCircle, Ban,
  ChevronLeft, ChevronRight, Users, AlertTriangle, Paperclip, Send,
  Calendar, ListChecks, FileText, BarChart3, Briefcase, Building2,
  ArrowLeft, ArrowRight, RefreshCw, Sun, Moon, Eye, X, Receipt,
} from 'lucide-react';

/* ═══════════ TYPES ═══════════ */
interface LeaveType { id: string; code: string; name: string; daysPerYear: number; isPaid: boolean; requiresApproval: boolean; requiresAttachment: boolean; maxCarryForward: number | null; isActive: boolean; _count?: { leaveRequests: number } }
interface Employee { id: string; firstName: string; lastName: string; employeeNumber: string; department?: { id: string; name: string } | null; branch?: { id: string; name: string } | null; managerId?: string | null; manager?: { firstName: string; lastName: string } | null }
interface LeaveRequest {
  id: string; employeeId: string; leaveTypeId: string; leaveTypeCode: string; leaveTypeName: string;
  startDate: string; endDate: string; daysRequested: number; isHalfDay: boolean; halfDayPeriod: string | null;
  reason?: string; attachmentUrl?: string; status: string; approvedBy?: string; approvedAt?: string; rejectionReason?: string; createdAt: string;
  employee: Employee;
}
interface LeaveBalance { leaveTypeId: string; leaveTypeName: string; leaveTypeCode: string; annualAllotment: number; usedDays: number; pendingDays: number; carryForwardDays: number; effectiveBalance: number }
interface Metrics { total: number; pending: number; approved: number; rejected: number; cancelled: number }
interface DeptOption { id: string; name: string; code: string }

/* ═══════════ CONSTANTS ═══════════ */
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:   { label: 'Pending',   color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',   icon: <Clock className="w-3 h-3" /> },
  APPROVED:  { label: 'Approved',  color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',   icon: <CheckCircle2 className="w-3 h-3" /> },
  REJECTED:  { label: 'Rejected',  color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',           icon: <XCircle className="w-3 h-3" /> },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',          icon: <Ban className="w-3 h-3" /> },
};

const INPUT_CLS = 'px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
const LABEL_CLS = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider';
const TAB_CLS = (active: boolean) => `flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
  active
    ? 'bg-blue-600 text-white shadow-sm'
    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
}`;

type Tab = 'requests' | 'new' | 'calendar' | 'approvals' | 'types';

/* ═══════════ MAIN ═══════════ */
export default function LeaveManagementPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const router = useRouter();
  const { organization } = useOrganization();

  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Detail modal
  const [detailRequest, setDetailRequest] = useState<(LeaveRequest & { overlaps?: any[] }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  /* ── Load Data ── */
  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);
      if (deptFilter) qs.set('departmentId', deptFilter);
      if (employeeFilter) qs.set('employeeId', employeeFilter);
      const res = await fetch(`/api/${orgSlug}/hcm/leave-requests?${qs}`);
      if (!res.ok) throw new Error('Failed to load leave requests');
      const json = await res.json();
      setRequests(json.data || []);
      if (json.metrics) setMetrics(json.metrics);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, statusFilter, deptFilter, employeeFilter]);

  const loadRefs = useCallback(async () => {
    try {
      const [ltRes, dRes, eRes] = await Promise.all([
        fetch(`/api/${orgSlug}/hcm/leave-types`).catch(() => null),
        fetch(`/api/${orgSlug}/hcm/departments`).catch(() => null),
        fetch(`/api/${orgSlug}/hcm/employees`).catch(() => null),
      ]);
      if (ltRes?.ok) { const j = await ltRes.json(); setLeaveTypes(j.data || []); }
      if (dRes?.ok) { const j = await dRes.json(); setDepartments(j.data || j.departments || []); }
      if (eRes?.ok) { const j = await eRes.json(); setEmployees(j.data || []); }
    } catch { /* best effort */ }
  }, [orgSlug]);

  useEffect(() => { loadRefs(); }, [loadRefs]);
  useEffect(() => {
    const t = setTimeout(() => loadRequests(), 200);
    return () => clearTimeout(t);
  }, [loadRequests]);

  /* ── Filtered requests (client-side search) ── */
  const filteredRequests = useMemo(() => {
    if (!search) return requests;
    const lc = search.toLowerCase();
    return requests.filter((r) =>
      `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase().includes(lc) ||
      r.employee.employeeNumber?.toLowerCase().includes(lc) ||
      r.leaveTypeName?.toLowerCase().includes(lc)
    );
  }, [requests, search]);

  const pendingRequests = useMemo(() => filteredRequests.filter(r => r.status === 'PENDING'), [filteredRequests]);

  /* ── Detail modal ── */
  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setRejectionReason('');
    try {
      const res = await fetch(`/api/${orgSlug}/hcm/leave-requests/${id}`);
      if (!res.ok) throw new Error('Failed to load request');
      const json = await res.json();
      setDetailRequest({ ...json.data, overlaps: json.overlaps || [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load request');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAction = async (action: 'APPROVE' | 'REJECT' | 'CANCEL') => {
    if (!detailRequest) return;
    if (action === 'REJECT' && !rejectionReason.trim()) { setError('Rejection reason is required'); return; }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/${orgSlug}/hcm/leave-requests/${detailRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectionReason: rejectionReason || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed to ${action.toLowerCase()} request`);
      }
      setSuccess(`Leave request ${action.toLowerCase()}d successfully`);
      setDetailRequest(null);
      loadRequests();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Dismiss messages after 4s ── */
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); } }, [success]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(null), 6000); return () => clearTimeout(t); } }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ═══ HCM Navigation Bar ═══ */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="px-6 py-2.5 flex items-center gap-3">
          <button onClick={() => router.push(`/${orgSlug}`)}
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
              <CalendarDays className="w-3.5 h-3.5" /> Leave
            </Link>
            <Link href={`/${orgSlug}/hcm/expense-claims`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Receipt className="w-3.5 h-3.5" /> Expenses
            </Link>
          </nav>
        </div>
      </div>

      {/* ═══ Header ═══ */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Leave Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track leave requests, balances &amp; approvals — {metrics.total} total requests
            </p>
          </div>
          <button onClick={() => setActiveTab('new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm">
            <Plus className="w-4 h-4" /> New Request
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* ═══ Toasts ═══ */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-2 hover:underline">Dismiss</button>
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-2 hover:underline">Dismiss</button>
          </div>
        )}

        {/* ═══ Tabs ═══ */}
        <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1.5 overflow-x-auto">
          <button onClick={() => setActiveTab('requests')} className={TAB_CLS(activeTab === 'requests')}>
            <ListChecks className="w-4 h-4" /> Requests
          </button>
          <button onClick={() => setActiveTab('new')} className={TAB_CLS(activeTab === 'new')}>
            <FileText className="w-4 h-4" /> New Request
          </button>
          <button onClick={() => setActiveTab('approvals')} className={TAB_CLS(activeTab === 'approvals')}>
            <CheckCircle2 className="w-4 h-4" /> Approvals
            {metrics.pending > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center">{metrics.pending}</span>
            )}
          </button>
          <button onClick={() => setActiveTab('calendar')} className={TAB_CLS(activeTab === 'calendar')}>
            <Calendar className="w-4 h-4" /> Calendar
          </button>
          <button onClick={() => setActiveTab('types')} className={TAB_CLS(activeTab === 'types')}>
            <BarChart3 className="w-4 h-4" /> Leave Types
          </button>
        </div>

        {/* ═══ Metric Cards ═══ */}
        {(activeTab === 'requests' || activeTab === 'approvals') && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard label="Total" value={metrics.total} color="blue" active={!statusFilter} onClick={() => setStatusFilter('')} />
            <MetricCard label="Pending" value={metrics.pending} color="amber" active={statusFilter === 'PENDING'} onClick={() => setStatusFilter(statusFilter === 'PENDING' ? '' : 'PENDING')} />
            <MetricCard label="Approved" value={metrics.approved} color="green" active={statusFilter === 'APPROVED'} onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? '' : 'APPROVED')} />
            <MetricCard label="Rejected" value={metrics.rejected} color="red" active={statusFilter === 'REJECTED'} onClick={() => setStatusFilter(statusFilter === 'REJECTED' ? '' : 'REJECTED')} />
            <MetricCard label="Cancelled" value={metrics.cancelled} color="gray" active={statusFilter === 'CANCELLED'} onClick={() => setStatusFilter(statusFilter === 'CANCELLED' ? '' : 'CANCELLED')} />
          </div>
        )}

        {/* ═══ TAB: REQUESTS ═══ */}
        {activeTab === 'requests' && (
          <RequestsTab
            requests={filteredRequests} loading={loading} search={search} setSearch={setSearch}
            showFilters={showFilters} setShowFilters={setShowFilters} deptFilter={deptFilter} setDeptFilter={setDeptFilter}
            employeeFilter={employeeFilter} setEmployeeFilter={setEmployeeFilter} departments={departments} employees={employees}
            openDetail={openDetail}
          />
        )}

        {/* ═══ TAB: NEW REQUEST ═══ */}
        {activeTab === 'new' && (
          <NewRequestTab orgSlug={orgSlug} leaveTypes={leaveTypes} employees={employees}
            onSuccess={() => { setActiveTab('requests'); loadRequests(); setSuccess('Leave request submitted!'); }}
            setError={setError} />
        )}

        {/* ═══ TAB: APPROVALS ═══ */}
        {activeTab === 'approvals' && (
          <ApprovalsTab requests={pendingRequests} loading={loading} openDetail={openDetail} />
        )}

        {/* ═══ TAB: CALENDAR ═══ */}
        {activeTab === 'calendar' && (
          <CalendarTab orgSlug={orgSlug} />
        )}

        {/* ═══ TAB: LEAVE TYPES ═══ */}
        {activeTab === 'types' && (
          <LeaveTypesTab leaveTypes={leaveTypes} orgSlug={orgSlug} onRefresh={loadRefs} setError={setError} setSuccess={setSuccess} />
        )}
      </div>

      {/* ═══ Detail / Action Modal ═══ */}
      {(detailRequest || detailLoading) && (
        <DetailModal
          request={detailRequest} loading={detailLoading} actionLoading={actionLoading}
          rejectionReason={rejectionReason} setRejectionReason={setRejectionReason}
          onAction={handleAction} onClose={() => setDetailRequest(null)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   REQUESTS TAB
   ══════════════════════════════════════════ */
function RequestsTab({ requests, loading, search, setSearch, showFilters, setShowFilters, deptFilter, setDeptFilter, employeeFilter, setEmployeeFilter, departments, employees, openDetail }: {
  requests: LeaveRequest[]; loading: boolean; search: string; setSearch: (s: string) => void;
  showFilters: boolean; setShowFilters: (b: boolean) => void;
  deptFilter: string; setDeptFilter: (s: string) => void; employeeFilter: string; setEmployeeFilter: (s: string) => void;
  departments: DeptOption[]; employees: Employee[]; openDetail: (id: string) => void;
}) {
  return (
    <>
      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by employee name, number, or leave type..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className={`pl-10 w-full ${INPUT_CLS}`} />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm ${
            showFilters || deptFilter || employeeFilter
              ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}>
          <Filter className="w-4 h-4" /> Filters
          {(deptFilter || employeeFilter) && (
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">
              {[deptFilter, employeeFilter].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={INPUT_CLS}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className={INPUT_CLS}>
            <option value="">All Employees</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeNumber})</option>)}
          </select>
          {(deptFilter || employeeFilter) && (
            <button onClick={() => { setDeptFilter(''); setEmployeeFilter(''); }}
              className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Data */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          <CalendarDays className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No leave requests found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Leave Type</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dates</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Days</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Submitted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {requests.map((r) => {
                  const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.PENDING;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => openDetail(r.id)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {r.employee.firstName[0]}{r.employee.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{r.employee.firstName} {r.employee.lastName}</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">{r.employee.employeeNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{r.leaveTypeName}</span>
                        {r.isHalfDay && <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400">(Half)</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {fmtDate(r.startDate)}
                        {r.startDate !== r.endDate && <> <ArrowRight className="inline w-3 h-3 mx-1" /> {fmtDate(r.endDate)}</>}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">{r.daysRequested}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.color}`}>
                          {sc.icon} {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">{fmtDate(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Eye className="w-4 h-4 text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════
   NEW REQUEST TAB (with balance preview)
   ══════════════════════════════════════════ */
function NewRequestTab({ orgSlug, leaveTypes, employees, onSuccess, setError }: {
  orgSlug: string; leaveTypes: LeaveType[]; employees: Employee[];
  onSuccess: () => void; setError: (s: string) => void;
}) {
  const [form, setForm] = useState({
    employeeId: '', leaveTypeId: '', startDate: '', endDate: '', isHalfDay: false,
    halfDayPeriod: 'MORNING', reason: '', attachmentUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [balLoading, setBalLoading] = useState(false);

  // Load balances when employee changes
  useEffect(() => {
    if (!form.employeeId) { setBalances([]); return; }
    setBalLoading(true);
    fetch(`/api/${orgSlug}/hcm/leave-balances?employeeId=${form.employeeId}`)
      .then(r => r.json())
      .then(j => setBalances(j.data?.balances || []))
      .catch(() => setBalances([]))
      .finally(() => setBalLoading(false));
  }, [orgSlug, form.employeeId]);

  const selectedBalance = balances.find(b => b.leaveTypeId === form.leaveTypeId);
  const selectedType = leaveTypes.find(t => t.id === form.leaveTypeId);

  // Estimate days
  const estimatedDays = useMemo(() => {
    if (!form.startDate) return 0;
    if (form.isHalfDay) return 0.5;
    if (!form.endDate) return 1;
    const s = new Date(form.startDate); const e = new Date(form.endDate);
    let count = 0;
    const cur = new Date(s);
    while (cur <= e) { const d = cur.getDay(); if (d !== 0 && d !== 6) count++; cur.setDate(cur.getDate() + 1); }
    return count;
  }, [form.startDate, form.endDate, form.isHalfDay]);

  const remainingAfter = selectedBalance ? selectedBalance.effectiveBalance - estimatedDays : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.leaveTypeId || !form.startDate) {
      setError('Please fill in all required fields'); return;
    }
    setSubmitting(true);
    try {
      const body = {
        ...form,
        endDate: form.endDate || form.startDate,
        isHalfDay: form.isHalfDay,
        halfDayPeriod: form.isHalfDay ? form.halfDayPeriod : undefined,
        attachmentUrl: form.attachmentUrl || undefined,
      };
      const res = await fetch(`/api/${orgSlug}/hcm/leave-requests`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to submit');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Submit Leave Request
        </h2>

        {/* Employee */}
        <div>
          <label className={LABEL_CLS}>Employee *</label>
          <select value={form.employeeId} onChange={(e) => setForm(p => ({ ...p, employeeId: e.target.value, leaveTypeId: '' }))}
            className={`w-full ${INPUT_CLS}`} required>
            <option value="">Select employee...</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeNumber})</option>)}
          </select>
        </div>

        {/* Leave Type */}
        <div>
          <label className={LABEL_CLS}>Leave Type *</label>
          <select value={form.leaveTypeId} onChange={(e) => setForm(p => ({ ...p, leaveTypeId: e.target.value }))}
            className={`w-full ${INPUT_CLS}`} required>
            <option value="">Select leave type...</option>
            {leaveTypes.filter(t => t.isActive).map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.isPaid ? 'Paid' : 'Unpaid'} · {t.daysPerYear} days/yr)</option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Start Date *</label>
            <input type="date" value={form.startDate} onChange={(e) => setForm(p => ({ ...p, startDate: e.target.value }))}
              className={`w-full ${INPUT_CLS}`} required />
          </div>
          <div>
            <label className={LABEL_CLS}>End Date {form.isHalfDay ? '(same day)' : ''}</label>
            <input type="date" value={form.isHalfDay ? form.startDate : form.endDate}
              onChange={(e) => setForm(p => ({ ...p, endDate: e.target.value }))}
              className={`w-full ${INPUT_CLS}`} disabled={form.isHalfDay}
              min={form.startDate || undefined} />
          </div>
        </div>

        {/* Half-Day Toggle */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isHalfDay}
              onChange={(e) => setForm(p => ({ ...p, isHalfDay: e.target.checked, endDate: e.target.checked ? p.startDate : p.endDate }))}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Half-day leave</span>
          </label>
          {form.isHalfDay && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setForm(p => ({ ...p, halfDayPeriod: 'MORNING' }))}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  form.halfDayPeriod === 'MORNING'
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}>
                <Sun className="w-3 h-3" /> Morning
              </button>
              <button type="button" onClick={() => setForm(p => ({ ...p, halfDayPeriod: 'AFTERNOON' }))}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  form.halfDayPeriod === 'AFTERNOON'
                    ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}>
                <Moon className="w-3 h-3" /> Afternoon
              </button>
            </div>
          )}
        </div>

        {/* Reason */}
        <div>
          <label className={LABEL_CLS}>Reason</label>
          <textarea value={form.reason} onChange={(e) => setForm(p => ({ ...p, reason: e.target.value }))}
            rows={3} placeholder="Brief reason for leave..."
            className={`w-full ${INPUT_CLS} resize-none`} />
        </div>

        {/* Attachment */}
        {selectedType?.requiresAttachment && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <Paperclip className="w-4 h-4 shrink-0" />
            This leave type requires a supporting document
          </div>
        )}
        <div>
          <label className={LABEL_CLS}>Attachment URL</label>
          <input type="url" value={form.attachmentUrl} onChange={(e) => setForm(p => ({ ...p, attachmentUrl: e.target.value }))}
            placeholder="https://..." className={`w-full ${INPUT_CLS}`} />
        </div>

        {/* Estimate */}
        {estimatedDays > 0 && (
          <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
            <div className="text-blue-700 dark:text-blue-400">
              <span className="font-bold text-lg">{estimatedDays}</span>
              <span className="ml-1 text-xs">business {estimatedDays === 1 ? 'day' : 'days'}</span>
            </div>
            {remainingAfter !== null && (
              <div className={`ml-auto text-xs font-medium ${
                remainingAfter >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {remainingAfter >= 0
                  ? `${remainingAfter} days remaining after this request`
                  : `Exceeds balance by ${Math.abs(remainingAfter)} days`}
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold shadow-sm">
          {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {submitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>

      {/* Balance Sidebar */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Leave Balances
          </h3>
          {!form.employeeId ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">Select an employee to view balances</p>
          ) : balLoading ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            </div>
          ) : balances.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">No leave entitlements configured</p>
          ) : (
            <div className="space-y-3">
              {balances.map((b) => {
                const pct = b.annualAllotment > 0 ? Math.min(100, ((b.usedDays + b.pendingDays) / b.annualAllotment) * 100) : 0;
                const isSelected = b.leaveTypeId === form.leaveTypeId;
                return (
                  <div key={b.leaveTypeId}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                    }`}
                    onClick={() => setForm(p => ({ ...p, leaveTypeId: b.leaveTypeId }))}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{b.leaveTypeName}</span>
                      <span className={`text-xs font-bold ${b.effectiveBalance > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {b.effectiveBalance} left
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-1">
                      <div className={`h-1.5 rounded-full transition-all ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
                      <span>Used: {b.usedDays} · Pending: {b.pendingDays}</span>
                      <span>Total: {b.annualAllotment}{b.carryForwardDays > 0 ? ` +${b.carryForwardDays} CF` : ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   APPROVALS TAB
   ══════════════════════════════════════════ */
function ApprovalsTab({ requests, loading, openDetail }: {
  requests: LeaveRequest[]; loading: boolean; openDetail: (id: string) => void;
}) {
  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  if (requests.length === 0) return (
    <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
      <CheckCircle2 className="w-12 h-12 mx-auto text-green-300 dark:text-green-800 mb-3" />
      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">All caught up!</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">No pending leave requests to review</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {requests.map((r) => (
        <div key={r.id} onClick={() => openDetail(r.id)}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all cursor-pointer group">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {r.employee.firstName[0]}{r.employee.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                  {r.employee.firstName} {r.employee.lastName}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                  <Clock className="w-3 h-3" /> Pending
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.employee.employeeNumber}</p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">{r.leaveTypeName}</span>
              <span className="font-bold text-gray-900 dark:text-white">{r.daysRequested} {r.isHalfDay ? 'half' : ''} day{r.daysRequested !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <CalendarDays className="w-3 h-3" />
              {fmtDate(r.startDate)} {r.startDate !== r.endDate && `— ${fmtDate(r.endDate)}`}
            </div>
            {r.reason && (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-2">&quot;{r.reason}&quot;</p>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); openDetail(r.id); }}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">
              <CheckCircle2 className="w-3 h-3" /> Review
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   CALENDAR TAB
   ══════════════════════════════════════════ */
function CalendarTab({ orgSlug }: { orgSlug: string }) {
  const [calDate, setCalDate] = useState(new Date());
  const [events, setEvents] = useState<LeaveRequest[]>([]);
  const [calLoading, setCalLoading] = useState(true);

  const year = calDate.getFullYear();
  const month = calDate.getMonth();

  useEffect(() => {
    setCalLoading(true);
    fetch(`/api/${orgSlug}/hcm/leave-requests?year=${year}&month=${month + 1}&status=APPROVED`)
      .then(r => r.json())
      .then(j => setEvents(j.data || []))
      .catch(() => setEvents([]))
      .finally(() => setCalLoading(false));
  }, [orgSlug, year, month]);

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calCells = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - firstDay + 1;
    return dayNum > 0 && dayNum <= daysInMonth ? dayNum : null;
  });

  const getEventsForDay = (day: number) => {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return events.filter((ev) => {
      const s = new Date(ev.startDate); s.setHours(0, 0, 0, 0);
      const e = new Date(ev.endDate); e.setHours(23, 59, 59);
      return d >= s && d <= e;
    });
  };

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const COLORS = ['bg-blue-200 dark:bg-blue-800/50 text-blue-800 dark:text-blue-300', 'bg-green-200 dark:bg-green-800/50 text-green-800 dark:text-green-300', 'bg-purple-200 dark:bg-purple-800/50 text-purple-800 dark:text-purple-300', 'bg-pink-200 dark:bg-pink-800/50 text-pink-800 dark:text-pink-300', 'bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-300', 'bg-cyan-200 dark:bg-cyan-800/50 text-cyan-800 dark:text-cyan-300'];
  const colorMap: Record<string, string> = {};
  let ci = 0;
  const getColor = (id: string) => {
    if (!colorMap[id]) { colorMap[id] = COLORS[ci % COLORS.length]; ci++; }
    return colorMap[id];
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      {/* Month Nav */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <button onClick={() => setCalDate(new Date(year, month - 1, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{monthNames[month]} {year}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{events.length} approved leave{events.length !== 1 ? 's' : ''} this month</p>
        </div>
        <button onClick={() => setCalDate(new Date(year, month + 1, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {calLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="p-4">
          <div className="grid grid-cols-7 gap-px mb-2">
            {dayNames.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            {calCells.map((day, i) => {
              const dayEvents = day ? getEventsForDay(day) : [];
              const isToday = day && year === new Date().getFullYear() && month === new Date().getMonth() && day === new Date().getDate();
              const isWeekend = i % 7 === 0 || i % 7 === 6;
              return (
                <div key={i} className={`min-h-[80px] p-1 ${
                  day ? (isWeekend ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-900') : 'bg-gray-50/50 dark:bg-gray-900/30'
                }`}>
                  {day && (
                    <>
                      <div className={`text-xs font-medium mb-0.5 ${
                        isToday ? 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center' : 'text-gray-700 dark:text-gray-300 pl-1'
                      }`}>{day}</div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <div key={ev.id} className={`px-1 py-0.5 rounded text-[9px] truncate font-medium ${getColor(ev.employeeId)}`}>
                            {ev.employee.firstName} {ev.employee.lastName[0]}.
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="px-1 text-[9px] text-gray-400 dark:text-gray-500 font-medium">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   LEAVE TYPES TAB
   ══════════════════════════════════════════ */
function LeaveTypesTab({ leaveTypes, orgSlug, onRefresh, setError, setSuccess }: {
  leaveTypes: LeaveType[]; orgSlug: string; onRefresh: () => void;
  setError: (s: string) => void; setSuccess: (s: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '', name: '', description: '', daysPerYear: 20, isPaid: true,
    requiresApproval: true, requiresAttachment: false, maxCarryForward: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name) { setError('Code and Name are required'); return; }
    setSaving(true);
    try {
      const body = {
        ...form, daysPerYear: Number(form.daysPerYear),
        maxCarryForward: form.maxCarryForward ? Number(form.maxCarryForward) : null,
      };
      const res = await fetch(`/api/${orgSlug}/hcm/leave-types`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create');
      setSuccess('Leave type created!');
      setShowForm(false);
      setForm({ code: '', name: '', description: '', daysPerYear: 20, isPaid: true, requiresApproval: true, requiresAttachment: false, maxCarryForward: '' });
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leave Type Configuration</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">
          <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Add Type'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={LABEL_CLS}>Code *</label>
              <input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. ANNUAL" className={`w-full ${INPUT_CLS}`} required />
            </div>
            <div>
              <label className={LABEL_CLS}>Name *</label>
              <input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Annual Leave" className={`w-full ${INPUT_CLS}`} required />
            </div>
            <div>
              <label className={LABEL_CLS}>Days Per Year</label>
              <input type="number" value={form.daysPerYear} onChange={(e) => setForm(p => ({ ...p, daysPerYear: +e.target.value }))}
                min={0} className={`w-full ${INPUT_CLS}`} />
            </div>
            <div>
              <label className={LABEL_CLS}>Max Carry Forward</label>
              <input type="number" value={form.maxCarryForward} onChange={(e) => setForm(p => ({ ...p, maxCarryForward: e.target.value }))}
                min={0} placeholder="None" className={`w-full ${INPUT_CLS}`} />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPaid} onChange={(e) => setForm(p => ({ ...p, isPaid: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Paid</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.requiresApproval} onChange={(e) => setForm(p => ({ ...p, requiresApproval: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Requires Approval</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.requiresAttachment} onChange={(e) => setForm(p => ({ ...p, requiresAttachment: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Requires Attachment</span>
              </label>
            </div>
          </div>
          <div>
            <label className={LABEL_CLS}>Description</label>
            <input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Optional description" className={`w-full ${INPUT_CLS}`} />
          </div>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Create Leave Type'}
          </button>
        </form>
      )}

      {/* Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {leaveTypes.map((lt) => (
          <div key={lt.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{lt.name}</h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{lt.code}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                lt.isActive
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}>{lt.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-gray-400 dark:text-gray-500">Days/Year</p>
                <p className="font-bold text-gray-900 dark:text-white">{lt.daysPerYear}</p>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-gray-400 dark:text-gray-500">Carry Forward</p>
                <p className="font-bold text-gray-900 dark:text-white">{lt.maxCarryForward ?? '—'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${lt.isPaid ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                {lt.isPaid ? 'Paid' : 'Unpaid'}
              </span>
              {lt.requiresApproval && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">Approval Required</span>
              )}
              {lt.requiresAttachment && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                  <Paperclip className="w-3 h-3 inline" /> Attachment
                </span>
              )}
              {lt._count && (
                <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">{lt._count.leaveRequests} request{lt._count.leaveRequests !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        ))}
        {leaveTypes.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
            <BarChart3 className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No leave types configured</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create leave types to start managing leave</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   DETAIL / ACTION MODAL
   ══════════════════════════════════════════ */
function DetailModal({ request, loading, actionLoading, rejectionReason, setRejectionReason, onAction, onClose }: {
  request: (LeaveRequest & { overlaps?: any[] }) | null; loading: boolean; actionLoading: boolean;
  rejectionReason: string; setRejectionReason: (s: string) => void;
  onAction: (action: 'APPROVE' | 'REJECT' | 'CANCEL') => void; onClose: () => void;
}) {
  const [showRejectInput, setShowRejectInput] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X className="w-5 h-5" />
        </button>

        {loading || !request ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Employee Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                {request.employee.firstName[0]}{request.employee.lastName[0]}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{request.employee.firstName} {request.employee.lastName}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {request.employee.employeeNumber}
                  {request.employee.department && ` · ${request.employee.department.name}`}
                </p>
              </div>
            </div>

            {/* Leave Info */}
            <div className="grid grid-cols-2 gap-3">
              <InfoBox label="Leave Type" value={request.leaveTypeName} />
              <InfoBox label="Status" value={
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CONFIG[request.status]?.color || ''}`}>
                  {STATUS_CONFIG[request.status]?.icon} {STATUS_CONFIG[request.status]?.label || request.status}
                </span>
              } />
              <InfoBox label="Start Date" value={fmtDate(request.startDate)} />
              <InfoBox label="End Date" value={fmtDate(request.endDate)} />
              <InfoBox label="Days Requested" value={
                <span className="text-lg font-bold">{request.daysRequested}{request.isHalfDay ? ` (${request.halfDayPeriod})` : ''}</span>
              } />
              <InfoBox label="Submitted" value={fmtDate(request.createdAt)} />
            </div>

            {request.reason && (
              <div>
                <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Reason</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">{request.reason}</p>
              </div>
            )}

            {request.attachmentUrl && (
              <a href={request.attachmentUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                <Paperclip className="w-4 h-4" /> View Attachment
              </a>
            )}

            {request.rejectionReason && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-[10px] font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider mb-1">Rejection Reason</p>
                <p className="text-sm text-red-700 dark:text-red-300">{request.rejectionReason}</p>
              </div>
            )}

            {/* Overlap Warning */}
            {request.overlaps && request.overlaps.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-2">
                  <AlertTriangle className="w-4 h-4" /> Department Overlap Warning
                </p>
                <div className="space-y-1">
                  {request.overlaps.map((o: any, i: number) => (
                    <p key={i} className="text-xs text-amber-600 dark:text-amber-300">
                      {o.employeeName} — {fmtDate(o.startDate)} to {fmtDate(o.endDate)} ({o.status})
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Actions for PENDING */}
            {request.status === 'PENDING' && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                {showRejectInput && (
                  <div>
                    <label className={LABEL_CLS}>Rejection Reason *</label>
                    <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                      rows={2} placeholder="Reason for rejecting..." className={`w-full ${INPUT_CLS} resize-none`} />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={() => onAction('APPROVE')} disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                  {showRejectInput ? (
                    <button onClick={() => onAction('REJECT')} disabled={actionLoading || !rejectionReason.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-semibold">
                      <XCircle className="w-4 h-4" /> Confirm Reject
                    </button>
                  ) : (
                    <button onClick={() => setShowRejectInput(true)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-semibold">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Cancel for PENDING/APPROVED */}
            {(request.status === 'PENDING' || request.status === 'APPROVED') && (
              <button onClick={() => onAction('CANCEL')} disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">
                <Ban className="w-4 h-4" /> Cancel Request
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SHARED COMPONENTS / UTILS
   ══════════════════════════════════════════ */
function MetricCard({ label, value, color, active, onClick }: {
  label: string; value: number; color: string; active: boolean; onClick: () => void;
}) {
  const colors: Record<string, string> = {
    blue: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    green: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    amber: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
    red: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    gray: 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  };
  return (
    <button onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-all ${
        active ? `${colors[color]} ring-2 ring-offset-1 ring-current` : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
      }`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider font-medium mt-1 opacity-70">{label}</p>
    </button>
  );
}

function InfoBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <div className="text-sm text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

function fmtDate(dateStr: string) {
  try { return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return dateStr; }
}
