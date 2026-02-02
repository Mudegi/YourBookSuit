'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Globe, Calendar, Briefcase, DollarSign, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetch-client';

interface OnboardingData {
  // Step 1
  companyName: string;
  legalName: string;
  homeCountry: string;
  baseCurrency: string;
  fiscalYearStart: number;
  
  // Step 2
  businessModel: string;
  
  // Step 3
  industry: string;
  
  // Step 4
  bankName: string;
  accountNumber: string;
  openingBalance: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  
  const [formData, setFormData] = useState<OnboardingData>({
    companyName: '',
    legalName: '',
    homeCountry: 'US',
    baseCurrency: 'USD',
    fiscalYearStart: 1,
    businessModel: '',
    industry: '',
    bankName: '',
    accountNumber: '',
    openingBalance: 0,
  });

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetchWithAuth('/api/auth/session');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      
      const data = await response.json();
      const org = data.data.organization;
      
      // Don't redirect if onboarding is "completed" - let user fix any issues
      // The dashboard will redirect them back here if requirements aren't met
      
      setOrgSlug(org.slug);
      setFormData(prev => ({
        ...prev,
        companyName: org.name || '',
        legalName: org.legalName || '',
        homeCountry: org.homeCountry || 'US',
        baseCurrency: org.baseCurrency || 'USD',
        fiscalYearStart: org.fiscalYearStart || 1,
        businessModel: org.businessModel || '',
        industry: org.industry || '',
      }));
    } catch (err) {
      console.error('Session check error:', err);
      router.push('/login');
    }
  };

  const handleInputChange = (field: keyof OnboardingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.companyName.trim()) {
          setError('Company name is required');
          return false;
        }
        if (!formData.baseCurrency) {
          setError('Currency is required');
          return false;
        }
        return true;
      case 2:
        if (!formData.businessModel) {
          setError('Please select a business type');
          return false;
        }
        return true;
      case 3:
        if (!formData.industry) {
          setError('Please select an industry');
          return false;
        }
        return true;
      case 4:
        if (!formData.bankName.trim()) {
          setError('Bank name is required');
          return false;
        }
        if (!formData.accountNumber.trim()) {
          setError('Account number is required');
          return false;
        }
        if (formData.openingBalance < 0) {
          setError('Opening balance cannot be negative');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep === 1) {
      // Save company details
      setLoading(true);
      try {
        const response = await fetchWithAuth('/api/onboarding/company-details', {
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

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to save company details');
        }

        setCurrentStep(2);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 2) {
      // Save business model
      setLoading(true);
      try {
        const response = await fetchWithAuth('/api/onboarding/business-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessModel: formData.businessModel,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to save business type');
        }

        setCurrentStep(3);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 3) {
      // Save industry and seed Chart of Accounts
      setLoading(true);
      try {
        console.log('Step 3: Seeding COA for industry:', formData.industry);
        
        const response = await fetchWithAuth('/api/onboarding/seed-coa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            industry: formData.industry,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to setup accounts');
        }

        const data = await response.json();
        console.log('COA seed response:', data);

        setCurrentStep(4);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 4) {
      // Save bank details and complete onboarding
      setLoading(true);
      try {
        // Ensure orgSlug is set
        if (!orgSlug) {
          throw new Error('Organization not found. Please refresh and try again.');
        }

        console.log('Checking COA for org:', orgSlug);
        
        // First verify COA exists before completing onboarding
        const coaCheckUrl = `/api/orgs/${orgSlug}/coa/generate?action=check`;
        console.log('COA check URL:', coaCheckUrl);
        
        const coaCheck = await fetchWithAuth(coaCheckUrl);
        const coaData = await coaCheck.json();
        
        console.log('COA check response:', coaData);
        
        // canGenerate: false means COA exists (inverted logic)
        // canGenerate: true means COA doesn't exist yet
        if (coaData.data?.canGenerate !== false) {
          throw new Error(`Chart of Accounts not found. Please go back to Step 2 and select an industry. ${coaData.data?.reason || ''}`);
        }

        console.log('COA exists, proceeding with completion');

        const response = await fetchWithAuth('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            openingBalance: formData.openingBalance,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to complete onboarding');
        }

        const data = await response.json();
        console.log('Onboarding completed:', data);

        // Force redirect to dashboard
        window.location.href = `/${orgSlug}/dashboard`;
      } catch (err: any) {
        console.error('Onboarding error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const industries = [
    { value: 'retail', label: 'Retail & E-commerce', icon: '🛍️' },
    { value: 'manufacturing', label: 'Manufacturing', icon: '🏭' },
    { value: 'services', label: 'Professional Services', icon: '💼' },
    { value: 'hospitality', label: 'Hospitality & Tourism', icon: '🏨' },
    { value: 'healthcare', label: 'Healthcare', icon: '🏥' },
    { value: 'construction', label: 'Construction', icon: '🏗️' },
    { value: 'technology', label: 'Technology', icon: '💻' },
    { value: 'education', label: 'Education', icon: '🎓' },
    { value: 'nonprofit', label: 'Non-Profit', icon: '❤️' },
    { value: 'other', label: 'Other', icon: '📊' },
  ];

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  ];

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">Y</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to YourBooks!</h1>
          <p className="text-gray-600">Let's get your accounting system set up in just 4 simple steps</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                    step < currentStep
                      ? 'bg-green-500 text-white'
                      : step === currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step < currentStep ? <CheckCircle2 className="w-6 h-6" /> : step}
                </div>
                {step < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm">
            <span className={currentStep >= 1 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
              Company Details
            </span>
            <span className={currentStep >= 2 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
              Business Type
            </span>
            <span className={currentStep >= 3 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
              Industry Setup
            </span>
            <span className={currentStep >= 4 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
              Bank Account
            </span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: Company Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Company Information</h2>
                <p className="text-gray-600">Tell us about your business</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="inline w-4 h-4 mr-1" />
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="inline w-4 h-4 mr-1" />
                  Legal Name
                </label>
                <input
                  type="text"
                  value={formData.legalName}
                  onChange={(e) => handleInputChange('legalName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Legal business name (leave blank to use company name)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Globe className="inline w-4 h-4 mr-1" />
                  Home Country *
                </label>
                <select
                  value={formData.homeCountry}
                  onChange={(e) => handleInputChange('homeCountry', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="US">United States</option>
                  <option value="UG">Uganda</option>
                  <option value="KE">Kenya</option>
                  <option value="TZ">Tanzania</option>
                  <option value="RW">Rwanda</option>
                  <option value="ZA">South Africa</option>
                  <option value="GB">United Kingdom</option>
                  <option value="CA">Canada</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Globe className="inline w-4 h-4 mr-1" />
                  Base Currency *
                </label>
                <select
                  value={formData.baseCurrency}
                  onChange={(e) => handleInputChange('baseCurrency', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name} ({currency.symbol})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  This will be your default currency for all transactions
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Fiscal Year Start Month *
                </label>
                <select
                  value={formData.fiscalYearStart}
                  onChange={(e) => handleInputChange('fiscalYearStart', parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  When does your financial year begin?
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Business Type Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">What Type of Business Do You Run?</h2>
                <p className="text-gray-600">
                  We'll customize your experience based on your business model
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    id: 'CONSULTING',
                    name: 'Professional Services',
                    description: 'Sell expertise and time-based services',
                    icon: '👔',
                    category: 'Service-Based',
                    examples: ['Consulting', 'Legal', 'Accounting', 'Marketing']
                  },
                  {
                    id: 'FREELANCE',
                    name: 'Freelance/Creative',
                    description: 'Individual services and creative work',
                    icon: '🎨',
                    category: 'Service-Based',
                    examples: ['Design', 'Writing', 'Photography', 'Development']
                  },
                  {
                    id: 'RETAIL',
                    name: 'Retail Business',
                    description: 'Sell physical products to customers',
                    icon: '🛍️',
                    category: 'Product-Based',
                    examples: ['Online store', 'Boutique', 'Electronics', 'Fashion']
                  },
                  {
                    id: 'MANUFACTURER',
                    name: 'Manufacturing',
                    description: 'Make and sell products',
                    icon: '🏭',
                    category: 'Product-Based',
                    examples: ['Factory', 'Workshop', 'Food production', 'Assembly']
                  },
                  {
                    id: 'MIXED_BUSINESS',
                    name: 'Products + Services',
                    description: 'Sell both products AND provide services',
                    icon: '🔧',
                    category: 'Mixed Business',
                    examples: ['Construction', 'Auto repair', 'IT + Hardware', 'Restaurant']
                  },
                  {
                    id: 'FULL_FEATURED',
                    name: 'Enterprise/Testing',
                    description: 'Access all features (perfect for testing)',
                    icon: '🚀',
                    category: 'Enterprise',
                    examples: ['Large business', 'Testing', 'All modules', 'Full access']
                  }
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleInputChange('businessModel', type.id)}
                    className={`p-6 border-2 rounded-lg text-left transition-all ${
                      formData.businessModel === type.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="text-3xl">{type.icon}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{type.name}</div>
                        <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-1">Examples:</p>
                          <div className="flex flex-wrap gap-1">
                            {type.examples.map((example) => (
                              <span 
                                key={example}
                                className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                              >
                                {example}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Industry Selection */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Industry</h2>
                <p className="text-gray-600">
                  We'll set up your Chart of Accounts based on your industry
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {industries.map((industry) => (
                  <button
                    key={industry.value}
                    type="button"
                    onClick={() => handleInputChange('industry', industry.value)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      formData.industry === industry.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">{industry.icon}</div>
                    <div className="font-medium text-gray-900">{industry.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Bank Account */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Initial Bank Account</h2>
                <p className="text-gray-600">Set up your primary bank account</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="inline w-4 h-4 mr-1" />
                  Bank Name *
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Bank of America"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number *
                </label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter account number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="inline w-4 h-4 mr-1" />
                  Opening Balance *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.openingBalance}
                  onChange={(e) => handleInputChange('openingBalance', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter your current bank balance ({formData.baseCurrency})
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
              className="px-6 py-3 text-gray-700 font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
                  {currentStep === 4 ? 'Complete Setup' : 'Next'}
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
