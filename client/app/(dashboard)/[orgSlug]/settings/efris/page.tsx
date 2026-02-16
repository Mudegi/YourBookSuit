'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, TestTube } from 'lucide-react';
import Link from 'next/link';

interface EfrisConfig {
  id?: string;
  provider: string;
  apiEndpoint: string;
  efrisApiKey: string;
  efrisApiSecret?: string;
  efrisDeviceNo?: string;
  efrisTIN?: string;
  efrisTestMode: boolean;
  isActive: boolean;
}

export default function EfrisSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [formData, setFormData] = useState<EfrisConfig>({
    provider: 'EFRIS',
    apiEndpoint: 'https://efrisintegration.nafacademy.com/api/external/efris',
    efrisApiKey: '',
    efrisApiSecret: '',
    efrisDeviceNo: '',
    efrisTIN: '',
    efrisTestMode: true,
    isActive: false,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/settings/efris`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setFormData({
            ...data.config,
            efrisApiSecret: '', // Don't show secret
          });
        }
      }
    } catch (error) {
      console.error('Error fetching EFRIS config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/settings/efris`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ EFRIS configuration saved successfully!');
        fetchConfig();
      } else {
        alert(`❌ Failed to save: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving EFRIS config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.apiEndpoint || !formData.efrisApiKey) {
      setTestResult({
        success: false,
        message: 'Please enter API endpoint and API key before testing',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/settings/efris/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiEndpoint: formData.apiEndpoint,
          apiKey: formData.efrisApiKey,
        }),
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading EFRIS settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Link
          href={`/${orgSlug}/settings/integrations`}
          className="p-2 hover:bg-gray-100 rounded-lg mr-4"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">EFRIS Integration</h1>
          <p className="text-gray-600 mt-1">
            Configure Electronic Fiscal Receipting and Invoicing Solution (EFRIS) for Uganda
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              About EFRIS Integration
            </h3>
            <p className="text-sm text-blue-800">
              EFRIS is required for businesses in Uganda to fiscalize invoices with the Uganda Revenue Authority (URA).
              This integration allows you to submit invoices directly to EFRIS and receive Fiscal Document Numbers (FDN).
            </p>
            <p className="text-sm text-blue-800 mt-2">
              <strong>Note:</strong> You need an API key from your EFRIS backend administrator. 
              Contact your system administrator if you don't have these credentials.
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <label className="text-base font-semibold text-gray-900">Enable EFRIS Integration</label>
            <p className="text-sm text-gray-600 mt-1">
              Activate EFRIS fiscalization for invoices
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* API Configuration */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Endpoint <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                required
                value={formData.apiEndpoint}
                onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                placeholder="http://server-ip:8001/api/external/efris"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                The URL of your EFRIS backend API server
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.efrisApiKey}
                onChange={(e) => setFormData({ ...formData, efrisApiKey: e.target.value })}
                placeholder="your-api-key-here"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your unique API key provided by the backend administrator
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Secret (Optional)
              </label>
              <input
                type="password"
                value={formData.efrisApiSecret}
                onChange={(e) => setFormData({ ...formData, efrisApiSecret: e.target.value })}
                placeholder="Leave empty to keep existing secret"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax Identification Number (TIN)
              </label>
              <input
                type="text"
                value={formData.efrisTIN}
                onChange={(e) => setFormData({ ...formData, efrisTIN: e.target.value })}
                placeholder="1234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                EFRIS Device Number
              </label>
              <input
                type="text"
                value={formData.efrisDeviceNo}
                onChange={(e) => setFormData({ ...formData, efrisDeviceNo: e.target.value })}
                placeholder="Device-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Test Mode */}
        <div className="flex items-center space-x-3 pt-4 border-t">
          <input
            type="checkbox"
            id="testMode"
            checked={formData.efrisTestMode}
            onChange={(e) => setFormData({ ...formData, efrisTestMode: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="testMode" className="text-sm text-gray-700">
            <span className="font-medium">Test Mode</span> - Use EFRIS test environment instead of production
          </label>
        </div>

        {/* Test Connection Button */}
        <div className="pt-4 border-t">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !formData.apiEndpoint || !formData.efrisApiKey}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          {testResult && (
            <div className={`mt-4 p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                )}
                <p className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {testResult.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t">
          <Link
            href={`/${orgSlug}/settings/integrations`}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>

      {/* Documentation */}
      <div className="bg-gray-50 rounded-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p>• Contact your backend administrator to get your API key</p>
          <p>• The backend server must be running on the configured endpoint</p>
          <p>• Test mode allows you to test the integration without affecting production data</p>
          <p>• Once configured, you can submit invoices to EFRIS from the invoice detail page</p>
        </div>
      </div>
    </div>
  );
}
