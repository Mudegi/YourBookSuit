import Link from 'next/link';

export default function FeaturesPage() {
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
              <Link href="/pricing" className="text-gray-700 hover:text-blue-600">Pricing</Link>
              <Link href="/contact" className="text-gray-700 hover:text-blue-600">Contact</Link>
              <Link href="/login" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Login</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">Powerful Features</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to manage your business finances, from accounting to inventory management.
            </p>
          </div>

          {/* Core Modules */}
          <div className="space-y-16">
            {/* General Ledger */}
            <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">General Ledger</h2>
                  <p className="text-gray-600 mb-4">
                    Complete double-entry accounting system with automated journal entries, 
                    customizable chart of accounts, and real-time balance tracking.
                  </p>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start"><span className="text-green-500 mr-2">✓</span> Double-entry bookkeeping</li>
                    <li className="flex items-start"><span className="text-green-500 mr-2">✓</span> Multi-currency support</li>
                    <li className="flex items-start"><span className="text-green-500 mr-2">✓</span> Automated journal entries</li>
                    <li className="flex items-start"><span className="text-green-500 mr-2">✓</span> Complete audit trail</li>
                  </ul>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">100%</div>
                  <div className="text-gray-600">Accounting Accuracy</div>
                </div>
              </div>
            </div>

            {/* Accounts Receivable */}
            <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="order-2 md:order-1 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-8 text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">Fast</div>
                  <div className="text-gray-600">Invoice Generation</div>
                </div>
                <div className="order-1 md:order-2">
                  <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Accounts Receivable</h2>
                  <p className="text-gray-600 mb-4">
                    Professional invoicing with automated payment tracking, customer aging reports, 
                    and email reminders to ensure timely payments.
                  </p>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start"><span className="text-green-500 mr-2">✓</span> Professional invoices</li>
                    <li className="flex items-start"><span className="text-green-500 mr-2">✓</span> Payment tracking</li>
                    <li className="flex items-start"><span className="text-green-500 mr-2">✓</span> Aging reports</li>
                    <li className="flex items-start"><span className="text-green-500 mr-2">✓</span> Automated reminders</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Accounts Payable */}
            <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Accounts Payable</h2>
                  <p className="text-gray-600 mb-4">
                    Streamlined vendor bill management with approval workflows, payment scheduling, 
                    and 1099 tracking for tax compliance.
                  </p>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start"><span className="text-green-500 mr-2">✓</span> Bill management</li>
                    <li className="flex items-start"><span className="text-green-500 mr-2">✓</span> Approval workflows</li>
                    <li className="flex items-start"><span className="text-green-500 mr-2">✓</span> Payment scheduling</li>
                    <li className="flex items-start"><span className="text-green-500 mr-2">✓</span> 1099 tracking</li>
                  </ul>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-8 text-center">
                  <div className="text-4xl font-bold text-purple-600 mb-2">Automated</div>
                  <div className="text-gray-600">Payment Processing</div>
                </div>
              </div>
            </div>

            {/* Inventory Management */}
            <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="order-2 md:order-1 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-8 text-center">
                  <div className="text-4xl font-bold text-orange-600 mb-2">Real-time</div>
                  <div className="text-gray-600">Stock Tracking</div>
                </div>
                <div className="order-1 md:order-2">
                  <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Inventory Management</h2>
                  <p className="text-gray-600 mb-4">
                    Perpetual inventory system with FIFO/LIFO costing, stock adjustments, 
                    and automated low stock alerts to prevent stockouts.
                  </p>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start"><span className="text-green-500 mr-2">✓</span> Perpetual tracking</li>
                    <li className="flex items-start"><span className="text-green-500 mr-2">✓</span> FIFO/LIFO costing</li>
                    <li className="flex items-start"><span className="text-green-500 mr-2">✓</span> Stock adjustments</li>
                    <li className="flex items-start"><span className="text-green-500 mr-2">✓</span> Low stock alerts</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Financial Reports */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 md:p-12 text-white">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Comprehensive Reporting</h2>
                <p className="text-blue-100 max-w-2xl mx-auto">
                  Get insights into your business with real-time financial reports and customizable dashboards.
                </p>
              </div>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="bg-white/10 rounded-lg p-6 text-center">
                  <div className="text-2xl font-bold mb-2">Balance Sheet</div>
                  <div className="text-blue-100 text-sm">Assets, Liabilities, Equity</div>
                </div>
                <div className="bg-white/10 rounded-lg p-6 text-center">
                  <div className="text-2xl font-bold mb-2">P&L Statement</div>
                  <div className="text-blue-100 text-sm">Revenue & Expenses</div>
                </div>
                <div className="bg-white/10 rounded-lg p-6 text-center">
                  <div className="text-2xl font-bold mb-2">Cash Flow</div>
                  <div className="text-blue-100 text-sm">Operating, Investing, Financing</div>
                </div>
                <div className="bg-white/10 rounded-lg p-6 text-center">
                  <div className="text-2xl font-bold mb-2">Custom Reports</div>
                  <div className="text-blue-100 text-sm">Build Your Own</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Link href="/pricing" className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-lg transition-all inline-block">
              View Pricing Plans →
            </Link>
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
