"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function RecurringExecutionsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('');

  async function fetchExecutions() {
    setLoading(true);
    const url = new URL(window.location.origin + `/api/${orgSlug}/recurring-executions`);
    if (status) url.searchParams.set('status', status);
    const res = await fetch(url.toString());
    const json = await res.json();
    if (json.success) setExecutions(json.data);
    setLoading(false);
  }

  useEffect(() => {
    if (orgSlug) fetchExecutions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug, status]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Recurring Executions</h1>
        <div className="flex items-center gap-3">
          <select className="border px-3 py-2 rounded" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="SKIPPED">Skipped</option>
          </select>
          <button className="px-4 py-2 border rounded" onClick={fetchExecutions}>Refresh</button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : executions.length === 0 ? (
        <div className="text-gray-600">No executions found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left border">Run At</th>
                <th className="px-3 py-2 text-left border">Template</th>
                <th className="px-3 py-2 text-left border">Status</th>
                <th className="px-3 py-2 text-left border">Refs</th>
                <th className="px-3 py-2 text-left border">Message</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2 border">{new Date(e.runAt).toLocaleString()}</td>
                  <td className="px-3 py-2 border">{e.templateId}</td>
                  <td className="px-3 py-2 border">{e.status}</td>
                  <td className="px-3 py-2 border">{e.transactionId || e.invoiceId || e.billId || e.paymentId || '-'}</td>
                  <td className="px-3 py-2 border text-sm">{e.message || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
