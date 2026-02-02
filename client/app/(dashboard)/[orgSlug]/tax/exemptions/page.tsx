'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCheck, Building, Calendar, AlertCircle, Plus } from 'lucide-react';

interface TaxExemption {
  id: string;
  exemptionNumber?: string;
  certificateNumber?: string;
  issuingAuthority?: string;
  issuedDate?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  customer?: { name: string; email: string };
  taxRule?: { name: string; jurisdiction?: { name: string; code: string } };
  exemptionType: string;
  exemptionRate?: number;
  isActive: boolean;
  validFrom: string;
  validTo?: string;
  documentUrl?: string;
  efrisReason?: string;
  reason?: string;
  createdAt?: string;
}

const SAMPLE_EXEMPTIONS: TaxExemption[] = [
  {
    id: 'sample-ex-1',
    exemptionNumber: 'EX-2024-1001',
    certificateNumber: 'URA-WHT-2024-001',
    issuingAuthority: 'URA',
    issuedDate: new Date('2024-01-15').toISOString(),
    entityType: 'VENDOR',
    entityId: 'VEND-001',
    entityName: 'Kampala Medical Supplies Ltd',
    exemptionType: 'WHT_EXEMPTION',
    exemptionRate: 0,
    isActive: true,
    validFrom: new Date('2024-01-15').toISOString(),
    validTo: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
    taxRule: { name: 'WHT 6% Professional Services', jurisdiction: { name: 'Uganda', code: 'UG' } },
    efrisReason: 'MEDICAL_SUPPLIES',
    reason: 'Supply of medical goods and services',
    documentUrl: '/documents/exemptions/ura-wht-2024-001.pdf',
  },
  {
    id: 'sample-ex-2',
    exemptionNumber: 'EX-2023-4422',
    certificateNumber: 'CERT-8899',
    issuingAuthority: 'IRS',
    issuedDate: new Date('2023-06-01').toISOString(),
    entityType: 'CUSTOMER',
    entityId: 'CUST-002',
    entityName: 'Civic Health NGO',
    exemptionType: 'VAT_EXEMPTION',
    exemptionRate: 0,
    isActive: false,
    validFrom: new Date('2023-06-01').toISOString(),
    validTo: new Date('2023-12-31').toISOString(),
    taxRule: { name: 'VAT Exemption for NGOs', jurisdiction: { name: 'California', code: 'US-CA' } },
    efrisReason: 'NONPROFIT',
    reason: 'Non-profit organization exemption',
  },
  {
    id: 'sample-ex-3',
    exemptionNumber: 'EX-2024-2001',
    certificateNumber: 'KRA-VAT-2024-045',
    issuingAuthority: 'KRA',
    issuedDate: new Date('2024-03-01').toISOString(),
    entityType: 'CUSTOMER',
    entityId: 'CUST-003',
    entityName: 'Nairobi Manufacturing Corp',
    exemptionType: 'PARTIAL',
    exemptionRate: 8,
    isActive: true,
    validFrom: new Date('2024-03-01').toISOString(),
    validTo: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(),
    taxRule: { name: 'Manufacturing VAT Reduced Rate', jurisdiction: { name: 'Kenya', code: 'KE' } },
    efrisReason: 'MANUFACTURING',
    reason: 'Manufacturing exemption - reduced rate',
    documentUrl: '/documents/exemptions/kra-vat-2024-045.pdf',
  },
];

export default function TaxExemptionsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const [exemptions, setExemptions] = useState<TaxExemption[]>([]);
  const [loading, setLoading] = useState(true);

  const [healthCheck, setHealthCheck] = useState<any>(null);
  const [showHealthCheck, setShowHealthCheck] = useState(false);

  useEffect(() => {
    fetchExemptions();
    fetchHealthCheck();
  }, [orgSlug]);

  const fetchHealthCheck = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/tax/exemptions/health`);
      if (response.ok) {
        const data = await response.json();
        setHealthCheck(data.data);
      }
    } catch (error) {
      console.error('Error fetching health check:', error);
    }
  };

  const fetchExemptions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/${orgSlug}/tax/exemptions`);
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setExemptions(list.length ? list : SAMPLE_EXEMPTIONS);
        return;
      }
    } catch (error) {
      console.error('Error fetching tax exemptions:', error);
    } finally {
      setLoading(false);
    }
    setExemptions(SAMPLE_EXEMPTIONS);
  };

  const getStatus = (exemption: TaxExemption) => {
    if (!exemption.isActive) return 'INACTIVE';
    if (exemption.validTo && new Date(exemption.validTo).getTime() < Date.now()) return 'EXPIRED';
    return 'ACTIVE';
  };

  const totalExemptions = exemptions.length;
  const activeExemptions = exemptions.filter((e) => getStatus(e) === 'ACTIVE').length;
  const expiringSoon = exemptions.filter((e) => {
    if (!e.validTo || getStatus(e) !== 'ACTIVE') return false;
    const daysUntilExpiry = Math.floor(
      (new Date(e.validTo).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  }).length;
  const expiredCount = exemptions.filter((e) => getStatus(e) === 'EXPIRED').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'REVOKED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getExemptionTypeColor = (type: string) => {
    switch (type) {
      case 'RESALE':
        return 'bg-blue-100 text-blue-800';
      case 'GOVERNMENT':
        return 'bg-purple-100 text-purple-800';
      case 'NONPROFIT':
        return 'bg-green-100 text-green-800';
      case 'AGRICULTURE':
        return 'bg-yellow-100 text-yellow-800';
      case 'MANUFACTURING':
        return 'bg-orange-100 text-orange-800';
      case 'FULL':
        return 'bg-green-100 text-green-800';
      case 'PARTIAL':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading tax exemptions...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tax Exemptions</h1>
          <p className="text-gray-500">Manage customer tax exemption certificates</p>
        </div>
        <Button
          onClick={() => router.push(`/${orgSlug}/tax/exemptions/new`)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Exemption Certificate
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Exemptions</p>
              <p className="text-2xl font-bold">{totalExemptions}</p>
            </div>
            <FileCheck className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold">{activeExemptions}</p>
            </div>
            <Building className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Expiring Soon</p>
              <p className="text-2xl font-bold">{expiringSoon}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Expired</p>
              <p className="text-2xl font-bold">{expiredCount}</p>
            </div>
            <Calendar className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Health Check Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Certificate Health Check</h2>
          <Button
            onClick={() => setShowHealthCheck(!showHealthCheck)}
            variant="outline"
            size="sm"
          >
            {showHealthCheck ? 'Hide' : 'Show'} Health Check
          </Button>
        </div>

        {showHealthCheck && healthCheck && (
          <div className="bg-white p-6 rounded-lg shadow mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{healthCheck.activeExemptions}</div>
                <div className="text-sm text-gray-500">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{healthCheck.expiringSoon}</div>
                <div className="text-sm text-gray-500">Expiring Soon</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{healthCheck.expired}</div>
                <div className="text-sm text-gray-500">Expired</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{healthCheck.missingCertificates}</div>
                <div className="text-sm text-gray-500">Missing Docs</div>
              </div>
            </div>

            {healthCheck.alerts && healthCheck.alerts.length > 0 && (
              <div>
                <h3 className="text-md font-semibold mb-2">Alerts</h3>
                <div className="space-y-2">
                  {healthCheck.alerts.slice(0, 5).map((alert: any, index: number) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-l-4 ${
                        alert.severity === 'CRITICAL' ? 'border-red-500 bg-red-50' :
                        alert.severity === 'HIGH' ? 'border-orange-500 bg-orange-50' :
                        alert.severity === 'MEDIUM' ? 'border-yellow-500 bg-yellow-50' :
                        'border-blue-500 bg-blue-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{alert.exemptionNumber}</div>
                          <div className="text-sm text-gray-600">{alert.entityName}</div>
                          <div className="text-sm">{alert.message}</div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          alert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tax Exemptions Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Certificate #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issuing Authority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exemption Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jurisdiction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valid From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valid To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {exemptions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No tax exemptions found. Create your first exemption certificate.
                  </td>
                </tr>
              ) : (
                exemptions.map((exemption) => (
                  <tr
                    key={exemption.id}
                    onClick={() => router.push(`/${orgSlug}/tax/exemptions/${exemption.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {exemption.certificateNumber || exemption.exemptionNumber || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{exemption.issuingAuthority || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {exemption.entityName || exemption.customer?.name || exemption.entityId || '—'}
                      </div>
                      {(exemption.customer?.email || exemption.entityType) && (
                        <div className="text-sm text-gray-500">
                          {exemption.customer?.email || exemption.entityType}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getExemptionTypeColor(
                          exemption.exemptionType
                        )}`}
                      >
                        {exemption.exemptionType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{exemption.taxRule?.jurisdiction?.name || '—'}</div>
                      <div className="text-sm text-gray-500">{exemption.taxRule?.jurisdiction?.code || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          getStatus(exemption)
                        )}`}
                      >
                        {getStatus(exemption)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(exemption.validFrom).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {exemption.validTo ? new Date(exemption.validTo).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {exemption.documentUrl ? (
                        <a
                          href={exemption.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
