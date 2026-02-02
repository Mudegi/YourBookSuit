'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, Clock, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface ServiceCatalog {
  id: string;
  serviceCode: string;
  name: string;
  description?: string;
  serviceType: string;
  category?: string;
  pricingModel: string;
  unitOfMeasure?: string;
  standardRate?: number;
  standardDuration?: number;
  skillLevel: string;
  department?: string;
  isBillable: boolean;
  isInternal: boolean;
  isActive: boolean;
  activities: ServiceActivity[];
  _count: {
    deliveries: number;
    bookings: number;
  };
  createdAt: string;
}

interface ServiceActivity {
  id: string;
  activityCode: string;
  name: string;
  estimatedHours?: number;
  standardRate?: number;
  sequence: number;
}

interface ServiceMetrics {
  totalServices: number;
  activeDeliveries: number;
  completedDeliveries: number;
  totalRevenue: number;
}

const serviceTypeLabels = {
  PROFESSIONAL: 'Professional',
  TECHNICAL: 'Technical',
  CREATIVE: 'Creative',
  EDUCATIONAL: 'Educational',
  SUPPORT: 'Support',
  ADMINISTRATIVE: 'Administrative',
  FIELD_SERVICE: 'Field Service',
  DIGITAL: 'Digital',
  RESEARCH: 'Research',
  PROJECT_BASED: 'Project-Based',
};

const pricingModelLabels = {
  FIXED_PRICE: 'Fixed Price',
  HOURLY_RATE: 'Hourly Rate',
  DAILY_RATE: 'Daily Rate',
  PROJECT_BASED: 'Project-Based',
  VALUE_BASED: 'Value-Based',
  RETAINER: 'Retainer',
  SUBSCRIPTION: 'Subscription',
  PER_USER: 'Per User',
  PER_TRANSACTION: 'Per Transaction',
  TIERED: 'Tiered',
};

const skillLevelColors = {
  ENTRY_LEVEL: 'bg-green-100 text-green-800',
  JUNIOR: 'bg-blue-100 text-blue-800',
  STANDARD: 'bg-gray-100 text-gray-800',
  SENIOR: 'bg-orange-100 text-orange-800',
  EXPERT: 'bg-red-100 text-red-800',
  SPECIALIST: 'bg-purple-100 text-purple-800',
};

export default function ServicesPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [metrics, setMetrics] = useState<ServiceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  useEffect(() => {
    loadServices();
    loadMetrics();
  }, [orgSlug, selectedType, selectedCategory, showActiveOnly, searchTerm]);

  const loadServices = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedType) params.append('serviceType', selectedType);
      if (selectedCategory) params.append('category', selectedCategory);
      if (showActiveOnly) params.append('isActive', 'true');
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/${orgSlug}/services/catalog?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setServices(result.data);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/services/metrics`);
      const result = await response.json();
      
      if (result.success) {
        setMetrics(result.data);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = !searchTerm || 
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.serviceCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  const categories = Array.from(new Set(services.map(s => s.category).filter(Boolean)));

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Service Catalog</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your organization's service offerings, activities, and delivery tracking
          </p>
        </div>
        <Link
          href={`/${orgSlug}/services/new`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Service
        </Link>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Services</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.totalServices}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Deliveries</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.activeDeliveries}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed This Month</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.completedDeliveries}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  UGX {metrics.totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Service Types</option>
            {Object.entries(serviceTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <div className="flex items-center">
            <input
              id="active-only"
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="active-only" className="ml-2 block text-sm text-gray-900">
              Active only
            </label>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <div key={service.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      <Link 
                        href={`/${orgSlug}/services/${service.id}`}
                        className="hover:text-blue-600"
                      >
                        {service.name}
                      </Link>
                    </h3>
                    {!service.isActive && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{service.serviceCode}</p>
                  {service.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{service.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {serviceTypeLabels[service.serviceType as keyof typeof serviceTypeLabels] || service.serviceType}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${skillLevelColors[service.skillLevel as keyof typeof skillLevelColors]}`}>
                      {service.skillLevel.replace('_', ' ')}
                    </span>
                    {service.category && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {service.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Pricing: </span>
                      {pricingModelLabels[service.pricingModel as keyof typeof pricingModelLabels] || service.pricingModel}
                    </div>
                    {service.standardRate && (
                      <div>
                        <span className="font-medium text-green-600">
                          UGX {service.standardRate.toLocaleString()}
                        </span>
                        {service.unitOfMeasure && (
                          <span className="text-gray-400">/{service.unitOfMeasure}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {service.activities.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1">
                        {service.activities.length} activities defined
                      </p>
                      <div className="text-xs text-gray-400">
                        Total estimated: {service.activities.reduce((sum, a) => sum + (a.estimatedHours || 0), 0)}h
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                    <div className="flex space-x-4 text-xs text-gray-500">
                      <span>{service._count.bookings} bookings</span>
                      <span>{service._count.deliveries} deliveries</span>
                    </div>
                    
                    <div className="flex space-x-1">
                      {service.isBillable && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Billable
                        </span>
                      )}
                      {service.isInternal && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Internal
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Users className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? 'Try adjusting your search or filters.' : 'Get started by creating your first service.'}
          </p>
          <Link
            href={`/${orgSlug}/services/new`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Service
          </Link>
        </div>
      )}
    </div>
  );
}