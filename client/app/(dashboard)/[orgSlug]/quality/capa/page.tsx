'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, FileText, Clock, CheckCircle, Plus, AlertTriangle, TrendingUp, Filter } from 'lucide-react';

interface CAPA {
  id: string;
  capaNumber: string;
  title: string;
  description: string;
  source: string;
  riskLevel: string;
  investigationMethod: string;
  status: string;
  assignedTo?: { name: string };
  targetCompletionDate?: string;
  createdAt: string;
  ncr?: { ncrNumber: string; title: string };
  tasks?: { id: string; status: string }[];
  createdBy: { name: string };
}

interface CAPAStats {
  total: number;
  open: number;
  closed: number;
  overdue: number;
  critical: number;
  byRiskLevel: Record<string, number>;
  bySource: Record<string, number>;
}

export default function CAPAPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const [capas, setCapas] = useState<CAPA[]>([]);
  const [stats, setStats] = useState<CAPAStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    riskLevel: 'all',
    source: 'all',
    assignedToId: 'all',
  });

  useEffect(() => {
    fetchCAPAs();
    fetchStats();
  }, [orgSlug, filters]);

  const fetchCAPAs = async () => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') queryParams.append(key, value);
      });

      const response = await fetch(`/api/${orgSlug}/quality/capa?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setCapas(data?.data || []);
      }
    } catch (error) {
      console.error('Error fetching CAPAs:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/quality/capa/config?stats=true`);
      if (response.ok) {
        const data = await response.json();
        setStats(data?.data?.statistics || null);
      }
    } catch (error) {
      console.error('Error fetching CAPA stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'IMPLEMENTED':
        return 'bg-purple-100 text-purple-800';
      case 'VERIFYING':
        return 'bg-indigo-100 text-indigo-800';
      case 'VERIFIED':
        return 'bg-teal-100 text-teal-800';
      case 'CLOSED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'NCR':
        return 'bg-red-100 text-red-800';
      case 'AUDIT':
        return 'bg-blue-100 text-blue-800';
      case 'CUSTOMER_COMPLAINT':
        return 'bg-orange-100 text-orange-800';
      case 'MANAGEMENT_REVIEW':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (capa: CAPA) => {
    if (!capa.targetCompletionDate || capa.status === 'CLOSED' || capa.status === 'CANCELLED') {
      return false;
    }
    return new Date(capa.targetCompletionDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading CAPA records...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Corrective & Preventive Actions (CAPA)
          </h1>
          <p className="text-gray-500">Manage corrective and preventive action plans</p>
        </div>
        <Button
          onClick={() => router.push(`/${orgSlug}/quality/capa/new`)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New CAPA
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total CAPAs</p>
              <p className="text-2xl font-bold">{stats?.total || 0}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Open/In Progress</p>
              <p className="text-2xl font-bold">{stats?.open || 0}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats?.overdue || 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Critical Risk</p>
              <p className="text-2xl font-bold text-red-600">{stats?.critical || 0}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="IMPLEMENTED">Implemented</SelectItem>
              <SelectItem value="VERIFYING">Verifying</SelectItem>
              <SelectItem value="VERIFIED">Verified</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.riskLevel} onValueChange={(value) => setFilters({...filters, riskLevel: value})}>
            <SelectTrigger>
              <SelectValue placeholder="All Risk Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk Levels</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.source} onValueChange={(value) => setFilters({...filters, source: value})}>
            <SelectTrigger>
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="NCR">NCR</SelectItem>
              <SelectItem value="AUDIT">Audit</SelectItem>
              <SelectItem value="CUSTOMER_COMPLAINT">Customer Complaint</SelectItem>
              <SelectItem value="MANAGEMENT_REVIEW">Management Review</SelectItem>
              <SelectItem value="INTERNAL_REVIEW">Internal Review</SelectItem>
              <SelectItem value="SUPPLIER_ISSUE">Supplier Issue</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setFilters({ status: 'all', riskLevel: 'all', source: 'all', assignedToId: 'all' })}
          >
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* CAPAs Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CAPA Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Related NCR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasks
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {capas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No CAPAs found. Create your first corrective/preventive action.
                  </td>
                </tr>
              ) : (
                capas.map((capa) => (
                  <tr
                    key={capa.id}
                    onClick={() => router.push(`/${orgSlug}/quality/capa/${capa.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{capa.capaNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{capa.title}</span>
                        <p className="text-xs text-gray-500 truncate max-w-xs">{capa.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getSourceColor(
                          capa.source
                        )}`}
                      >
                        {capa.source.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskLevelColor(
                          capa.riskLevel
                        )}`}
                      >
                        {capa.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          capa.status
                        )}`}
                      >
                        {capa.status.replace('_', ' ')}
                      </span>
                      {isOverdue(capa) && (
                        <div className="text-xs text-red-600 mt-1">Overdue</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{capa.ncr?.ncrNumber || '—'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{capa.assignedTo?.name || '—'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {capa.targetCompletionDate
                        ? new Date(capa.targetCompletionDate).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {capa.tasks?.filter(t => t.status !== 'COMPLETED').length || 0} open
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
