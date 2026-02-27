'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, User, Briefcase, CreditCard, MapPin,
  Heart, AlertTriangle, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';

/* ───── Types ───── */
interface RefOption { id: string; name?: string; title?: string; code?: string }

type Section = 'personal' | 'employment' | 'payroll' | 'address' | 'emergency';

const SECTION_META: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: 'personal', label: 'Personal Information', icon: <User className="w-4 h-4 text-blue-500" /> },
  { key: 'employment', label: 'Employment Details', icon: <Briefcase className="w-4 h-4 text-purple-500" /> },
  { key: 'payroll', label: 'Payroll & Banking', icon: <CreditCard className="w-4 h-4 text-green-500" /> },
  { key: 'address', label: 'Address', icon: <MapPin className="w-4 h-4 text-red-500" /> },
  { key: 'emergency', label: 'Emergency & Next of Kin', icon: <Heart className="w-4 h-4 text-pink-500" /> },
];

const GENDERS = [
  { value: '', label: 'Select...' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'TEMPORARY', label: 'Temporary' },
  { value: 'INTERN', label: 'Intern' },
];

const PAY_FREQ = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BI_WEEKLY', label: 'Bi-weekly' },
  { value: 'SEMI_MONTHLY', label: 'Semi-monthly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUALLY', label: 'Annually' },
];

const INPUT = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors';
const LABEL = 'block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1';

/* ═══════════ MAIN ═══════════ */
export default function NewEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const { organization, currency: orgCurrency } = useOrganization();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<Section, boolean>>({
    personal: true, employment: true, payroll: false, address: false, emergency: false,
  });

  // Reference data
  const [departments, setDepartments] = useState<RefOption[]>([]);
  const [branches, setBranches] = useState<RefOption[]>([]);
  const [jobTitles, setJobTitles] = useState<RefOption[]>([]);
  const [managers, setManagers] = useState<{ id: string; name: string; number: string }[]>([]);

  // Form state
  const [form, setForm] = useState({
    // Personal
    employeeNumber: '',
    firstName: '',
    middleName: '',
    lastName: '',
    gender: '',
    email: '',
    phone: '',
    whatsapp: '',
    dateOfBirth: '',
    nationalId: '',
    socialSecurityNo: '',
    // Employment
    hireDate: new Date().toISOString().slice(0, 10),
    probationEndDate: '',
    employmentType: 'FULL_TIME',
    departmentId: '',
    branchId: '',
    jobTitleId: '',
    managerId: '',
    workLocation: '',
    // Payroll (pre-filled from org settings below)
    payrollCurrency: '',
    baseSalary: '',
    payFrequency: 'MONTHLY',
    taxIdNumber: '',
    bankName: '',
    bankBranch: '',
    bankAccountNumber: '',
    bankSortCode: '',
    // Address
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    localVillage: '',
    localParish: '',
    localDistrict: '',
    localRegion: '',
    // Emergency
    nextOfKinName: '',
    nextOfKinPhone: '',
    nextOfKinRelation: '',
    emergencyContact: '',
    emergencyPhone: '',
    notes: '',
  });

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  // Load reference data
  const loadRefs = useCallback(async () => {
    try {
      const [dRes, bRes, empRes] = await Promise.all([
        fetch(`/api/${orgSlug}/hcm/departments`).catch(() => null),
        fetch(`/api/${orgSlug}/branches`).catch(() => null),
        fetch(`/api/${orgSlug}/hcm/employees?status=ACTIVE`).catch(() => null),
      ]);

      if (dRes?.ok) {
        const j = await dRes.json();
        setDepartments((j.data || j.departments || []).map((d: any) => ({ id: d.id, name: d.name, code: d.code })));
      }
      if (bRes?.ok) {
        const j = await bRes.json();
        setBranches((j.data || j.branches || []).map((b: any) => ({ id: b.id, name: b.name, code: b.code })));
      }
      if (empRes?.ok) {
        const j = await empRes.json();
        setManagers((j.data || []).map((e: any) => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`,
          number: e.employeeNumber,
        })));
      }
    } catch { /* best effort */ }
  }, [orgSlug]);

  useEffect(() => { loadRefs(); }, [loadRefs]);

  // Pre-fill currency & country from organization settings once loaded
  useEffect(() => {
    if (orgCurrency && !form.payrollCurrency) {
      setForm((p) => ({ ...p, payrollCurrency: p.payrollCurrency || orgCurrency }));
    }
    if (organization?.homeCountry && !form.country) {
      setForm((p) => ({ ...p, country: p.country || organization.homeCountry }));
    }
  }, [orgCurrency, organization?.homeCountry]);

  // Generate employee number
  useEffect(() => {
    if (!form.employeeNumber) {
      const ts = Date.now().toString().slice(-6);
      update('employeeNumber', `EMP-${ts}`);
    }
  }, []);

  async function handleSave() {
    // Basic validation
    if (!form.firstName.trim()) return setError('First name is required');
    if (!form.lastName.trim()) return setError('Last name is required');
    if (!form.employeeNumber.trim()) return setError('Employee number is required');
    if (!form.hireDate) return setError('Hire date is required');

    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, any> = {};
      for (const [key, val] of Object.entries(form)) {
        if (val === '') {
          payload[key] = undefined;
        } else {
          payload[key] = val;
        }
      }
      // Required fields
      payload.employeeNumber = form.employeeNumber;
      payload.firstName = form.firstName;
      payload.lastName = form.lastName;
      payload.hireDate = form.hireDate;
      payload.employmentType = form.employmentType;
      payload.payFrequency = form.payFrequency;

      if (payload.baseSalary) payload.baseSalary = Number(payload.baseSalary);
      if (payload.email === '') payload.email = undefined;

      const res = await fetch(`/api/${orgSlug}/hcm/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json();
        throw new Error(typeof j.error === 'string' ? j.error : JSON.stringify(j.error));
      }

      const result = await res.json();
      router.push(`/${orgSlug}/hcm/employees/${result.data?.id || ''}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee');
    } finally {
      setSaving(false);
    }
  }

  function toggle(s: Section) {
    setExpanded((p) => ({ ...p, [s]: !p[s] }));
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/${orgSlug}/hcm/employees`)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Employee</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Fill in the details below to register a new employee
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push(`/${orgSlug}/hcm/employees`)}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto underline text-xs">Dismiss</button>
          </div>
        )}

        {/* ─── PERSONAL ─── */}
        <AccordionSection section="personal" meta={SECTION_META[0]} expanded={expanded} toggle={toggle}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Employee Number *" value={form.employeeNumber} onChange={(v) => update('employeeNumber', v)}
              placeholder="EMP-001" />
            <Field label="First Name *" value={form.firstName} onChange={(v) => update('firstName', v)} />
            <Field label="Middle Name" value={form.middleName} onChange={(v) => update('middleName', v)} />
            <Field label="Last Name *" value={form.lastName} onChange={(v) => update('lastName', v)} />
            <SelectField label="Gender" value={form.gender} onChange={(v) => update('gender', v)} options={GENDERS} />
            <Field label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(v) => update('dateOfBirth', v)} />
            <Field label="Email" type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="employee@company.com" />
            <Field label="Phone" value={form.phone} onChange={(v) => update('phone', v)} placeholder="+1 234 567 890" />
            <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => update('whatsapp', v)} placeholder="+1 234 567 890" />
            <Field label="National ID" value={form.nationalId} onChange={(v) => update('nationalId', v)} placeholder="National identification number" />
            <Field label="Social Security No." value={form.socialSecurityNo} onChange={(v) => update('socialSecurityNo', v)} placeholder="Social security / pension number" />
          </div>
        </AccordionSection>

        {/* ─── EMPLOYMENT ─── */}
        <AccordionSection section="employment" meta={SECTION_META[1]} expanded={expanded} toggle={toggle}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Hire Date *" type="date" value={form.hireDate} onChange={(v) => update('hireDate', v)} />
            <Field label="Probation End Date" type="date" value={form.probationEndDate} onChange={(v) => update('probationEndDate', v)} />
            <SelectField label="Employment Type" value={form.employmentType} onChange={(v) => update('employmentType', v)} options={EMPLOYMENT_TYPES} />
            <SelectField label="Department" value={form.departmentId} onChange={(v) => update('departmentId', v)}
              options={[{ value: '', label: 'Select department...' }, ...departments.map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` }))]} />
            <SelectField label="Branch" value={form.branchId} onChange={(v) => update('branchId', v)}
              options={[{ value: '', label: 'Select branch...' }, ...branches.map((b) => ({ value: b.id, label: `${b.code} — ${b.name}` }))]} />
            <SelectField label="Reporting Manager" value={form.managerId} onChange={(v) => update('managerId', v)}
              options={[{ value: '', label: 'Select manager...' }, ...managers.map((m) => ({ value: m.id, label: `${m.name} (${m.number})` }))]} />
            <Field label="Work Location" value={form.workLocation} onChange={(v) => update('workLocation', v)} placeholder="e.g. Head Office, Remote" />
          </div>
        </AccordionSection>

        {/* ─── PAYROLL ─── */}
        <AccordionSection section="payroll" meta={SECTION_META[2]} expanded={expanded} toggle={toggle}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Base Salary" type="number" value={form.baseSalary} onChange={(v) => update('baseSalary', v)} placeholder="0.00" />
            <Field label="Currency (3-letter code)" value={form.payrollCurrency} onChange={(v) => update('payrollCurrency', v.toUpperCase())}
              placeholder={orgCurrency || 'e.g. UGX, USD'} maxLength={3} />
            <SelectField label="Pay Frequency" value={form.payFrequency} onChange={(v) => update('payFrequency', v)} options={PAY_FREQ} />
            <Field label="Tax ID (TIN)" value={form.taxIdNumber} onChange={(v) => update('taxIdNumber', v)} placeholder="Tax identification number" />
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800 mt-4 pt-4">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-3">Bank Details</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Bank Name" value={form.bankName} onChange={(v) => update('bankName', v)} />
              <Field label="Bank Branch" value={form.bankBranch} onChange={(v) => update('bankBranch', v)} />
              <Field label="Account Number" value={form.bankAccountNumber} onChange={(v) => update('bankAccountNumber', v)} />
              <Field label="Sort Code / Routing" value={form.bankSortCode} onChange={(v) => update('bankSortCode', v)} />
            </div>
          </div>
        </AccordionSection>

        {/* ─── ADDRESS ─── */}
        <AccordionSection section="address" meta={SECTION_META[3]} expanded={expanded} toggle={toggle}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <Field label="Street Address" value={form.address} onChange={(v) => update('address', v)} />
            </div>
            <Field label="City" value={form.city} onChange={(v) => update('city', v)} />
            <Field label="State / Province" value={form.state} onChange={(v) => update('state', v)} />
            <Field label="Postal Code" value={form.postalCode} onChange={(v) => update('postalCode', v)} />
            <Field label="Country" value={form.country} onChange={(v) => update('country', v)} />
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800 mt-4 pt-4">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-3">Local Address (Optional)</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Field label="Village" value={form.localVillage} onChange={(v) => update('localVillage', v)} />
              <Field label="Parish" value={form.localParish} onChange={(v) => update('localParish', v)} />
              <Field label="District" value={form.localDistrict} onChange={(v) => update('localDistrict', v)} />
              <Field label="Region" value={form.localRegion} onChange={(v) => update('localRegion', v)} />
            </div>
          </div>
        </AccordionSection>

        {/* ─── EMERGENCY ─── */}
        <AccordionSection section="emergency" meta={SECTION_META[4]} expanded={expanded} toggle={toggle}>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-3">Next of Kin</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Name" value={form.nextOfKinName} onChange={(v) => update('nextOfKinName', v)} />
            <Field label="Phone" value={form.nextOfKinPhone} onChange={(v) => update('nextOfKinPhone', v)} />
            <Field label="Relationship" value={form.nextOfKinRelation} onChange={(v) => update('nextOfKinRelation', v)} placeholder="e.g. Spouse, Parent, Sibling" />
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800 mt-4 pt-4">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-3">Emergency Contact</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Contact Name" value={form.emergencyContact} onChange={(v) => update('emergencyContact', v)} />
              <Field label="Phone" value={form.emergencyPhone} onChange={(v) => update('emergencyPhone', v)} />
            </div>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800 mt-4 pt-4">
            <label className={LABEL}>Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)}
              className={INPUT} placeholder="Any additional notes about this employee..." />
          </div>
        </AccordionSection>

        {/* Sticky bottom save bar */}
        <div className="sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 -mx-6 px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Fields marked with <span className="text-red-500 font-bold">*</span> are required
          </p>
          <div className="flex gap-2">
            <button onClick={() => router.push(`/${orgSlug}/hcm/employees`)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───── Sub-components ───── */

function AccordionSection({ section, meta, expanded, toggle, children }: {
  section: Section;
  meta: { key: Section; label: string; icon: React.ReactNode };
  expanded: Record<Section, boolean>;
  toggle: (s: Section) => void;
  children: React.ReactNode;
}) {
  const isOpen = expanded[section];
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <button onClick={() => toggle(section)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <span className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
          {meta.icon} {meta.label}
        </span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {isOpen && (
        <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-800 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, maxLength }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; maxLength?: number;
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} maxLength={maxLength} className={INPUT} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
