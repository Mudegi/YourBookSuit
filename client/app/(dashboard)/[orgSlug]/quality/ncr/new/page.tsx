'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Save,
  AlertTriangle,
  Package,
  Building,
  User,
  Calendar,
  Tag
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
}

export default function NewNCRPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    source: '',
    severity: '',
    productId: '',
    lotNumber: '',
    vendorId: '',
    customerId: '',
    quantity: '',
    detectedDate: new Date().toISOString().split('T')[0],
    assignedToId: '',
    notes: '',
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    setLoading(true);
    try {
      // Fetch products
      const productsRes = await fetch(`/api/${orgSlug}/inventory/products`);
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        if (productsData.success && productsData.data) {
          setProducts(productsData.data);
        } else {
          console.error('Failed to fetch products:', productsData.error);
          setProducts([]);
        }
      } else {
        console.error('Failed to fetch products:', productsRes.status);
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching reference data:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const submitData = {
        ...formData,
        quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
        detectedDate: new Date(formData.detectedDate),
      };

      const response = await fetch(`/api/${orgSlug}/quality/ncr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const result = await response.json();
        router.push(`/demo-company/quality/ncr/${result.ncr.id}`);
      } else {
        const error = await response.json();
        alert(`Error creating NCR: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating NCR:', error);
      alert('Error creating NCR. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => router.push(`/demo-company/quality/ncr`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to NCRs
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create New NCR</h1>
          <p className="text-muted-foreground">Report a new non-conformance</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              NCR Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Brief description of the issue"
                  required
                />
              </div>
              <div>
                <Label htmlFor="source">Source *</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) => handleInputChange('source', value)}
                  required
                >
                  <option value="">Select source</option>
                  <option value="PRODUCTION">Production</option>
                  <option value="RECEIVING">Receiving</option>
                  <option value="SHIPPING">Shipping</option>
                  <option value="CUSTOMER_COMPLAINT">Customer Complaint</option>
                  <option value="INTERNAL_AUDIT">Internal Audit</option>
                  <option value="SUPPLIER">Supplier</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detailed description of the non-conformance"
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="severity">Severity *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => handleInputChange('severity', value)}
                  required
                >
                  <option value="">Select severity</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="detectedDate">Detected Date *</Label>
                <Input
                  id="detectedDate"
                  type="date"
                  value={formData.detectedDate}
                  onChange={(e) => handleInputChange('detectedDate', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity Affected</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              Product & Traceability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="productId">Product</Label>
                <Select
                  value={formData.productId}
                  onValueChange={(value) => handleInputChange('productId', value)}
                >
                  <option value="">Select product</option>
                  {Array.isArray(products) && products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="lotNumber">Lot Number</Label>
                <Input
                  id="lotNumber"
                  value={formData.lotNumber}
                  onChange={(e) => handleInputChange('lotNumber', e.target.value)}
                  placeholder="LOT-001"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-green-500" />
              Related Parties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="vendorId">Vendor/Supplier</Label>
                <Input
                  id="vendorId"
                  value={formData.vendorId}
                  onChange={(e) => handleInputChange('vendorId', e.target.value)}
                  placeholder="Vendor ID or name"
                />
              </div>
              <div>
                <Label htmlFor="customerId">Customer</Label>
                <Input
                  id="customerId"
                  value={formData.customerId}
                  onChange={(e) => handleInputChange('customerId', e.target.value)}
                  placeholder="Customer ID or name"
                />
              </div>
              <div>
                <Label htmlFor="assignedToId">Assigned To</Label>
                <Input
                  id="assignedToId"
                  value={formData.assignedToId}
                  onChange={(e) => handleInputChange('assignedToId', e.target.value)}
                  placeholder="User ID or name"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-purple-500" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes or observations"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/demo-company/quality/ncr`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create NCR'}
          </Button>
        </div>
      </form>
    </div>
  );
}