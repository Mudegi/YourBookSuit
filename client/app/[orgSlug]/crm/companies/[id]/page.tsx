'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function CompanyDetailPage({ params }: { params: { orgSlug: string; id: string } }) {
  const router = useRouter();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCompany();
  }, [params.id]);

  async function loadCompany() {
    try {
      const res = await fetch(`/api/${params.orgSlug}/crm/companies?search=${params.id}`);
      if (!res.ok) throw new Error('Failed to load');

      const data = await res.json();
      setCompany(data.companies?.find((c: any) => c.id === params.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-600 mb-4 hover:text-blue-800">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

      {company && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="bg-white border rounded-lg p-6 mb-6">
              <h1 className="text-3xl font-bold mb-2">{company.name}</h1>
              <p className="text-gray-600 mb-4">Type: {company.type}</p>

              <div className="grid grid-cols-2 gap-4 mt-6">
                {company.email && (
                  <div>
                    <p className="text-gray-600 text-sm">Email</p>
                    <p className="font-semibold">{company.email}</p>
                  </div>
                )}
                {company.phone && (
                  <div>
                    <p className="text-gray-600 text-sm">Phone</p>
                    <p className="font-semibold">{company.phone}</p>
                  </div>
                )}
                {company.website && (
                  <div>
                    <p className="text-gray-600 text-sm">Website</p>
                    <p className="font-semibold">{company.website}</p>
                  </div>
                )}
                {company.industry && (
                  <div>
                    <p className="text-gray-600 text-sm">Industry</p>
                    <p className="font-semibold">{company.industry}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white border rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-2">Contacts</h2>
                <p className="text-gray-500 text-sm">Coming soon</p>
              </div>
              <div className="bg-white border rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-2">Opportunities</h2>
                <p className="text-gray-500 text-sm">Coming soon</p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Summary</h2>
            <div className="space-y-3">
              <div>
                <p className="text-gray-600 text-sm">Contacts</p>
                <p className="text-2xl font-bold">{company._count?.contacts || 0}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Opportunities</p>
                <p className="text-2xl font-bold">{company._count?.opportunities || 0}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Activities</p>
                <p className="text-2xl font-bold">{company._count?.activities || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
