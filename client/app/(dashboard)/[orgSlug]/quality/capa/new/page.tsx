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

interface FormConfig {
  validationRules: {
    riskLevels: string[];
    investigationMethods: string[];
    requiredFields: string[];
    workflowStates: string[];
  };
  regulatoryRequirements: {
    standards: string[];
    complianceFields: string[];
  };
  translationKeys: Record<string, string>;
  supportedSources: string[];
  supportedRiskLevels: string[];
  supportedInvestigationMethods: string[];
  supportedStatuses: string[];
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function NewCAPAPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    source: '',
    riskLevel: '',
    investigationMethod: '',
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
    verifiedById: '',
    notes: '',
  });

  useEffect(() => {
    fetchConfig();
    fetchUsers();
  }, [orgSlug]);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/quality/capa/config`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data?.data || null);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
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
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        quantity: formData.quantity ? parseInt(formData.quantity) : undefined,
        targetCompletionDate: formData.targetCompletionDate ? new Date(formData.targetCompletionDate) : undefined,
        verificationDate: formData.verificationDate ? new Date(formData.verificationDate) : undefined,
      };

      const response = await fetch(`/api/${orgSlug}/quality/capa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('CAPA created successfully');
        router.push(`/${orgSlug}/quality/capa/${data.data.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create CAPA');
      }
    } catch (error) {
      console.error('Error creating CAPA:', error);
      toast.error('Failed to create CAPA');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New CAPA</h1>
          <p className="text-gray-500">Corrective and Preventive Action</p>
        </div>
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
                placeholder="Enter CAPA title"
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
                  {config.supportedSources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the issue requiring CAPA"
                rows={3}
                required
              />
            </div>
          </div>
        </Card>

        {/* Risk Assessment */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Risk Assessment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="riskLevel">Risk Level *</Label>
              <Select value={formData.riskLevel} onValueChange={(value) => handleInputChange('riskLevel', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent>
                  {config.supportedRiskLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
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
                  {config.supportedInvestigationMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Related Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Related Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ncrId">Related NCR</Label>
              <Input
                id="ncrId"
                value={formData.ncrId}
                onChange={(e) => handleInputChange('ncrId', e.target.value)}
                placeholder="NCR ID if applicable"
              />
            </div>
            <div>
              <Label htmlFor="productId">Product</Label>
              <Input
                id="productId"
                value={formData.productId}
                onChange={(e) => handleInputChange('productId', e.target.value)}
                placeholder="Product ID"
              />
            </div>
            <div>
              <Label htmlFor="lotNumber">Lot Number</Label>
              <Input
                id="lotNumber"
                value={formData.lotNumber}
                onChange={(e) => handleInputChange('lotNumber', e.target.value)}
                placeholder="Lot/Batch number"
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                placeholder="Affected quantity"
              />
            </div>
            <div>
              <Label htmlFor="vendorId">Vendor</Label>
              <Input
                id="vendorId"
                value={formData.vendorId}
                onChange={(e) => handleInputChange('vendorId', e.target.value)}
                placeholder="Vendor ID"
              />
            </div>
            <div>
              <Label htmlFor="customerId">Customer</Label>
              <Input
                id="customerId"
                value={formData.customerId}
                onChange={(e) => handleInputChange('customerId', e.target.value)}
                placeholder="Customer ID"
              />
            </div>
          </div>
        </Card>

        {/* Assignment & Timeline */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Assignment & Timeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assignedToId">Assigned To</Label>
              <Select value={formData.assignedToId} onValueChange={(value) => handleInputChange('assignedToId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
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
        </Card>

        {/* Actions & Analysis */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Actions & Analysis</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rootCauseAnalysis">Root Cause Analysis</Label>
              <Textarea
                id="rootCauseAnalysis"
                value={formData.rootCauseAnalysis}
                onChange={(e) => handleInputChange('rootCauseAnalysis', e.target.value)}
                placeholder="Document the root cause analysis"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="correctiveAction">Corrective Action</Label>
              <Textarea
                id="correctiveAction"
                value={formData.correctiveAction}
                onChange={(e) => handleInputChange('correctiveAction', e.target.value)}
                placeholder="Describe the corrective action to be taken"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="preventiveAction">Preventive Action</Label>
              <Textarea
                id="preventiveAction"
                value={formData.preventiveAction}
                onChange={(e) => handleInputChange('preventiveAction', e.target.value)}
                placeholder="Describe preventive measures to avoid recurrence"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="effectivenessVerification">Effectiveness Verification</Label>
              <Textarea
                id="effectivenessVerification"
                value={formData.effectivenessVerification}
                onChange={(e) => handleInputChange('effectivenessVerification', e.target.value)}
                placeholder="How will effectiveness be verified?"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional notes or context"
                rows={2}
              />
            </div>
          </div>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Create CAPA
          </Button>
        </div>
      </form>
    </div>
  );
}