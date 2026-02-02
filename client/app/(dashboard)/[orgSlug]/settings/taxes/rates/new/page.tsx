'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Save, X, Calculator, AlertCircle, CheckCircle, Info,
  DollarSign, Building2, Calendar, Settings, FileText
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

  // Preview Calculator
  const [previewAmount, setPreviewAmount] = useState('1000000');
  const [previewMode, setPreviewMode] = useState<'EXCLUSIVE' | 'INCLUSIVE'>('EXCLUSIVE');
  const [previewResult, setPreviewResult] = useState<{
    net: string;
    tax: string;
    total: string;
  } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, [orgSlug]);

  useEffect(() => {
    calculatePreview();
  }, [previewAmount, rate, fixedAmount, calculationType, previewMode, isCompoundTax]);

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
    if (!name || !taxAgencyId) {
      alert('Please fill in required fields');
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
                    <select
                      value={taxAgencyId}
                      onChange={(e) => setTaxAgencyId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select tax agency...</option>
                      {agencies.map((agency) => (
                        <option key={agency.id} value={agency.id}>
                          {agency.name} ({agency.code})
                        </option>
                      ))}
                    </select>
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
    </div>
  );
}
