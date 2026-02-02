'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TaxJurisdiction {
  id: string;
  name: string;
  code: string;
  jurisdictionType: string;
  country: string;
  isActive: boolean;
}

interface TaxRuleFormData {
  jurisdictionId: string;
  name: string;
  taxType: string;
  ruleType: string;
  rate: number;
  applicableOn: string;
  productCategory: string;
  customerType: string;
  effectiveFrom: string;
  effectiveTo: string;
  minAmount: number;
  maxAmount: number;
  calculationFormula: string;
  isCompound: boolean;
  compoundSequence: number;
  parentRuleId: string;
  priority: number;
  isActive: boolean;
  notes: string;
}

const RULE_TYPES = [
  { value: 'STANDARD_RATE', label: 'Standard Rate' },
  { value: 'REDUCED_RATE', label: 'Reduced Rate' },
  { value: 'ZERO_RATE', label: 'Zero Rate' },
  { value: 'EXEMPTION', label: 'Exemption' },
  { value: 'REVERSE_CHARGE', label: 'Reverse Charge' },
  { value: 'COMPOUND', label: 'Compound' },
  { value: 'WITHHOLDING', label: 'Withholding' },
  { value: 'CUSTOM', label: 'Custom' },
];

const TAX_TYPES = [
  { value: 'VAT', label: 'VAT' },
  { value: 'GST', label: 'GST' },
  { value: 'SALES_TAX', label: 'Sales Tax' },
  { value: 'INCOME_TAX', label: 'Income Tax' },
  { value: 'CORPORATE_TAX', label: 'Corporate Tax' },
  { value: 'WITHHOLDING_TAX', label: 'Withholding Tax' },
  { value: 'CUSTOM_DUTY', label: 'Custom Duty' },
];

const APPLICABLE_ON_OPTIONS = [
  { value: 'SALES', label: 'Sales' },
  { value: 'PURCHASES', label: 'Purchases' },
  { value: 'BOTH', label: 'Both' },
];

export default function NewTaxRulePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [jurisdictions, setJurisdictions] = useState<TaxJurisdiction[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<TaxRuleFormData>({
    jurisdictionId: '',
    name: '',
    taxType: 'VAT',
    ruleType: 'STANDARD_RATE',
    rate: 0,
    applicableOn: 'BOTH',
    productCategory: '',
    customerType: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
    minAmount: 0,
    maxAmount: 0,
    calculationFormula: '',
    isCompound: false,
    compoundSequence: 0,
    parentRuleId: '',
    priority: 1,
    isActive: true,
    notes: '',
  });

  // Load jurisdictions
  useEffect(() => {
    const loadJurisdictions = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/${orgSlug}/tax/jurisdictions`);
        if (response.ok) {
          const data = await response.json();
          setJurisdictions(data.jurisdictions || []);
        } else {
          // Fallback to sample data from various countries
          setJurisdictions([
            {
              id: 'sample-us-fed',
              name: 'United States Federal',
              code: 'US-FED',
              jurisdictionType: 'FEDERAL',
              country: 'United States',
              isActive: true,
            },
            {
              id: 'sample-us-ca',
              name: 'California',
              code: 'US-CA',
              jurisdictionType: 'STATE',
              country: 'United States',
              isActive: true,
            },
            {
              id: 'sample-us-ny',
              name: 'New York',
              code: 'US-NY',
              jurisdictionType: 'STATE',
              country: 'United States',
              isActive: true,
            },
            {
              id: 'sample-uk',
              name: 'United Kingdom',
              code: 'GB',
              jurisdictionType: 'NATIONAL',
              country: 'United Kingdom',
              isActive: true,
            },
            {
              id: 'sample-de',
              name: 'Germany',
              code: 'DE',
              jurisdictionType: 'NATIONAL',
              country: 'Germany',
              isActive: true,
            },
            {
              id: 'sample-fr',
              name: 'France',
              code: 'FR',
              jurisdictionType: 'NATIONAL',
              country: 'France',
              isActive: true,
            },
            {
              id: 'sample-ca-fed',
              name: 'Canada Federal',
              code: 'CA-FED',
              jurisdictionType: 'FEDERAL',
              country: 'Canada',
              isActive: true,
            },
            {
              id: 'sample-au',
              name: 'Australia',
              code: 'AU',
              jurisdictionType: 'NATIONAL',
              country: 'Australia',
              isActive: true,
            },
            {
              id: 'sample-jp',
              name: 'Japan',
              code: 'JP',
              jurisdictionType: 'NATIONAL',
              country: 'Japan',
              isActive: true,
            },
            {
              id: 'sample-in',
              name: 'India',
              code: 'IN',
              jurisdictionType: 'NATIONAL',
              country: 'India',
              isActive: true,
            },
            {
              id: 'sample-br',
              name: 'Brazil',
              code: 'BR',
              jurisdictionType: 'NATIONAL',
              country: 'Brazil',
              isActive: true,
            },
            {
              id: 'sample-za',
              name: 'South Africa',
              code: 'ZA',
              jurisdictionType: 'NATIONAL',
              country: 'South Africa',
              isActive: true,
            },
            {
              id: 'sample-ug',
              name: 'Uganda Revenue Authority',
              code: 'UG-URA',
              jurisdictionType: 'NATIONAL',
              country: 'Uganda',
              isActive: true,
            },
            {
              id: 'sample-ke',
              name: 'Kenya Revenue Authority',
              code: 'KE-KRA',
              jurisdictionType: 'NATIONAL',
              country: 'Kenya',
              isActive: true,
            },
            {
              id: 'sample-ng',
              name: 'Nigeria Federal',
              code: 'NG-FED',
              jurisdictionType: 'FEDERAL',
              country: 'Nigeria',
              isActive: true,
            },
            {
              id: 'sample-mx',
              name: 'Mexico Federal',
              code: 'MX-FED',
              jurisdictionType: 'FEDERAL',
              country: 'Mexico',
              isActive: true,
            },
          ]);
        }
      } catch (error) {
        console.error('Failed to load jurisdictions:', error);
        toast.error('Failed to load tax jurisdictions');
      } finally {
        setLoading(false);
      }
    };

    loadJurisdictions();
  }, [orgSlug]);

  const handleInputChange = (field: keyof TaxRuleFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.jurisdictionId || !formData.name || !formData.taxType || !formData.ruleType) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        jurisdictionId: formData.jurisdictionId,
        name: formData.name,
        taxType: formData.taxType,
        ruleType: formData.ruleType,
        rate: formData.rate,
        applicableOn: formData.applicableOn,
        productCategory: formData.productCategory || undefined,
        customerType: formData.customerType || undefined,
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo || undefined,
        minAmount: formData.minAmount || undefined,
        maxAmount: formData.maxAmount || undefined,
        calculationFormula: formData.calculationFormula || undefined,
        isCompound: formData.isCompound,
        compoundSequence: formData.isCompound ? formData.compoundSequence : undefined,
        parentRuleId: formData.parentRuleId || undefined,
        priority: formData.priority,
        isActive: formData.isActive,
        notes: formData.notes || undefined,
      };

      const response = await fetch(`/api/${orgSlug}/tax/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Tax rule created successfully');
        router.push(`/${orgSlug}/tax/rules`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create tax rule');
      }
    } catch (error) {
      console.error('Failed to create tax rule:', error);
      toast.error('Failed to create tax rule');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tax Rules
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create New Tax Rule</h1>
          <p className="text-gray-600">Define a new tax rule for your organization</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jurisdictionId">Tax Jurisdiction *</Label>
                <Select
                  id="jurisdictionId"
                  value={formData.jurisdictionId}
                  onChange={(e) => handleInputChange('jurisdictionId', e.target.value)}
                  required
                >
                  <option value="">Select jurisdiction</option>
                  {jurisdictions.map((jurisdiction) => (
                    <option key={jurisdiction.id} value={jurisdiction.id}>
                      {jurisdiction.name} ({jurisdiction.code})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Rule Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Standard VAT 18%"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxType">Tax Type *</Label>
                <Select
                  id="taxType"
                  value={formData.taxType}
                  onChange={(e) => handleInputChange('taxType', e.target.value)}
                  required
                >
                  {TAX_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ruleType">Rule Type *</Label>
                <Select
                  id="ruleType"
                  value={formData.ruleType}
                  onChange={(e) => handleInputChange('ruleType', e.target.value)}
                  required
                >
                  {RULE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate">Tax Rate (%) *</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.rate}
                  onChange={(e) => handleInputChange('rate', parseFloat(e.target.value) || 0)}
                  placeholder="18.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="applicableOn">Applicable On</Label>
                <Select
                  id="applicableOn"
                  value={formData.applicableOn}
                  onChange={(e) => handleInputChange('applicableOn', e.target.value)}
                >
                  {APPLICABLE_ON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conditions & Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productCategory">Product Category</Label>
                <Input
                  id="productCategory"
                  value={formData.productCategory}
                  onChange={(e) => handleInputChange('productCategory', e.target.value)}
                  placeholder="e.g., Food, Medical, Financial Services"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerType">Customer Type</Label>
                <Input
                  id="customerType"
                  value={formData.customerType}
                  onChange={(e) => handleInputChange('customerType', e.target.value)}
                  placeholder="e.g., Individual, Business, Non-Resident"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minAmount">Minimum Amount</Label>
                <Input
                  id="minAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minAmount}
                  onChange={(e) => handleInputChange('minAmount', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxAmount">Maximum Amount</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.maxAmount}
                  onChange={(e) => handleInputChange('maxAmount', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Advanced Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="effectiveFrom">Effective From *</Label>
                <Input
                  id="effectiveFrom"
                  type="date"
                  value={formData.effectiveFrom}
                  onChange={(e) => handleInputChange('effectiveFrom', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="effectiveTo">Effective To</Label>
                <Input
                  id="effectiveTo"
                  type="date"
                  value={formData.effectiveTo}
                  onChange={(e) => handleInputChange('effectiveTo', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="calculationFormula">Calculation Formula</Label>
                <Input
                  id="calculationFormula"
                  value={formData.calculationFormula}
                  onChange={(e) => handleInputChange('calculationFormula', e.target.value)}
                  placeholder="e.g., base_amount * rate / 100"
                />
              </div>
            </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isCompound"
                  checked={formData.isCompound}
                  onCheckedChange={(checked) => handleInputChange('isCompound', checked)}
                />
                <Label htmlFor="isCompound">Compound Rule</Label>
              </div>

            {formData.isCompound && (
              <div className="space-y-2">
                <Label htmlFor="compoundSequence">Compound Sequence</Label>
                <Input
                  id="compoundSequence"
                  type="number"
                  min="1"
                  value={formData.compoundSequence}
                  onChange={(e) => handleInputChange('compoundSequence', parseInt(e.target.value) || 0)}
                  placeholder="1"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes or comments..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Tax Rule
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}