"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function RecurringTemplateDetailPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const id = params?.id as string;
  const [template, setTemplate] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function fetchTemplate() {
    setLoading(true);
    const res = await fetch(`/api/${orgSlug}/recurring-templates/${id}`);
    const json = await res.json();
    if (json.success) setTemplate(json.data);
    setLoading(false);
  }

  useEffect(() => {
    if (orgSlug && id) fetchTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug, id]);

  async function runNow() {
    setRunning(true);
    setMessage(null);
    const res = await fetch(`/api/${orgSlug}/recurring-templates/${id}/run`, { method: 'POST' });
    const json = await res.json();
    setRunning(false);
    if (json.success) {
      setMessage('Executed successfully');
      fetchTemplate();
    } else {
      setMessage(json.error || 'Execution failed');
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (!template) return <div className="p-6">Template not found</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{template.name}</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <div><span className="font-medium">Type:</span> {template.templateType}</div>
          <div><span className="font-medium">Frequency:</span> {template.frequency}</div>
          <div><span className="font-medium">Status:</span> {template.status}</div>
          <div><span className="font-medium">Next Run:</span> {template.nextRunAt ? new Date(template.nextRunAt).toLocaleString() : '-'}</div>
          <div><span className="font-medium">Last Run:</span> {template.lastRunAt ? new Date(template.lastRunAt).toLocaleString() : '-'}</div>
          <div><span className="font-medium">Executed Count:</span> {template.executedCount}</div>
        </div>
        <div className="border rounded p-4">
          <div className="font-medium mb-2">Payload</div>
          <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto max-h-64">{JSON.stringify(template.payload, null, 2)}</pre>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={runNow} disabled={running}>
          {running ? 'Running...' : 'Run Now'}
        </button>
        {message && <span className="text-sm text-gray-700">{message}</span>}
      </div>
    </div>
  );
}
