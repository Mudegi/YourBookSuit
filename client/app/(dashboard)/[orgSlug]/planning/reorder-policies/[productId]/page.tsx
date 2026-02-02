/**
 * Individual Product Reorder Policy Configuration Page
 * Route: /[orgSlug]/planning/reorder-policies/[productId]
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Settings, TrendingUp } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  purchasePrice: number;
}

interface ReorderPolicy {
  id: string;
  policyType: string;
  reorderPoint: number;
  reorderQuantity: number;
  minQuantity: number;
  maxQuantity: number;
  leadTimeDays: number;
  reviewCycleDays: number;
  isActive: boolean;
  notes: string;
}

export default function ProductReorderPolicyPage() {
  const params = useParams();
  const router = useRouter();
  const { orgSlug, productId } = params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [policy, setPolicy] = useState<ReorderPolicy | null>(null);
  const [formData, setFormData] = useState({
    policyType: 'REORDER_POINT',
    reorderPoint: 20,
    reorderQuantity: 100,
    minQuantity: 10,
    maxQuantity: 500,
    leadTimeDays: 7,
    reviewCycleDays: 7,
    isActive: true,
    notes: '',
  });

  useEffect(() => {
    fetchProductAndPolicy();
  }, [orgSlug, productId]);

  const fetchProductAndPolicy = async () => {
    try {
      setLoading(true);

      // Fetch product details
      const productResponse = await fetch(`/api/${orgSlug}/products/${productId}`);
      if (productResponse.ok) {
        const productData = await productResponse.json();
        setProduct(productData.data);
      } else {
        // Mock product data for demo
        setProduct({
          id: productId as string,
          name: 'Sample Product',
          sku: 'PROD-001',
          category: 'General',
          purchasePrice: 25.00,
        });
      }

      // Fetch existing reorder policy
      const policyResponse = await fetch(`/api/${orgSlug}/planning/reorder-policies?productId=${productId}`);
      if (policyResponse.ok) {
        const policyData = await policyResponse.json();
        if (policyData.data && policyData.data.length > 0) {
          const existingPolicy = policyData.data[0];
          setPolicy(existingPolicy);
          setFormData({
            policyType: existingPolicy.policyType,
            reorderPoint: existingPolicy.reorderPoint,
            reorderQuantity: existingPolicy.reorderQuantity,
            minQuantity: existingPolicy.minQuantity || 10,
            maxQuantity: existingPolicy.maxQuantity || 500,
            leadTimeDays: existingPolicy.leadTimeDays,
            reviewCycleDays: existingPolicy.reviewCycleDays || 7,
            isActive: existingPolicy.isActive,
            notes: existingPolicy.notes || '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const method = policy ? 'PUT' : 'POST';
      const url = policy 
        ? `/api/${orgSlug}/planning/reorder-policies/${policy.id}`
        : `/api/${orgSlug}/planning/reorder-policies`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          ...formData,
        }),
      });

      if (response.ok) {
        router.push(`/${orgSlug}/planning/reorder-policies`);
      } else {
        console.error('Failed to save policy');
      }
    } catch (error) {
      console.error('Error saving policy:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/${orgSlug}/planning/reorder-policies`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Policies
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Configure Reorder Policy</h1>
            <p className="text-gray-600">
              {product?.name} ({product?.sku})
            </p>
          </div>
        </div>
        <Badge variant={formData.isActive ? "default" : "secondary"}>
          {formData.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Policy Configuration</span>
              </CardTitle>
              <CardDescription>
                Set up the reorder policy parameters for this product
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Policy Type */}
              <div className="space-y-2">
                <Label htmlFor="policyType">Policy Type</Label>
                <Select
                  value={formData.policyType}
                  onValueChange={(value) => handleInputChange('policyType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REORDER_POINT">Reorder Point</SelectItem>
                    <SelectItem value="MIN_MAX">Min-Max</SelectItem>
                    <SelectItem value="ECONOMIC_ORDER_QUANTITY">Economic Order Quantity</SelectItem>
                    <SelectItem value="JUST_IN_TIME">Just in Time</SelectItem>
                    <SelectItem value="PERIODIC_REVIEW">Periodic Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reorder Point */}
              <div className="space-y-2">
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  value={formData.reorderPoint}
                  onChange={(e) => handleInputChange('reorderPoint', parseInt(e.target.value) || 0)}
                />
              </div>

              {/* Reorder Quantity */}
              <div className="space-y-2">
                <Label htmlFor="reorderQuantity">Reorder Quantity</Label>
                <Input
                  id="reorderQuantity"
                  type="number"
                  value={formData.reorderQuantity}
                  onChange={(e) => handleInputChange('reorderQuantity', parseInt(e.target.value) || 0)}
                />
              </div>

              {/* Min/Max Quantities */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minQuantity">Minimum Quantity</Label>
                  <Input
                    id="minQuantity"
                    type="number"
                    value={formData.minQuantity}
                    onChange={(e) => handleInputChange('minQuantity', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxQuantity">Maximum Quantity</Label>
                  <Input
                    id="maxQuantity"
                    type="number"
                    value={formData.maxQuantity}
                    onChange={(e) => handleInputChange('maxQuantity', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Lead Time and Review Cycle */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
                  <Input
                    id="leadTimeDays"
                    type="number"
                    value={formData.leadTimeDays}
                    onChange={(e) => handleInputChange('leadTimeDays', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reviewCycleDays">Review Cycle (Days)</Label>
                  <Input
                    id="reviewCycleDays"
                    type="number"
                    value={formData.reviewCycleDays}
                    onChange={(e) => handleInputChange('reviewCycleDays', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  className="w-full p-2 border border-gray-200 rounded-md"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Add any notes about this policy..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent>
              {product && (
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Product Name</div>
                    <div>{product.name}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">SKU</div>
                    <div>{product.sku}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Category</div>
                    <div>{product.category}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Purchase Price</div>
                    <div>UGX {product.purchasePrice?.toLocaleString()}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Quick Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Estimated Value</span>
                  <span>UGX {((product?.purchasePrice || 0) * formData.reorderQuantity).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Coverage Period</span>
                  <span>{formData.leadTimeDays + formData.reviewCycleDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <Badge variant={formData.isActive ? "default" : "secondary"}>
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : policy ? 'Update Policy' : 'Create Policy'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => router.push(`/${orgSlug}/planning/reorder-policies`)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}