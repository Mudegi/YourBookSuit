'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Globe, Calendar, DollarSign, CheckCircle2, ArrowRight, ArrowLeft, CreditCard, Smartphone, Shield, Zap } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetch-client';

// Pricing constants (keep in sync with landing / pricing pages)
const MONTHLY_PRICE  = 30;
const FREE_MONTHS    = 2;
const ANNUAL_PRICE   = MONTHLY_PRICE * (12 - FREE_MONTHS); // 300
const ANNUAL_MONTHLY = Math.round(ANNUAL_PRICE / 12);      // 25

const TOTAL_STEPS = 5;

// Map business type to the industry template used for Chart of Accounts seeding
const BUSINESS_TO_INDUSTRY: Record<string, string> = {
  CONSULTING: 'services',
  FREELANCE: 'services',
  RETAIL: 'retail',
  MANUFACTURER: 'manufacturing',
  MIXED_BUSINESS: 'construction',
  FULL_FEATURED: 'other',
};

interface OnboardingData {
  // Step 1 - Company
  companyName: string;
  legalName: string;
  homeCountry: string;
  baseCurrency: string;
  fiscalYearStart: number;
  // Step 2 - Business type (also seeds COA)
  businessModel: string;
  // Step 3 - Bank
  bankName: string;
  accountNumber: string;
  openingBalance: number;
  // Step 4 - Plan
  billingCycle: 'monthly' | 'annual';
  // Step 5 - Payment
  paymentMethod: 'flutterwave' | 'mobile_money' | '';
  mobileProvider: string;
  mobileNumber: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [orgSlug, setOrgSlug] = useState('');

  const [formData, setFormData] = useState<OnboardingData>({
    companyName: '',
    legalName: '',
    homeCountry: 'US',
    baseCurrency: 'USD',
    fiscalYearStart: 1,
    businessModel: '',
    bankName: '',
    accountNumber: '',
    openingBalance: 0,
    billingCycle: 'annual',
    paymentMethod: '',
    mobileProvider: '',
    mobileNumber: '',
  });

  useEffect(() => { loadProgress(); }, []);

  /**
   * Load existing onboarding progress so the user resumes where they left off
   * and all previously-saved fields are pre-filled.
   */
  const loadProgress = async () => {
    try {
      // First verify session
      const sessionRes = await fetchWithAuth('/api/auth/session');
      if (!sessionRes.ok) { router.push('/login'); return; }

      // Then fetch full onboarding progress
      const progressRes = await fetchWithAuth('/api/onboarding/progress');
      if (!progressRes.ok) {
        // Fallback: at least set org basics from session
        const sessionData = await sessionRes.json();
        const org = sessionData.data.organization;
        if (org) {
          setOrgSlug(org.slug);
          setFormData(prev => ({
            ...prev,
            companyName: org.name || '',
            legalName: org.legalName || '',
            homeCountry: org.homeCountry || 'US',
            baseCurrency: org.baseCurrency || 'USD',
          }));
        }
        setInitialLoading(false);
        return;
      }

      const { data } = await progressRes.json();
      const org = data.organization;
      const bank = data.bank;

      setOrgSlug(org.slug);

      // Pre-fill every field that already has data
      setFormData(prev => ({
        ...prev,
        companyName: org.name || '',
        legalName: org.legalName || '',
        homeCountry: org.homeCountry || 'US',
        baseCurrency: org.baseCurrency || 'USD',
        fiscalYearStart: org.fiscalYearStart || 1,
        businessModel: (org.businessModel && org.businessModel !== 'GENERAL') ? org.businessModel : '',
        bankName: bank?.bankName || '',
        accountNumber: bank?.accountNumber || '',
        openingBalance: bank?.openingBalance || 0,
      }));

      // Resume from the first incomplete step.
      // If onboarding is already complete, start at step 1 so the user can
      // review / update any field (they can still navigate forward freely).
      const completed = data.completedStep || 0;
      const resumeStep = completed >= TOTAL_STEPS ? 1 : completed + 1;
      setCurrentStep(resumeStep);
    } catch {
      router.push('/login');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleInputChange = (field: keyof OnboardingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.companyName.trim()) { setError('Company name is required'); return false; }
        if (!formData.baseCurrency) { setError('Currency is required'); return false; }
        return true;
      case 2:
        if (!formData.businessModel) { setError('Please select a business type'); return false; }
        return true;
      case 3:
        if (!formData.bankName.trim()) { setError('Bank name is required'); return false; }
        if (!formData.accountNumber.trim()) { setError('Account number is required'); return false; }
        if (formData.openingBalance < 0) { setError('Opening balance cannot be negative'); return false; }
        return true;
      case 4:
        return true;
      case 5:
        if (!formData.paymentMethod) { setError('Please select a payment method'); return false; }
        if (formData.paymentMethod === 'mobile_money') {
          if (!formData.mobileProvider) { setError('Select a mobile money provider'); return false; }
          if (!formData.mobileNumber.trim()) { setError('Phone number is required'); return false; }
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;
    setLoading(true);
    try {
      if (currentStep === 1) {
        const res = await fetchWithAuth('/api/onboarding/company-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.companyName,
            legalName: formData.legalName || formData.companyName,
            homeCountry: formData.homeCountry,
            baseCurrency: formData.baseCurrency,
            fiscalYearStart: formData.fiscalYearStart,
          }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to save company details'); }
        setCurrentStep(2);
      } else if (currentStep === 2) {
        // Save business type
        const res1 = await fetchWithAuth('/api/onboarding/business-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessModel: formData.businessModel }),
        });
        if (!res1.ok) { const d = await res1.json(); throw new Error(d.error || 'Failed to save business type'); }
        // Also seed COA based on mapped industry
        const industry = BUSINESS_TO_INDUSTRY[formData.businessModel] || 'other';
        const res2 = await fetchWithAuth('/api/onboarding/seed-coa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ industry }),
        });
        if (!res2.ok) { const d = await res2.json(); throw new Error(d.error || 'Failed to setup Chart of Accounts'); }
        setCurrentStep(3);
      } else if (currentStep === 3) {
        if (!orgSlug) throw new Error('Organization not found. Please refresh and try again.');
        const coaCheck = await fetchWithAuth(`/api/orgs/${orgSlug}/coa/generate?action=check`);
        const coaData = await coaCheck.json();
        if (coaData.data?.canGenerate !== false) {
          throw new Error('Chart of Accounts not found. Please go back and select a business type.');
        }
        const res = await fetchWithAuth('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            openingBalance: formData.openingBalance,
          }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to complete bank setup'); }
        setCurrentStep(4);
      } else if (currentStep === 4) {
        setCurrentStep(5);
      } else if (currentStep === 5) {
        const res = await fetchWithAuth('/api/onboarding/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            billingCycle: formData.billingCycle,
            paymentMethod: formData.paymentMethod,
            ...(formData.paymentMethod === 'mobile_money' && {
              mobileProvider: formData.mobileProvider,
              mobileNumber: formData.mobileNumber,
            }),
          }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Payment failed'); }
        const data = await res.json();
        if (data.data?.subscriptionStatus === 'ACTIVE') {
          window.location.href = `/${orgSlug}/dashboard`;
        } else {
          window.location.href = `/${orgSlug}/dashboard`;
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) { setCurrentStep(currentStep - 1); setError(''); }
  };

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  ];

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString('en', { month: 'long' }),
  }));

  const stepLabels = ['Company', 'Business', 'Banking', 'Plan', 'Payment'];

  const inputCls = 'w-full px-4 py-3 bg-slate-900 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500';
  const selectCls = inputCls;
  const labelCls = 'block text-sm font-medium text-slate-300 mb-2';

  // Show loading spinner while we fetch existing progress
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-slate-400 text-sm">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/20">
            <span className="text-white font-bold text-2xl">Y</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to YourBooks!</h1>
          <p className="text-slate-400">Let&apos;s set up your accounting system in {TOTAL_STEPS} simple steps</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-colors ${
                    step < currentStep
                      ? 'bg-emerald-500 text-white'
                      : step === currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {step < currentStep ? <CheckCircle2 className="w-5 h-5" /> : step}
                </div>
                {step < TOTAL_STEPS && (
                  <div className={`flex-1 h-1 mx-2 rounded ${step < currentStep ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs">
            {stepLabels.map((label, i) => (
              <span key={label} className={currentStep >= i + 1 ? 'text-blue-400 font-medium' : 'text-slate-500'}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Step 1: Company Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Company Information</h2>
                <p className="text-slate-400">Tell us about your business</p>
              </div>
              <div>
                <label className={labelCls}><Building2 className="inline w-4 h-4 mr-1" /> Company Name *</label>
                <input type="text" value={formData.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} className={inputCls} placeholder="Enter your company name" />
              </div>
              <div>
                <label className={labelCls}><Building2 className="inline w-4 h-4 mr-1" /> Legal Name</label>
                <input type="text" value={formData.legalName} onChange={(e) => handleInputChange('legalName', e.target.value)} className={inputCls} placeholder="Legal business name (leave blank to use company name)" />
              </div>
              <div>
                <label className={labelCls}><Globe className="inline w-4 h-4 mr-1" /> Home Country *</label>
                <select value={formData.homeCountry} onChange={(e) => handleInputChange('homeCountry', e.target.value)} className={selectCls}>
                  <option value="US">United States</option>
                  <option value="UG">Uganda</option>
                  <option value="KE">Kenya</option>
                  <option value="TZ">Tanzania</option>
                  <option value="RW">Rwanda</option>
                  <option value="ZA">South Africa</option>
                  <option value="NG">Nigeria</option>
                  <option value="GH">Ghana</option>
                  <option value="GB">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="IN">India</option>
                </select>
              </div>
              <div>
                <label className={labelCls}><Globe className="inline w-4 h-4 mr-1" /> Base Currency *</label>
                <select value={formData.baseCurrency} onChange={(e) => handleInputChange('baseCurrency', e.target.value)} className={selectCls}>
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>{c.code} - {c.name} ({c.symbol})</option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-slate-500">This will be your default currency for all transactions</p>
              </div>
              <div>
                <label className={labelCls}><Calendar className="inline w-4 h-4 mr-1" /> Fiscal Year Start Month *</label>
                <select value={formData.fiscalYearStart} onChange={(e) => handleInputChange('fiscalYearStart', parseInt(e.target.value))} className={selectCls}>
                  {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <p className="mt-1 text-sm text-slate-500">When does your financial year begin?</p>
              </div>
            </div>
          )}

          {/* Step 2: Business Type */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">What Type of Business Do You Run?</h2>
                <p className="text-slate-400">We&apos;ll customize your modules and set up your Chart of Accounts automatically</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'CONSULTING', name: 'Professional Services', description: 'Sell expertise and time-based services', icon: '👔', examples: ['Consulting', 'Legal', 'Accounting', 'Marketing'] },
                  { id: 'FREELANCE', name: 'Freelance/Creative', description: 'Individual services and creative work', icon: '🎨', examples: ['Design', 'Writing', 'Photography', 'Development'] },
                  { id: 'RETAIL', name: 'Retail Business', description: 'Sell physical products to customers', icon: '🛍️', examples: ['Online store', 'Boutique', 'Electronics', 'Fashion'] },
                  { id: 'MANUFACTURER', name: 'Manufacturing', description: 'Make and sell products', icon: '🏭', examples: ['Factory', 'Workshop', 'Food production', 'Assembly'] },
                  { id: 'MIXED_BUSINESS', name: 'Products + Services', description: 'Sell both products AND provide services', icon: '🔧', examples: ['Construction', 'Auto repair', 'IT + Hardware', 'Restaurant'] },
                  { id: 'FULL_FEATURED', name: 'Enterprise', description: 'Access all features for large-scale operations', icon: '🚀', examples: ['Large business', 'Conglomerate', 'All modules', 'Full access'] },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleInputChange('businessModel', type.id)}
                    className={`p-6 border-2 rounded-lg text-left transition-all ${
                      formData.businessModel === type.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 hover:border-slate-500 bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="text-3xl">{type.icon}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-white">{type.name}</div>
                        <div className="text-sm text-slate-400 mt-1">{type.description}</div>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {type.examples.map((ex) => (
                            <span key={ex} className="inline-block bg-slate-700/50 text-slate-300 text-xs px-2 py-1 rounded">{ex}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Bank Account */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Initial Bank Account</h2>
                <p className="text-slate-400">Set up your primary bank account</p>
              </div>
              <div>
                <label className={labelCls}><Building2 className="inline w-4 h-4 mr-1" /> Bank Name *</label>
                <input type="text" value={formData.bankName} onChange={(e) => handleInputChange('bankName', e.target.value)} className={inputCls} placeholder="e.g., Bank of America" />
              </div>
              <div>
                <label className={labelCls}>Account Number *</label>
                <input type="text" value={formData.accountNumber} onChange={(e) => handleInputChange('accountNumber', e.target.value)} className={inputCls} placeholder="Enter account number" />
              </div>
              <div>
                <label className={labelCls}><DollarSign className="inline w-4 h-4 mr-1" /> Opening Balance *</label>
                <input type="number" step="0.01" value={formData.openingBalance} onChange={(e) => handleInputChange('openingBalance', parseFloat(e.target.value) || 0)} className={inputCls} placeholder="0.00" />
                <p className="mt-1 text-sm text-slate-500">Enter your current bank balance ({formData.baseCurrency})</p>
              </div>
            </div>
          )}

          {/* Step 4: Choose Plan */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Choose Your Plan</h2>
                <p className="text-slate-400">All plans include every feature — pick a billing cycle that suits you</p>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Monthly */}
                <button
                  type="button"
                  onClick={() => handleInputChange('billingCycle', 'monthly')}
                  className={`relative p-6 border-2 rounded-xl text-left transition-all ${
                    formData.billingCycle === 'monthly'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 hover:border-slate-500 bg-slate-800/30'
                  }`}
                >
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-white mb-1">Monthly</h3>
                    <p className="text-sm text-slate-400 mb-4">Pay as you go, cancel anytime</p>
                    <div className="mb-4">
                      <span className="text-4xl font-extrabold text-white">${MONTHLY_PRICE}</span>
                      <span className="text-slate-400 ml-1">/month</span>
                    </div>
                    <div className="text-xs text-slate-500">${MONTHLY_PRICE * 12}/year if paid monthly</div>
                  </div>
                </button>

                {/* Annual */}
                <button
                  type="button"
                  onClick={() => handleInputChange('billingCycle', 'annual')}
                  className={`relative p-6 border-2 rounded-xl text-left transition-all ${
                    formData.billingCycle === 'annual'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 hover:border-slate-500 bg-slate-800/30'
                  }`}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full">
                    Save ${MONTHLY_PRICE * 12 - ANNUAL_PRICE}/year
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-white mb-1">Annual</h3>
                    <p className="text-sm text-slate-400 mb-4">{FREE_MONTHS} months FREE</p>
                    <div className="mb-2">
                      <span className="text-4xl font-extrabold text-white">${ANNUAL_PRICE}</span>
                      <span className="text-slate-400 ml-1">/year</span>
                    </div>
                    <div className="text-xs text-slate-500">That&apos;s only ${ANNUAL_MONTHLY}/month</div>
                    <div className="mt-2 flex items-center justify-center gap-1">
                      <span className="line-through text-slate-500 text-sm">${MONTHLY_PRICE * 12}</span>
                    </div>
                  </div>
                </button>
              </div>

              {/* Trial badge */}
              <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-400/20 rounded-xl">
                <Shield className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-400">7-day free trial included</p>
                  <p className="text-xs text-slate-400">You won&apos;t be charged until your trial ends. Cancel anytime during the trial.</p>
                </div>
              </div>

              {/* What's included */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Everything included:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {['Unlimited users', 'All 9+ modules', 'Multi-currency', 'Financial reports', 'Manufacturing & inventory', 'Priority support'].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-slate-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Payment Method */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Payment Method</h2>
                <p className="text-slate-400">
                  Selected plan: <span className="text-blue-400 font-medium">{formData.billingCycle === 'annual' ? 'Annual' : 'Monthly'} — {formData.billingCycle === 'annual' ? `$${ANNUAL_PRICE}/year` : `$${MONTHLY_PRICE}/month`}</span>
                </p>
              </div>

              {/* Method selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Flutterwave */}
                <button
                  type="button"
                  onClick={() => handleInputChange('paymentMethod', 'flutterwave')}
                  className={`relative p-5 border-2 rounded-xl text-center transition-all ${
                    formData.paymentMethod === 'flutterwave'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 hover:border-slate-500 bg-slate-800/30'
                  }`}
                >
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full whitespace-nowrap">
                    Recommended
                  </div>
                  <Zap className="w-8 h-8 mx-auto mb-2 text-orange-400" />
                  <div className="font-medium text-white text-sm">Flutterwave</div>
                  <div className="text-xs text-slate-400 mt-1">Cards, bank, USSD &mdash; instant</div>
                </button>

                {/* Mobile Money */}
                <button
                  type="button"
                  onClick={() => handleInputChange('paymentMethod', 'mobile_money')}
                  className={`relative p-5 border-2 rounded-xl text-center transition-all ${
                    formData.paymentMethod === 'mobile_money'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 hover:border-slate-500 bg-slate-800/30'
                  }`}
                >
                  <Smartphone className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                  <div className="font-medium text-white text-sm">Mobile Money</div>
                  <div className="text-xs text-slate-400 mt-1">MTN, Airtel, M-Pesa</div>
                </button>
              </div>

              {/* Flutterwave info */}
              {formData.paymentMethod === 'flutterwave' && (
                <div className="space-y-4 p-5 bg-slate-900/50 rounded-xl border border-slate-700/50">
                  <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-400" /> Flutterwave Checkout
                  </h4>
                  <div className="flex flex-wrap gap-3 items-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-300"><CreditCard className="w-3.5 h-3.5" /> Visa / Mastercard</span>
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-300">Bank Transfer</span>
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-300">USSD</span>
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-300">Mobile Money</span>
                  </div>
                  <p className="text-sm text-slate-400">You&apos;ll be redirected to Flutterwave&apos;s secure checkout to complete payment. Supports cards, bank transfers, USSD and mobile money across Africa.</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    PCI-DSS compliant. Your payment details are never stored on our servers.
                  </div>
                </div>
              )}

              {/* Mobile Money form */}
              {formData.paymentMethod === 'mobile_money' && (
                <div className="space-y-4 p-5 bg-slate-900/50 rounded-xl border border-slate-700/50">
                  <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Smartphone className="w-4 h-4" /> Mobile Money
                  </h4>
                  <div>
                    <label className={labelCls}>Provider</label>
                    <select value={formData.mobileProvider} onChange={(e) => handleInputChange('mobileProvider', e.target.value)} className={selectCls}>
                      <option value="">Select provider...</option>
                      <option value="MTN">MTN Mobile Money</option>
                      <option value="AIRTEL">Airtel Money</option>
                      <option value="MPESA">M-Pesa</option>
                      <option value="TIGO">Tigo Pesa</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Phone Number</label>
                    <input type="tel" value={formData.mobileNumber} onChange={(e) => handleInputChange('mobileNumber', e.target.value)} className={inputCls} placeholder="+256 700 123 456" />
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-400/20 rounded-lg">
                    <p className="text-xs text-amber-400">
                      A payment prompt will be sent to your phone. After confirmation, your account will be activated within minutes by our admin team.
                    </p>
                  </div>
                </div>
              )}

              {/* 7-day trial reminder */}
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-400/20 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-400">7-day free trial starts now</p>
                  <p className="text-xs text-slate-400">
                    {formData.paymentMethod === 'flutterwave'
                      ? "You'll be redirected to Flutterwave after clicking below. Charged after the 7-day trial."
                      : "You'll get full access during the trial while we process your payment."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-700">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
              className="px-6 py-3 text-slate-400 font-medium rounded-lg hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center transition"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  {currentStep === TOTAL_STEPS
                    ? (formData.paymentMethod === 'flutterwave' ? 'Pay with Flutterwave' : 'Submit & Start Trial')
                    : currentStep === 4 ? 'Continue to Payment' : 'Next'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
