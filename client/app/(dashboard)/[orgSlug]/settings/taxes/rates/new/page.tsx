'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Save, X, Calculator, AlertCircle, CheckCircle, Info,
  DollarSign, Building2, Calendar, Settings, FileText, Plus
} from 'lucide-react';
import Decimal from 'decimal.js';

interface TaxAgency {
  id: string;
  name: string;
  code: string;
  country: string;
}

interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
}

interface ExternalTaxCategory {
  code: string;
  name: string;
  description: string;
}

export default function NewTaxRatePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  // Form State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agencies, setAgencies] = useState<TaxAgency[]>([]);
  const [glAccounts, setGlAccounts] = useState<ChartOfAccount[]>([]);
  const [externalCategories, setExternalCategories] = useState<ExternalTaxCategory[]>([]);

  // Form Fields - Basic Identity
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [taxAgencyId, setTaxAgencyId] = useState('');
  const [description, setDescription] = useState('');
  const [taxType, setTaxType] = useState<'VAT' | 'GST' | 'SALES_TAX' | 'EXCISE' | 'IMPORT_DUTY' | 'WITHHOLDING' | 'PAYROLL' | 'DEEMED'>('VAT');

  // Calculation Logic
  const [calculationType, setCalculationType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [rate, setRate] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [isInclusiveDefault, setIsInclusiveDefault] = useState(false);
  const [isCompoundTax, setIsCompoundTax] = useState(false);

  // Financial Mapping
  const [salesTaxAccountId, setSalesTaxAccountId] = useState('');
  const [purchaseTaxAccountId, setPurchaseTaxAccountId] = useState('');
  const [isRecoverable, setIsRecoverable] = useState(true);
  const [recoveryPercentage, setRecoveryPercentage] = useState('100');

  // Applicability & Scope
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveTo, setEffectiveTo] = useState('');
  const [applicableContext, setApplicableContext] = useState<string[]>(['SALES', 'PURCHASES']);
  const [externalTaxCode, setExternalTaxCode] = useState('');
  const [reportingCategory, setReportingCategory] = useState('');

  // EFRIS Tax Classification (Uganda)
  const [efrisTaxCategoryCode, setEfrisTaxCategoryCode] = useState('');
  const [efrisGoodsCategoryId, setEfrisGoodsCategoryId] = useState('');

  // Preview Calculator
  const [previewAmount, setPreviewAmount] = useState('1000000');
  const [previewMode, setPreviewMode] = useState<'EXCLUSIVE' | 'INCLUSIVE'>('EXCLUSIVE');
  const [previewResult, setPreviewResult] = useState<{
    net: string;
    tax: string;
    total: string;
  } | null>(null);

  // New Agency Modal
  const [showNewAgencyModal, setShowNewAgencyModal] = useState(false);
  const [newAgencyData, setNewAgencyData] = useState({
    name: '',
    code: '',
    country: 'UG',
    taxType: 'VAT' as 'VAT' | 'SALES_TAX' | 'GST' | 'EXCISE' | 'WITHHOLDING' | 'CORPORATE' | 'INCOME' | 'PROPERTY' | 'CUSTOMS' | 'OTHER',
    registrationNumber: '',
    isActive: true,
  });

  useEffect(() => {
    loadInitialData();
  }, [orgSlug]);

  useEffect(() => {
    calculatePreview();
  }, [previewAmount, rate, fixedAmount, calculationType, previewMode, isCompoundTax]);

  // Auto-suggest EFRIS category code based on tax rate
  useEffect(() => {
    if (!efrisTaxCategoryCode && rate && calculationType === 'PERCENTAGE') {
      const rateNum = parseFloat(rate);
      // Auto-suggest based on rate
      if (rateNum === 0) {
        setEfrisTaxCategoryCode('02'); // Zero-rated
      } else if (rateNum === 18) {
        setEfrisTaxCategoryCode('01'); // Standard 18%
      } else if (rateNum < 0 || isNaN(rateNum)) {
        setEfrisTaxCategoryCode('03'); // Exempt
      }
    }
  }, [rate, calculationType]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load tax agencies
      const agenciesRes = await fetch(`/api/orgs/${orgSlug}/tax/agencies`);
      if (agenciesRes.ok) {
        const agenciesData = await agenciesRes.json();
        setAgencies(Array.isArray(agenciesData) ? agenciesData : []);
      }

      // Load GL accounts (liability and expense accounts)
      const accountsRes = await fetch(`/api/orgs/${orgSlug}/chart-of-accounts`);
      if (accountsRes.ok) {
        const accountsResponse = await accountsRes.json();
        // API returns { success: true, data: accounts }
        const accountsData = accountsResponse.data || accountsResponse;
        // Filter for LIABILITY and EXPENSE types
        const filteredAccounts = Array.isArray(accountsData) 
          ? accountsData.filter((acc: any) => acc.accountType === 'LIABILITY' || acc.accountType === 'EXPENSE')
          : [];
        setGlAccounts(filteredAccounts);
      }

      // Load external tax categories (from LocalizationManager)
      const categoriesRes = await fetch(`/api/orgs/${orgSlug}/tax/external-categories`);
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setExternalCategories(Array.isArray(categoriesData) ? categoriesData : []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePreview = () => {
    if (!previewAmount) {
      setPreviewResult(null);
      return;
    }

    try {
      const amount = new Decimal(previewAmount);
      
      if (calculationType === 'FIXED_AMOUNT' && fixedAmount) {
        // Fixed amount tax
        const tax = new Decimal(fixedAmount);
        const total = amount.plus(tax);
        setPreviewResult({
          net: amount.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
        });
      } else if (calculationType === 'PERCENTAGE' && rate) {
        // Percentage tax
        const r = new Decimal(rate).dividedBy(100);

        if (previewMode === 'INCLUSIVE') {
          // Tax is included in amount
          const net = amount.dividedBy(r.plus(1)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
          const tax = amount.minus(net).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
          
          // Verify Net + Tax = Total
          const verifyTotal = net.plus(tax);
          const adjustedTax = verifyTotal.equals(amount) ? tax : amount.minus(net);
          
          setPreviewResult({
            net: net.toFixed(2),
            tax: adjustedTax.toFixed(2),
            total: amount.toFixed(2),
          });
        } else {
          // Tax is exclusive
          const net = amount;
          const tax = amount.times(r).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
          const total = net.plus(tax);
          
          setPreviewResult({
            net: net.toFixed(2),
            tax: tax.toFixed(2),
            total: total.toFixed(2),
          });
        }
      } else {
        setPreviewResult(null);
      }
    } catch (error) {
      console.error('Preview calculation error:', error);
      setPreviewResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name) {
      alert('Please enter a tax rate name');
      return;
    }

    if (calculationType === 'PERCENTAGE' && !rate) {
      alert('Please enter a tax rate');
      return;
    }

    if (calculationType === 'FIXED_AMOUNT' && !fixedAmount) {
      alert('Please enter a fixed amount');
      return;
    }

    // GL accounts are ALWAYS required for proper accounting
    if (!salesTaxAccountId || !purchaseTaxAccountId) {
      alert('Please map GL accounts for both sales and purchases');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/tax/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          displayName: displayName || name,
          taxAgencyId,
          description,
          taxType,
          calculationType,
          rate: calculationType === 'PERCENTAGE' ? parseFloat(rate) : 0,
          fixedAmount: calculationType === 'FIXED_AMOUNT' ? parseFloat(fixedAmount) : null,
          isInclusiveDefault,
          isCompoundTax,
          salesTaxAccountId,
          purchaseTaxAccountId,
          isRecoverable,
          recoveryPercentage: parseFloat(recoveryPercentage),
          effectiveFrom: new Date(effectiveFrom),
          effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
          applicableContext,
          externalTaxCode: externalTaxCode || null,
          reportingCategory: reportingCategory || null,
          isActive: true,
          // EFRIS fields
          efrisTaxCategoryCode: efrisTaxCategoryCode || null,
          efrisGoodsCategoryId: efrisGoodsCategoryId || null,
        }),
      });

      if (res.ok) {
        alert('Tax rate created successfully!');
        router.push(`/${orgSlug}/settings/taxes/rates`);
      } else {
        const errorData = await res.json();
        const errorMessage = errorData.error || errorData.message || 'Unknown error occurred';
        alert(`Error: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error('Error creating tax rate:', error);
      alert(`Failed to create tax rate: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleContext = (context: string) => {
    if (applicableContext.includes(context)) {
      setApplicableContext(applicableContext.filter(c => c !== context));
    } else {
      setApplicableContext([...applicableContext, context]);
    }
  };

  const handleCreateAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/tax/agencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgencyData),
      });

      if (!res.ok) throw new Error('Failed to create tax agency');

      const createdAgency = await res.json();
      
      // Add to agencies list and auto-select
      setAgencies([...agencies, createdAgency]);
      setTaxAgencyId(createdAgency.id);
      
      // Reset form and close modal
      setShowNewAgencyModal(false);
      setNewAgencyData({
        name: '',
        code: '',
        country: 'UG',
        taxType: 'VAT',
        registrationNumber: '',
        isActive: true,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to create agency');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create Tax Rate / Rule</h1>
          <p className="mt-2 text-gray-600">
            Define the "brain" of your tax engine - how the system calculates, posts, and reports taxes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Section 1: Basic Identity */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold">Basic Identity</h2>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., VAT Standard Rate"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Display Label
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g., VAT 18%"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Agency <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={taxAgencyId}
                        onChange={(e) => setTaxAgencyId(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select tax agency...</option>
                        {agencies.map((agency) => (
                          <option key={agency.id} value={agency.id}>
                            {agency.name} ({agency.code})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewAgencyModal(true)}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 whitespace-nowrap"
                        title="Add new tax agency"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Not in the list? Click "Add" to create a new tax agency quickly.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description of this tax rate"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Calculation Logic */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold">Calculation Logic</h2>
                  <span className="text-xs text-gray-500 ml-2">(The QuickBooks Behavior)</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Calculation Type
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="PERCENTAGE"
                          checked={calculationType === 'PERCENTAGE'}
                          onChange={(e) => setCalculationType(e.target.value as 'PERCENTAGE')}
                          className="mr-2"
                        />
                        <span className="text-sm">Fixed Percentage</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="FIXED_AMOUNT"
                          checked={calculationType === 'FIXED_AMOUNT'}
                          onChange={(e) => setCalculationType(e.target.value as 'FIXED_AMOUNT')}
                          className="mr-2"
                        />
                        <span className="text-sm">Fixed Amount</span>
                      </label>
                    </div>
                  </div>

                  {calculationType === 'PERCENTAGE' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Rate (%) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        placeholder="e.g., 18.0000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Enter as decimal (e.g., 18 for 18%)
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fixed Amount <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={fixedAmount}
                        onChange={(e) => setFixedAmount(e.target.value)}
                        placeholder="e.g., 1000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        For taxes like stamp duty (flat fee regardless of price)
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isInclusiveDefault}
                        onChange={(e) => setIsInclusiveDefault(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">Inclusive by Default</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isCompoundTax}
                        onChange={(e) => setIsCompoundTax(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">Compound Tax (Tax on Tax)</span>
                    </label>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div className="text-xs text-blue-800">
                        <strong>Inclusive:</strong> Tax is already in the unit price. System "peels back" tax.
                        <br />
                        <strong>Compound:</strong> This tax is applied after other taxes (e.g., tax on subtotal + other taxes).
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Financial Mapping */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-semibold">Financial Mapping (GL Accounts)</h2>
                  <span className="text-xs text-gray-500 ml-2">(Where does the money go?)</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sales Tax Account (Output Tax) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={salesTaxAccountId}
                      onChange={(e) => setSalesTaxAccountId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select GL account...</option>
                      {Array.isArray(glAccounts) && glAccounts
                        .filter(acc => acc.accountType === 'LIABILITY')
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Liability account where tax collected from customers is credited
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purchase Tax Account (Input Tax) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={purchaseTaxAccountId}
                      onChange={(e) => setPurchaseTaxAccountId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select GL account...</option>
                      {Array.isArray(glAccounts) && glAccounts
                        .filter(acc => acc.accountType === 'LIABILITY' || acc.accountType === 'EXPENSE')
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Asset/Expense account where tax paid to suppliers is debited
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          checked={isRecoverable}
                          onChange={(e) => setIsRecoverable(e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium">Tax is Recoverable</span>
                      </label>
                      <p className="text-xs text-gray-500">
                        Can the business claim this tax back from the authority?
                      </p>
                    </div>

                    {isRecoverable && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Recovery Percentage
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={recoveryPercentage}
                          onChange={(e) => setRecoveryPercentage(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          % of input tax that can be recovered (usually 100%)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 4: Applicability & Scope */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-orange-600" />
                  <h2 className="text-lg font-semibold">Applicability & Scope</h2>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Effective From <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={effectiveFrom}
                        onChange={(e) => setEffectiveFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Effective To (Optional)
                      </label>
                      <input
                        type="date"
                        value={effectiveTo}
                        onChange={(e) => setEffectiveTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Leave empty for indefinite validity
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Applicable Context (Where can this tax be used?)
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={applicableContext.includes('SALES')}
                          onChange={() => toggleContext('SALES')}
                          className="mr-2"
                        />
                        <span className="text-sm">Sales (Invoices)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={applicableContext.includes('PURCHASES')}
                          onChange={() => toggleContext('PURCHASES')}
                          className="mr-2"
                        />
                        <span className="text-sm">Purchases (Bills)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={applicableContext.includes('BOTH')}
                          onChange={() => {
                            if (applicableContext.includes('BOTH')) {
                              setApplicableContext(applicableContext.filter(c => c !== 'BOTH'));
                            } else {
                              setApplicableContext(['SALES', 'PURCHASES', 'BOTH']);
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">Both</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        External Mapping Code
                      </label>
                      {externalCategories.length > 0 ? (
                        <select
                          value={externalTaxCode}
                          onChange={(e) => setExternalTaxCode(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select statutory code...</option>
                          {externalCategories.map((cat) => (
                            <option key={cat.code} value={cat.code}>
                              {cat.code} - {cat.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={externalTaxCode}
                          onChange={(e) => setExternalTaxCode(e.target.value)}
                          placeholder="e.g., 01 for EFRIS"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Code used by tax authority API (EFRIS, eTIMS, MTD)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reporting Category
                      </label>
                      <input
                        type="text"
                        value={reportingCategory}
                        onChange={(e) => setReportingCategory(e.target.value)}
                        placeholder="e.g., Standard Supplies"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Category for tax return grouping
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: EFRIS Tax Classification (Uganda) */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow border-2 border-green-200 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-green-700" />
                  <h2 className="text-lg font-semibold text-green-900">EFRIS Tax Classification</h2>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Uganda</span>
                </div>
                
                <p className="text-sm text-green-800 mb-4">
                  Configure how this tax rate maps to EFRIS T109 invoice codes. This ensures proper tax reporting to URA.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      EFRIS Tax Category Code <span className="text-green-600">*</span>
                    </label>
                    <select
                      value={efrisTaxCategoryCode}
                      onChange={(e) => setEfrisTaxCategoryCode(e.target.value)}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                    >
                      <option value="">Auto-detect from rate...</option>
                      <option value="01">01 - Standard (18%)</option>
                      <option value="02">02 - Zero Rated (0%)</option>
                      <option value="03">03 - Exempt (-)</option>
                      <option value="04">04 - Deemed (18%)</option>
                      <option value="05">05 - Excise Duty</option>
                      <option value="06">06 - Over the Top Service (OTT)</option>
                      <option value="07">07 - Stamp Duty</option>
                      <option value="08">08 - Local Hotel Service Tax</option>
                      <option value="09">09 - UCC Levy</option>
                      <option value="10">10 - Others</option>
                      <option value="11">11 - VAT Out of Scope</option>
                    </select>
                    <p className="mt-1 text-xs text-green-700">
                      {efrisTaxCategoryCode === '01' && '✓ Standard VAT rate (most common)'}
                      {efrisTaxCategoryCode === '02' && '✓ Zero-rated supplies (exports, exempt goods)'}
                      {efrisTaxCategoryCode === '03' && '✓ VAT exempt items (no VAT charged)'}
                      {efrisTaxCategoryCode === '04' && '✓ Deemed supplies (VAT deemed)'}
                      {efrisTaxCategoryCode === '11' && '⚠️ Out of scope - check if your org is registered for this'}
                      {!efrisTaxCategoryCode && 'System will auto-detect based on rate percentage'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Goods Category ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={efrisGoodsCategoryId}
                      onChange={(e) => setEfrisGoodsCategoryId(e.target.value)}
                      placeholder="e.g., 100000000"
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      VAT commodity category from T124. Leave empty to use product-specific categories.
                    </p>
                  </div>

                  <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                    <div className="flex gap-2">
                      <Info className="w-4 h-4 text-green-700 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-green-800">
                        <p className="font-medium mb-1">Important EFRIS Mappings:</p>
                        <ul className="space-y-0.5 list-disc list-inside">
                          <li><strong>Exempt (03)</strong>: VAT still applies, but rate is zero (use vatApplicableFlag=1)</li>
                          <li><strong>Zero-rated (02)</strong>: For exports and specific goods at 0% VAT</li>
                          <li><strong>Out of Scope (11)</strong>: VAT doesn't apply at all (use vatApplicableFlag=0)</li>
                          <li>If unsure, leave blank - system will auto-detect from your rate settings</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Preview Calculator */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6 sticky top-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Live Preview Calculator</h3>
                </div>

                <p className="text-xs text-gray-600 mb-4">
                  See how this tax rule will behave in real transactions
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sample Amount
                    </label>
                    <input
                      type="number"
                      value={previewAmount}
                      onChange={(e) => setPreviewAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Calculation Mode
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewMode('EXCLUSIVE')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                          previewMode === 'EXCLUSIVE'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300'
                        }`}
                      >
                        Exclusive
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode('INCLUSIVE')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                          previewMode === 'INCLUSIVE'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300'
                        }`}
                      >
                        Inclusive
                      </button>
                    </div>
                  </div>

                  {previewResult && (
                    <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Net Amount:</span>
                          <span className="text-lg font-bold text-gray-900">
                            {parseFloat(previewResult.net).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Tax Amount:</span>
                          <span className="text-lg font-bold text-blue-600">
                            {parseFloat(previewResult.tax).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-900">Total:</span>
                            <span className="text-xl font-bold text-green-600">
                              {parseFloat(previewResult.total).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                          <div className="text-xs text-gray-600">
                            {previewMode === 'INCLUSIVE' ? (
                              <>
                                <strong>Tax Inclusive:</strong> The total stays at{' '}
                                {parseFloat(previewAmount).toLocaleString()}, but we "peel back" the tax
                                to find the net revenue.
                              </>
                            ) : (
                              <>
                                <strong>Tax Exclusive:</strong> The net is{' '}
                                {parseFloat(previewAmount).toLocaleString()}, and tax is added on top.
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!previewResult && (rate || fixedAmount) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                        <p className="text-xs text-yellow-800">
                          Enter a sample amount to see the tax calculation preview
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Formula Explanation */}
                {calculationType === 'PERCENTAGE' && rate && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Formula:</h4>
                    {previewMode === 'INCLUSIVE' ? (
                      <div className="text-xs text-gray-600 space-y-1 font-mono">
                        <div>Net = Total / (1 + {rate}%)</div>
                        <div>Tax = Total - Net</div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600 space-y-1 font-mono">
                        <div>Tax = Net × {rate}%</div>
                        <div>Total = Net + Tax</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Creating...' : 'Create Tax Rate'}
            </button>
          </div>
        </form>
      </div>

      {/* New Tax Agency Modal */}
      {showNewAgencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Tax Agency</h2>
              <form onSubmit={handleCreateAgency} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agency Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newAgencyData.name}
                    onChange={(e) => setNewAgencyData({ ...newAgencyData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Tax Authority"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newAgencyData.code}
                    onChange={(e) => setNewAgencyData({ ...newAgencyData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., URA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newAgencyData.country}
                    onChange={(e) => setNewAgencyData({ ...newAgencyData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., UG"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={newAgencyData.taxType}
                    onChange={(e) => setNewAgencyData({ ...newAgencyData, taxType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="VAT">VAT</option>
                    <option value="GST">GST</option>
                    <option value="SALES_TAX">Sales Tax</option>
                    <option value="EXCISE">Excise</option>
                    <option value="WITHHOLDING">Withholding Tax</option>
                    <option value="CORPORATE">Corporate Tax</option>
                    <option value="INCOME">Income Tax</option>
                    <option value="PROPERTY">Property Tax</option>
                    <option value="CUSTOMS">Customs Duty</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={newAgencyData.registrationNumber}
                    onChange={(e) => setNewAgencyData({ ...newAgencyData, registrationNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="agencyActive"
                    checked={newAgencyData.isActive}
                    onChange={(e) => setNewAgencyData({ ...newAgencyData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="agencyActive" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowNewAgencyModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Create Agency
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
