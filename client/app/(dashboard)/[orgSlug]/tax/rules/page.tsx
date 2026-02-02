'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Scale, DollarSign, Package, Percent, Plus } from 'lucide-react';

interface TaxRule {
  id: string;
  name: string;
  ruleType: 'STANDARD_RATE' | 'REDUCED_RATE' | 'ZERO_RATE' | 'EXEMPTION' | 'REVERSE_CHARGE' | 'COMPOUND' | 'WITHHOLDING' | 'CUSTOM';
  priority: number;
  jurisdiction: { name: string; code: string };
  taxType: string;
  rate?: number;
  applicableOn: string;
  productCategory?: string;
  customerType?: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  isCompound: boolean;
  minimumAmount?: number;
  maximumAmount?: number;
}

const SAMPLE_RULES: TaxRule[] = [
  {
    id: 'sample-standard',
    name: 'Standard VAT 20%',
    ruleType: 'STANDARD_RATE',
    priority: 1,
    jurisdiction: { name: 'United Kingdom', code: 'GB' },
    taxType: 'VAT',
    rate: 20,
    applicableOn: 'SALES',
    isActive: true,
    effectiveFrom: new Date('2023-01-01').toISOString(),
    isCompound: false,
  },
  {
    id: 'sample-reduced',
    name: 'Reduced Food 5%',
    ruleType: 'REDUCED_RATE',
    priority: 2,
    jurisdiction: { name: 'United Kingdom', code: 'GB' },
    taxType: 'VAT',
    rate: 5,
    applicableOn: 'SALES',
    productCategory: 'Food',
    isActive: true,
    effectiveFrom: new Date('2023-01-01').toISOString(),
    isCompound: false,
  },
  {
    id: 'sample-zero',
    name: 'Zero Rate Exports',
    ruleType: 'ZERO_RATE',
    priority: 3,
    jurisdiction: { name: 'United Kingdom', code: 'GB' },
    taxType: 'VAT',
    rate: 0,
    applicableOn: 'SALES',
    isActive: true,
    effectiveFrom: new Date('2023-01-01').toISOString(),
    isCompound: false,
  },
  {
    id: 'sample-exempt',
    name: 'Financial Services Exemption',
    ruleType: 'EXEMPTION',
    priority: 4,
    jurisdiction: { name: 'United Kingdom', code: 'GB' },
    taxType: 'VAT',
    applicableOn: 'SALES',
    productCategory: 'Financial Services',
    isActive: true,
    effectiveFrom: new Date('2023-01-01').toISOString(),
    isCompound: false,
  },
  {
    id: 'sample-reverse',
    name: 'EU B2B Reverse Charge',
    ruleType: 'REVERSE_CHARGE',
    priority: 5,
    jurisdiction: { name: 'United Kingdom', code: 'GB' },
    taxType: 'VAT',
    rate: 20,
    applicableOn: 'PURCHASES',
    customerType: 'Business',
    isActive: true,
    effectiveFrom: new Date('2023-01-01').toISOString(),
    isCompound: false,
  },
  {
    id: 'sample-compound',
    name: 'Luxury Goods: VAT + Luxury Tax',
    ruleType: 'COMPOUND',
    priority: 6,
    jurisdiction: { name: 'France', code: 'FR' },
    taxType: 'VAT',
    rate: 20,
    applicableOn: 'SALES',
    productCategory: 'Luxury Goods',
    isActive: true,
    effectiveFrom: new Date('2023-01-01').toISOString(),
    isCompound: true,
  },
];

export default function TaxRulesPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const [rules, setRules] = useState<TaxRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRules();
  }, [orgSlug]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/${orgSlug}/tax/rules`);
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setRules(list.length ? list : SAMPLE_RULES);
        return;
      }
    } catch (error) {
      console.error('Error fetching tax rules:', error);
    } finally {
      setLoading(false);
    }
    setRules(SAMPLE_RULES);
  };

  const totalRules = rules.length;
  const activeRules = rules.filter(r => r.isActive).length;
  const avgRate =
    rules.filter(r => r.rate).length > 0
      ? rules.filter(r => r.rate).reduce((sum, r) => sum + (r.rate || 0), 0) /
        rules.filter(r => r.rate).length
      : 0;
  const exemptionRules = rules.filter(r => r.ruleType === 'EXEMPTION').length;
  const reverseChargeRules = rules.filter(r => r.ruleType === 'REVERSE_CHARGE').length;
  const compoundRules = rules.filter(r => r.isCompound).length;

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'STANDARD_RATE':
        return 'bg-blue-100 text-blue-800';
      case 'REDUCED_RATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'ZERO_RATE':
        return 'bg-gray-100 text-gray-800';
      case 'EXEMPTION':
        return 'bg-green-100 text-green-800';
      case 'REVERSE_CHARGE':
        return 'bg-purple-100 text-purple-800';
      case 'COMPOUND':
        return 'bg-orange-100 text-orange-800';
      case 'WITHHOLDING':
        return 'bg-red-100 text-red-800';
      case 'CUSTOM':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading tax rules...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tax Rules</h1>
          <p className="text-gray-500">Configure tax calculation rules by jurisdiction</p>
        </div>
        <Button
          onClick={() => router.push(`/${orgSlug}/tax/rules/new`)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Tax Rule
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Rules</p>
              <p className="text-2xl font-bold">{totalRules}</p>
            </div>
            <Scale className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Rules</p>
              <p className="text-2xl font-bold">{activeRules}</p>
            </div>
            <Package className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Exemptions</p>
              <p className="text-2xl font-bold">{exemptionRules}</p>
            </div>
            <Percent className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Reverse Charge</p>
              <p className="text-2xl font-bold">{reverseChargeRules}</p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
      </div>

      {/* Tax Rules Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rule Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jurisdiction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rule Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applicable On
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Effective From
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                    No tax rules found. Create your first tax rule.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr
                    key={rule.id}
                    onClick={() => router.push(`/${orgSlug}/tax/rules/${rule.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{rule.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{rule.jurisdiction.name}</div>
                      <div className="text-sm text-gray-500">{rule.jurisdiction.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRuleTypeColor(
                          rule.ruleType
                        )}`}
                      >
                        {rule.ruleType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{rule.taxType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {rule.rate ? `${rule.rate.toFixed(2)}%` : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{rule.applicableOn}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{rule.productCategory || '—'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{rule.priority}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          rule.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(rule.effectiveFrom).toLocaleDateString()}
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
