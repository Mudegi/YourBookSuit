'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  RefreshCw, 
  Package, 
  TrendingDown, 
  TrendingUp, 
  Plus, 
  Filter,
  Settings,
  Users,
  AlertTriangle,
  CheckCircle,
  Globe,
  Calculator,
  Layers
} from 'lucide-react';

interface ReorderPolicy {
  id: string;
  product: { 
    name: string; 
    sku: string;
    unitCost: number;
    unit: string;
    category?: string;
  };
  warehouse?: { name: string };
  strategy: string;
  reorderPoint: number;
  reorderQuantity: number;
  minQuantity?: number;
  maxQuantity?: number;
  leadTimeDays: number;
  isActive: boolean;
  formattedValues?: {
    reorderPoint: string;
    unitCost: string;
    minQuantity: string;
    maxQuantity: string;
  };
  localization?: {
    currency: string;
    country: string;
    formattedQuantity: string;
  };
  enterprise?: {
    nextReviewDate: string;
    strategySuitability: string;
    complianceStatus: string;
  };
  currentRecommendation?: {
    strategy: string;
    recommendedOrderQty: number;
    urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reasoning: string;
    financialImpact: {
      orderValue: number;
      formattedOrderValue: string;
    };
  };
}

interface PolicyAnalytics {
  summary: {
    totalPolicies: number;
    activePolicies: number;
    avgLeadTime: number;
    totalValue: number;
    currency: string;
  };
  performance: {
    efficiencyScore: number;
    coverageRate: number;
    complianceRate: number;
  };
}

interface BulkOperationDialog {
  open: boolean;
  operation: 'assign' | 'activate' | 'deactivate';
}

export default function PlanningRulesEnginePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const [policies, setPolicies] = useState<ReorderPolicy[]>([]);
  const [analytics, setAnalytics] = useState<PolicyAnalytics | null>(null);
  const [availableStrategies, setAvailableStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    category: '',
    strategy: 'all-strategies',
    status: 'all',
    warehouse: '',
  });
  const [bulkDialog, setBulkDialog] = useState<BulkOperationDialog>({
    open: false,
    operation: 'assign'
  });
  const [includeCalculations, setIncludeCalculations] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  useEffect(() => {
    fetchPolicies();
  }, [orgSlug, includeCalculations]);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (includeCalculations) queryParams.set('includeCalculations', 'true');
      if (filters.category) queryParams.set('category', filters.category);
      if (filters.strategy && filters.strategy !== 'all-strategies') queryParams.set('policyType', filters.strategy);
      if (filters.status !== 'all') queryParams.set('isActive', filters.status === 'active' ? 'true' : 'false');

      const response = await fetch(`/api/${orgSlug}/planning/reorder-policies?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setPolicies(data.data || []);
        setAnalytics(data.analytics);
        setAvailableStrategies(data.metadata?.availableStrategies || []);
      }
    } catch (error) {
      console.error('Error fetching reorder policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkOperation = async (operation: string, selectedIds: string[]) => {
    try {
      const response = await fetch(`/api/${orgSlug}/planning/reorder-policies`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation,
          policies: selectedIds.map(id => ({ id }))
        })
      });

      if (response.ok) {
        await fetchPolicies(); // Refresh data
        setSelectedPolicies([]);
        setBulkDialog({ open: false, operation: 'assign' });
      }
    } catch (error) {
      console.error('Bulk operation failed:', error);
    }
  };

  const handleSelectPolicy = (policyId: string, checked: boolean) => {
    if (checked) {
      setSelectedPolicies(prev => [...prev, policyId]);
    } else {
      setSelectedPolicies(prev => prev.filter(id => id !== policyId));
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return 'text-red-600 bg-red-50';
      case 'HIGH': return 'text-orange-600 bg-orange-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  const filteredPolicies = policies.filter(policy => {
    if (filters.category && !policy.product.category?.toLowerCase().includes(filters.category.toLowerCase())) {
      return false;
    }
    if (filters.strategy && filters.strategy !== 'all-strategies' && policy.strategy !== filters.strategy) {
      return false;
    }
    if (filters.status === 'active' && !policy.isActive) return false;
    if (filters.status === 'inactive' && policy.isActive) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-gray-500">Loading Planning Rules Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header with Enterprise Branding */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3">
            <Layers className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Planning Rules Engine</h1>
              <p className="text-gray-500">Enterprise reorder policies with strategy-based automation</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Localization Indicator */}
          {analytics && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {analytics.summary.currency}
            </Badge>
          )}
          
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
            >
              Cards
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Table
            </Button>
          </div>

          {/* Calculations Toggle */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={includeCalculations}
              onCheckedChange={setIncludeCalculations}
            />
            <label className="text-sm font-medium">Live Calculations</label>
          </div>

          <Button
            onClick={() => router.push(`/${orgSlug}/planning/reorder-policies/new`)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Policy
          </Button>
        </div>
      </div>

      {/* Advanced Analytics Dashboard */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <Card className="p-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Policies</p>
                <p className="text-3xl font-bold">{analytics.summary.totalPolicies}</p>
                <p className="text-xs text-gray-400">
                  {analytics.summary.activePolicies} active
                </p>
              </div>
              <Package className="h-10 w-10 text-blue-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Efficiency</p>
                <p className="text-2xl font-bold">{Math.round(analytics.performance.efficiencyScore)}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Coverage</p>
                <p className="text-2xl font-bold">{Math.round(analytics.performance.coverageRate)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Compliance</p>
                <p className="text-2xl font-bold">{Math.round(analytics.performance.complianceRate)}%</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-lg font-bold">{analytics.summary.totalValue.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{analytics.summary.currency}</p>
              </div>
              <Calculator className="h-8 w-8 text-indigo-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Advanced Filters and Bulk Operations */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Filter by category..."
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-48"
            />
            
            <Select value={filters.strategy} onValueChange={(value) => setFilters(prev => ({ ...prev, strategy: value === 'all-strategies' ? '' : value }))}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-strategies">All Strategies</SelectItem>
                {availableStrategies.map(strategy => (
                  <SelectItem key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={fetchPolicies}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            
            {selectedPolicies.length > 0 && (
              <Button
                onClick={() => setBulkDialog({ open: true, operation: 'assign' })}
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Bulk ({selectedPolicies.length})
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Policy Display */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPolicies.length === 0 ? (
            <div className="col-span-full">
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Package className="h-16 w-16 text-gray-300" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">No Planning Rules Found</h3>
                    <p className="text-gray-500 mt-2">Create your first enterprise reorder policy to get started.</p>
                  </div>
                  <Button onClick={() => router.push(`/${orgSlug}/planning/reorder-policies/new`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Policy
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            filteredPolicies.map((policy) => (
              <Card key={policy.id} className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox 
                        checked={selectedPolicies.includes(policy.id)}
                        onCheckedChange={(checked) => handleSelectPolicy(policy.id, checked)}
                      />
                      <h3 className="font-semibold text-gray-900">{policy.product.name}</h3>
                    </div>
                    <p className="text-sm text-gray-500">{policy.product.sku}</p>
                    <Badge variant="outline" className="text-xs mt-2">
                      {policy.strategy || 'FIXED_QTY'}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge 
                      variant={policy.isActive ? 'default' : 'secondary'}
                      className={policy.isActive ? 'bg-green-500' : ''}
                    >
                      {policy.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {policy.currentRecommendation && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getUrgencyColor(policy.currentRecommendation.urgencyLevel)}`}
                      >
                        {policy.currentRecommendation.urgencyLevel}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-gray-500">Reorder Point</p>
                    <p className="font-semibold">{policy.formattedValues?.reorderPoint || policy.reorderPoint}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Lead Time</p>
                    <p className="font-semibold">{policy.leadTimeDays} days</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Unit Cost</p>
                    <p className="font-semibold">{policy.formattedValues?.unitCost || policy.product.unitCost}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Currency</p>
                    <p className="font-semibold flex items-center gap-1">
                      {policy.localization?.currency || 'USD'}
                      <Globe className="h-3 w-3 text-blue-500" />
                    </p>
                  </div>
                </div>

                {policy.currentRecommendation && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Live Calculation</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{policy.currentRecommendation.reasoning}</p>
                    <div className="flex justify-between text-sm">
                      <span>Recommended Qty:</span>
                      <span className="font-semibold">{policy.currentRecommendation.recommendedOrderQty}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Order Value:</span>
                      <span className="font-semibold">{policy.currentRecommendation.financialImpact.formattedOrderValue}</span>
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/${orgSlug}/planning/reorder-policies/${policy.product.id}`)}
                  className="w-full mt-4"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <Checkbox 
                      checked={selectedPolicies.length === filteredPolicies.length && filteredPolicies.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPolicies(filteredPolicies.map(p => p.id));
                        } else {
                          setSelectedPolicies([]);
                        }
                      }}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strategy</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder Point</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPolicies.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No policies match your current filters.
                    </td>
                  </tr>
                ) : (
                  filteredPolicies.map((policy) => (
                    <tr key={policy.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <Checkbox 
                          checked={selectedPolicies.includes(policy.id)}
                          onCheckedChange={(checked) => handleSelectPolicy(policy.id, checked)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{policy.product.name}</div>
                          <div className="text-sm text-gray-500">{policy.product.sku}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{policy.strategy || 'FIXED_QTY'}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {policy.formattedValues?.reorderPoint || policy.reorderPoint}
                      </td>
                      <td className="px-6 py-4 text-sm">{policy.leadTimeDays} days</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-1">
                          {policy.localization?.currency || 'USD'}
                          <Globe className="h-3 w-3 text-blue-500" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={policy.isActive ? 'default' : 'secondary'}>
                          {policy.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/${orgSlug}/planning/reorder-policies/${policy.product.id}`)}
                        >
                          Configure
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Bulk Operations Modal */}
      <Modal
        isOpen={bulkDialog.open}
        onClose={() => setBulkDialog({ open: false, operation: 'assign' })}
        title="Bulk Policy Operations"
        description={`Apply operations to ${selectedPolicies.length} selected policies`}
        size="md"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">
              {selectedPolicies.length} policies selected for bulk operation
            </p>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => handleBulkOperation('activate', selectedPolicies)}
              className="flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Activate All Selected Policies
            </Button>
            <Button
              variant="outline"
              onClick={() => handleBulkOperation('deactivate', selectedPolicies)}
              className="flex items-center justify-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Deactivate All Selected Policies
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
