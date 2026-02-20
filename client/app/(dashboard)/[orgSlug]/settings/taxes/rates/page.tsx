'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit, Trash2, Percent, DollarSign, Tag, Wine, Search, RefreshCw, Database } from 'lucide-react';
import { toast } from 'sonner';

interface TaxAgency {
  id: string;
  name: string;
  code: string;
  country: string;
}

interface TaxRate {
  id: string;
  name: string;
  code?: string; // May not exist for EFRIS tax rates
  rate: number;
  calculationType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  isInclusive?: boolean;
  isCompoundTax?: boolean;
  fixedAmount?: number;
  isActive: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  taxAgency?: TaxAgency; // Optional - only exists for TaxAgencyRate records
  // EFRIS-specific fields (for TaxRate records)
  taxType?: string;
  efrisTaxCategoryCode?: string;
  efrisGoodsCategoryId?: string;
  createdAt?: string;
}

interface ExciseDutyCode {
  exciseDutyCode: string;
  goodService: string;
  rateText: string;
  effectiveDate: string;
  parentCode?: string;
  isLeafNode: string;
  rate?: string;
  unit?: string;
  unitDisplay?: string;
  currency?: string;
  excise_rule?: string;
}

export default function TaxRatesPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [activeTab, setActiveTab] = useState<'rates' | 'excise'>('rates');
  
  // Excise duty states
  const [exciseCodes, setExciseCodes] = useState<ExciseDutyCode[]>([]);
  const [exciseLoading, setExciseLoading] = useState(false);
  const [exciseSyncing, setExciseSyncing] = useState(false);
  const [exciseError, setExciseError] = useState('');
  const [exciseSearch, setExciseSearch] = useState('');
  const [exciseSource, setExciseSource] = useState<string>('');

  useEffect(() => {
    if (activeTab === 'rates') {
      fetchRates();
    } else {
      fetchExciseCodes();
    }
  }, [filter, activeTab, exciseSearch]);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const activeOnly = filter === 'active' ? 'true' : filter === 'inactive' ? 'false' : '';
      const url = `/api/orgs/${orgSlug}/tax/rates${activeOnly ? `?activeOnly=${activeOnly}` : ''}`;
      const res = await fetch(url);
      
      if (!res.ok) throw new Error('Failed to fetch tax rates');
      
      const data = await res.json();
      setRates(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchExciseCodes = async () => {
    try {
      setExciseLoading(true);
      const url = `/api/orgs/${orgSlug}/efris/excise-codes${
        exciseSearch ? `?excise_name=${encodeURIComponent(exciseSearch)}` : ''
      }`;
      const res = await fetch(url);
      
      if (!res.ok) throw new Error('Failed to fetch excise codes');
      
      const data = await res.json();
      setExciseCodes(data.data || []);
      setExciseSource(data.source || 'cache');
      setExciseError('');
    } catch (err: any) {
      setExciseError(err.message);
    } finally {
      setExciseLoading(false);
    }
  };

  const syncFromEfris = async () => {
    try {
      setExciseSyncing(true);
      const toastId = toast.loading('Syncing excise duty codes from EFRIS...');
      const res = await fetch(`/api/orgs/${orgSlug}/efris/excise-codes?refresh=true`);
      
      if (!res.ok) throw new Error('Failed to sync from EFRIS');
      
      const data = await res.json();
      setExciseCodes(data.data || []);
      setExciseSource('efris_refreshed');
      setExciseError('');
      toast.success(`Synced ${data.total || 0} excise duty codes from EFRIS`, { id: toastId });
    } catch (err: any) {
      setExciseError(err.message);
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setExciseSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tax rate?')) return;
    
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/tax/rates/${id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Failed to delete tax rate');
      
      fetchRates();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatRate = (rate: TaxRate) => {
    if (rate.calculationType === 'FIXED_AMOUNT') {
      return `${rate.fixedAmount?.toLocaleString()} (Fixed)`;
    }
    return `${rate.rate}%`;
  };

  const filteredRates = rates.filter(rate => {
    if (filter === 'active') return rate.isActive;
    if (filter === 'inactive') return !rate.isActive;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tax Rates & Excise Duty</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage tax rates and excise duty codes for your organization
            </p>
          </div>
          {activeTab === 'rates' && (
            <Link
              href={`/${orgSlug}/settings/taxes/rates/new`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Tax Rate
            </Link>
          )}
          {activeTab === 'excise' && (
            <div className="flex items-center gap-2">
              {exciseSource && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  {exciseSource === 'cache' ? 'From cache' : exciseSource === 'efris_refreshed' ? 'Just synced' : 'Initial sync'}
                </span>
              )}
              <button
                onClick={syncFromEfris}
                disabled={exciseSyncing}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${exciseSyncing ? 'animate-spin' : ''}`} />
                {exciseSyncing ? 'Syncing...' : 'Sync from EFRIS'}
              </button>
            </div>
          )}
        </div>

        {/* Main Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('rates')}
              className={`${
                activeTab === 'rates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Percent className="h-4 w-4 mr-2" />
              Tax Rates
            </button>
            <button
              onClick={() => setActiveTab('excise')}
              className={`${
                activeTab === 'excise'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Wine className="h-4 w-4 mr-2" />
              Excise Duty (EFRIS)
            </button>
          </nav>
        </div>

        {/* Filter Tabs - Only for Tax Rates */}
        {activeTab === 'rates' && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setFilter('active')}
              className={`${
                filter === 'active'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`${
                filter === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`${
                filter === 'inactive'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Inactive
            </button>
          </nav>
        </div>
        )}

        {/* Search for Excise Duty */}
        {activeTab === 'excise' && (
          <div className="mb-6">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={exciseSearch}
                onChange={(e) => setExciseSearch(e.target.value)}
                placeholder="Search excise codes (e.g., beer, alcohol, fuel, tobacco)..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Excise duty codes are cached locally for fast loading. Click &quot;Sync from EFRIS&quot; to refresh from the EFRIS API.
            </p>
          </div>
        )}

        {/* Error Message */}
        {(error || exciseError) && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error || exciseError}</p>
          </div>
        )}

        {/* Tax Rates Content */}
        {activeTab === 'rates' && (
          <>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2 text-sm text-gray-500">Loading tax rates...</p>
          </div>
        ) : filteredRates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Tag className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tax rates</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new tax rate.
            </p>
            <div className="mt-6">
              <Link
                href={`/${orgSlug}/settings/taxes/rates/new`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Tax Rate
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tax Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {rate.calculationType === 'PERCENTAGE' ? (
                          <Percent className="h-5 w-5 text-gray-400 mr-2" />
                        ) : (
                          <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {rate.name}
                          </div>
                          {rate.isCompoundTax && (
                            <div className="text-xs text-orange-600">Compound Tax</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rate.code || rate.efrisTaxCategoryCode || rate.taxType || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatRate(rate)}</div>
                      <div className="text-xs text-gray-500">
                        {rate.isInclusive ? 'Inclusive' : 'Exclusive'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rate.calculationType === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {rate.taxAgency ? (
                        <>
                          <div className="text-sm text-gray-900">{rate.taxAgency.name}</div>
                          <div className="text-xs text-gray-500">{rate.taxAgency.country}</div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm text-gray-900">
                            {rate.taxType || 'Tax Rate'}
                          </div>
                          {rate.efrisTaxCategoryCode && (
                            <div className="text-xs text-green-600">
                              EFRIS: {rate.efrisTaxCategoryCode}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          rate.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {rate.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => router.push(`/${orgSlug}/settings/taxes/rates/${rate.id}/edit`)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rate.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          </>
        )}

        {/* Excise Duty Content */}
        {activeTab === 'excise' && (
          <>
            {exciseLoading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
                <p className="mt-2 text-sm text-gray-500">Loading excise codes...</p>
              </div>
            ) : exciseCodes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Wine className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No excise codes found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {exciseSearch 
                    ? 'Try a different search term or clear the search to see all codes.'
                    : 'Click "Sync from EFRIS" to load excise duty codes into the local cache.'}
                </p>
                {exciseSearch && (
                  <button
                    onClick={() => setExciseSearch('')}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                  <p className="text-sm text-gray-600">
                    {exciseCodes.length} excise duty code(s) found
                  </p>
                </div>
                <div className="divide-y divide-gray-200">
                  {exciseCodes.map((code) => (
                    <div
                      key={code.exciseDutyCode}
                      className="px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <Wine className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2">
                              <h3 className="text-sm font-semibold text-gray-900">
                                {code.exciseDutyCode}
                              </h3>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {code.rateText || 'No rate'}
                              </span>
                              {code.currency && code.currency !== 'UGX' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {code.currency}
                                </span>
                              )}
                              {code.excise_rule === '2' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                  Dual Rate
                                </span>
                              )}
                            </div>
                            <p className="mt-1.5 text-sm text-gray-700 leading-relaxed">{code.goodService}</p>
                            <div className="mt-2 flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                              {code.rate && (
                                <span className="flex items-center">
                                  <Tag className="h-3 w-3 mr-1" />
                                  Rate: <strong className="ml-1 text-gray-700">{code.rate}</strong>
                                </span>
                              )}
                              {code.unitDisplay && (
                                <span className="flex items-center">
                                  Unit: <strong className="ml-1 text-gray-700">{code.unitDisplay}</strong>
                                </span>
                              )}
                              {code.effectiveDate && (
                                <span>Effective: {code.effectiveDate}</span>
                              )}
                              {code.parentCode && (
                                <span>Parent: {code.parentCode}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
