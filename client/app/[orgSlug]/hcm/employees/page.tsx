'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  status: string;
  employmentType: string;
  departmentName?: string;
  jobTitle?: string;
  hireDate: string;
}

export default function EmployeesPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    employeeNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    hireDate: new Date().toISOString().split('T')[0],
    employmentType: 'FULL_TIME',
    baseSalary: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${orgSlug}/hcm/employees`);
      if (!res.ok) throw new Error('Failed to load employees');
      const json = await res.json();
      setEmployees(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgSlug) load();
  }, [orgSlug]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/${orgSlug}/hcm/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          baseSalary: form.baseSalary ? Number(form.baseSalary) : undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to create employee');
      }
      setShowForm(false);
      setForm({
        employeeNumber: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        hireDate: new Date().toISOString().split('T')[0],
        employmentType: 'FULL_TIME',
        baseSalary: '',
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-gray-600">Manage employee records and information</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'Add Employee'}
        </button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-md p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Employee Number *
              <input
                className="mt-1 rounded border border-gray-300 px-3 py-2"
                value={form.employeeNumber}
                onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })}
                required
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              First Name *
              <input
                className="mt-1 rounded border border-gray-300 px-3 py-2"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Last Name *
              <input
                className="mt-1 rounded border border-gray-300 px-3 py-2"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Email
              <input
                type="email"
                className="mt-1 rounded border border-gray-300 px-3 py-2"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Phone
              <input
                className="mt-1 rounded border border-gray-300 px-3 py-2"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Hire Date *
              <input
                type="date"
                className="mt-1 rounded border border-gray-300 px-3 py-2"
                value={form.hireDate}
                onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                required
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Employment Type
              <select
                className="mt-1 rounded border border-gray-300 px-3 py-2"
                value={form.employmentType}
                onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="TEMPORARY">Temporary</option>
                <option value="INTERN">Intern</option>
              </select>
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              Base Salary
              <input
                type="number"
                step="0.01"
                className="mt-1 rounded border border-gray-300 px-3 py-2"
                value={form.baseSalary}
                onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Creating...' : 'Create Employee'}
          </button>
        </form>
      )}

      <div className="overflow-auto border border-gray-200 rounded-md bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Employee #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Department</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Job Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Hire Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono">{emp.employeeNumber}</td>
                <td className="px-4 py-3 text-sm font-medium">{emp.firstName} {emp.lastName}</td>
                <td className="px-4 py-3 text-sm">{emp.email || '—'}</td>
                <td className="px-4 py-3 text-sm">{emp.departmentName || '—'}</td>
                <td className="px-4 py-3 text-sm">{emp.jobTitle || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    emp.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    emp.status === 'ON_LEAVE' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {emp.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{new Date(emp.hireDate).toLocaleDateString()}</td>
              </tr>
            ))}
            {employees.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-4 text-sm text-gray-600" colSpan={7}>No employees yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
