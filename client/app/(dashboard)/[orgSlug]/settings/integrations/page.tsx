'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Plug, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';

interface Integration {
  id: string;
  name: string;
  type: string;
  provider: string;
  status: string;
  isActive: boolean;
  lastSyncAt: string | null;
  syncFrequency: string | null;
  errorCount: number;
  lastError: string | null;
  _count: {
    webhooks: number;
    syncLogs: number;
  };
  createdAt: string;
}

const integrationTypeLabels: Record<string, string> = {
  PAYMENT_GATEWAY: 'Payment Gateway',
  BANKING: 'Banking',
  ACCOUNTING: 'Accounting Software',
  E_COMMERCE: 'E-commerce',
  CRM: 'CRM',
  INVENTORY: 'Inventory Management',
  PAYROLL: 'Payroll',
  TAX_FILING: 'Tax Filing',
  REPORTING: 'Reporting',
  CUSTOM_API: 'Custom API',
  WEBHOOK: 'Webhook',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  ERROR: 'bg-red-100 text-red-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  SUSPENDED: 'bg-orange-100 text-orange-800',
};

const statusIcons: Record<string, any> = {
  ACTIVE: CheckCircle,
  INACTIVE: XCircle,
  ERROR: AlertCircle,
  PENDING: Clock,
  SUSPENDED: AlertCircle,
};

export default function IntegrationsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/${orgSlug}/integrations`);
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data);
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (integrationId: string) => {
    try {
      setSyncingId(integrationId);
      const response = await fetch(
        `/api/${orgSlug}/integrations/${integrationId}/sync`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        // Refresh integrations list
        fetchIntegrations();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to trigger sync');
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
      alert('Failed to trigger sync');
    } finally {
      setSyncingId(null);
    }
  };

  const formatLastSync = (lastSyncAt: string | null) => {
    if (!lastSyncAt) return 'Never';
    
    const date = new Date(lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const activeCount = integrations.filter((i) => i.status === 'ACTIVE').length;
  const errorCount = integrations.filter((i) => i.status === 'ERROR').length;
  const totalWebhooks = integrations.reduce((sum, i) => sum + i._count.webhooks, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-gray-600 mt-1">
            Connect with third-party services and APIs
          </p>
        </div>
        <Link href={`/${orgSlug}/settings/integrations/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Integration
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Integrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{integrations.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Integrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{errorCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalWebhooks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading integrations...</p>
        </div>
      ) : integrations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Plug className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No integrations yet</h3>
            <p className="text-gray-600 mb-4">
              Connect your business with payment gateways, accounting software, and more
            </p>
            <Link href={`/${orgSlug}/settings/integrations/new`}>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add First Integration
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {integrations.map((integration) => {
            const StatusIcon = statusIcons[integration.status] || Plug;
            const isSyncing = syncingId === integration.id;

            return (
              <Card key={integration.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Plug className="w-6 h-6 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{integration.name}</CardTitle>
                          <Badge className={statusColors[integration.status]}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {integration.status}
                          </Badge>
                          {!integration.isActive && (
                            <Badge variant="outline">Disabled</Badge>
                          )}
                        </div>
                        <CardDescription>
                          <div className="flex items-center gap-4 mt-1">
                            <span>
                              {integrationTypeLabels[integration.type] || integration.type}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span>Provider: {integration.provider}</span>
                            {integration.syncFrequency && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span>Sync: {integration.syncFrequency}</span>
                              </>
                            )}
                          </div>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {integration.status === 'ACTIVE' && integration.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSync(integration.id)}
                          disabled={isSyncing}
                        >
                          <RefreshCw
                            className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`}
                          />
                          {isSyncing ? 'Syncing...' : 'Sync Now'}
                        </Button>
                      )}
                      <Link href={`/${orgSlug}/settings/integrations/${integration.id}`}>
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600 mb-1">Last Sync</div>
                      <div className="font-medium">
                        {formatLastSync(integration.lastSyncAt)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 mb-1">Webhooks</div>
                      <div className="font-medium">{integration._count.webhooks}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 mb-1">Sync Logs</div>
                      <div className="font-medium">{integration._count.syncLogs}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 mb-1">Error Count</div>
                      <div
                        className={`font-medium ${
                          integration.errorCount > 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {integration.errorCount}
                      </div>
                    </div>
                  </div>

                  {integration.lastError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-red-900 mb-1">
                            Last Error
                          </div>
                          <div className="text-sm text-red-700">
                            {integration.lastError}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Popular Integrations */}
      {integrations.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Popular Integrations</CardTitle>
            <CardDescription>Connect with these popular services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  name: 'Stripe',
                  type: 'Payment Gateway',
                  description: 'Accept online payments',
                },
                {
                  name: 'QuickBooks',
                  type: 'Accounting',
                  description: 'Sync with QuickBooks Online',
                },
                {
                  name: 'PayPal',
                  type: 'Payment Gateway',
                  description: 'Process PayPal payments',
                },
                {
                  name: 'Shopify',
                  type: 'E-commerce',
                  description: 'Connect your online store',
                },
                {
                  name: 'Xero',
                  type: 'Accounting',
                  description: 'Sync with Xero accounting',
                },
                {
                  name: 'Square',
                  type: 'Payment Gateway',
                  description: 'Accept Square payments',
                },
              ].map((service) => (
                <div
                  key={service.name}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <h3 className="font-semibold mb-1">{service.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{service.type}</p>
                  <p className="text-xs text-gray-500">{service.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
