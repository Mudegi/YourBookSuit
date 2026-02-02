'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
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
  productId?: string;
  lotNumber?: string;
  vendorId?: string;
  customerId?: string;
  quantity?: number;
  ncrId?: string;
  assignedToId?: string;
  targetCompletionDate?: string;
  rootCauseAnalysis?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  effectivenessVerification?: string;
  verificationDate?: string;
  notes?: string;
  product?: { id: string; name: string };
  vendor?: { id: string; name: string };
  customer?: { id: string; name: string };
  ncr?: { id: string; ncrNumber: string; title: string };
  assignedTo?: { id: string; name: string; email: string };
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function CAPAEditPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const capaId = params.id as string;

  const [capa, setCapa] = useState<CAPA | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    source: '',
    riskLevel: '',
    investigationMethod: '',
    status: '',
    productId: '',
    lotNumber: '',
    vendorId: '',
    customerId: '',
    quantity: '',
    ncrId: '',
    assignedToId: '',
    targetCompletionDate: '',
    rootCauseAnalysis: '',
    correctiveAction: '',
    preventiveAction: '',
    effectivenessVerification: '',
    verificationDate: '',
    notes: ''
  });

  useEffect(() => {
    fetchCAPA();
    fetchUsers();
  }, [orgSlug, capaId]);

  const fetchCAPA = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/quality/capa/${capaId}`);
      if (response.ok) {
        const data = await response.json();
        const capaData = data?.data;
        setCapa(capaData);
        setFormData({
          title: capaData.title || '',
          description: capaData.description || '',
          source: capaData.source || '',
          riskLevel: capaData.riskLevel || '',
          investigationMethod: capaData.investigationMethod || '',
          status: capaData.status || '',
          productId: capaData.productId || '',
          lotNumber: capaData.lotNumber || '',
          vendorId: capaData.vendorId || '',
          customerId: capaData.customerId || '',
          quantity: capaData.quantity?.toString() || '',
          ncrId: capaData.ncrId || '',
          assignedToId: capaData.assignedToId || '',
          targetCompletionDate: capaData.targetCompletionDate ? new Date(capaData.targetCompletionDate).toISOString().split('T')[0] : '',
          rootCauseAnalysis: capaData.rootCauseAnalysis || '',
          correctiveAction: capaData.correctiveAction || '',
          preventiveAction: capaData.preventiveAction || '',
          effectivenessVerification: capaData.effectivenessVerification || '',
          verificationDate: capaData.verificationDate ? new Date(capaData.verificationDate).toISOString().split('T')[0] : '',
          notes: capaData.notes || ''
        });
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

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/users`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data?.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData = {
        ...formData,
        quantity: formData.quantity ? parseInt(formData.quantity) : undefined,
        targetCompletionDate: formData.targetCompletionDate || undefined,
        verificationDate: formData.verificationDate || undefined,
        productId: formData.productId || undefined,
        vendorId: formData.vendorId || undefined,
        customerId: formData.customerId || undefined,
        ncrId: formData.ncrId || undefined,
        assignedToId: formData.assignedToId || undefined
      };

      const response = await fetch(`/api/${orgSlug}/quality/capa/${capaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast.success('CAPA updated successfully');
        router.push(`/${orgSlug}/quality/capa/${capaId}`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update CAPA');
      }
    } catch (error) {
      console.error('Error updating CAPA:', error);
      toast.error('Failed to update CAPA');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    <div className="container mx-auto p-6 max-w-4xl">
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
            <h1 className="text-3xl font-bold text-gray-900">Edit CAPA</h1>
            <p className="text-gray-500">{capa.capaNumber}</p>
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="source">Source *</Label>
              <Select value={formData.source} onValueChange={(value) => handleInputChange('source', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NCR">NCR</SelectItem>
                  <SelectItem value="AUDIT">Audit</SelectItem>
                  <SelectItem value="CUSTOMER_COMPLAINT">Customer Complaint</SelectItem>
                  <SelectItem value="INTERNAL">Internal</SelectItem>
                  <SelectItem value="SUPPLIER">Supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="riskLevel">Risk Level *</Label>
              <Select value={formData.riskLevel} onValueChange={(value) => handleInputChange('riskLevel', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="IMPLEMENTED">Implemented</SelectItem>
                  <SelectItem value="VERIFYING">Verifying</SelectItem>
                  <SelectItem value="VERIFIED">Verified</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="investigationMethod">Investigation Method *</Label>
              <Select value={formData.investigationMethod} onValueChange={(value) => handleInputChange('investigationMethod', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select investigation method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FISHBONE">Fishbone Diagram</SelectItem>
                  <SelectItem value="FMEA">FMEA</SelectItem>
                  <SelectItem value="FIVE_WHY">5 Why Analysis</SelectItem>
                  <SelectItem value="PARETO">Pareto Analysis</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="assignedToId">Assigned To</Label>
              <Select value={formData.assignedToId} onValueChange={(value) => handleInputChange('assignedToId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="targetCompletionDate">Target Completion Date</Label>
              <Input
                id="targetCompletionDate"
                type="date"
                value={formData.targetCompletionDate}
                onChange={(e) => handleInputChange('targetCompletionDate', e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              required
            />
          </div>
        </Card>

        {/* Related Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Related Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lotNumber">Lot Number</Label>
              <Input
                id="lotNumber"
                value={formData.lotNumber}
                onChange={(e) => handleInputChange('lotNumber', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* Analysis & Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Analysis & Actions</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rootCauseAnalysis">Root Cause Analysis</Label>
              <Textarea
                id="rootCauseAnalysis"
                value={formData.rootCauseAnalysis}
                onChange={(e) => handleInputChange('rootCauseAnalysis', e.target.value)}
                rows={4}
                placeholder="Document the root cause analysis findings..."
              />
            </div>
            <div>
              <Label htmlFor="correctiveAction">Corrective Action</Label>
              <Textarea
                id="correctiveAction"
                value={formData.correctiveAction}
                onChange={(e) => handleInputChange('correctiveAction', e.target.value)}
                rows={4}
                placeholder="Describe the corrective actions to be taken..."
              />
            </div>
            <div>
              <Label htmlFor="preventiveAction">Preventive Action</Label>
              <Textarea
                id="preventiveAction"
                value={formData.preventiveAction}
                onChange={(e) => handleInputChange('preventiveAction', e.target.value)}
                rows={4}
                placeholder="Describe the preventive actions to prevent recurrence..."
              />
            </div>
            <div>
              <Label htmlFor="effectivenessVerification">Effectiveness Verification</Label>
              <Textarea
                id="effectivenessVerification"
                value={formData.effectivenessVerification}
                onChange={(e) => handleInputChange('effectivenessVerification', e.target.value)}
                rows={4}
                placeholder="Describe how effectiveness will be verified..."
              />
            </div>
            <div>
              <Label htmlFor="verificationDate">Verification Date</Label>
              <Input
                id="verificationDate"
                type="date"
                value={formData.verificationDate}
                onChange={(e) => handleInputChange('verificationDate', e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}