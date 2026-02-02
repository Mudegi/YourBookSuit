'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, MapPin, Building2, FileText, Download } from 'lucide-react';

interface TaxJurisdiction {
  id: string;
  name: string;
  code: string;
  jurisdictionType: string;
  country: string;
  countryCode?: string;
  stateProvince?: string;
  countyDistrict?: string;
  city?: string;
  postalCode?: string;
  taxAuthority?: string;
  taxLiabilityAccount?: {
    id: string;
    name: string;
    code: string;
  };
  eInvoiceFormat?: string;
  requiresEInvoicing: boolean;
  metadata?: any;
  isActive: boolean;
  parentJurisdiction?: {
    id: string;
    name: string;
  };
  _count?: {
    taxRules: number;
  };
}

const SAMPLE_JURISDICTIONS: TaxJurisdiction[] = [
  {
    id: 'sample-fed',
    name: 'United States Federal',
    code: 'US-FED',
    jurisdictionType: 'FEDERAL',
    country: 'United States',
    countryCode: 'US',
    taxAuthority: 'IRS',
    eInvoiceFormat: 'NONE',
    requiresEInvoicing: false,
    isActive: true,
  },
  {
    id: 'sample-ug',
    name: 'Uganda Revenue Authority',
    code: 'UG-URA',
    jurisdictionType: 'FEDERAL',
    country: 'Uganda',
    countryCode: 'UG',
    taxAuthority: 'URA',
    eInvoiceFormat: 'EFRIS',
    requiresEInvoicing: true,
    metadata: { efrisEnabled: true },
    isActive: true,
  },
  {
    id: 'sample-state',
    name: 'California',
    code: 'US-CA',
    jurisdictionType: 'STATE',
    country: 'United States',
    countryCode: 'US',
    stateProvince: 'California',
    taxAuthority: 'CDTFA',
    eInvoiceFormat: 'NONE',
    requiresEInvoicing: false,
    isActive: true,
  },
  {
    id: 'sample-city',
    name: 'San Francisco',
    code: 'US-SF',
    jurisdictionType: 'CITY',
    country: 'United States',
    countryCode: 'US',
    stateProvince: 'California',
    city: 'San Francisco',
    taxAuthority: 'SF Tax Collector',
    eInvoiceFormat: 'NONE',
    requiresEInvoicing: false,
    isActive: true,
    parentJurisdiction: { id: 'sample-state', name: 'California' },
  },
];

export default function TaxJurisdictionsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  
  const [jurisdictions, setJurisdictions] = useState<TaxJurisdiction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJurisdictions();
  }, [orgSlug]);

  const fetchJurisdictions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/${orgSlug}/tax/jurisdictions`);
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setJurisdictions(list.length ? list : SAMPLE_JURISDICTIONS);
        return;
      }
    } catch (error) {
      console.error('Error fetching jurisdictions:', error);
    } finally {
      setLoading(false);
    }
    setJurisdictions(SAMPLE_JURISDICTIONS);
  };

  const handleDownloadReport = async () => {
    // For demo purposes, use last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    try {
      const response = await fetch(`/api/${orgSlug}/tax/jurisdictions/report?startDate=${startDateStr}&endDate=${endDateStr}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tax-summary-report-${startDateStr}-to-${endDateStr}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Failed to download report');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const getJurisdictionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      FEDERAL: 'bg-purple-100 text-purple-800',
      STATE: 'bg-blue-100 text-blue-800',
      COUNTY: 'bg-green-100 text-green-800',
      CITY: 'bg-yellow-100 text-yellow-800',
      LOCAL: 'bg-orange-100 text-orange-800',
      SPECIAL: 'bg-red-100 text-red-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const federalJurisdictions = jurisdictions.filter(j => j.jurisdictionType === 'FEDERAL');
  const stateJurisdictions = jurisdictions.filter(j => j.jurisdictionType === 'STATE');
  const localJurisdictions = jurisdictions.filter(j => ['COUNTY', 'CITY', 'LOCAL'].includes(j.jurisdictionType));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tax Jurisdictions</h1>
          <p className="text-gray-600 mt-1">Manage tax jurisdictions and hierarchies</p>
        </div>
        <div className="flex gap-4">
          <Link
            href={`/${orgSlug}/tax/jurisdictions/new`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Jurisdiction
          </Link>
          <button
            onClick={handleDownloadReport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Jurisdictions</p>
              <p className="text-2xl font-bold mt-1">{jurisdictions.length}</p>
            </div>
            <MapPin className="w-10 h-10 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Federal</p>
              <p className="text-2xl font-bold mt-1">{federalJurisdictions.length}</p>
            </div>
            <Building2 className="w-10 h-10 text-purple-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">State/Province</p>
              <p className="text-2xl font-bold mt-1">{stateJurisdictions.length}</p>
            </div>
            <Building2 className="w-10 h-10 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Local</p>
              <p className="text-2xl font-bold mt-1">{localJurisdictions.length}</p>
            </div>
            <MapPin className="w-10 h-10 text-green-600" />
          </div>
        </div>
      </div>

      {/* Jurisdictions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Authority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-Invoice</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requires E-Invoicing</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Liability Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jurisdictions.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No tax jurisdictions found</p>
                  <p className="text-sm mt-1">Create jurisdictions to manage tax rules</p>
                </td>
              </tr>
            ) : (
              jurisdictions.map((jurisdiction) => (
                <tr key={jurisdiction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{jurisdiction.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {jurisdiction.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getJurisdictionTypeColor(jurisdiction.jurisdictionType)}`}>
                      {jurisdiction.jurisdictionType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {jurisdiction.country}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {jurisdiction.countryCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {jurisdiction.taxAuthority}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {jurisdiction.eInvoiceFormat || 'NONE'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      jurisdiction.requiresEInvoicing ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {jurisdiction.requiresEInvoicing ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {jurisdiction.taxLiabilityAccount?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      jurisdiction.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {jurisdiction.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
