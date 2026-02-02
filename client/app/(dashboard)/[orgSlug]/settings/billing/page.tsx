'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Check, CreditCard, Package, Zap } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  package: string;
  slug: string;
}

const packages = {
  STARTER: {
    name: 'Starter',
    description: 'Essential features for small businesses',
    price: 'Free',
    features: [
      'Basic inventory management',
      'Simple invoicing',
      'Customer management',
      'Basic reporting',
      'Up to 2 users',
    ],
  },
  PROFESSIONAL: {
    name: 'Professional',
    description: 'Advanced features for growing businesses',
    price: 'UGX 150,000/month',
    features: [
      'All Starter features',
      'Advanced inventory tracking',
      'Multi-currency support',
      'Service catalog',
      'Project management',
      'Advanced reporting',
      'Up to 10 users',
      'Email support',
    ],
  },
  ADVANCED: {
    name: 'Advanced',
    description: 'Comprehensive solution for established businesses',
    price: 'UGX 300,000/month',
    features: [
      'All Professional features',
      'Manufacturing module',
      'Quality management',
      'Advanced costing',
      'Forecasting & planning',
      'Up to 50 users',
      'Priority support',
      'Custom integrations',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    description: 'Full-featured solution for large organizations',
    price: 'Contact for pricing',
    features: [
      'All Advanced features',
      'Unlimited users',
      'Custom workflows',
      'Advanced security',
      'Dedicated support',
      'On-premise deployment',
      'Custom development',
      'SLA guarantees',
    ],
  },
};

export default function BillingPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadOrganization();
  }, [orgSlug]);

  const loadOrganization = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/organization`);
      const result = await response.json();
      
      if (result.success) {
        setOrganization(result.data);
      }
    } catch (error) {
      console.error('Error loading organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePackage = async (newPackage: string) => {
    if (!organization) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/${orgSlug}/organization/package`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ package: newPackage }),
      });

      if (response.ok) {
        setOrganization({ ...organization, package: newPackage });
        window.location.reload(); // Refresh to update navigation
      } else {
        alert('Failed to update package');
      }
    } catch (error) {
      console.error('Error updating package:', error);
      alert('Error updating package');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Billing & Subscription</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your organization's subscription and billing information
        </p>
      </div>

      {/* Current Package */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Current Package</h2>
        {organization && (
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {packages[organization.package as keyof typeof packages]?.name || organization.package}
              </h3>
              <p className="text-sm text-gray-500">
                {packages[organization.package as keyof typeof packages]?.description}
              </p>
              <p className="text-sm font-medium text-green-600 mt-1">
                {packages[organization.package as keyof typeof packages]?.price}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Package Comparison */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Available Packages</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(packages).map(([key, pkg]) => (
            <div 
              key={key}
              className={`border rounded-lg p-6 relative ${
                organization?.package === key 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {organization?.package === key && (
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Current
                  </span>
                </div>
              )}
              
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>
                <p className="text-xl font-bold text-gray-900 mt-2">{pkg.price}</p>
              </div>

              <ul className="space-y-2 mb-6">
                {pkg.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {organization?.package !== key && (
                <button
                  onClick={() => updatePackage(key)}
                  disabled={updating}
                  className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? 'Updating...' : 
                    key === 'ENTERPRISE' ? 'Contact Sales' : `Upgrade to ${pkg.name}`
                  }
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Demo Organization Notice */}
      {orgSlug === 'demo-company' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Zap className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Demo Organization</h3>
              <p className="text-sm text-yellow-700 mt-1">
                This is a demo organization. You can switch between packages to test different features.
                For testing purposes, we recommend using the <strong>Enterprise</strong> package to access all features.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}