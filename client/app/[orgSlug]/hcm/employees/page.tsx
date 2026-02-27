'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Users, Plus, Search, Building2, Briefcase, Phone, Mail,
  MessageSquare, Filter, UserCheck, UserX, Clock, AlertTriangle,
  ChevronRight, BarChart3, Shield, ArrowLeft, CalendarDays, Receipt,
} from 'lucide-react';
import Link from 'next/link';

/* ───── Types ───── */
interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  profileImage?: string;
  hireDate: string;
  status: string;
  employmentType: string;
  department?: { id: string; code: string; name: string } | null;
  branch?: { id: string; code: string; name: string } | null;
  jobTitle?: string | null;
  managerName?: string | null;
  managerId?: string | null;
  hasUserAccount: boolean;
  userIsActive?: boolean | null;
  isActive: boolean;
}

interface Metrics {
  total: number;
  active: number;
  onLeave: number;
  terminated: number;
  suspended: number;
}

interface DeptOption { id: string; name: string; code: string }
interface BranchOption { id: string; name: string; code: string }

/* ───── Constants ───── */
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', icon: <UserCheck className="w-3 h-3" /> },
  ON_LEAVE: { label: 'On Leave', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', icon: <Clock className="w-3 h-3" /> },
  SUSPENDED: { label: 'Suspended', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400', icon: <AlertTriangle className="w-3 h-3" /> },
  TERMINATED: { label: 'Terminated', color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400', icon: <UserX className="w-3 h-3" /> },
  RETIRED: { label: 'Retired', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400', icon: <Shield className="w-3 h-3" /> },
};

const EMPLOYMENT_TYPES: Record<string, string> = {
  FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract',
  TEMPORARY: 'Temporary', INTERN: 'Intern',
};

const INPUT_CLS = 'px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

/* ═══════════ MAIN ═══════════ */
export default function EmployeesDirectoryPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, active: 0, onLeave: 0, terminated: 0, suspended: 0 });
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (statusFilter) qs.set('status', statusFilter);
      if (deptFilter) qs.set('departmentId', deptFilter);
      if (branchFilter) qs.set('branchId', branchFilter);
      if (typeFilter) qs.set('employmentType', typeFilter);

      const res = await fetch(`/api/${orgSlug}/hcm/employees?${qs.toString()}`);
      if (!res.ok) throw new Error('Failed to load employees');
      const json = await res.json();
      setEmployees(json.data || []);
      if (json.metrics) setMetrics(json.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, search, statusFilter, deptFilter, branchFilter, typeFilter]);

  const loadRefs = useCallback(async () => {
    try {
      const [dRes, bRes] = await Promise.all([
        fetch(`/api/${orgSlug}/hcm/departments`).catch(() => null),
        fetch(`/api/${orgSlug}/branches`).catch(() => null),
      ]);
      if (dRes?.ok) {
        const j = await dRes.json();
        setDepartments(j.data || j.departments || []);
      }
      if (bRes?.ok) {
        const j = await bRes.json();
        setBranches(j.data || j.branches || []);
      }
    } catch { /* best effort */ }
  }, [orgSlug]);

  useEffect(() => { loadRefs(); }, [loadRefs]);
  useEffect(() => {
    const timer = setTimeout(() => loadEmployees(), 300);
    return () => clearTimeout(timer);
  }, [loadEmployees]);

  function getInitials(emp: Employee) {
    return `${emp.firstName[0] || ''}${emp.lastName[0] || ''}`.toUpperCase();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* HCM Navigation Bar */}
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
              <Users className="w-3.5 h-3.5" /> Employees
            </Link>
            <Link href={`/${orgSlug}/hcm/leave-requests`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <CalendarDays className="w-3.5 h-3.5" /> Leave
            </Link>
            <Link href={`/${orgSlug}/hcm/expense-claims`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
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
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Employee Directory
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your organization&apos;s workforce — {metrics.total} total employees
            </p>
          </div>
          <button onClick={() => router.push(`/${orgSlug}/hcm/employees/new`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm">
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard label="Total" value={metrics.total} color="blue" active={!statusFilter}
            onClick={() => setStatusFilter('')} />
          <MetricCard label="Active" value={metrics.active} color="green" active={statusFilter === 'ACTIVE'}
            onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? '' : 'ACTIVE')} />
          <MetricCard label="On Leave" value={metrics.onLeave} color="amber" active={statusFilter === 'ON_LEAVE'}
            onClick={() => setStatusFilter(statusFilter === 'ON_LEAVE' ? '' : 'ON_LEAVE')} />
          <MetricCard label="Suspended" value={metrics.suspended} color="orange" active={statusFilter === 'SUSPENDED'}
            onClick={() => setStatusFilter(statusFilter === 'SUSPENDED' ? '' : 'SUSPENDED')} />
          <MetricCard label="Terminated" value={metrics.terminated} color="red" active={statusFilter === 'TERMINATED'}
            onClick={() => setStatusFilter(statusFilter === 'TERMINATED' ? '' : 'TERMINATED')} />
        </div>

        {/* Search + Filters Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by name, employee number, or email..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className={`pl-10 w-full ${INPUT_CLS}`} />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm ${
              showFilters || deptFilter || branchFilter || typeFilter
                ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            <Filter className="w-4 h-4" /> Filters
            {(deptFilter || branchFilter || typeFilter) && (
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">
                {[deptFilter, branchFilter, typeFilter].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={INPUT_CLS}>
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className={INPUT_CLS}>
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={INPUT_CLS}>
              <option value="">All Types</option>
              {Object.entries(EMPLOYMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {(deptFilter || branchFilter || typeFilter) && (
              <button onClick={() => { setDeptFilter(''); setBranchFilter(''); setTypeFilter(''); }}
                className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Employee Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
            <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No employees found</p>
            <button onClick={() => router.push(`/${orgSlug}/hcm/employees/new`)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <Plus className="w-4 h-4 inline mr-1" /> Add First Employee
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {employees.map((emp) => {
              const sc = STATUS_CONFIG[emp.status] || STATUS_CONFIG.ACTIVE;
              return (
                <div key={emp.id}
                  onClick={() => router.push(`/${orgSlug}/hcm/employees/${emp.id}`)}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {emp.profileImage ? (
                        <img src={emp.profileImage} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        getInitials(emp)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                          {emp.firstName} {emp.middleName ? `${emp.middleName} ` : ''}{emp.lastName}
                        </h3>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.color}`}>
                          {sc.icon} {sc.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {emp.jobTitle || 'No title'} · <span className="font-mono">{emp.employeeNumber}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                        {emp.department && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3" /> {emp.department.name}
                          </span>
                        )}
                        {emp.branch && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {emp.branch.name}
                          </span>
                        )}
                      </div>
                      {emp.managerName && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                          Reports to {emp.managerName}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                  </div>
                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    {emp.phone && (
                      <a href={`tel:${emp.phone}`} onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded text-[10px] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Phone className="w-3 h-3" /> Call
                      </a>
                    )}
                    {emp.whatsapp && (
                      <a href={`https://wa.me/${emp.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded text-[10px] text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30">
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </a>
                    )}
                    {emp.email && (
                      <a href={`mailto:${emp.email}`} onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded text-[10px] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Mail className="w-3 h-3" /> Email
                      </a>
                    )}
                    <span className="ml-auto text-[10px] text-gray-300 dark:text-gray-600">
                      {EMPLOYMENT_TYPES[emp.employmentType] || emp.employmentType}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ────── Sub-components ────── */
function MetricCard({ label, value, color, active, onClick }: {
  label: string; value: number; color: string; active: boolean; onClick: () => void;
}) {
  const colors: Record<string, string> = {
    blue: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    green: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    amber: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
    orange: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
    red: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
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
