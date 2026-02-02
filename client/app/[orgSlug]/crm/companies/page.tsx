'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

export default function CRMCompaniesPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    loadCompanies();
  }, [orgSlug, search, typeFilter]);

  async function loadCompanies() {
    try {
      const url = new URL(`/api/${orgSlug}/crm/companies`, window.location.origin);
      if (search) url.searchParams.append('search', search);
      if (typeFilter) url.searchParams.append('type', typeFilter);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to load companies');

      const data = await res.json();
      setCompanies(data.companies || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Companies</h1>
        <button
          onClick={() => router.push(`/${orgSlug}/crm/companies/new`)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Company
        </button>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-lg"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Types</option>
          <option value="CLIENT">Client</option>
          <option value="VENDOR">Vendor</option>
          <option value="PARTNER">Partner</option>
          <option value="PROSPECT">Prospect</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white border rounded-lg">
            No companies found
          </div>
        ) : (
          companies.map((company: any) => (
            <div key={company.id} className="p-4 bg-white border rounded-lg hover:shadow-lg transition cursor-pointer" onClick={() => router.push(`/${orgSlug}/crm/companies/${company.id}`)}>
              <h3 className="text-lg font-semibold mb-1">{company.name}</h3>
              <div className="space-y-1 text-sm text-gray-600 mb-3">
                <p>
                  <span className="font-medium">Type:</span> {company.type}
                </p>
                {company.email && (
                  <p>
                    <span className="font-medium">Email:</span> {company.email}
                  </p>
                )}
                {company.phone && (
                  <p>
                    <span className="font-medium">Phone:</span> {company.phone}
                  </p>
                )}
                {company.industry && (
                  <p>
                    <span className="font-medium">Industry:</span> {company.industry}
                  </p>
                )}
              </div>
              <div className="flex gap-2 text-xs text-gray-600 pt-3 border-t">
                <span>{company._count?.contacts || 0} contacts</span>
                <span>•</span>
                <span>{company._count?.opportunities || 0} opportunities</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
