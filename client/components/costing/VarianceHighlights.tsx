/**
 * Variance Highlights Component
 */

'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Eye } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';

interface VarianceHighlight {
  productId: string;
  productName: string;
  productSku: string;
  standardCost: number;
  lastPurchasePrice?: number;
  actualCost?: number;
  variance: number;
  variancePercent: number;
  threshold: number;
  flagged: boolean;
  recommendation: string;
}

interface VarianceHighlightsProps {
  orgSlug: string;
  threshold?: number;
  onVarianceClick?: (variance: VarianceHighlight) => void;
}

export default function VarianceHighlights({ 
  orgSlug, 
  threshold = 10,
  onVarianceClick 
}: VarianceHighlightsProps) {
  const { currency: orgCurrency } = useOrganization();
  
  const [variances, setVariances] = useState<{
    critical: VarianceHighlight[];
    warning: VarianceHighlight[];
    normal: VarianceHighlight[];
    summary: any;
  }>({
    critical: [],
    warning: [],
    normal: [],
    summary: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVariances();
  }, [threshold]);

  const fetchVariances = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/${orgSlug}/costing/standard-costs/variance-analysis?threshold=${threshold}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch variances');
      }

      const data = await response.json();
      
      if (data.success) {
        // API returns variances nested under data.variances
        const varianceData = data.data.variances || {};
        setVariances({
          critical: varianceData.critical || [],
          warning: varianceData.warning || [],
          normal: varianceData.normal || [],
          summary: data.data.summary || {},
        });
      } else {
        throw new Error(data.error || 'Failed to analyze variances');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: orgCurrency || 'USD',
    }).format(amount);
  };

  const getVarianceIcon = (variance: number, percent: number) => {
    if (Math.abs(percent) > 20) {
      return variance > 0 ? 
        <TrendingUp className="w-4 h-4 text-red-600" /> : 
        <TrendingDown className="w-4 h-4 text-green-600" />;
    }
    if (Math.abs(percent) > threshold) {
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
    return <Eye className="w-4 h-4 text-gray-400" />;
  };

  const getVarianceColor = (percent: number) => {
    if (Math.abs(percent) > 20) {
      return percent > 0 ? 'text-red-600' : 'text-green-600';
    }
    if (Math.abs(percent) > threshold) {
      return 'text-yellow-600';
    }
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchVariances}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { critical, warning, normal, summary } = variances;
  const flaggedVariances = [...(critical || []), ...(warning || [])];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Variance Highlights</h3>
            <p className="text-sm text-gray-600 mt-1">
              Products with {threshold}%+ variance from last purchase price
            </p>
          </div>
          <button
            onClick={fetchVariances}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{summary.critical || 0}</div>
            <div className="text-xs text-gray-600">Critical (>20%)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{summary.warning || 0}</div>
            <div className="text-xs text-gray-600">Warning (>{threshold}%)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summary.normal || 0}</div>
            <div className="text-xs text-gray-600">Normal</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{summary.totalProducts || 0}</div>
            <div className="text-xs text-gray-600">Total Products</div>
          </div>
        </div>
      </div>

      {/* Flagged Variances List */}
      <div className="max-h-96 overflow-y-auto">
        {flaggedVariances.length > 0 ? (
          flaggedVariances.map((variance, index) => (
            <div
              key={`${variance.productId}-${index}`}
              className="px-6 py-4 border-b hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onVarianceClick?.(variance)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getVarianceIcon(variance.variance, variance.variancePercent)}
                    <span className="font-medium text-gray-900">
                      {variance.productName}
                    </span>
                    <span className="text-sm text-gray-500">({variance.productSku})</span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-4">
                      <span>Standard: {formatCurrency(variance.standardCost)}</span>
                      {variance.lastPurchasePrice && (
                        <span>Last Purchase: {formatCurrency(variance.lastPurchasePrice)}</span>
                      )}
                    </div>
                    <p className="text-xs italic">{variance.recommendation}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-lg font-semibold ${getVarianceColor(variance.variancePercent)}`}>
                    {variance.variance >= 0 ? '+' : ''}
                    {formatCurrency(variance.variance)}
                  </div>
                  <div className={`text-sm ${getVarianceColor(variance.variancePercent)}`}>
                    {variance.variancePercent >= 0 ? '+' : ''}
                    {variance.variancePercent.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            <Eye className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            <p>No significant variances found</p>
            <p className="text-sm mt-1">All costs are within {threshold}% threshold</p>
          </div>
        )}
      </div>

      {summary.averageVariance !== undefined && (
        <div className="px-6 py-3 bg-gray-50 border-t">
          <div className="text-sm text-gray-600">
            Average Variance: <span className="font-medium">{summary.averageVariance.toFixed(1)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}