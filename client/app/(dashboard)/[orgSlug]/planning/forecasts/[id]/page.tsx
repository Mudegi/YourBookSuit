'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, LineChart, Target, Calendar, TrendingUp, AlertCircle, BarChart3, Settings } from 'lucide-react';

interface ForecastDetail {
  id: string;
  product: {
    id: string;
    name: string;
    sku: string;
    category?: string;
  };
  warehouse?: {
    id: string;
    name: string;
  };
  forecastMethod: string;
  forecastPeriod: string;
  forecastedDemand: string | number;
  actualDemand?: string | number | null;
  confidenceLevel?: string | number | null;
  accuracy?: string | number | null;
  periodStart: string;
  periodEnd: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ForecastDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const forecastId = params.id as string;
  
  const [forecast, setForecast] = useState<ForecastDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchForecastDetail();
  }, [forecastId]);

  const fetchForecastDetail = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/planning/forecasts/${forecastId}`);
      if (response.ok) {
        const data = await response.json();
        setForecast(data.data);
      } else {
        setError('Failed to load forecast details');
      }
    } catch (error) {
      setError('Network error loading forecast details');
      console.error('Error fetching forecast detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Forecast Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The requested forecast could not be found.'}</p>
          <button
            onClick={() => router.push(`/${orgSlug}/planning/forecasts`)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Forecasts
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'MOVING_AVERAGE': return 'bg-blue-100 text-blue-800';
      case 'EXPONENTIAL_SMOOTHING': return 'bg-green-100 text-green-800';
      case 'LINEAR_REGRESSION': return 'bg-purple-100 text-purple-800';
      case 'SEASONAL': return 'bg-orange-100 text-orange-800';
      case 'MACHINE_LEARNING': return 'bg-red-100 text-red-800';
      case 'MANUAL': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'text-green-600';
    if (accuracy >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push(`/${orgSlug}/planning/forecasts`)}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Forecasts
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{forecast.product.name}</h1>
            <p className="text-lg text-gray-600">SKU: {forecast.product.sku}</p>
            {forecast.product.category && (
              <p className="text-sm text-gray-500">Category: {forecast.product.category}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getMethodColor(forecast.forecastMethod)}`}>
              {forecast.forecastMethod.replace(/_/g, ' ')}
            </span>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Settings className="w-4 h-4 mr-2" />
              Edit Forecast
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Forecasted Demand</p>
              <p className="text-2xl font-bold text-gray-900">
                {Number(forecast.forecastedDemand).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {forecast.actualDemand && (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Actual Demand</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Number(forecast.actualDemand).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {forecast.confidenceLevel && (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Confidence Level</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Number(forecast.confidenceLevel).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {forecast.accuracy && (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <LineChart className="w-8 h-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Accuracy</p>
                <p className={`text-2xl font-bold ${getAccuracyColor(Number(forecast.accuracy))}`}>
                  {Number(forecast.accuracy).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Forecast Information */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Forecast Details</h3>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Forecast Period:</span>
              <span className="text-sm text-gray-900">{forecast.forecastPeriod}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Period Start:</span>
              <span className="text-sm text-gray-900">{formatDate(forecast.periodStart)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Period End:</span>
              <span className="text-sm text-gray-900">{formatDate(forecast.periodEnd)}</span>
            </div>
            
            {forecast.warehouse && (
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Warehouse:</span>
                <span className="text-sm text-gray-900">{forecast.warehouse.name}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Created:</span>
              <span className="text-sm text-gray-900">{formatDate(forecast.createdAt)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Last Updated:</span>
              <span className="text-sm text-gray-900">{formatDate(forecast.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Notes & Analysis */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Analysis & Notes</h3>
          </div>
          <div className="px-6 py-4">
            {forecast.notes ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{forecast.notes}</p>
            ) : (
              <p className="text-sm text-gray-500 italic">No notes available for this forecast.</p>
            )}
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Method Information</h4>
              <div className="text-sm text-gray-600">
                <p>This forecast was generated using the <strong>{forecast.forecastMethod.replace(/_/g, ' ').toLowerCase()}</strong> method.</p>
                {forecast.forecastMethod === 'MOVING_AVERAGE' && (
                  <p className="mt-2">Moving average smooths out short-term fluctuations to reveal longer-term trends.</p>
                )}
                {forecast.forecastMethod === 'EXPONENTIAL_SMOOTHING' && (
                  <p className="mt-2">Exponential smoothing gives more weight to recent observations while maintaining historical data.</p>
                )}
                {forecast.forecastMethod === 'LINEAR_REGRESSION' && (
                  <p className="mt-2">Linear regression identifies trends and patterns in historical data to project future demand.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-center space-x-4">
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          Export Data
        </button>
        <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
          Update Forecast
        </button>
        <button className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100">
          Delete Forecast
        </button>
      </div>
    </div>
  );
}