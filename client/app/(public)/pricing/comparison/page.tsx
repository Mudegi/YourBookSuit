'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';

export default function PricingComparisonPage() {
  const allFeatures = [
    {
      category: 'Core Features',
      features: [
        'Dashboard & Analytics',
        'General Ledger',
        'Accounts Receivable',
        'Accounts Payable',
        'Payments',
        'Banking',
        'Inventory Management',
        'Financial Reports',
      ],
    },
    {
      category: 'Business Operations',
      features: [
        'Bank Feeds',
        'Document Management',
        'Project Tracking',
        'Multi-Currency',
        'Budget Management',
        'Fixed Assets',
        'Services Management',
      ],
    },
    {
      category: 'Advanced Features',
      features: [
        'CRM',
        'Warehouse Management',
        'Manufacturing',
        'HCM / Payroll',
        'Field Service',
        'Maintenance',
        'Advanced Reporting & BI',
        'Workflows & Approvals',
        'Integrations & API',
        'Security & MDM',
        'Advanced Inventory',
        'Costing & Planning',
        'Planning & Forecasting',
        'Quality Management',
        'Tax & Localization',
        'API Access',
        'White Label',
        'Custom Fields',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-block mb-6 text-2xl font-bold text-blue-600">
            YourBooks
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            One Plan, All Features
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get complete access to all YourBooks features with a single subscription.
          </p>
        </div>

        {/* Single Pricing Card */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative rounded-2xl border-2 border-blue-500 bg-white shadow-xl ring-4 ring-blue-100">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-1 rounded-full text-sm font-semibold">
              Full Access
            </div>
            
            <div className="p-8">
              <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold mb-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                YourBooks Complete
              </div>
              
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">Complete ERP Suite</h3>
                <p className="text-gray-600">Everything you need to run your business</p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-sm text-gray-700">
                  <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span>Unlimited users</span>
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span>Unlimited organizations</span>
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span>All features included</span>
                </li>
              </ul>

              <Link
                href="/register"
                className="block w-full text-center py-3 rounded-lg font-semibold transition-all bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>

        {/* Feature List */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600">
            <h2 className="text-2xl font-bold text-white text-center">
              All Features Included
            </h2>
          </div>

          <div className="p-8">
            <div className="grid md:grid-cols-3 gap-8">
              {allFeatures.map((category) => (
                <div key={category.category}>
                  <h3 className="font-bold text-gray-900 mb-4 text-lg border-b pb-2">
                    {category.category}
                  </h3>
                  <ul className="space-y-2">
                    {category.features.map((feature) => (
                      <li key={feature} className="flex items-start text-sm text-gray-700">
                        <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of businesses managing their finances with YourBooks
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Start Free Trial
            </Link>
            <Link
              href="/contact"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
            >
              Contact Sales
            </Link>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <details className="bg-white rounded-lg p-6 shadow">
              <summary className="font-semibold text-gray-900 cursor-pointer">
                Are there any limits on users or organizations?
              </summary>
              <p className="mt-2 text-gray-600">
                No! With YourBooks Complete, you get unlimited users and organizations. Scale as much as you need.
              </p>
            </details>
            <details className="bg-white rounded-lg p-6 shadow">
              <summary className="font-semibold text-gray-900 cursor-pointer">
                Do I get all features with one subscription?
              </summary>
              <p className="mt-2 text-gray-600">
                Yes! There are no tiers or restrictions. Every feature is available to you from day one.
              </p>
            </details>
            <details className="bg-white rounded-lg p-6 shadow">
              <summary className="font-semibold text-gray-900 cursor-pointer">
                Is there a free trial?
              </summary>
              <p className="mt-2 text-gray-600">
                Yes! All plans come with a 14-day free trial. No credit card required.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
