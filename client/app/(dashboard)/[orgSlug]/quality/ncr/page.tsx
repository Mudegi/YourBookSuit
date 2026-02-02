'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileText, Clock, CheckCircle, Plus } from 'lucide-react';

interface NCR {
  id: string;
  number: string;
  title: string;
  product?: { name: string; sku: string };
  severity: string;
  status: string;
  issueDescription: string;
  rootCause?: string;
  reportedBy: { name: string };
  assignedTo?: { name: string };
  createdAt: string;
}

const sampleNcrs: NCR[] = [
  {
    id: 'ncr-001',
    number: 'NCR-2305',
    title: 'Dimensional deviation on Component B',
    product: { name: 'Component B', sku: 'COMP-222' },
    severity: 'MAJOR',
    status: 'IN_PROGRESS',
    issueDescription: 'Width out of tolerance by 0.4mm',
    reportedBy: { name: 'Operator - L. James' },
    assignedTo: { name: 'QE - C. Musa' },
    createdAt: '2025-12-18',
  },
  {
    id: 'ncr-002',
    number: 'NCR-2304',
    title: 'Supplier lot rust spots',
    product: { name: 'Raw Material A', sku: 'RMA-001' },
    severity: 'CRITICAL',
    status: 'OPEN',
    issueDescription: 'Surface corrosion on 3/20 samples',
    reportedBy: { name: 'Receiving - S. Wei' },
    assignedTo: { name: 'SQE - J. Patel' },
    createdAt: '2025-12-17',
  },
  {
    id: 'ncr-003',
    number: 'NCR-2301',
    title: 'Packaging tear in finished goods',
    product: { name: 'Finished Good X', sku: 'FGX-100' },
    severity: 'MINOR',
    status: 'RESOLVED',
    issueDescription: 'Torn outer carton observed during audit',
    reportedBy: { name: 'QA - P. Kamanzi' },
    assignedTo: { name: 'Ops - S. Kim' },
    createdAt: '2025-12-10',
  },
];

export default function NCRPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const [ncrs, setNcrs] = useState<NCR[]>(sampleNcrs);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNCRs();
  }, [orgSlug]);

  const fetchNCRs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/${orgSlug}/quality/ncr`);
      if (response.ok) {
        const data = await response.json();
        const records = data?.data || data;
        if (Array.isArray(records)) {
          setNcrs(records);
        }
      }
    } catch (error) {
      console.error('Error fetching NCRs, showing sample data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalNCRs = ncrs.length;
  const openNCRs = ncrs.filter(n => n.status === 'OPEN' || n.status === 'IN_PROGRESS').length;
  const closedNCRs = ncrs.filter(n => n.status === 'CLOSED').length;
  const criticalNCRs = ncrs.filter(n => n.severity === 'CRITICAL').length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'MAJOR':
        return 'bg-orange-100 text-orange-800';
      case 'MINOR':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-red-100 text-red-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading non-conformance reports...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Non-Conformance Reports (NCR)</h1>
          <p className="text-gray-500">Track quality issues and non-conformances</p>
        </div>
        <Button
          onClick={() => router.push(`/${orgSlug}/quality/ncr/new`)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New NCR
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total NCRs</p>
              <p className="text-2xl font-bold">{totalNCRs}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Open/In Progress</p>
              <p className="text-2xl font-bold">{openNCRs}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Closed</p>
              <p className="text-2xl font-bold">{closedNCRs}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Critical</p>
              <p className="text-2xl font-bold">{criticalNCRs}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* NCRs Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NCR Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reported By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ncrs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No NCRs found. Create your first non-conformance report.
                  </td>
                </tr>
              ) : (
                ncrs.map((ncr) => (
                  <tr
                    key={ncr.id}
                    onClick={() => router.push(`/${orgSlug}/quality/ncr/${ncr.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{ncr.number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">{ncr.title}</span>
                    </td>
                    <td className="px-6 py-4">
                      {ncr.product ? (
                        <>
                          <div className="text-sm text-gray-900">{ncr.product.name}</div>
                          <div className="text-sm text-gray-500">{ncr.product.sku}</div>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityColor(
                          ncr.severity
                        )}`}
                      >
                        {ncr.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          ncr.status
                        )}`}
                      >
                        {ncr.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{ncr.reportedBy.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{ncr.assignedTo?.name || '—'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ncr.createdAt).toLocaleDateString()}
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
