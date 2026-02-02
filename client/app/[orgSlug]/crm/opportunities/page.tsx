'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

export default function OpportunitiesPipelinePage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const router = useRouter();
  const [pipeline, setPipeline] = useState<Record<string, any[]>>({});
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPipeline();
  }, [orgSlug]);

  async function loadPipeline() {
    try {
      const res = await fetch(`/api/${orgSlug}/crm/opportunities`);
      if (!res.ok) throw new Error('Failed to load opportunities');

      const data = await res.json();
      setPipeline(data.pipeline || {});
      setMetrics(data.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  }

  const stages = ['PROSPECT', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
  const stageNames: Record<string, string> = {
    PROSPECT: 'Prospect',
    QUALIFIED: 'Qualified',
    PROPOSAL: 'Proposal',
    NEGOTIATION: 'Negotiation',
    WON: 'Won',
    LOST: 'Lost',
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Sales Pipeline</h1>
        <button
          onClick={() => router.push(`/${orgSlug}/crm/opportunities/new`)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Opportunity
        </button>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

      {metrics && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-white border rounded-lg">
            <p className="text-gray-600 text-sm">Total Opportunities</p>
            <p className="text-2xl font-bold">{metrics.totalOpportunities}</p>
          </div>
          <div className="p-4 bg-white border rounded-lg">
            <p className="text-gray-600 text-sm">Total Value</p>
            <p className="text-2xl font-bold">${(metrics.totalValue || 0).toFixed(0)}</p>
          </div>
          <div className="p-4 bg-white border rounded-lg">
            <p className="text-gray-600 text-sm">Weighted Value</p>
            <p className="text-2xl font-bold">${(metrics.weightedValue || 0).toFixed(0)}</p>
          </div>
          <div className="p-4 bg-white border rounded-lg">
            <p className="text-gray-600 text-sm">Win Probability</p>
            <p className="text-2xl font-bold">
              {metrics.totalOpportunities > 0
                ? (
                    (metrics.weightedValue / metrics.totalValue) *
                    100
                  ).toFixed(0)
                : 0}
              %
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-6 gap-4">
        {stages.map((stage) => {
          const opportunities = pipeline[stage] || [];
          const stageMetrics = metrics?.byStage?.find((s: any) => s.stage === stage);

          return (
            <div key={stage} className="bg-gray-50 rounded-lg p-4">
              <div className="mb-4">
                <h3 className="font-semibold text-sm">{stageNames[stage]}</h3>
                <p className="text-xs text-gray-600">
                  {opportunities.length} • ${(stageMetrics?.value || 0).toFixed(0)}
                </p>
              </div>

              <div className="space-y-2">
                {opportunities.map((opp: any) => (
                  <div
                    key={opp.id}
                    onClick={() => router.push(`/${orgSlug}/crm/opportunities/${opp.id}`)}
                    className="p-3 bg-white border rounded-lg hover:shadow-md transition cursor-pointer"
                  >
                    <p className="text-sm font-medium truncate">{opp.name}</p>
                    <p className="text-xs text-gray-600">{opp.company?.name}</p>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs font-semibold">${(Number(opp.value) || 0).toFixed(0)}</p>
                      <p className="text-xs text-blue-600">{opp.probability}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
