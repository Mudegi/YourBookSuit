'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Edit3, X, User, Building2, Briefcase, Phone,
  Mail, MessageSquare, Calendar, DollarSign, Shield, MapPin,
  UserCheck, UserX, Clock, AlertTriangle, Trash2, Heart,
  FileText, CreditCard, Globe, Users, ChevronRight, Link2,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';

/* ───── Types ───── */
interface Employee {
  id: string;
  organizationId: string;
  userId: string | null;
  branchId: string | null;
  employeeNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  profileImage: string | null;
  dateOfBirth: string | null;
  nationalId: string | null;
  socialSecurityNo: string | null;
  hireDate: string;
  probationEndDate: string | null;
  terminationDate: string | null;
  status: string;
  jobTitleId: string | null;
  departmentId: string | null;
  positionId: string | null;
  managerId: string | null;
  workLocation: string | null;
  employmentType: string;
  payrollCurrency: string;
  baseSalary: number | null;
  payFrequency: string;
  taxIdNumber: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  bankBranch: string | null;
  bankSortCode: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  localVillage: string | null;
  localParish: string | null;
  localDistrict: string | null;
  localRegion: string | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  nextOfKinRelation: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  department: { id: string; code: string; name: string } | null;
  branch: { id: string; code: string; name: string } | null;
  jobTitle: { id: string; title: string } | null;
  position: { id: string; positionNumber: string } | null;
  manager: { id: string; firstName: string; lastName: string; employeeNumber: string; email: string | null } | null;
  directReports: { id: string; firstName: string; lastName: string; employeeNumber: string; status: string; jobTitle: { title: string } | null }[];
  user: { id: string; email: string; isActive: boolean; lastLoginAt: string | null } | null;
  leaveRequests: { id: string; status: string; startDate: string; endDate: string; createdAt: string }[];
}

/* ───── Constants ───── */
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  ON_LEAVE: { label: 'On Leave', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  SUSPENDED: { label: 'Suspended', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
  TERMINATED: { label: 'Terminated', color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
  RETIRED: { label: 'Retired', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
};

const EMPLOYMENT_TYPES: Record<string, string> = {
  FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract',
  TEMPORARY: 'Temporary', INTERN: 'Intern',
};

const PAY_FREQ: Record<string, string> = {
  WEEKLY: 'Weekly', BI_WEEKLY: 'Bi-weekly', SEMI_MONTHLY: 'Semi-monthly',
  MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', ANNUALLY: 'Annually',
};

const GENDERS: Record<string, string> = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' };

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none';
const LABEL_CLS = 'block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1';

type Tab = 'general' | 'payroll' | 'documents' | 'emergency';

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtCurrency(n: number | null, curr: string) {
  if (n == null) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: curr, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  } catch { return `${curr} ${n.toLocaleString()}`; }
}

/* ═══════════ MAIN ═══════════ */
export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const id = params?.id as string;
  const { currency: orgCurrency } = useOrganization();

  const [emp, setEmp] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>('general');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Edit form state (flat object mirrors all fields)
  const [form, setForm] = useState<Record<string, any>>({});

  const loadEmployee = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${orgSlug}/hcm/employees/${id}`);
      if (!res.ok) throw new Error('Failed to load employee');
      const json = await res.json();
      setEmp(json.data);
      populateForm(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, id]);

  function populateForm(e: Employee) {
    setForm({
      firstName: e.firstName || '',
      middleName: e.middleName || '',
      lastName: e.lastName || '',
      gender: e.gender || '',
      email: e.email || '',
      phone: e.phone || '',
      whatsapp: e.whatsapp || '',
      dateOfBirth: e.dateOfBirth ? new Date(e.dateOfBirth).toISOString().slice(0, 10) : '',
      nationalId: e.nationalId || '',
      socialSecurityNo: e.socialSecurityNo || '',
      hireDate: e.hireDate ? new Date(e.hireDate).toISOString().slice(0, 10) : '',
      probationEndDate: e.probationEndDate ? new Date(e.probationEndDate).toISOString().slice(0, 10) : '',
      employmentType: e.employmentType || 'FULL_TIME',
      workLocation: e.workLocation || '',
      // Payroll
      payrollCurrency: e.payrollCurrency || orgCurrency || '',
      baseSalary: e.baseSalary != null ? String(e.baseSalary) : '',
      payFrequency: e.payFrequency || 'MONTHLY',
      taxIdNumber: e.taxIdNumber || '',
      bankName: e.bankName || '',
      bankBranch: e.bankBranch || '',
      bankAccountNumber: e.bankAccountNumber || '',
      bankSortCode: e.bankSortCode || '',
      // Address
      address: e.address || '',
      city: e.city || '',
      state: e.state || '',
      postalCode: e.postalCode || '',
      country: e.country || '',
      localVillage: e.localVillage || '',
      localParish: e.localParish || '',
      localDistrict: e.localDistrict || '',
      localRegion: e.localRegion || '',
      // Emergency
      nextOfKinName: e.nextOfKinName || '',
      nextOfKinPhone: e.nextOfKinPhone || '',
      nextOfKinRelation: e.nextOfKinRelation || '',
      emergencyContact: e.emergencyContact || '',
      emergencyPhone: e.emergencyPhone || '',
      notes: e.notes || '',
    });
  }

  useEffect(() => { loadEmployee(); }, [loadEmployee]);

  function updateForm(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, any> = { ...form };
      if (payload.baseSalary) payload.baseSalary = Number(payload.baseSalary);
      else payload.baseSalary = null;
      // Clean empty strings to null for optional fields
      for (const key of Object.keys(payload)) {
        if (payload[key] === '') payload[key] = null;
      }
      // Don't null required fields
      if (!payload.firstName) payload.firstName = emp?.firstName;
      if (!payload.lastName) payload.lastName = emp?.lastName;
      if (!payload.hireDate) payload.hireDate = emp?.hireDate;

      const res = await fetch(`/api/${orgSlug}/hcm/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Save failed');
      }
      setEditing(false);
      loadEmployee();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    try {
      const res = await fetch(`/api/${orgSlug}/hcm/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setShowStatusModal(false);
      loadEmployee();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status change failed');
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/${orgSlug}/hcm/employees/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      router.push(`/${orgSlug}/hcm/employees`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="p-6">
        <button onClick={() => router.push(`/${orgSlug}/hcm/employees`)}
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to directory
        </button>
        <p className="text-gray-500 dark:text-gray-400">Employee not found.</p>
      </div>
    );
  }

  const sc = STATUS_CONFIG[emp.status] || STATUS_CONFIG.ACTIVE;
  const tenure = Math.floor((Date.now() - new Date(emp.hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const onProbation = emp.probationEndDate && new Date(emp.probationEndDate) > new Date();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ─── Header ─── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <button onClick={() => router.push(`/${orgSlug}/hcm/employees`)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg mt-1">
                <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
                {emp.profileImage ? (
                  <img src={emp.profileImage} alt="" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  `${emp.firstName[0]}${emp.lastName[0]}`
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {emp.firstName} {emp.middleName ? `${emp.middleName} ` : ''}{emp.lastName}
                  </h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${sc.color}`}>{sc.label}</span>
                  {onProbation && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                      PROBATION
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-mono">{emp.employeeNumber}</span>
                  {emp.jobTitle && (
                    <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {emp.jobTitle.title}</span>
                  )}
                  {emp.department && (
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {emp.department.name}</span>
                  )}
                  {emp.branch && (
                    <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {emp.branch.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  {emp.phone && (
                    <a href={`tel:${emp.phone}`}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                      <Phone className="w-3 h-3" /> Call
                    </a>
                  )}
                  {emp.whatsapp && (
                    <a href={`https://wa.me/${emp.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30">
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </a>
                  )}
                  {emp.email && (
                    <a href={`mailto:${emp.email}`}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                      <Mail className="w-3 h-3" /> Email
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setShowStatusModal(true)}
                className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                Change Status
              </button>
              <button onClick={() => { setEditing(!editing); if (!editing && emp) populateForm(emp); }}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                {editing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                {editing ? 'Cancel' : 'Edit'}
              </button>
              <button onClick={() => setShowDeleteConfirm(true)}
                className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 hover:text-red-500 hover:border-red-300 dark:hover:border-red-700">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 flex gap-4 border-t border-gray-100 dark:border-gray-800">
          {([
            { key: 'general' as Tab, label: 'General', icon: <User className="w-4 h-4" /> },
            { key: 'payroll' as Tab, label: 'Payroll & Financial', icon: <CreditCard className="w-4 h-4" /> },
            { key: 'documents' as Tab, label: 'Documents & Notes', icon: <FileText className="w-4 h-4" /> },
            { key: 'emergency' as Tab, label: 'Emergency & Next of Kin', icon: <Heart className="w-4 h-4" /> },
          ]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* ─── Content ─── */}
      <div className="px-6 py-6">
        <div className="flex gap-6">
          {/* Main Column */}
          <div className="flex-1 space-y-6">
            {/* ──── GENERAL TAB ──── */}
            {tab === 'general' && !editing && (
              <>
                {/* Personal Info */}
                <Section title="Personal Information" icon={<User className="w-4 h-4 text-blue-500" />}>
                  <InfoGrid>
                    <InfoRow label="Full Name" value={`${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim()} />
                    <InfoRow label="Gender" value={GENDERS[emp.gender || ''] || emp.gender || '—'} />
                    <InfoRow label="Date of Birth" value={fmtDate(emp.dateOfBirth)} />
                    <InfoRow label="National ID" value={emp.nationalId || '—'} sensitive />
                    <InfoRow label="Social Security No." value={emp.socialSecurityNo || '—'} sensitive />
                    <InfoRow label="Tax ID (TIN)" value={emp.taxIdNumber || '—'} sensitive />
                  </InfoGrid>
                </Section>

                {/* Employment Details */}
                <Section title="Employment Details" icon={<Briefcase className="w-4 h-4 text-purple-500" />}>
                  <InfoGrid>
                    <InfoRow label="Employee Number" value={emp.employeeNumber} />
                    <InfoRow label="Employment Type" value={EMPLOYMENT_TYPES[emp.employmentType] || emp.employmentType} />
                    <InfoRow label="Hire Date" value={fmtDate(emp.hireDate)} />
                    <InfoRow label="Tenure" value={tenure > 0 ? `${tenure} year${tenure !== 1 ? 's' : ''}` : 'Less than 1 year'} />
                    <InfoRow label="Probation End" value={fmtDate(emp.probationEndDate)} />
                    <InfoRow label="Work Location" value={emp.workLocation || '—'} />
                    {emp.terminationDate && <InfoRow label="Termination Date" value={fmtDate(emp.terminationDate)} />}
                  </InfoGrid>
                </Section>

                {/* Contact Info */}
                <Section title="Contact Information" icon={<Phone className="w-4 h-4 text-green-500" />}>
                  <InfoGrid>
                    <InfoRow label="Email" value={emp.email || '—'} />
                    <InfoRow label="Phone" value={emp.phone || '—'} />
                    <InfoRow label="WhatsApp" value={emp.whatsapp || '—'} />
                  </InfoGrid>
                </Section>

                {/* Address */}
                <Section title="Address" icon={<MapPin className="w-4 h-4 text-red-500" />}>
                  <InfoGrid>
                    <InfoRow label="Street Address" value={emp.address || '—'} />
                    <InfoRow label="City" value={emp.city || '—'} />
                    <InfoRow label="State / Province" value={emp.state || '—'} />
                    <InfoRow label="Postal Code" value={emp.postalCode || '—'} />
                    <InfoRow label="Country" value={emp.country || '—'} />
                  </InfoGrid>
                  {(emp.localVillage || emp.localParish || emp.localDistrict || emp.localRegion) && (
                    <>
                      <div className="border-t border-gray-100 dark:border-gray-800 my-4" />
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-3">Local Address</p>
                      <InfoGrid>
                        <InfoRow label="Village" value={emp.localVillage || '—'} />
                        <InfoRow label="Parish" value={emp.localParish || '—'} />
                        <InfoRow label="District" value={emp.localDistrict || '—'} />
                        <InfoRow label="Region" value={emp.localRegion || '—'} />
                      </InfoGrid>
                    </>
                  )}
                </Section>
              </>
            )}

            {/* ──── GENERAL TAB - EDIT MODE ──── */}
            {tab === 'general' && editing && (
              <div className="space-y-6">
                <Section title="Personal Information" icon={<User className="w-4 h-4 text-blue-500" />}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="First Name *" value={form.firstName} onChange={(v) => updateForm('firstName', v)} />
                    <Field label="Middle Name" value={form.middleName} onChange={(v) => updateForm('middleName', v)} />
                    <Field label="Last Name *" value={form.lastName} onChange={(v) => updateForm('lastName', v)} />
                    <SelectField label="Gender" value={form.gender} onChange={(v) => updateForm('gender', v)}
                      options={[{ value: '', label: 'Select...' }, ...Object.entries(GENDERS).map(([k, v]) => ({ value: k, label: v }))]} />
                    <Field label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(v) => updateForm('dateOfBirth', v)} />
                    <Field label="National ID" value={form.nationalId} onChange={(v) => updateForm('nationalId', v)} placeholder="National identification number" />
                    <Field label="Social Security No." value={form.socialSecurityNo} onChange={(v) => updateForm('socialSecurityNo', v)} placeholder="Social security / pension number" />
                    <Field label="Tax ID (TIN)" value={form.taxIdNumber} onChange={(v) => updateForm('taxIdNumber', v)} placeholder="Tax identification number" />
                  </div>
                </Section>

                <Section title="Employment" icon={<Briefcase className="w-4 h-4 text-purple-500" />}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Hire Date *" type="date" value={form.hireDate} onChange={(v) => updateForm('hireDate', v)} />
                    <Field label="Probation End Date" type="date" value={form.probationEndDate} onChange={(v) => updateForm('probationEndDate', v)} />
                    <SelectField label="Employment Type" value={form.employmentType} onChange={(v) => updateForm('employmentType', v)}
                      options={Object.entries(EMPLOYMENT_TYPES).map(([k, v]) => ({ value: k, label: v }))} />
                    <Field label="Work Location" value={form.workLocation} onChange={(v) => updateForm('workLocation', v)} />
                  </div>
                </Section>

                <Section title="Contact" icon={<Phone className="w-4 h-4 text-green-500" />}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Email" type="email" value={form.email} onChange={(v) => updateForm('email', v)} />
                    <Field label="Phone" value={form.phone} onChange={(v) => updateForm('phone', v)} />
                    <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => updateForm('whatsapp', v)} />
                  </div>
                </Section>

                <Section title="Address" icon={<MapPin className="w-4 h-4 text-red-500" />}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                      <Field label="Street Address" value={form.address} onChange={(v) => updateForm('address', v)} />
                    </div>
                    <Field label="City" value={form.city} onChange={(v) => updateForm('city', v)} />
                    <Field label="State / Province" value={form.state} onChange={(v) => updateForm('state', v)} />
                    <Field label="Postal Code" value={form.postalCode} onChange={(v) => updateForm('postalCode', v)} />
                    <Field label="Country" value={form.country} onChange={(v) => updateForm('country', v)} />
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-800 my-4" />
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-3">Local Address (Optional)</p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Field label="Village" value={form.localVillage} onChange={(v) => updateForm('localVillage', v)} />
                    <Field label="Parish" value={form.localParish} onChange={(v) => updateForm('localParish', v)} />
                    <Field label="District" value={form.localDistrict} onChange={(v) => updateForm('localDistrict', v)} />
                    <Field label="Region" value={form.localRegion} onChange={(v) => updateForm('localRegion', v)} />
                  </div>
                </Section>

                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold disabled:opacity-50">
                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ──── PAYROLL TAB ──── */}
            {tab === 'payroll' && !editing && (
              <>
                <Section title="Compensation" icon={<DollarSign className="w-4 h-4 text-green-500" />}>
                  <InfoGrid>
                    <InfoRow label="Base Salary" value={fmtCurrency(emp.baseSalary ? Number(emp.baseSalary) : null, emp.payrollCurrency)} />
                    <InfoRow label="Currency" value={emp.payrollCurrency} />
                    <InfoRow label="Pay Frequency" value={PAY_FREQ[emp.payFrequency] || emp.payFrequency} />
                  </InfoGrid>
                </Section>

                <Section title="Bank Details" icon={<CreditCard className="w-4 h-4 text-indigo-500" />}>
                  <InfoGrid>
                    <InfoRow label="Bank Name" value={emp.bankName || '—'} />
                    <InfoRow label="Bank Branch" value={emp.bankBranch || '—'} />
                    <InfoRow label="Account Number" value={emp.bankAccountNumber || '—'} sensitive />
                    <InfoRow label="Sort Code / Routing" value={emp.bankSortCode || '—'} />
                  </InfoGrid>
                </Section>

                <Section title="Tax & Statutory" icon={<Shield className="w-4 h-4 text-orange-500" />}>
                  <InfoGrid>
                    <InfoRow label="Tax ID (TIN)" value={emp.taxIdNumber || '—'} sensitive />
                    <InfoRow label="Social Security No." value={emp.socialSecurityNo || '—'} sensitive />
                  </InfoGrid>
                </Section>
              </>
            )}

            {tab === 'payroll' && editing && (
              <div className="space-y-6">
                <Section title="Compensation" icon={<DollarSign className="w-4 h-4 text-green-500" />}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Base Salary" type="number" value={form.baseSalary} onChange={(v) => updateForm('baseSalary', v)} />
                    <Field label="Currency" value={form.payrollCurrency} onChange={(v) => updateForm('payrollCurrency', v.toUpperCase())} maxLength={3} placeholder={orgCurrency || 'e.g. UGX, USD'} />
                    <SelectField label="Pay Frequency" value={form.payFrequency} onChange={(v) => updateForm('payFrequency', v)}
                      options={Object.entries(PAY_FREQ).map(([k, v]) => ({ value: k, label: v }))} />
                  </div>
                </Section>

                <Section title="Bank Details" icon={<CreditCard className="w-4 h-4 text-indigo-500" />}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Bank Name" value={form.bankName} onChange={(v) => updateForm('bankName', v)} />
                    <Field label="Bank Branch" value={form.bankBranch} onChange={(v) => updateForm('bankBranch', v)} />
                    <Field label="Account Number" value={form.bankAccountNumber} onChange={(v) => updateForm('bankAccountNumber', v)} />
                    <Field label="Sort Code / Routing" value={form.bankSortCode} onChange={(v) => updateForm('bankSortCode', v)} />
                  </div>
                </Section>

                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold disabled:opacity-50">
                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ──── DOCUMENTS TAB ──── */}
            {tab === 'documents' && (
              <Section title="Documents & Notes" icon={<FileText className="w-4 h-4 text-amber-500" />}>
                <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Document management coming soon</p>
                  <p className="text-xs mt-1">Upload ID copies, contracts, certificates, and more</p>
                </div>
                {emp.notes && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Notes</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{emp.notes}</p>
                  </div>
                )}
                {editing && (
                  <div className="mt-4">
                    <label className={LABEL_CLS}>Notes</label>
                    <textarea rows={4} value={form.notes || ''} onChange={(e) => updateForm('notes', e.target.value)}
                      className={INPUT_CLS} />
                    <div className="flex gap-2 mt-4">
                      <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold disabled:opacity-50">
                        <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* ──── EMERGENCY TAB ──── */}
            {tab === 'emergency' && !editing && (
              <>
                <Section title="Next of Kin" icon={<Heart className="w-4 h-4 text-pink-500" />}>
                  <InfoGrid>
                    <InfoRow label="Name" value={emp.nextOfKinName || '—'} />
                    <InfoRow label="Phone" value={emp.nextOfKinPhone || '—'} />
                    <InfoRow label="Relationship" value={emp.nextOfKinRelation || '—'} />
                  </InfoGrid>
                </Section>

                <Section title="Emergency Contact" icon={<AlertTriangle className="w-4 h-4 text-red-500" />}>
                  <InfoGrid>
                    <InfoRow label="Contact Name" value={emp.emergencyContact || '—'} />
                    <InfoRow label="Phone" value={emp.emergencyPhone || '—'} />
                  </InfoGrid>
                </Section>
              </>
            )}

            {tab === 'emergency' && editing && (
              <div className="space-y-6">
                <Section title="Next of Kin" icon={<Heart className="w-4 h-4 text-pink-500" />}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Name" value={form.nextOfKinName} onChange={(v) => updateForm('nextOfKinName', v)} />
                    <Field label="Phone" value={form.nextOfKinPhone} onChange={(v) => updateForm('nextOfKinPhone', v)} />
                    <Field label="Relationship" value={form.nextOfKinRelation} onChange={(v) => updateForm('nextOfKinRelation', v)} placeholder="e.g. Spouse, Parent, Sibling" />
                  </div>
                </Section>

                <Section title="Emergency Contact" icon={<AlertTriangle className="w-4 h-4 text-red-500" />}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Contact Name" value={form.emergencyContact} onChange={(v) => updateForm('emergencyContact', v)} />
                    <Field label="Phone" value={form.emergencyPhone} onChange={(v) => updateForm('emergencyPhone', v)} />
                  </div>
                </Section>

                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold disabled:opacity-50">
                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─── Sidebar ─── */}
          <div className="w-80 space-y-4 shrink-0">
            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Quick Info</h4>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.color}`}>{sc.label}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Type</span>
                <span className="text-gray-700 dark:text-gray-300">{EMPLOYMENT_TYPES[emp.employmentType] || emp.employmentType}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Tenure</span>
                <span className="text-gray-700 dark:text-gray-300">{tenure > 0 ? `${tenure}y` : '<1y'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Hire Date</span>
                <span className="text-gray-700 dark:text-gray-300">{fmtDate(emp.hireDate)}</span>
              </div>
            </div>

            {/* Manager */}
            {emp.manager && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Direct Manager</h4>
                <button onClick={() => router.push(`/${orgSlug}/hcm/employees/${emp.manager!.id}`)}
                  className="flex items-center gap-3 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-2 -m-2">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500">
                    {emp.manager.firstName[0]}{emp.manager.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{emp.manager.firstName} {emp.manager.lastName}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{emp.manager.employeeNumber}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                </button>
              </div>
            )}

            {/* Direct Reports */}
            {emp.directReports.length > 0 && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                  Direct Reports ({emp.directReports.length})
                </h4>
                <div className="space-y-2">
                  {emp.directReports.map((r) => (
                    <button key={r.id} onClick={() => router.push(`/${orgSlug}/hcm/employees/${r.id}`)}
                      className="flex items-center gap-2 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-1.5 -mx-1.5">
                      <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500">
                        {r.firstName[0]}{r.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{r.firstName} {r.lastName}</p>
                        <p className="text-[10px] text-gray-400">{r.jobTitle?.title || r.employeeNumber}</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                        STATUS_CONFIG[r.status]?.color || 'bg-gray-100 text-gray-600'
                      }`}>{r.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Linked User Account */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">System Account</h4>
              {emp.user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{emp.user.email}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Account Status</span>
                    <span className={emp.user.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {emp.user.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </div>
                  {emp.user.lastLoginAt && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Last Login</span>
                      <span className="text-gray-600 dark:text-gray-300">{fmtDate(emp.user.lastLoginAt)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No linked user account</p>
              )}
            </div>

            {/* Record Info */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Record</h4>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Created</span>
                <span className="text-gray-600 dark:text-gray-300">{fmtDate(emp.createdAt)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Updated</span>
                <span className="text-gray-600 dark:text-gray-300">{fmtDate(emp.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Status Change Modal ─── */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6 mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Change Employee Status</h3>
            <div className="space-y-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => handleStatusChange(key)}
                  disabled={key === emp.status}
                  className={`w-full flex items-center gap-3 p-3 border rounded-lg text-left transition-all ${
                    key === emp.status
                      ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 opacity-60'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                  {key === emp.status && <span className="text-[10px] text-gray-400 ml-auto">Current</span>}
                  {key === 'TERMINATED' && key !== emp.status && (
                    <span className="text-[10px] text-red-400 ml-auto">Will deactivate user account</span>
                  )}
                </button>
              ))}
            </div>
            <button onClick={() => setShowStatusModal(false)}
              className="w-full mt-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm Modal ─── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6 mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Employee?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              This will permanently remove &quot;{emp.firstName} {emp.lastName}&quot; ({emp.employeeNumber}) and all related records. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── Sub-components ───── */
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">{icon} {title}</h3>
      {children}
    </div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">{children}</div>;
}

function InfoRow({ label, value, sensitive }: { label: string; value: string; sensitive?: boolean }) {
  const [revealed, setRevealed] = useState(!sensitive);
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">{label}</p>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">
        {sensitive && !revealed && value !== '—' ? (
          <button onClick={() => setRevealed(true)} className="text-gray-400 hover:text-blue-500 text-xs">
            ••••••• (click to reveal)
          </button>
        ) : value}
      </p>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, maxLength }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; maxLength?: number;
}) {
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} maxLength={maxLength}
        className={INPUT_CLS} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} className={INPUT_CLS}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
