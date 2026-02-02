'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, LineChart, Target, Calendar } from 'lucide-react';

interface DemandForecast {
  id: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  warehouse?: {
    id: string;
    name: string;
  };
  forecastMethod: string;
  forecastedDemand: string | number; // Prisma Decimal comes as string
  confidenceLevel?: string | number | null; // Prisma Decimal comes as string
  accuracy?: string | number | null; // Prisma Decimal comes as string
  periodStart: string;
  periodEnd: string;
}

export default function DemandForecastsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  
  const [forecasts, setForecasts] = useState<DemandForecast[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecasts();
  }, []);

  const fetchForecasts = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/planning/forecasts`);
      if (response.ok) {
        const data = await response.json();
        setForecasts(data.data);
        setSummary(data.summary);
        console.log('✅ Forecasts loaded:', data.data.length);
      } else {
        console.error('❌ API Error:', response.status, response.statusText);
        const errorData = await response.text();
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('❌ Network Error fetching forecasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForecastClick = (forecastId: string) => {
    router.push(`/${orgSlug}/planning/forecasts/${forecastId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Demand Forecasts</h1>
          <p className="text-gray-600 mt-1">Manage demand forecasts and accuracy tracking</p>
        </div>
        <Link
          href={`/${orgSlug}/planning/forecasts/new`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Forecast
        </Link>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Forecasts</p>
                <p className="text-2xl font-bold mt-1">{summary.totalForecasts}</p>
              </div>
              <LineChart className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Accuracy</p>
                <p className="text-2xl font-bold mt-1">
                  {summary.averageAccuracy ? `${(summary.averageAccuracy * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </div>
              <Target className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Periods</p>
                <p className="text-2xl font-bold mt-1">{forecasts.filter(f => new Date(f.periodEnd) > new Date()).length}</p>
              </div>
              <Calendar className="w-10 h-10 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Forecasts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Forecast Qty</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {forecasts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <LineChart className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No demand forecasts found</p>
                  <p className="text-sm mt-1">Create forecasts to plan inventory levels</p>
                </td>
              </tr>
            ) : (
              forecasts.map((forecast) => (
                <tr 
                  key={forecast.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleForecastClick(forecast.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{forecast.product.name}</div>
                      <div className="text-sm text-gray-500">{forecast.product.sku}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {forecast.forecastMethod.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {Number(forecast.forecastedDemand).toFixed(0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                    {forecast.confidenceLevel 
                      ? `${Number(forecast.confidenceLevel).toFixed(1)}%`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {forecast.accuracy ? `${Number(forecast.accuracy).toFixed(1)}%` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(forecast.periodStart).toLocaleDateString()} - {new Date(forecast.periodEnd).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
