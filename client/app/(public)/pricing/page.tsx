import Link from 'next/link';

export default function PricingPage() {
  const pricingPlans = [
    {
      id: '1',
      name: 'Professional',
      description: 'Perfect for growing businesses',
      price: 79,
      billingPeriod: 'MONTHLY',
      isPopular: true,
      features: [
        'Up to 25 users',
        '5 organizations',
        'Core accounting features',
        'Inventory management',
        'Financial reports',
        'Bank feeds',
        'Document management',
        'Project tracking',
        'Multi-currency support',
        'Budget management',
        'Fixed assets',
        'Email support',
      ],
      ctaText: 'Get Started',
      ctaLink: '/register',
    },
    {
      id: '2',
      name: 'Advanced',
      description: 'For enterprises needing everything',
      price: 0,
      billingPeriod: 'CUSTOM',
      isPopular: false,
      features: [
        'Unlimited users',
        'Unlimited organizations',
        'Everything in Professional',
        'CRM & Sales Pipeline',
        'Manufacturing & BOMs',
        'Warehouse Management',
        'HCM / Payroll',
        'Field Service',
        'Maintenance Management',
        'Advanced Reporting & BI',
        'Workflows & Approvals',
        'Integrations & API',
        'Quality Management',
        'Tax & Localization',
        'White Label',
        'Dedicated Support',
      ],
      ctaText: 'Contact Sales',
      ctaLink: '/contact',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">Y</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">YourBooks</h1>
                <p className="text-xs text-gray-500">Enterprise ERP</p>
              </div>
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/" className="text-gray-700 hover:text-blue-600">Home</Link>
              <Link href="/about" className="text-gray-700 hover:text-blue-600">About</Link>
              <Link href="/features" className="text-gray-700 hover:text-blue-600">Features</Link>
              <Link href="/contact" className="text-gray-700 hover:text-blue-600">Contact</Link>
              <Link href="/login" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Login</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">Simple, Transparent Pricing</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose the plan that fits your business needs. All plans include core accounting features.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-5xl mx-auto">
            {pricingPlans.map((plan: any, index: number) => (
              <div
                key={plan.id}
                className={`bg-white rounded-xl shadow-lg p-8 border-2 transition-all ${
                  plan.isPopular
                    ? 'border-blue-600 relative transform scale-105 shadow-2xl'
                    : 'border-purple-600 hover:border-purple-700'
                }`}
              >
                  {plan.isPopular && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 mb-4">{plan.description}</p>
                    <div className={`text-5xl font-bold mb-2 ${plan.isPopular ? 'text-blue-600' : 'text-gray-900'}`}>
                      {plan.price > 0 ? `$${plan.price}` : 'Custom'}
                    </div>
                    <div className="text-gray-600">
                      {plan.billingPeriod === 'CUSTOM' ? 'contact us' : `per ${plan.billingPeriod.toLowerCase()}`}
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.ctaLink}
                    className={`block w-full text-center px-6 py-3 font-semibold rounded-lg transition ${
                      plan.isPopular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                    }`}
                  >
                    {plan.ctaText}
                  </Link>
                </div>
              ))
            }
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">Can I switch plans later?</h3>
                <p className="text-gray-600">Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">Is there a free trial?</h3>
                <p className="text-gray-600">We offer a 7-day free trial on all plans. No credit card required.</p>
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">What payment methods do you accept?</h3>
                <p className="text-gray-600">We accept all major credit cards, ACH transfers, and wire transfers for Enterprise plans.</p>
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">Is my data secure?</h3>
                <p className="text-gray-600">Absolutely. We use bank-level encryption and follow industry best practices for data security.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2025 YourBooks ERP. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
