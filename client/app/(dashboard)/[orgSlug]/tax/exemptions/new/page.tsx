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
import { ArrowLeft, Save, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface TaxRule {
  id: string;
  name: string;
  ruleType: string;
  taxType: string;
  jurisdiction: { name: string; code: string };
}

interface Entity {
  id: string;
  name: string;
  type: 'CUSTOMER' | 'VENDOR';
  email?: string;
  phone?: string;
}

interface TaxExemptionFormData {
  taxRuleId: string;
  entityType: string;
  entityId: string;
  exemptionType: string;
  exemptionNumber: string;
  certificateNumber: string;
  issuingAuthority: string;
  issuedDate: string;
  validFrom: string;
  validTo: string;
  documentUrl: string;
  documentPath: string;
  efrisReason: string;
  reason: string;
  exemptionRate: number;
  isActive: boolean;
  notes: string;
}

const EXEMPTION_TYPES = [
  { value: 'FULL_EXEMPTION', label: 'Full Exemption' },
  { value: 'PARTIAL_EXEMPTION', label: 'Partial Exemption' },
  { value: 'WHT_EXEMPTION', label: 'WHT Exemption' },
  { value: 'ZERO_RATED', label: 'Zero Rated' },
  { value: 'CUSTOM_EXEMPTION', label: 'Custom Exemption' },
];

const ENTITY_TYPES = [
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'VENDOR', label: 'Vendor' },
];

const EFRIS_REASONS = [
  { value: 'NONE', label: 'None' },
  { value: 'MEDICAL', label: 'Medical Supplies/Services' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'AGRICULTURE', label: 'Agriculture' },
  { value: 'MANUFACTURING', label: 'Manufacturing' },
  { value: 'EXPORT', label: 'Export' },
  { value: 'ZERO_RATED', label: 'Zero Rated' },
  { value: 'EXEMPT', label: 'Exempt' },
];

export default function NewTaxExemptionPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<TaxExemptionFormData>({
    taxRuleId: '',
    entityType: 'CUSTOMER',
    entityId: '',
    exemptionType: 'FULL_EXEMPTION',
    exemptionNumber: '',
    certificateNumber: '',
    issuingAuthority: '',
    issuedDate: '',
    validFrom: new Date().toISOString().split('T')[0],
    validTo: '',
    documentUrl: '',
    documentPath: '',
    efrisReason: 'NONE',
    reason: '',
    exemptionRate: 0,
    isActive: true,
    notes: '',
  });

  // Load tax rules
  useEffect(() => {
    const loadTaxRules = async () => {
      try {
        const response = await fetch(`/api/${orgSlug}/tax/rules`);
        if (response.ok) {
          const data = await response.json();
          setTaxRules(data.rules || []);
        } else {
          // Fallback to sample data from various countries
          setTaxRules([
            {
              id: 'sample-vat-us',
              name: 'US Federal Sales Tax 0%',
              ruleType: 'ZERO_RATE',
              taxType: 'SALES_TAX',
              jurisdiction: { name: 'United States Federal', code: 'US-FED' },
            },
            {
              id: 'sample-vat-uk',
              name: 'UK Standard VAT 20%',
              ruleType: 'STANDARD_RATE',
              taxType: 'VAT',
              jurisdiction: { name: 'United Kingdom', code: 'GB' },
            },
            {
              id: 'sample-gst-ca',
              name: 'Canada GST 5%',
              ruleType: 'STANDARD_RATE',
              taxType: 'GST',
              jurisdiction: { name: 'Canada Federal', code: 'CA-FED' },
            },
            {
              id: 'sample-vat-de',
              name: 'Germany VAT 19%',
              ruleType: 'STANDARD_RATE',
              taxType: 'VAT',
              jurisdiction: { name: 'Germany', code: 'DE' },
            },
            {
              id: 'sample-vat-fr',
              name: 'France VAT 20%',
              ruleType: 'STANDARD_RATE',
              taxType: 'VAT',
              jurisdiction: { name: 'France', code: 'FR' },
            },
            {
              id: 'sample-vat-au',
              name: 'Australia GST 10%',
              ruleType: 'STANDARD_RATE',
              taxType: 'GST',
              jurisdiction: { name: 'Australia', code: 'AU' },
            },
            {
              id: 'sample-vat-jp',
              name: 'Japan Consumption Tax 10%',
              ruleType: 'STANDARD_RATE',
              taxType: 'CONSUMPTION_TAX',
              jurisdiction: { name: 'Japan', code: 'JP' },
            },
            {
              id: 'sample-vat-in',
              name: 'India GST 18%',
              ruleType: 'STANDARD_RATE',
              taxType: 'GST',
              jurisdiction: { name: 'India', code: 'IN' },
            },
            {
              id: 'sample-vat-br',
              name: 'Brazil ICMS 18%',
              ruleType: 'STANDARD_RATE',
              taxType: 'ICMS',
              jurisdiction: { name: 'Brazil', code: 'BR' },
            },
            {
              id: 'sample-vat-za',
              name: 'South Africa VAT 15%',
              ruleType: 'STANDARD_RATE',
              taxType: 'VAT',
              jurisdiction: { name: 'South Africa', code: 'ZA' },
            },
            {
              id: 'sample-vat-ug',
              name: 'Uganda VAT 18%',
              ruleType: 'STANDARD_RATE',
              taxType: 'VAT',
              jurisdiction: { name: 'Uganda', code: 'UG' },
            },
            {
              id: 'sample-wht-ug',
              name: 'Uganda WHT 6% Professional Services',
              ruleType: 'WITHHOLDING',
              taxType: 'WITHHOLDING_TAX',
              jurisdiction: { name: 'Uganda', code: 'UG' },
            },
            {
              id: 'sample-vat-ke',
              name: 'Kenya VAT 16%',
              ruleType: 'STANDARD_RATE',
              taxType: 'VAT',
              jurisdiction: { name: 'Kenya', code: 'KE' },
            },
            {
              id: 'sample-vat-ng',
              name: 'Nigeria VAT 7.5%',
              ruleType: 'STANDARD_RATE',
              taxType: 'VAT',
              jurisdiction: { name: 'Nigeria', code: 'NG' },
            },
            {
              id: 'sample-vat-mx',
              name: 'Mexico IVA 16%',
              ruleType: 'STANDARD_RATE',
              taxType: 'IVA',
              jurisdiction: { name: 'Mexico', code: 'MX' },
            },
          ]);
        }
      } catch (error) {
        console.error('Failed to load tax rules:', error);
        toast.error('Failed to load tax rules');
      }
    };

    loadTaxRules();
  }, [orgSlug]);

  // Load entities based on entity type
  useEffect(() => {
    const loadEntities = async () => {
      if (!formData.entityType) return;

      try {
        setLoading(true);
        let endpoint = '';

        if (formData.entityType === 'CUSTOMER') {
          endpoint = `/api/${orgSlug}/crm/customers`;
        } else if (formData.entityType === 'VENDOR') {
          endpoint = `/api/${orgSlug}/purchases/vendors`;
        }

        if (endpoint) {
          const response = await fetch(endpoint);
          if (response.ok) {
            const data = await response.json();
            const entityList = (data.customers || data.vendors || []).map((entity: any) => ({
              id: entity.id,
              name: entity.name || entity.companyName,
              type: formData.entityType as 'CUSTOMER' | 'VENDOR',
              email: entity.email,
              phone: entity.phone,
            }));
            setEntities(entityList);
          }
        }
      } catch (error) {
        console.error('Failed to load entities:', error);
        // Fallback to sample data
        setEntities([
          {
            id: 'sample-customer',
            name: 'ABC Company Ltd',
            type: 'CUSTOMER' as const,
            email: 'contact@abc.com',
          },
          {
            id: 'sample-vendor',
            name: 'XYZ Supplies Ltd',
            type: 'VENDOR' as const,
            email: 'sales@xyz.com',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadEntities();
  }, [orgSlug, formData.entityType]);

  const handleInputChange = (field: keyof TaxExemptionFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEntityTypeChange = (entityType: string) => {
    setFormData(prev => ({
      ...prev,
      entityType,
      entityId: '', // Reset entity selection when type changes
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.taxRuleId || !formData.entityType || !formData.entityId || !formData.exemptionType || !formData.validFrom) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        taxRuleId: formData.taxRuleId,
        entityType: formData.entityType,
        entityId: formData.entityId,
        exemptionType: formData.exemptionType,
        exemptionNumber: formData.exemptionNumber || undefined,
        certificateNumber: formData.certificateNumber || undefined,
        issuingAuthority: formData.issuingAuthority || undefined,
        issuedDate: formData.issuedDate || undefined,
        validFrom: formData.validFrom,
        validTo: formData.validTo || undefined,
        documentUrl: formData.documentUrl || undefined,
        documentPath: formData.documentPath || undefined,
        efrisReason: formData.efrisReason || undefined,
        reason: formData.reason || undefined,
        exemptionRate: formData.exemptionRate || undefined,
        isActive: formData.isActive,
        notes: formData.notes || undefined,
      };

      const response = await fetch(`/api/${orgSlug}/tax/exemptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Tax exemption created successfully');
        router.push(`/${orgSlug}/tax/exemptions`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create tax exemption');
      }
    } catch (error) {
      console.error('Failed to create tax exemption:', error);
      toast.error('Failed to create tax exemption');
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
          Back to Tax Exemptions
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create New Tax Exemption</h1>
          <p className="text-gray-600">Define a new tax exemption certificate</p>
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
                <Label htmlFor="taxRuleId">Tax Rule *</Label>
                <Select
                  id="taxRuleId"
                  value={formData.taxRuleId}
                  onChange={(e) => handleInputChange('taxRuleId', e.target.value)}
                  required
                >
                  <option value="">Select tax rule</option>
                  {taxRules.map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.name} ({rule.jurisdiction.code})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entityType">Entity Type *</Label>
                <Select
                  id="entityType"
                  value={formData.entityType}
                  onChange={(e) => handleEntityTypeChange(e.target.value)}
                  required
                >
                  {ENTITY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entityId">Entity *</Label>
                <Select
                  id="entityId"
                  value={formData.entityId}
                  onChange={(e) => handleInputChange('entityId', e.target.value)}
                  required
                >
                  <option value="">Select {formData.entityType.toLowerCase()}</option>
                  {entities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name} {entity.email ? `(${entity.email})` : ''}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exemptionType">Exemption Type *</Label>
                <Select
                  id="exemptionType"
                  value={formData.exemptionType}
                  onChange={(e) => handleInputChange('exemptionType', e.target.value)}
                  required
                >
                  {EXEMPTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exemptionNumber">Exemption Number</Label>
                <Input
                  id="exemptionNumber"
                  value={formData.exemptionNumber}
                  onChange={(e) => handleInputChange('exemptionNumber', e.target.value)}
                  placeholder="Auto-generated if empty"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exemptionRate">Exemption Rate (%)</Label>
                <Input
                  id="exemptionRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.exemptionRate}
                  onChange={(e) => handleInputChange('exemptionRate', parseFloat(e.target.value) || 0)}
                  placeholder="0.00 for full exemption"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Certificate Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="certificateNumber">Certificate Number</Label>
                <Input
                  id="certificateNumber"
                  value={formData.certificateNumber}
                  onChange={(e) => handleInputChange('certificateNumber', e.target.value)}
                  placeholder="e.g., URA-WHT-2024-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="issuingAuthority">Issuing Authority</Label>
                <Input
                  id="issuingAuthority"
                  value={formData.issuingAuthority}
                  onChange={(e) => handleInputChange('issuingAuthority', e.target.value)}
                  placeholder="e.g., URA, IRS, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="issuedDate">Issued Date</Label>
                <Input
                  id="issuedDate"
                  type="date"
                  value={formData.issuedDate}
                  onChange={(e) => handleInputChange('issuedDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="efrisReason">EFRIS Reason</Label>
                <Select
                  id="efrisReason"
                  value={formData.efrisReason}
                  onChange={(e) => handleInputChange('efrisReason', e.target.value)}
                >
                  {EFRIS_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentUrl">Document URL</Label>
              <Input
                id="documentUrl"
                value={formData.documentUrl}
                onChange={(e) => handleInputChange('documentUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Validity & Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validFrom">Valid From *</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => handleInputChange('validFrom', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validTo">Valid To</Label>
                <Input
                  id="validTo"
                  type="date"
                  value={formData.validTo}
                  onChange={(e) => handleInputChange('validTo', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                placeholder="Reason for exemption..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleInputChange('isActive', checked)}
              />
              <Label htmlFor="isActive">Active</Label>
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
                Create Tax Exemption
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}