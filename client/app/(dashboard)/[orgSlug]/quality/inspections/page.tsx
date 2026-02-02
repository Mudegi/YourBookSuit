'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, ClipboardCheck, AlertCircle, CheckCircle } from 'lucide-react';

interface QualityInspection {
  id: string;
  inspectionNumber: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  inspectionType: string;
  status: string;
  priority: string;
  result?: string;
  scheduledDate: string;
  actualDate?: string;
  inspector: {
    id: string;
    name: string;
  };
}

const sampleInspections: QualityInspection[] = [
  {
    id: 'in-001',
    inspectionNumber: 'INSP-1042',
    product: { id: 'prd-1', name: 'Raw Material A', sku: 'RMA-001' },
    inspectionType: 'RECEIVING',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    result: undefined,
    scheduledDate: '2025-12-20',
    inspector: { id: 'usr-1', name: 'A. Patel' },
  },
  {
    id: 'in-002',
    inspectionNumber: 'INSP-1039',
    product: { id: 'prd-2', name: 'Assembly Widget', sku: 'ASM-204' },
    inspectionType: 'IN_PROCESS',
    status: 'SCHEDULED',
    priority: 'MEDIUM',
    scheduledDate: '2025-12-21',
    inspector: { id: 'usr-2', name: 'L. Chen' },
  },
  {
    id: 'in-003',
    inspectionNumber: 'INSP-1031',
    product: { id: 'prd-3', name: 'Finished Good X', sku: 'FGX-100' },
    inspectionType: 'FINAL',
    status: 'COMPLETED',
    priority: 'HIGH',
    result: 'PASS',
    scheduledDate: '2025-12-17',
    actualDate: '2025-12-17',
    inspector: { id: 'usr-3', name: 'M. Alvarez' },
  },
];

export default function QualityInspectionsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [inspections, setInspections] = useState<QualityInspection[]>(sampleInspections);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInspections = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/${orgSlug}/quality/inspections`);
        if (response.ok) {
          const data = await response.json();
          if (data?.data) {
            setInspections(data.data);
          }
        }
      } catch (error) {
        console.error('Error fetching inspections, showing sample data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInspections();
  }, [orgSlug]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SCHEDULED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      URGENT: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const completedInspections = inspections.filter(i => i.status === 'COMPLETED');
  const passedInspections = completedInspections.filter(i => i.result === 'PASS');
  const failedInspections = completedInspections.filter(i => i.result === 'FAIL');

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Quality Inspections</h1>
          <p className="text-gray-600 mt-1">Manage quality inspections and results</p>
        </div>
        <Link
          href={`/${orgSlug}/quality/inspections/new`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Inspection
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Inspections</p>
              <p className="text-2xl font-bold mt-1">{inspections.length}</p>
            </div>
            <ClipboardCheck className="w-10 h-10 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold mt-1">{completedInspections.length}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Passed</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{passedInspections.length}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{failedInspections.length}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
        </div>
      </div>

      {/* Inspections Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspection #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspector</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inspections.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No quality inspections found</p>
                  <p className="text-sm mt-1">Create inspections to track quality control</p>
                </td>
              </tr>
            ) : (
              inspections.map((inspection) => (
                <tr key={inspection.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {inspection.inspectionNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{inspection.product.name}</div>
                      <div className="text-sm text-gray-500">{inspection.product.sku}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      {inspection.inspectionType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(inspection.priority)}`}>
                      {inspection.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(inspection.status)}`}>
                      {inspection.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {inspection.result ? (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        inspection.result === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {inspection.result}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {inspection.inspector.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(inspection.scheduledDate).toLocaleDateString()}
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
