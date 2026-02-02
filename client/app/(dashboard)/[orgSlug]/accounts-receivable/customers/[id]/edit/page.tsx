'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Building2,
  DollarSign,
  MapPin,
  FileText,
  CreditCard,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  taxIdNumber: string | null;
  paymentTerms: number;
  creditLimit: number | null;
  billingAddress: any;
  shippingAddress: any;
  notes: string | null;
  isActive: boolean;
  region: string | null;
  taxCategory: string | null;
  taxExempt: boolean;
  taxExemptionReason: string | null;
  defaultRevenueAccountId: string | null;
  displayName?: string;
  taxIdLabel?: string;
  financialSummary?: any;
  complianceFlags?: any;
}

interface Address {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  region?: string;
  district?: string;
}

interface AgingBucket {
  label: string;
  amount: number;
  invoiceCount: number;
  percentOfTotal: number;
}

export default function CustomerEditPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [taxIdLabel, setTaxIdLabel] = useState('Tax ID');
  const [taxIdError, setTaxIdError] = useState('');
  const [paymentTermsOptions, setPaymentTermsOptions] = useState<any[]>([]);
  const [addressFields, setAddressFields] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    taxIdNumber: '',
    paymentTerms: 30,
    creditLimit: '',
    billingAddress: {} as Address,
    shippingAddress: {} as Address,
    notes: '',
    isActive: true,
    region: '',
    taxCategory: '',
    taxExempt: false,
    taxExemptionReason: '',
  });

  useEffect(() => {
    fetchCustomer();
    fetchLocalizationData();
  }, [customerId]);

  const fetchCustomer = async () => {
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/customers/${customerId}/financials`
      );
      const data = await response.json();

      if (data.success) {
        const cust = data.data;
        setCustomer(cust);
        setTaxIdLabel(cust.taxIdLabel || 'Tax ID');

        // Populate form
        setFormData({
          firstName: cust.firstName || '',
          lastName: cust.lastName || '',
          companyName: cust.companyName || '',
          email: cust.email || '',
          phone: cust.phone || '',
          taxIdNumber: cust.taxIdNumber || '',
          paymentTerms: cust.paymentTerms || 30,
          creditLimit: cust.creditLimit ? cust.creditLimit.toString() : '',
          billingAddress: (cust.billingAddress as Address) || {},
          shippingAddress: (cust.shippingAddress as Address) || {},
          notes: cust.notes || '',
          isActive: cust.isActive !== false,
          region: cust.region || '',
          taxCategory: cust.taxCategory || '',
          taxExempt: cust.taxExempt || false,
          taxExemptionReason: cust.taxExemptionReason || '',
        });
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocalizationData = async () => {
    try {
      // Fetch organization to get country
      const orgRes = await fetch(`/api/orgs/${orgSlug}/organization`);
      const orgData = await orgRes.json();
      const country = orgData.data?.homeCountry || 'US';

      // Fetch localization metadata (you'll need to create this endpoint)
      // For now, use defaults
      setPaymentTermsOptions([
        { value: 0, label: 'Due on Receipt' },
        { value: 7, label: 'Net 7' },
        { value: 15, label: 'Net 15' },
        { value: 30, label: 'Net 30' },
        { value: 45, label: 'Net 45' },
        { value: 60, label: 'Net 60' },
        { value: 90, label: 'Net 90' },
      ]);
    } catch (error) {
      console.error('Error fetching localization data:', error);
    }
  };

  const validateTaxId = async () => {
    if (!formData.taxIdNumber) {
      setTaxIdError('');
      return true;
    }

    // In a real implementation, call the localization API
    // For now, basic validation
    if (formData.taxIdNumber.length < 8) {
      setTaxIdError(`Invalid ${taxIdLabel} format`);
      return false;
    }

    setTaxIdError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!(await validateTaxId())) {
      setActiveTab('general');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/${orgSlug}/accounts-receivable/customers/${customerId}`);
      } else {
        alert(data.error || 'Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  const copyBillingToShipping = () => {
    setFormData(prev => ({
      ...prev,
      shippingAddress: { ...prev.billingAddress },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading customer...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Customer not found</p>
        <Link
          href={`/${orgSlug}/accounts-receivable/customers`}
          className="text-blue-600 hover:text-blue-700 mt-4 inline-block"
        >
          Back to Customers
        </Link>
      </div>
    );
  }

  const getRiskColor = (riskScore: string) => {
    switch (riskScore) {
      case 'LOW':
        return 'text-green-600 bg-green-50';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50';
      case 'HIGH':
        return 'text-orange-600 bg-orange-50';
      case 'CRITICAL':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const tabs = [
    { id: 'general', label: 'General Information', icon: Building2 },
    { id: 'financial', label: 'Financial Settings', icon: DollarSign },
    { id: 'address', label: 'Addresses', icon: MapPin },
    { id: 'receivables', label: 'Receivables Summary', icon: TrendingDown },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/${orgSlug}/accounts-receivable/customers/${customerId}`}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Edit Customer: {customer.displayName || `${customer.firstName} ${customer.lastName}`}
            </h1>
            <p className="text-gray-600 mt-1">Update customer information and settings</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-5 w-5" />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Compliance Alerts */}
      {customer.complianceFlags && !customer.complianceFlags.taxIdValid && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900">Tax ID Validation Warning</h3>
            <p className="text-yellow-700 text-sm">
              The {taxIdLabel} format may be invalid. Please verify.
            </p>
          </div>
        </div>
      )}

      {customer.financialSummary?.isCreditHold && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Credit Hold</h3>
            <p className="text-red-700 text-sm">
              Customer has exceeded credit limit. New sales orders will require approval.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">General Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name (DBA)
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Doing Business As name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {taxIdLabel}
                </label>
                <input
                  type="text"
                  value={formData.taxIdNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, taxIdNumber: e.target.value })
                  }
                  onBlur={validateTaxId}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    taxIdError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={`Enter ${taxIdLabel}`}
                />
                {taxIdError && (
                  <p className="mt-1 text-sm text-red-600">{taxIdError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Category
                </label>
                <select
                  value={formData.taxCategory}
                  onChange={(e) =>
                    setFormData({ ...formData, taxCategory: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  <option value="RETAIL">Retail</option>
                  <option value="WHOLESALE">Wholesale</option>
                  <option value="GOVERNMENT">Government</option>
                  <option value="CORPORATE">Corporate</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region/Territory
                </label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Sales region or territory"
                />
              </div>

              <div className="md:col-span-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active Customer
                </label>
              </div>

              <div className="md:col-span-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="taxExempt"
                  checked={formData.taxExempt}
                  onChange={(e) =>
                    setFormData({ ...formData, taxExempt: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="taxExempt" className="text-sm font-medium text-gray-700">
                  Tax Exempt
                </label>
              </div>

              {formData.taxExempt && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Exemption Reason
                  </label>
                  <textarea
                    value={formData.taxExemptionReason}
                    onChange={(e) =>
                      setFormData({ ...formData, taxExemptionReason: e.target.value })
                    }
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Government entity, Non-profit organization, Export sales"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Financial Settings</h2>

            {customer.financialSummary && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Current Financial Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Outstanding</div>
                    <div className="text-lg font-semibold">
                      ${customer.financialSummary.totalOutstanding.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Credit Available</div>
                    <div className="text-lg font-semibold">
                      ${customer.financialSummary.creditAvailable.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Utilization</div>
                    <div className="text-lg font-semibold">
                      {customer.financialSummary.creditUtilization.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Risk Score</div>
                    <div
                      className={`inline-block px-2 py-1 rounded-full text-sm font-semibold ${getRiskColor(
                        customer.financialSummary.riskScore
                      )}`}
                    >
                      {customer.financialSummary.riskScore}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credit Limit
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.creditLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, creditLimit: e.target.value })
                    }
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Unlimited"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Leave blank for unlimited credit
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms
                </label>
                <select
                  value={formData.paymentTerms}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentTerms: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {paymentTermsOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'address' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.billingAddress.street || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billingAddress: {
                          ...formData.billingAddress,
                          street: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.billingAddress.city || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billingAddress: {
                          ...formData.billingAddress,
                          city: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/Province
                  </label>
                  <input
                    type="text"
                    value={formData.billingAddress.state || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billingAddress: {
                          ...formData.billingAddress,
                          state: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.billingAddress.postalCode || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billingAddress: {
                          ...formData.billingAddress,
                          postalCode: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.billingAddress.country || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billingAddress: {
                          ...formData.billingAddress,
                          country: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Shipping Address</h3>
                <button
                  type="button"
                  onClick={copyBillingToShipping}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Copy from Billing
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.shippingAddress.street || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shippingAddress: {
                          ...formData.shippingAddress,
                          street: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.shippingAddress.city || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shippingAddress: {
                          ...formData.shippingAddress,
                          city: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/Province
                  </label>
                  <input
                    type="text"
                    value={formData.shippingAddress.state || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shippingAddress: {
                          ...formData.shippingAddress,
                          state: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.shippingAddress.postalCode || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shippingAddress: {
                          ...formData.shippingAddress,
                          postalCode: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.shippingAddress.country || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shippingAddress: {
                          ...formData.shippingAddress,
                          country: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'receivables' && customer.financialSummary && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Receivables Summary</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 mb-1">Total Outstanding</div>
                <div className="text-2xl font-bold text-blue-900">
                  ${customer.financialSummary.totalOutstanding.toLocaleString()}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-600 mb-1">Total Paid</div>
                <div className="text-2xl font-bold text-green-900">
                  ${customer.financialSummary.totalPaid.toLocaleString()}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-purple-600 mb-1">Credit Available</div>
                <div className="text-2xl font-bold text-purple-900">
                  $
                  {customer.financialSummary.creditAvailable === Infinity
                    ? '∞'
                    : customer.financialSummary.creditAvailable.toLocaleString()}
                </div>
              </div>
              <div className={`rounded-lg p-4 ${getRiskColor(customer.financialSummary.riskScore)}`}>
                <div className="text-sm mb-1">Risk Score</div>
                <div className="text-2xl font-bold">
                  {customer.financialSummary.riskScore}
                </div>
              </div>
            </div>

            {/* Aging Analysis */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Aging Analysis</h3>
              <div className="space-y-4">
                {customer.financialSummary.agingSummary.buckets.map(
                  (bucket: AgingBucket, index: number) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {bucket.label}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            ${bucket.amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              index === 0
                                ? 'bg-green-500'
                                : index === 1
                                ? 'bg-yellow-500'
                                : index === 2
                                ? 'bg-orange-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${bucket.percentOfTotal}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">
                            {bucket.invoiceCount} invoice{bucket.invoiceCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs text-gray-500">
                            {bucket.percentOfTotal.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Credit Status */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Status</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  {customer.financialSummary.isCreditHold ? (
                    <>
                      <XCircle className="h-6 w-6 text-red-500" />
                      <div>
                        <div className="font-medium text-red-900">Credit Hold</div>
                        <div className="text-sm text-red-600">
                          Exceeds credit limit
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-6 w-6 text-green-500" />
                      <div>
                        <div className="font-medium text-green-900">Good Standing</div>
                        <div className="text-sm text-green-600">
                          Within credit limit
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-6 w-6 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">
                      Payment Terms
                    </div>
                    <div className="text-sm text-gray-600">
                      Net {customer.paymentTerms} days
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Documents & Notes</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Internal Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Credit application details, special instructions, account history..."
              />
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Document Upload (Coming Soon)
              </h3>
              <p className="text-gray-600 text-sm">
                Attach credit applications, tax exemption certificates, trade licenses, and
                other relevant documents.
              </p>
              <div className="mt-4 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Document upload feature coming soon</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
