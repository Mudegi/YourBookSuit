'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';

export default function ProjectDetailPage({ params }: { params: { orgSlug: string; id: string } }) {
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProject();
  }, [params.id]);

  async function loadProject() {
    try {
      const res = await fetch(`/api/${params.orgSlug}/projects?projectId=${params.id}`);
      if (!res.ok) throw new Error('Failed to load');

      const data = await res.json();
      const proj = data.projects?.[0];
      setProject(proj);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-600 mb-4 hover:text-blue-800">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

      {project && (
        <>
          <div className="mb-6 p-6 bg-white border rounded-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold">{project.name}</h1>
                <p className="text-gray-600">Project Code: {project.code}</p>
              </div>
              <span
                className={`px-3 py-1 text-sm rounded-full ${
                  project.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : project.status === 'ON_HOLD'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {project.status}
              </span>
            </div>

            {project.description && <p className="text-gray-700 mb-4">{project.description}</p>}

            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-gray-600 text-sm">Manager</p>
                <p className="font-semibold">{project.manager?.firstName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Customer</p>
                <p className="font-semibold">{project.customer?.companyName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Budget</p>
                <p className="font-semibold">${(Number(project.budget) || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Duration</p>
                <p className="font-semibold">
                  {new Date(project.startDate).toLocaleDateString()} to{' '}
                  {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Tasks ({project._count?.tasks || 0})</h2>
                <button className="text-blue-600 hover:text-blue-800">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-white border rounded-lg p-4 space-y-2">
                <p className="text-gray-500 text-sm">Task management coming soon</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Costs ({project._count?.costs || 0})</h2>
                <button className="text-blue-600 hover:text-blue-800">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-white border rounded-lg p-4 space-y-2">
                <p className="text-gray-500 text-sm">Cost tracking coming soon</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
