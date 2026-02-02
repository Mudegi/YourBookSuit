'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle,
  User,
  Calendar,
  Tag,
  Package,
  Building,
  MessageSquare,
  Activity,
  Save,
  X
} from 'lucide-react';

interface NCR {
  id: string;
  number: string;
  title: string;
  product?: { name: string; sku: string };
  vendor?: { name: string };
  customer?: { name: string };
  source: string;
  severity: string;
  status: string;
  issueDescription: string;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  quantity?: number;
  lotNumber?: string;
  batchNumber?: string;
  reportedBy: { name: string };
  assignedTo?: { name: string };
  createdAt: string;
  updatedAt?: string;
  closedAt?: string;
  notes?: string;
  attachments?: any[];
}

const sampleNcrs: NCR[] = [
  {
    id: 'ncr-001',
    number: 'NCR-2305',
    title: 'Dimensional deviation on Component B',
    product: { name: 'Component B', sku: 'COMP-222' },
    source: 'PRODUCTION',
    severity: 'MAJOR',
    status: 'IN_PROGRESS',
    issueDescription: 'Width out of tolerance by 0.4mm on 15 out of 100 pieces inspected',
    rootCause: 'Machine calibration drift due to temperature variation',
    correctiveAction: 'Recalibrate machine and implement daily calibration checks',
    preventiveAction: 'Install temperature monitoring system in production area',
    quantity: 100,
    lotNumber: 'LOT-2025-001',
    reportedBy: { name: 'Operator - L. James' },
    assignedTo: { name: 'QE - C. Musa' },
    createdAt: '2025-12-18',
    updatedAt: '2025-12-20',
    notes: 'Follow-up inspection scheduled for Dec 22',
  },
  {
    id: 'ncr-002',
    number: 'NCR-2304',
    title: 'Supplier lot rust spots',
    product: { name: 'Raw Material A', sku: 'RMA-001' },
    vendor: { name: 'SteelCorp Ltd' },
    source: 'SUPPLIER',
    severity: 'CRITICAL',
    status: 'OPEN',
    issueDescription: 'Surface corrosion on 3/20 samples from supplier lot',
    quantity: 500,
    lotNumber: 'SUP-LOT-456',
    reportedBy: { name: 'Receiving - S. Wei' },
    assignedTo: { name: 'SQE - J. Patel' },
    createdAt: '2025-12-17',
  },
  {
    id: 'ncr-003',
    number: 'NCR-2301',
    title: 'Customer complaint - packaging damage',
    product: { name: 'Finished Product X', sku: 'FP-001' },
    customer: { name: 'RetailCorp Inc' },
    source: 'CUSTOMER',
    severity: 'MINOR',
    status: 'CLOSED',
    issueDescription: 'Damaged outer packaging on delivery',
    rootCause: 'Improper stacking during warehouse handling',
    correctiveAction: 'Implement training on proper stacking procedures',
    preventiveAction: 'Review and update warehouse handling procedures',
    quantity: 25,
    reportedBy: { name: 'Customer Service - M. Brown' },
    assignedTo: { name: 'Logistics - R. Garcia' },
    createdAt: '2025-12-15',
    closedAt: '2025-12-18',
  },
];

export default function NCRDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug;
  const ncrId = params.id;
  const [ncr, setNcr] = useState<NCR | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);

  // Form states
  const [commentText, setCommentText] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Action states
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchNcr();
  }, [ncrId]);

  const fetchNcr = async () => {
    try {
      setLoading(true);
      // Try to fetch from API first
      const response = await fetch(`/api/${orgSlug}/quality/ncr/${ncrId}`);
      if (response.ok) {
        const data = await response.json();
        setNcr(data?.data || data);
      } else {
        // Fall back to sample data
        const sampleNcr = sampleNcrs.find(n => n.id === ncrId);
        if (sampleNcr) {
          setNcr(sampleNcr);
        }
      }
    } catch (error) {
      console.error('Error fetching NCR, showing sample data:', error);
      // Fall back to sample data
      const sampleNcr = sampleNcrs.find(n => n.id === ncrId);
      if (sampleNcr) {
        setNcr(sampleNcr);
      }
    } finally {
      setLoading(false);
    }
  };

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
      case 'CLOSED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'PRODUCTION':
        return <Package className="h-4 w-4" />;
      case 'SUPPLIER':
        return <Building className="h-4 w-4" />;
      case 'CUSTOMER':
        return <User className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  // Action handlers
  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    setSubmitting(true);
    try {
      const currentNotes = ncr?.notes || '';
      const updatedNotes = currentNotes
        ? `${currentNotes}\n\n[${new Date().toLocaleString()}] Comment: ${commentText}`
        : `[${new Date().toLocaleString()}] Comment: ${commentText}`;

      const response = await fetch(`/api/${orgSlug}/quality/ncr/${ncrId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: updatedNotes,
        }),
      });

      if (response.ok) {
        setCommentText('');
        setCommentModalOpen(false);
        await fetchNcr(); // Refresh data
      } else {
        console.error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus) return;

    setSubmitting(true);
    try {
      const updateData: any = {
        status: newStatus,
      };

      // Add additional fields if provided
      if (rootCause.trim()) updateData.rootCause = rootCause;
      if (correctiveAction.trim()) updateData.correctiveAction = correctiveAction;
      if (preventiveAction.trim()) updateData.preventiveAction = preventiveAction;
      if (additionalNotes.trim()) {
        const currentNotes = ncr?.notes || '';
        updateData.notes = currentNotes
          ? `${currentNotes}\n\n[${new Date().toLocaleString()}] Status Update: ${additionalNotes}`
          : `[${new Date().toLocaleString()}] Status Update: ${additionalNotes}`;
      }

      const response = await fetch(`/api/${orgSlug}/quality/ncr/${ncrId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        // Reset form
        setNewStatus('');
        setRootCause('');
        setCorrectiveAction('');
        setPreventiveAction('');
        setAdditionalNotes('');
        setStatusModalOpen(false);
        await fetchNcr(); // Refresh data
      } else {
        console.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReassign = async () => {
    if (!newAssignee.trim()) return;

    setSubmitting(true);
    try {
      // For now, we'll just update notes since we don't have user lookup
      // In a real implementation, you'd look up the user by name/email
      const currentNotes = ncr?.notes || '';
      const updatedNotes = currentNotes
        ? `${currentNotes}\n\n[${new Date().toLocaleString()}] Reassigned to: ${newAssignee}`
        : `[${new Date().toLocaleString()}] Reassigned to: ${newAssignee}`;

      const response = await fetch(`/api/${orgSlug}/quality/ncr/${ncrId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: updatedNotes,
        }),
      });

      if (response.ok) {
        setNewAssignee('');
        setReassignModalOpen(false);
        await fetchNcr(); // Refresh data
      } else {
        console.error('Failed to reassign NCR');
      }
    } catch (error) {
      console.error('Error reassigning NCR:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading NCR details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!ncr) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">NCR Not Found</h2>
          <p className="text-gray-600 mb-4">The requested NCR could not be found.</p>
          <Button onClick={() => router.push(`/${orgSlug}/quality/ncr`)}>
            Back to NCR List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/${orgSlug}/quality/ncr`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to NCRs
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{ncr.number}</h1>
            <p className="text-gray-600">{ncr.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getSeverityColor(ncr.severity)}>
            {ncr.severity}
          </Badge>
          <Badge className={getStatusColor(ncr.status)}>
            {ncr.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Issue Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Issue Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-gray-900">{ncr.issueDescription}</p>
              </div>

              {ncr.rootCause && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Root Cause</label>
                  <p className="mt-1 text-gray-900">{ncr.rootCause}</p>
                </div>
              )}

              {ncr.correctiveAction && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Corrective Action</label>
                  <p className="mt-1 text-gray-900">{ncr.correctiveAction}</p>
                </div>
              )}

              {ncr.preventiveAction && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Preventive Action</label>
                  <p className="mt-1 text-gray-900">{ncr.preventiveAction}</p>
                </div>
              )}

              {ncr.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <p className="mt-1 text-gray-900">{ncr.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline/Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">NCR Created</p>
                    <p className="text-xs text-gray-500">
                      {new Date(ncr.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">by {ncr.reportedBy.name}</p>
                  </div>
                </div>

                {ncr.updatedAt && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Last Updated</p>
                      <p className="text-xs text-gray-500">
                        {new Date(ncr.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {ncr.closedAt && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">NCR Closed</p>
                      <p className="text-xs text-gray-500">
                        {new Date(ncr.closedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* NCR Information */}
          <Card>
            <CardHeader>
              <CardTitle>NCR Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Source:</span>
                <Badge variant="outline" className="flex items-center gap-1">
                  {getSourceIcon(ncr.source)}
                  {ncr.source}
                </Badge>
              </div>

              {ncr.product && (
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Product:</span>
                  <span className="text-sm font-medium">{ncr.product.name} ({ncr.product.sku})</span>
                </div>
              )}

              {ncr.vendor && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Vendor:</span>
                  <span className="text-sm font-medium">{ncr.vendor.name}</span>
                </div>
              )}

              {ncr.customer && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Customer:</span>
                  <span className="text-sm font-medium">{ncr.customer.name}</span>
                </div>
              )}

              {ncr.quantity && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Quantity:</span>
                  <span className="text-sm font-medium">{ncr.quantity}</span>
                </div>
              )}

              {ncr.lotNumber && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Lot Number:</span>
                  <span className="text-sm font-medium">{ncr.lotNumber}</span>
                </div>
              )}

              {ncr.batchNumber && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Batch Number:</span>
                  <span className="text-sm font-medium">{ncr.batchNumber}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Reported by:</span>
                <span className="text-sm font-medium">{ncr.reportedBy.name}</span>
              </div>

              {ncr.assignedTo && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Assigned to:</span>
                  <span className="text-sm font-medium">{ncr.assignedTo.name}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Created:</span>
                <span className="text-sm font-medium">
                  {new Date(ncr.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setCommentModalOpen(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Add Comment
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setStatusModalOpen(true)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Update Status
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setReassignModalOpen(true)}
              >
                <User className="h-4 w-4 mr-2" />
                Reassign
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {/* Add Comment Modal */}
      <Modal
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        title="Add Comment"
        description="Add a comment to this NCR"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Enter your comment..."
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCommentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddComment}
              disabled={submitting || !commentText.trim()}
            >
              {submitting ? 'Adding...' : 'Add Comment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update NCR Status"
        description="Update the status and add resolution details"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="status">New Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <option value="">Select status...</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="rootCause">Root Cause (Optional)</Label>
            <Textarea
              id="rootCause"
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="Describe the root cause..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="correctiveAction">Corrective Action (Optional)</Label>
            <Textarea
              id="correctiveAction"
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="Describe the corrective action..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="preventiveAction">Preventive Action (Optional)</Label>
            <Textarea
              id="preventiveAction"
              value={preventiveAction}
              onChange={(e) => setPreventiveAction(e.target.value)}
              placeholder="Describe preventive measures..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
            <Textarea
              id="additionalNotes"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setStatusModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={submitting || !newStatus}
            >
              {submitting ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reassign Modal */}
      <Modal
        isOpen={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        title="Reassign NCR"
        description="Assign this NCR to a different person"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="assignee">New Assignee</Label>
            <Input
              id="assignee"
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              placeholder="Enter assignee name or email..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setReassignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReassign}
              disabled={submitting || !newAssignee.trim()}
            >
              {submitting ? 'Reassigning...' : 'Reassign'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}