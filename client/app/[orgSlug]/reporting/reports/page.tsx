'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Report {
  id: string;
  name: string;
  description: string | null;
  reportType: string;
  category: string | null;
  isPublic: boolean;
  createdAt: string;
  createdBy: {
    firstName: string;
    lastName: string;
  };
}

export default function ReportsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    reportType: 'CUSTOM',
    category: 'FINANCIAL',
  });

  useEffect(() => {
    fetchReports();
  }, [orgSlug]);

  const fetchReports = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/reporting/reports`);
      const data = await response.json();

      if (data.success) {
        setReports(data.data);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`/api/${orgSlug}/reporting/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          query: {},
          columns: [],
          filters: {},
        }),
      });

      const data = await response.json();

      if (data.success) {
        setReports([data.data, ...reports]);
        setShowForm(false);
        setFormData({
          name: '',
          description: '',
          reportType: 'CUSTOM',
          category: 'FINANCIAL',
        });
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to create report');
    }
  };

  const getReportTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      BALANCE_SHEET: 'bg-blue-100 text-blue-800',
      PROFIT_LOSS: 'bg-green-100 text-green-800',
      CASH_FLOW: 'bg-purple-100 text-purple-800',
      TRIAL_BALANCE: 'bg-yellow-100 text-yellow-800',
      AGED_RECEIVABLES: 'bg-orange-100 text-orange-800',
      AGED_PAYABLES: 'bg-red-100 text-red-800',
      INVENTORY_VALUATION: 'bg-indigo-100 text-indigo-800',
      CUSTOM: 'bg-gray-100 text-gray-800',
    };
    return badges[type] || badges.CUSTOM;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-gray-600 mt-1">Manage custom reports and financial statements</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'Create Report'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Create New Report</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Type
                </label>
                <select
                  value={formData.reportType}
                  onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="BALANCE_SHEET">Balance Sheet</option>
                  <option value="PROFIT_LOSS">Profit & Loss</option>
                  <option value="CASH_FLOW">Cash Flow</option>
                  <option value="TRIAL_BALANCE">Trial Balance</option>
                  <option value="AGED_RECEIVABLES">Aged Receivables</option>
                  <option value="AGED_PAYABLES">Aged Payables</option>
                  <option value="INVENTORY_VALUATION">Inventory Valuation</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Report
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Created By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Created Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Public
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No reports found. Create your first custom report.
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{report.name}</div>
                    {report.description && (
                      <div className="text-sm text-gray-500">{report.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getReportTypeBadge(
                        report.reportType
                      )}`}
                    >
                      {report.reportType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {report.category || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {report.createdBy.firstName} {report.createdBy.lastName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        report.isPublic
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {report.isPublic ? 'Yes' : 'No'}
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
