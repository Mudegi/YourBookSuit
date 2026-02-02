'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Briefcase, 
  Package, 
  Wrench, 
  Building2, 
  Monitor,
  Users,
  Palette,
  Stethoscope,
  Home,
  HandHelping 
} from 'lucide-react';

interface BusinessTypeOption {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: string;
  examples: string[];
}

const businessTypes: BusinessTypeOption[] = [
  {
    id: 'CONSULTING',
    name: 'Professional Services',
    description: 'Sell expertise and time-based services',
    icon: Briefcase,
    category: 'Service-Based',
    examples: ['Consulting', 'Legal', 'Accounting', 'Marketing']
  },
  {
    id: 'FREELANCE',
    name: 'Freelance/Creative',
    description: 'Individual services and creative work',
    icon: Palette,
    category: 'Service-Based',
    examples: ['Design', 'Writing', 'Photography', 'Development']
  },
  {
    id: 'RETAIL',
    name: 'Retail Business',
    description: 'Sell physical products to customers',
    icon: Package,
    category: 'Product-Based',
    examples: ['Online store', 'Boutique', 'Electronics', 'Fashion']
  },
  {
    id: 'MANUFACTURER',
    name: 'Manufacturing',
    description: 'Make and sell products',
    icon: Building2,
    category: 'Product-Based',
    examples: ['Factory', 'Workshop', 'Food production', 'Assembly']
  },
  {
    id: 'CONSTRUCTION',
    name: 'Construction/Contracting',
    description: 'Projects with materials and labor',
    icon: Wrench,
    category: 'Mixed Business',
    examples: ['Construction', 'Plumbing', 'Electrical', 'Carpentry']
  },
  {
    id: 'TECHNOLOGY',
    name: 'Technology Company',
    description: 'Software, apps, and tech services',
    icon: Monitor,
    category: 'Mixed Business',
    examples: ['Software', 'SaaS', 'App development', 'IT services']
  },
];

interface BusinessSetupProps {
  organizationId: string;
  organizationSlug: string;
  onComplete: () => void;
}

export default function BusinessSetup({ organizationId, organizationSlug, onComplete }: BusinessSetupProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleContinue = async () => {
    if (!selectedType) return;
    
    setLoading(true);
    try {
      // Update the organization with the selected business model
      const response = await fetch(`/api/${organizationSlug}/organization/business-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          businessModel: selectedType,
          organizationId 
        }),
      });

      if (response.ok) {
        onComplete();
        router.push(`/${organizationSlug}/dashboard`);
      } else {
        console.error('Failed to update business model');
      }
    } catch (error) {
      console.error('Error updating business model:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryGroups = businessTypes.reduce((groups, type) => {
    if (!groups[type.category]) {
      groups[type.category] = [];
    }
    groups[type.category].push(type);
    return groups;
  }, {} as Record<string, BusinessTypeOption[]>);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">What type of business do you have?</h2>
          <p className="mt-4 text-lg text-gray-600">
            We'll customize your workspace to match how you do business
          </p>
        </div>

        <div className="mt-10">
          {Object.entries(categoryGroups).map(([category, types]) => (
            <div key={category} className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {types.map((type) => {
                  const IconComponent = type.icon;
                  const isSelected = selectedType === type.id;
                  
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`p-6 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-lg ${
                          isSelected ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <IconComponent className={`h-6 w-6 ${
                            isSelected ? 'text-blue-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900">{type.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 mb-1">Examples:</p>
                            <div className="flex flex-wrap gap-1">
                              {type.examples.map((example) => (
                                <span 
                                  key={example}
                                  className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                                >
                                  {example}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-between items-center">
          <button
            onClick={() => {
              setSelectedType('GENERAL');
              handleContinue();
            }}
            className="text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            Skip - I'll set this up later
          </button>
          
          <button
            onClick={handleContinue}
            disabled={!selectedType || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            {loading ? 'Setting up...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}