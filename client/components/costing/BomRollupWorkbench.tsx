/**
 * BOM Roll-up Workbench Component
 */

'use client';

import { useState, useEffect } from 'react';
import { Calculator, Layers, AlertTriangle, CheckCircle, Download, RefreshCw } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';

interface BomRollupWorkbenchProps {
  productId: string;
  orgSlug: string;
  onRollupComplete?: (result: any) => void;
}

interface BomCostComponent {
  componentId: string;
  componentName: string;
  componentSku: string;
  quantityPer: number;
  unitCost: number;
  extendedCost: number;
  level: number;
  source: 'STANDARD_COST' | 'LAST_PURCHASE' | 'MANUAL' | 'DEFAULT';
}

interface RollupResult {
  productName: string;
  calculatedCosts: {
    materialCost: number;
    laborCost: number;
    overheadCost: number;
    totalCost: number;
  };
  localizedCosts?: {
    materialCost: number;
    laborCost: number;
    overheadCost: number;
    totalCost: number;
  };
  rollupDetails: BomCostComponent[];
  varianceAnalysis?: {
    currentStandardCost: number;
    calculatedCost: number;
    variance: number;
    variancePercent: number;
    recommendation: string;
  };
}

export default function BomRollupWorkbench({ 
  productId, 
  orgSlug, 
  onRollupComplete 
}: BomRollupWorkbenchProps) {
  const { currency: orgCurrency } = useOrganization();
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RollupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeLocalization, setIncludeLocalization] = useState(true);

  const performRollup = async (createStandardCost = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/${orgSlug}/costing/standard-costs/bom-rollup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          includeLocalization,
          createStandardCost,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to perform rollup');
      }

      const data = await response.json();
      
      if (data.success) {
        const rollupResult = data.data.rollupResult || data.data;
        setResult(rollupResult);
        onRollupComplete?.(rollupResult);
      } else {
        throw new Error(data.error || 'Rollup calculation failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'STANDARD_COST':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'LAST_PURCHASE':
        return <RefreshCw className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: orgCurrency || 'USD',
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">BOM Roll-up Workbench</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Calculate standard costs from Bill of Materials and routing data
        </p>
      </div>
      
      <div className="p-6">
        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeLocalization}
              onChange={(e) => setIncludeLocalization(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Include localization adjustments</span>
          </label>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => performRollup(false)}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            {loading ? 'Calculating...' : 'Calculate Costs'}
          </button>
          
          {result && (
            <button
              onClick={() => performRollup(true)}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Create Standard Cost
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-red-800 font-medium">Error</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-6">
            {/* Cost Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Calculated Costs for {result.productName}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(result.calculatedCosts.materialCost)}
                  </div>
                  <div className="text-sm text-gray-600">Material</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(result.calculatedCosts.laborCost)}
                  </div>
                  <div className="text-sm text-gray-600">Labor</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(result.calculatedCosts.overheadCost)}
                  </div>
                  <div className="text-sm text-gray-600">Overhead</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(result.calculatedCosts.totalCost)}
                  </div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
              </div>
            </div>

            {/* Localized Costs */}
            {result.localizedCosts && includeLocalization && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">Localized Costs (Region-Adjusted)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-700">
                      {formatCurrency(result.localizedCosts.materialCost)}
                    </div>
                    <div className="text-sm text-blue-600">Material</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-700">
                      {formatCurrency(result.localizedCosts.laborCost)}
                    </div>
                    <div className="text-sm text-blue-600">Labor</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-700">
                      {formatCurrency(result.localizedCosts.overheadCost)}
                    </div>
                    <div className="text-sm text-blue-600">Overhead</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-900">
                      {formatCurrency(result.localizedCosts.totalCost)}
                    </div>
                    <div className="text-sm text-blue-600">Total</div>
                  </div>
                </div>
              </div>
            )}

            {/* Variance Analysis */}
            {result.varianceAnalysis && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-3">Variance Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-yellow-700">Current Standard Cost</div>
                    <div className="text-lg font-medium">
                      {formatCurrency(result.varianceAnalysis.currentStandardCost)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-yellow-700">Calculated Cost</div>
                    <div className="text-lg font-medium">
                      {formatCurrency(result.varianceAnalysis.calculatedCost)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-yellow-700">Variance</div>
                    <div className={`text-lg font-medium ${
                      result.varianceAnalysis.variance >= 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {result.varianceAnalysis.variance >= 0 ? '+' : ''}
                      {formatCurrency(result.varianceAnalysis.variance)} 
                      ({result.varianceAnalysis.variancePercent.toFixed(1)}%)
                    </div>
                  </div>
                </div>
                <p className="text-yellow-800 mt-2 font-medium">
                  {result.varianceAnalysis.recommendation}
                </p>
              </div>
            )}

            {/* Component Details */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Component Breakdown</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty Per</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Extended</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Source</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {result.rollupDetails.map((component, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="text-sm font-medium text-gray-900">
                            {component.componentName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {component.componentSku}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-gray-900">
                          {component.quantityPer}
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-gray-900">
                          {formatCurrency(component.unitCost)}
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(component.extendedCost)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {getSourceIcon(component.source)}
                            <span className="text-xs text-gray-600">
                              {component.source.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}