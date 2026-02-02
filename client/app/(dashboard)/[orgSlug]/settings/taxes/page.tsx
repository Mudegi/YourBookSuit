'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Plus, Edit2, Trash2, Save, X, Building2, Percent, 
  Globe, FileText, CheckCircle, AlertCircle, Settings 
} from 'lucide-react';

interface TaxAgency {
  id: string;
  name: string;
  code: string;
  country: string;
  taxType: string;
  registrationNumber?: string;
  isActive: boolean;
  ratesCount: number;
}

interface TaxRate {
  id: string;
  name: string;
  displayName?: string;
  rate: number;
  isInclusiveDefault: boolean;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  taxAgency: {
    id: string;
    name: string;
    code: string;
  };
  salesTaxAccount?: {
    id: string;
    code: string;
    name: string;
  };
  purchaseTaxAccount?: {
    id: string;
    code: string;
    name: string;
  };
}

interface TaxGroup {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  taxGroupRates: Array<{
    id: string;
    sequence: number;
    isCompound: boolean;
    taxAgencyRate: {
      id: string;
      name: string;
      rate: number;
    };
  }>;
}

export default function TaxSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [activeTab, setActiveTab] = useState<'agencies' | 'rates' | 'groups'>('agencies');
  const [loading, setLoading] = useState(true);
  const [agencies, setAgencies] = useState<TaxAgency[]>([]);
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [groups, setGroups] = useState<TaxGroup[]>([]);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    loadData();
  }, [orgSlug, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'agencies') {
        const res = await fetch(`/api/orgs/${orgSlug}/tax/agencies`);
        if (res.ok) {
          const data = await res.json();
          setAgencies(data);
        }
      } else if (activeTab === 'rates') {
        const res = await fetch(`/api/orgs/${orgSlug}/tax/rates`);
        if (res.ok) {
          const data = await res.json();
          setRates(data);
        }
      } else if (activeTab === 'groups') {
        const res = await fetch(`/api/orgs/${orgSlug}/tax/groups`);
        if (res.ok) {
          const data = await res.json();
          setGroups(data);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedTaxes = async () => {
    if (!selectedCountry) {
      alert('Please select a country');
      return;
    }

    setSeeding(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/tax/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: selectedCountry }),
      });

      if (res.ok) {
        const result = await res.json();
        alert(`Success! Created: ${result.created.agencies} agencies, ${result.created.rates} rates, ${result.created.groups} groups`);
        setShowSeedModal(false);
        loadData();
      } else {
        const error = await res.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error seeding taxes:', error);
      alert('Failed to seed taxes');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tax Settings</h1>
              <p className="mt-2 text-gray-600">
                Manage tax agencies, rates, and groups for your organization
              </p>
            </div>
            <button
              onClick={() => setShowSeedModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Globe className="w-4 h-4" />
              Seed Taxes by Country
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('agencies')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'agencies'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Tax Agencies
              </div>
            </button>
            <button
              onClick={() => setActiveTab('rates')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rates'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Tax Rates
              </div>
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'groups'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Tax Groups
              </div>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : (
            <>
              {/* Tax Agencies Tab */}
              {activeTab === 'agencies' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Tax Agencies</h2>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Plus className="w-4 h-4" />
                      Add Agency
                    </button>
                  </div>

                  {agencies.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">No tax agencies configured</p>
                      <p className="text-sm mb-4">Start by seeding taxes for your country or add agencies manually</p>
                      <button
                        onClick={() => setShowSeedModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Seed Taxes
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rates</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {agencies.map((agency) => (
                            <tr key={agency.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {agency.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {agency.code}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {agency.country}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {agency.taxType}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {agency.ratesCount} rates
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {agency.isActive ? (
                                  <span className="flex items-center gap-1 text-green-600 text-sm">
                                    <CheckCircle className="w-4 h-4" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-gray-400 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    Inactive
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button className="text-blue-600 hover:text-blue-900 mr-3">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button className="text-red-600 hover:text-red-900">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tax Rates Tab */}
              {activeTab === 'rates' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Tax Rates</h2>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Plus className="w-4 h-4" />
                      Add Rate
                    </button>
                  </div>

                  {rates.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Percent className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p>No tax rates configured</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agency</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Mode</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GL Accounts</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {rates.map((rate) => (
                            <tr key={rate.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                {rate.displayName || rate.name}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {rate.taxAgency.name}
                              </td>
                              <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                                {rate.rate}%
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  rate.isInclusiveDefault
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {rate.isInclusiveDefault ? 'Inclusive' : 'Exclusive'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                <div className="space-y-1">
                                  {rate.salesTaxAccount && (
                                    <div className="text-xs">
                                      <span className="text-gray-400">Sales:</span> {rate.salesTaxAccount.code}
                                    </div>
                                  )}
                                  {rate.purchaseTaxAccount && (
                                    <div className="text-xs">
                                      <span className="text-gray-400">Purchase:</span> {rate.purchaseTaxAccount.code}
                                    </div>
                                  )}
                                  {!rate.salesTaxAccount && !rate.purchaseTaxAccount && (
                                    <span className="text-yellow-600 text-xs">Not mapped</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {rate.isActive ? (
                                  <span className="text-green-600 text-sm">●</span>
                                ) : (
                                  <span className="text-gray-400 text-sm">●</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button className="text-blue-600 hover:text-blue-900 mr-3">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tax Groups Tab */}
              {activeTab === 'groups' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Tax Groups</h2>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Plus className="w-4 h-4" />
                      Add Group
                    </button>
                  </div>

                  {groups.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p>No tax groups configured</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {groups.map((group) => (
                        <div key={group.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900">{group.name}</h3>
                              <p className="text-sm text-gray-500">{group.code}</p>
                            </div>
                            {group.isDefault && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                Default
                              </span>
                            )}
                          </div>
                          
                          {group.description && (
                            <p className="text-sm text-gray-600 mb-3">{group.description}</p>
                          )}

                          <div className="space-y-2">
                            <h4 className="text-xs font-medium text-gray-500 uppercase">Rates:</h4>
                            {group.taxGroupRates.map((groupRate) => (
                              <div key={groupRate.id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">
                                  {groupRate.taxAgencyRate.name}
                                  {groupRate.isCompound && (
                                    <span className="ml-1 text-xs text-purple-600">(compound)</span>
                                  )}
                                </span>
                                <span className="font-medium">{groupRate.taxAgencyRate.rate}%</span>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                            <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-red-600 hover:bg-red-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Seed Modal */}
      {showSeedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Seed Taxes by Country</h3>
              <button onClick={() => setShowSeedModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Select a country to automatically configure tax agencies, rates, and groups based on that country's tax system.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a country...</option>
                <option value="UG">Uganda</option>
                <option value="KE">Kenya</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSeedModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSeedTaxes}
                disabled={!selectedCountry || seeding}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {seeding ? 'Seeding...' : 'Seed Taxes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
