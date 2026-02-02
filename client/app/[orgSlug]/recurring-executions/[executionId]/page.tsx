"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ExecutionDetailPage({ params }: { params: { orgSlug: string; executionId: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exec, setExec] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(`/api/${params.orgSlug}/recurring-executions/${params.executionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setExec(data.execution);
      setTemplate(data.template);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [params.orgSlug, params.executionId]);

  async function approve() {
    setLoading(true);
    try {
      const res = await fetch(`/api/${params.orgSlug}/recurring-executions/${params.executionId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approve failed');
      await load();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  async function reject() {
    setLoading(true);
    try {
      const res = await fetch(`/api/${params.orgSlug}/recurring-executions/${params.executionId}/reject`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reject failed');
      await load();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!exec) return <div className="p-6">Execution not found</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Execution Detail</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div><span className="font-medium">Status:</span> {exec.status}</div>
          <div><span className="font-medium">Run At:</span> {new Date(exec.runAt).toLocaleString()}</div>
          {exec.message && <div><span className="font-medium">Message:</span> {exec.message}</div>}
        </div>
        <div>
          <div><span className="font-medium">Template:</span> {template?.name} ({template?.templateType})</div>
          <div><span className="font-medium">Approval Required:</span> {template?.approvalRequired ? 'Yes' : 'No'}</div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Payload Snapshot</h2>
        <pre className="mt-2 p-4 bg-gray-50 border rounded text-sm overflow-x-auto">{JSON.stringify(exec.payloadSnapshot, null, 2)}</pre>
      </div>

      {template?.approvalRequired && exec.status === 'PENDING' && (
        <div className="flex gap-2">
          <button onClick={approve} className="border rounded px-4 py-2">Approve & Post</button>
          <button onClick={reject} className="border rounded px-4 py-2">Reject</button>
        </div>
      )}
    </div>
  );
}
