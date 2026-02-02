"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EditTemplatePage({ params }: { params: { orgSlug: string; id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tpl, setTpl] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/${params.orgSlug}/recurring-templates/${params.id}`);
        const data = await res.json();
        if (!res.ok || data.success === false) throw new Error(data.error || 'Failed to load');
        setTpl(data.template ?? data.data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.orgSlug, params.id]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const approverRoles: string[] = [];
    if (fd.get('approverAdmin') === 'on') approverRoles.push('ADMIN');
    if (fd.get('approverManager') === 'on') approverRoles.push('MANAGER');

    const body: any = {
      name: fd.get('name') || undefined,
      templateType: fd.get('templateType') || undefined,
      frequency: fd.get('frequency') || undefined,
      timezone: fd.get('timezone') || undefined,
      startDate: fd.get('startDate') || undefined,
      endDate: fd.get('endDate') || undefined,
      dayOfMonth: fd.get('dayOfMonth') ? Number(fd.get('dayOfMonth')) : undefined,
      weekday: fd.get('weekday') ? Number(fd.get('weekday')) : undefined,
      approvalRequired: fd.get('approvalRequired') === 'on',
      approverRoles,
      status: fd.get('status') || undefined,
    };
    setLoading(true);
    try {
      const res = await fetch(`/api/${params.orgSlug}/recurring-templates/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || 'Update failed');
      router.push(`/${params.orgSlug}/recurring-templates`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!tpl) return <div className="p-6">Template not found</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Edit Template</h1>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Name</label>
          <input name="name" defaultValue={tpl.name} className="mt-1 w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm">Type</label>
          <select name="templateType" defaultValue={tpl.templateType} className="mt-1 w-full border rounded p-2">
            <option value="JOURNAL_ENTRY">Journal</option>
            <option value="INVOICE">Invoice</option>
            <option value="BILL">Bill</option>
            <option value="PAYMENT">Payment</option>
          </select>
        </div>
        <div>
          <label className="block text-sm">Frequency</label>
          <select name="frequency" defaultValue={tpl.frequency} className="mt-1 w-full border rounded p-2">
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="YEARLY">Yearly</option>
            <option value="CUSTOM_CRON">Custom Cron</option>
          </select>
        </div>
        <div>
          <label className="block text-sm">Timezone</label>
          <input name="timezone" defaultValue={tpl.timezone} className="mt-1 w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm">Start Date</label>
          <input type="date" name="startDate" defaultValue={tpl.startDate?.substring(0, 10)} className="mt-1 w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm">End Date</label>
          <input type="date" name="endDate" defaultValue={tpl.endDate?.substring(0, 10)} className="mt-1 w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm">Day of Month</label>
          <input type="number" name="dayOfMonth" defaultValue={tpl.dayOfMonth ?? ''} className="mt-1 w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm">Weekday (0-6)</label>
          <input type="number" name="weekday" defaultValue={tpl.weekday ?? ''} className="mt-1 w-full border rounded p-2" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" name="approvalRequired" defaultChecked={tpl.approvalRequired} />
          <label>Approval Required</label>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Approver Roles</span>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="approverAdmin" defaultChecked={tpl.approverRoles?.includes('ADMIN')} />
            Admin
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="approverManager" defaultChecked={tpl.approverRoles?.includes('MANAGER')} />
            Manager
          </label>
          <span className="text-xs text-gray-500">Defaults to Admin + Manager if none selected.</span>
        </div>
        <div>
          <label className="block text-sm">Status</label>
          <select name="status" defaultValue={tpl.status} className="mt-1 w-full border rounded p-2">
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
        <div className="md:col-span-2 flex gap-2">
          <button type="submit" className="border rounded px-4 py-2">Save</button>
          <button type="button" className="border rounded px-4 py-2" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
