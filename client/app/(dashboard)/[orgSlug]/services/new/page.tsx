'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ServiceFormData {
  serviceCode: string;
  name: string;
  description: string;
  serviceType: string;
  category: string;
  pricingModel: string;
  unitOfMeasure: string;
  standardRate: string;
  standardDuration: string;
  skillLevel: string;
  department: string;
  isBillable: boolean;
  isInternal: boolean;
  tags: string;
}

interface NewServicePageProps {
  params: { orgSlug: string };
}

export default function NewServicePage({ params }: NewServicePageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<ServiceFormData>({
    serviceCode: '',
    name: '',
    description: '',
    serviceType: 'PROFESSIONAL',
    category: '',
    pricingModel: 'HOURLY_RATE',
    unitOfMeasure: 'hour',
    standardRate: '',
    standardDuration: '60',
    skillLevel: 'STANDARD',
    department: '',
    isBillable: true,
    isInternal: false,
    tags: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.serviceCode.trim()) newErrors.serviceCode = 'Service code is required';
    if (!formData.name.trim()) newErrors.name = 'Service name is required';
    if (!formData.serviceType) newErrors.serviceType = 'Service type is required';
    if (!formData.pricingModel) newErrors.pricingModel = 'Pricing model is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const payload = {
        ...formData,
        standardRate: formData.standardRate ? parseFloat(formData.standardRate) : undefined,
        standardDuration: formData.standardDuration ? parseInt(formData.standardDuration) : undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
      };

      const response = await fetch(`/api/${params.orgSlug}/services/catalog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create service');
      }

      toast.success('Service created successfully!');
      router.push(`/${params.orgSlug}/services`);
      router.refresh();
    } catch (error) {
      console.error('Error creating service:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create service. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Service</h1>
          <p className="text-muted-foreground">
            Add a new service to your catalog
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/${params.orgSlug}/services`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Services
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Information</CardTitle>
          <CardDescription>
            Enter the basic information for your new service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="serviceCode">Service Code *</Label>
                <Input
                  id="serviceCode"
                  name="serviceCode"
                  value={formData.serviceCode}
                  onChange={handleInputChange}
                  placeholder="e.g., SVC-001"
                  className={errors.serviceCode ? 'border-red-500' : ''}
                />
                {errors.serviceCode && <p className="text-sm text-red-500">{errors.serviceCode}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Service Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Business Consulting"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the service..."
                className="resize-none"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="serviceType">Service Type *</Label>
                <select
                  id="serviceType"
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.serviceType ? 'border-red-500' : ''}`}
                >
                  <option value="PROFESSIONAL">Professional Services</option>
                  <option value="TECHNICAL">Technical Services</option>
                  <option value="CREATIVE">Creative Services</option>
                  <option value="SUPPORT">Support Services</option>
                  <option value="DIGITAL">Digital Services</option>
                </select>
                {errors.serviceType && <p className="text-sm text-red-500">{errors.serviceType}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="e.g., Consulting"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pricingModel">Pricing Model *</Label>
                <select
                  id="pricingModel"
                  name="pricingModel"
                  value={formData.pricingModel}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.pricingModel ? 'border-red-500' : ''}`}
                >
                  <option value="HOURLY_RATE">Hourly Rate</option>
                  <option value="FIXED_PRICE">Fixed Price</option>
                  <option value="DAILY_RATE">Daily Rate</option>
                  <option value="PROJECT_BASED">Project-Based</option>
                </select>
                {errors.pricingModel && <p className="text-sm text-red-500">{errors.pricingModel}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="standardRate">Standard Rate (UGX)</Label>
                <Input
                  id="standardRate"
                  name="standardRate"
                  type="number"
                  step="0.01"
                  value={formData.standardRate}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="consulting, strategy, analysis (comma-separated)"
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Settings</h3>
              
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isBillable"
                    checked={formData.isBillable}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isBillable: checked as boolean }))}
                  />
                  <Label htmlFor="isBillable">Billable Service</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isInternal"
                    checked={formData.isInternal}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isInternal: checked as boolean }))}
                  />
                  <Label htmlFor="isInternal">Internal Service Only</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/${params.orgSlug}/services`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Service'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}