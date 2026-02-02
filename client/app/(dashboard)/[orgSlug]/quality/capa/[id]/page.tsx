'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit, Plus, CheckCircle, Clock, AlertTriangle, User, Calendar, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface CAPA {
  id: string;
  capaNumber: string;
  title: string;
  description: string;
  source: string;
  riskLevel: string;
  investigationMethod: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  productId?: string;
  lotNumber?: string;
  vendorId?: string;
  customerId?: string;
  quantity?: number;
  ncrId?: string;
  createdBy: { id: string; name: string; email: string };
  assignedTo?: { id: string; name: string; email: string };
  verifiedBy?: { id: string; name: string; email: string };
  targetCompletionDate?: string;
  closureDate?: string;
  rootCauseAnalysis?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  effectivenessVerification?: string;
  verificationDate?: string;
  notes?: string;
  localData?: any;
  product?: { id: string; name: string };
  vendor?: { id: string; name: string };
  customer?: { id: string; name: string };
  ncr?: { id: string; ncrNumber: string; title: string };
  tasks: CAPATask[];
}

interface CAPATask {
  id: string;
  title: string;
  description?: string;
  status: string;
  taskType: string;
  assignedTo: { id: string; name: string; email: string };
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}

export default function CAPADetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const capaId = params.id as string;

  const [capa, setCapa] = useState<CAPA | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchCAPA();
  }, [orgSlug, capaId]);

  const fetchCAPA = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/${orgSlug}/quality/capa/${capaId}`);
      if (response.ok) {
        const data = await response.json();
        setCapa(data?.data || null);
      } else if (response.status === 404) {
        toast.error('CAPA not found');
        router.push(`/${orgSlug}/quality/capa`);
      }
    } catch (error) {
      console.error('Error fetching CAPA:', error);
      toast.error('Failed to load CAPA');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IMPLEMENTED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'VERIFYING':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'VERIFIED':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'CLOSED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'NCR':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'AUDIT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CUSTOMER_COMPLAINT':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isOverdue = () => {
    if (!capa?.targetCompletionDate || capa.status === 'CLOSED' || capa.status === 'CANCELLED') {
      return false;
    }
    return new Date(capa.targetCompletionDate) < new Date();
  };

  const getOpenTasksCount = () => {
    return capa?.tasks.filter(task => task.status !== 'COMPLETED').length || 0;
  };

  const getCompletedTasksCount = () => {
    return capa?.tasks.filter(task => task.status === 'COMPLETED').length || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading CAPA...</p>
        </div>
      </div>
    );
  }

  if (!capa) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">CAPA not found</p>
          <Button onClick={() => router.push(`/${orgSlug}/quality/capa`)} className="mt-4">
            Back to CAPAs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{capa.capaNumber}</h1>
            <p className="text-gray-500">{capa.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/${orgSlug}/quality/capa/${capa.id}/edit`)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button
            onClick={() => router.push(`/${orgSlug}/quality/capa/${capa.id}/tasks/new`)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Badge className={getStatusColor(capa.status)}>
          {capa.status.replace('_', ' ')}
        </Badge>
        <Badge className={getRiskLevelColor(capa.riskLevel)}>
          {capa.riskLevel} Risk
        </Badge>
        <Badge className={getSourceColor(capa.source)}>
          {capa.source.replace('_', ' ')}
        </Badge>
        {isOverdue() && (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Tasks</p>
              <p className="text-2xl font-bold">{capa.tasks.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Open Tasks</p>
              <p className="text-2xl font-bold text-orange-600">{getOpenTasksCount()}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed Tasks</p>
              <p className="text-2xl font-bold text-green-600">{getCompletedTasksCount()}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Target Date</p>
              <p className="text-lg font-semibold">
                {capa.targetCompletionDate
                  ? new Date(capa.targetCompletionDate).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-gray-500" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({capa.tasks.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-sm text-gray-900">{capa.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Investigation Method</label>
                  <p className="text-sm text-gray-900">{capa.investigationMethod.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created By</label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{capa.createdBy.name}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Assigned To</label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{capa.assignedTo?.name || 'Not assigned'}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created Date</label>
                  <p className="text-sm text-gray-900">{new Date(capa.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </Card>

            {/* Related Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Related Information</h3>
              <div className="space-y-3">
                {capa.ncr && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Related NCR</label>
                    <p className="text-sm text-gray-900">{capa.ncr.ncrNumber} - {capa.ncr.title}</p>
                  </div>
                )}
                {capa.product && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Product</label>
                    <p className="text-sm text-gray-900">{capa.product.name}</p>
                  </div>
                )}
                {capa.lotNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Lot Number</label>
                    <p className="text-sm text-gray-900">{capa.lotNumber}</p>
                  </div>
                )}
                {capa.quantity && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Quantity</label>
                    <p className="text-sm text-gray-900">{capa.quantity}</p>
                  </div>
                )}
                {capa.vendor && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Vendor</label>
                    <p className="text-sm text-gray-900">{capa.vendor.name}</p>
                  </div>
                )}
                {capa.customer && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Customer</label>
                    <p className="text-sm text-gray-900">{capa.customer.name}</p>
                  </div>
                )}
                {capa.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Notes</label>
                    <p className="text-sm text-gray-900">{capa.notes}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Root Cause Analysis */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Root Cause Analysis</h3>
              <div className="prose prose-sm max-w-none">
                {capa.rootCauseAnalysis ? (
                  <div dangerouslySetInnerHTML={{ __html: capa.rootCauseAnalysis.replace(/\n/g, '<br>') }} />
                ) : (
                  <p className="text-gray-500 italic">No root cause analysis documented yet.</p>
                )}
              </div>
            </Card>

            {/* Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Corrective & Preventive Actions</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Corrective Action</label>
                  <div className="prose prose-sm max-w-none mt-1">
                    {capa.correctiveAction ? (
                      <div dangerouslySetInnerHTML={{ __html: capa.correctiveAction.replace(/\n/g, '<br>') }} />
                    ) : (
                      <p className="text-gray-500 italic">No corrective action documented yet.</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Preventive Action</label>
                  <div className="prose prose-sm max-w-none mt-1">
                    {capa.preventiveAction ? (
                      <div dangerouslySetInnerHTML={{ __html: capa.preventiveAction.replace(/\n/g, '<br>') }} />
                    ) : (
                      <p className="text-gray-500 italic">No preventive action documented yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Effectiveness Verification */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Effectiveness Verification</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Verification Plan</label>
                  <div className="prose prose-sm max-w-none mt-1">
                    {capa.effectivenessVerification ? (
                      <div dangerouslySetInnerHTML={{ __html: capa.effectivenessVerification.replace(/\n/g, '<br>') }} />
                    ) : (
                      <p className="text-gray-500 italic">No verification plan documented yet.</p>
                    )}
                  </div>
                </div>
                {capa.verificationDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Verification Date</label>
                    <p className="text-sm text-gray-900">{new Date(capa.verificationDate).toLocaleDateString()}</p>
                  </div>
                )}
                {capa.verifiedBy && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Verified By</label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{capa.verifiedBy.name}</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">CAPA Tasks</h3>
              <Button
                onClick={() => router.push(`/${orgSlug}/quality/capa/${capa.id}/tasks/new`)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            </div>

            {capa.tasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No tasks created yet.</p>
            ) : (
              <div className="space-y-4">
                {capa.tasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{task.title}</h4>
                      <Badge className={task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    )}
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span>Assigned to: {task.assignedTo.name}</span>
                        <span>Type: {task.taskType}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                        {task.completedAt && <span>Completed: {new Date(task.completedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">CAPA History</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">CAPA Created</p>
                  <p className="text-xs text-gray-500">{new Date(capa.createdAt).toLocaleString()}</p>
                  <p className="text-xs text-gray-600">by {capa.createdBy.name}</p>
                </div>
              </div>
              {/* Add more history items as the CAPA progresses */}
              <div className="text-center text-gray-500 py-8">
                <p>Full audit trail will be implemented with status changes and task completions.</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}