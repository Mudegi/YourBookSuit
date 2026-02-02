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

export default function EditTaxRatePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const rateId = params.id as string;

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
  const [isActive, setIsActive] = useState(true);

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
  }, [orgSlug, rateId]);

  useEffect(() => {
    calculatePreview();
  }, [previewAmount, rate, fixedAmount, calculationType, previewMode, isCompoundTax]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load existing tax rate
      const rateRes = await fetch(`/api/orgs/${orgSlug}/tax/rates/${rateId}`);
      if (rateRes.ok) {
        const rateData = await rateRes.json();
        console.log('Loaded tax rate data:', rateData);
        
        setName(rateData.name || '');
        setDisplayName(rateData.displayName || '');
        setTaxAgencyId(rateData.taxAgencyId || '');
        setDescription(rateData.description || '');
        setCalculationType(rateData.calculationType || 'PERCENTAGE');
        setRate(rateData.rate?.toString() || '');
        setFixedAmount(rateData.fixedAmount?.toString() || '');
        setIsInclusiveDefault(rateData.isInclusiveDefault || false);
        setIsCompoundTax(rateData.isCompoundTax || false);
        setSalesTaxAccountId(rateData.salesTaxAccountId || '');
        setPurchaseTaxAccountId(rateData.purchaseTaxAccountId || '');
        setIsRecoverable(rateData.isRecoverable ?? true);
        setRecoveryPercentage(rateData.recoveryPercentage?.toString() || '100');
        setEffectiveFrom(rateData.effectiveFrom ? new Date(rateData.effectiveFrom).toISOString().split('T')[0] : '');
        setEffectiveTo(rateData.effectiveTo ? new Date(rateData.effectiveTo).toISOString().split('T')[0] : '');
        setApplicableContext(rateData.applicableContext || ['SALES', 'PURCHASES']);
        setExternalTaxCode(rateData.externalTaxCode || '');
        setReportingCategory(rateData.reportingCategory || '');
        setIsActive(rateData.isActive ?? true);
      } else {
        const error = await rateRes.json();
        console.error('Failed to load tax rate:', error);
        alert('Failed to load tax rate: ' + (error.error || 'Unknown error'));
      }

      // Load tax agencies
      const agenciesRes = await fetch(`/api/orgs/${orgSlug}/tax/agencies`);
      if (agenciesRes.ok) {
        const agenciesData = await agenciesRes.json();
        setAgencies(Array.isArray(agenciesData) ? agenciesData : []);
      }

      // Load GL accounts
      const accountsRes = await fetch(`/api/orgs/${orgSlug}/chart-of-accounts`);
      if (accountsRes.ok) {
        const accountsResponse = await accountsRes.json();
        const accountsData = accountsResponse.data || accountsResponse;
        const filteredAccounts = Array.isArray(accountsData) 
          ? accountsData.filter((acc: any) => acc.accountType === 'LIABILITY' || acc.accountType === 'EXPENSE')
          : [];
        setGlAccounts(filteredAccounts);
      }

      // Load external tax categories
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
      let taxValue: Decimal;
      let netAmount: Decimal;
      let totalAmount: Decimal;

      if (calculationType === 'FIXED_AMOUNT') {
        taxValue = fixedAmount ? new Decimal(fixedAmount) : new Decimal(0);
        netAmount = amount;
        totalAmount = amount.plus(taxValue);
      } else {
        const taxRate = rate ? new Decimal(rate).dividedBy(100) : new Decimal(0);

        if (previewMode === 'INCLUSIVE') {
          totalAmount = amount;
          netAmount = amount.dividedBy(new Decimal(1).plus(taxRate));
          taxValue = amount.minus(netAmount);
        } else {
          netAmount = amount;
          taxValue = amount.times(taxRate);
          totalAmount = amount.plus(taxValue);
        }
      }

      setPreviewResult({
        net: netAmount.toFixed(2),
        tax: taxValue.toFixed(2),
        total: totalAmount.toFixed(2),
      });
    } catch (error) {
      console.error('Error calculating preview:', error);
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
      const res = await fetch(`/api/orgs/${orgSlug}/tax/rates/${rateId}`, {
        method: 'PUT',
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
          isActive,
        }),
      });

      if (res.ok) {
        alert('Tax rate updated successfully!');
        router.push(`/${orgSlug}/settings/taxes/rates`);
      } else {
        const errorData = await res.json();
        const errorMessage = errorData.error || errorData.message || 'Unknown error occurred';
        alert(`Error: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error('Error updating tax rate:', error);
      alert(`Failed to update tax rate: ${error.message || 'Unknown error'}`);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500">Loading tax rate...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Tax Rate</h1>
            <p className="mt-1 text-sm text-gray-500">
              Update tax rate configuration and calculation settings
            </p>
          </div>
          <button
            onClick={() => router.push(`/${orgSlug}/settings/taxes/rates`)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Reuse the same form sections from the new page */}
              {/* I'll add a simplified version here */}
              
              {/* Basic Identity */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <FileText className="h-5 w-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Basic Identity</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Rate Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., VAT Standard Rate 18%"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional: Short name for invoices"
                    />
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
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional notes about this rate"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                      Active
                    </label>
                  </div>
                </div>
              </div>

              {/* Calculation Logic */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <Calculator className="h-5 w-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Calculation Logic</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Calculation Type
                    </label>
                    <select
                      value={calculationType}
                      onChange={(e) => setCalculationType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="FIXED_AMOUNT">Fixed Amount</option>
                    </select>
                  </div>

                  {calculationType === 'PERCENTAGE' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Rate (%) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 18.00"
                        required
                      />
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 5000"
                        required
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-6">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isInclusiveDefault"
                        checked={isInclusiveDefault}
                        onChange={(e) => setIsInclusiveDefault(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isInclusiveDefault" className="ml-2 block text-sm text-gray-900">
                        Inclusive by Default
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isCompoundTax"
                        checked={isCompoundTax}
                        onChange={(e) => setIsCompoundTax(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isCompoundTax" className="ml-2 block text-sm text-gray-900">
                        Compound Tax
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Mapping - Simplified */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <Building2 className="h-5 w-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Financial Mapping</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sales Tax Account <span className="text-red-500">*</span>
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purchase Tax Account <span className="text-red-500">*</span>
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
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => router.push(`/${orgSlug}/settings/taxes/rates`)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Tax Rate
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column - Preview Calculator */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
                <div className="flex items-center mb-4">
                  <Calculator className="h-5 w-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Live Preview</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      value={previewAmount}
                      onChange={(e) => setPreviewAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mode
                    </label>
                    <div className="flex rounded-lg border border-gray-300">
                      <button
                        type="button"
                        onClick={() => setPreviewMode('EXCLUSIVE')}
                        className={`flex-1 px-3 py-2 text-sm font-medium ${
                          previewMode === 'EXCLUSIVE'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Exclusive
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode('INCLUSIVE')}
                        className={`flex-1 px-3 py-2 text-sm font-medium ${
                          previewMode === 'INCLUSIVE'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Inclusive
                      </button>
                    </div>
                  </div>

                  {previewResult && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Net Amount:</span>
                          <span className="font-mono font-medium">{previewResult.net}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax:</span>
                          <span className="font-mono font-medium text-blue-600">{previewResult.tax}</span>
                        </div>
                        <div className="flex justify-between text-base font-semibold pt-2 border-t border-blue-300">
                          <span className="text-gray-900">Total:</span>
                          <span className="font-mono">{previewResult.total}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
