'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Server, Save, Loader2, ShieldCheck } from 'lucide-react';

interface EInvoiceConfig {
  id?: string;
  country: string;
  provider: string;
  apiEndpoint: string;
  credentials: any;
  certificatePath?: string;
  isActive: boolean;
}

const defaults: EInvoiceConfig = {
  country: '',
  provider: '',
  apiEndpoint: '',
  credentials: {},
  certificatePath: '',
  isActive: true,
};

export default function EInvoicingPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [config, setConfig] = useState<EInvoiceConfig>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${orgSlug}/tax/e-invoicing/config`);
      if (res.ok) {
        const json = await res.json();
        setConfig(json.data ? { ...defaults, ...json.data } : defaults);
      }
    } catch (err) {
      console.error('Failed to load e-invoicing config', err);
      setConfig(defaults);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const body = {
        ...config,
        credentials: parseJsonSafe(config.credentials),
      };
      const res = await fetch(`/api/${orgSlug}/tax/e-invoicing/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await fetchConfig();
      }
    } catch (err) {
      console.error('Failed to save e-invoicing config', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-500">
        Loading e-invoicing...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">E-Invoicing</h1>
          <p className="text-gray-500">Configure Peppol/SAF-T/e-invoicing endpoints and credentials</p>
        </div>
        <Button onClick={saveConfig} className="flex items-center gap-2" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Server className="h-5 w-5 text-blue-500" />
            <p className="text-sm text-gray-700">Connection</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Country</p>
              <Input value={config.country} onChange={(e) => setConfig({ ...config, country: e.target.value })} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Provider</p>
              <Input value={config.provider} onChange={(e) => setConfig({ ...config, provider: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-gray-500 mb-1">API Endpoint</p>
              <Input
                value={config.apiEndpoint}
                onChange={(e) => setConfig({ ...config, apiEndpoint: e.target.value })}
                placeholder="https://api.peppol-gateway.example"
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Certificate Path (optional)</p>
              <Input
                value={config.certificatePath || ''}
                onChange={(e) => setConfig({ ...config, certificatePath: e.target.value })}
                placeholder="/certs/einvoice.pem"
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <Select
                value={config.isActive ? 'true' : 'false'}
                onChange={(e) => setConfig({ ...config, isActive: e.target.value === 'true' })}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            <p className="text-sm text-gray-700">Credentials (JSON)</p>
          </div>
          <textarea
            className="w-full border rounded-lg p-2 text-sm min-h-[220px]"
            value={config.credentials ? JSON.stringify(config.credentials, null, 2) : ''}
            onChange={(e) => setConfig({ ...config, credentials: e.target.value })}
            placeholder='{ "clientId": "...", "secret": "...", "subscriptionKey": "..." }'
          />
        </Card>
      </div>
    </div>
  );
}

function parseJsonSafe(value: any) {
  if (value === null || value === undefined || value === '') return {};
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    console.warn('Invalid JSON credentials, saving raw string');
    return value;
  }
}
