import Link from 'next/link';

// ═══════════════════════════════════════════════════════════
//  PRICING CONFIG — change the monthly price here and
//  everything else (annual, savings, per-month) auto-updates
// ═══════════════════════════════════════════════════════════
const MONTHLY_PRICE   = 30;                              // USD per month
const FREE_MONTHS     = 2;                               // months free on annual
const ANNUAL_PRICE    = MONTHLY_PRICE * (12 - FREE_MONTHS); // e.g. 30 × 10 = 300
const ANNUAL_MONTHLY  = Math.round(ANNUAL_PRICE / 12);   // effective monthly
const ANNUAL_FULL     = MONTHLY_PRICE * 12;              // what 12 months would cost
const ANNUAL_SAVINGS  = ANNUAL_FULL - ANNUAL_PRICE;      // saved per year

export default function Home() {
  return (
    <div className="min-h-screen bg-emerald-50">
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full bg-gray-50/90 backdrop-blur-lg border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-md shadow-blue-200">
              <span className="text-white font-bold text-lg leading-none">Y</span>
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">YourBooks</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Features</a>
            <a href="#modules" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Modules</a>
            <a href="#why" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Why YourBooks</a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900 px-4 py-2 transition">
              Sign In
            </Link>
            <Link href="/register" className="text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 px-5 py-2.5 rounded-lg transition shadow-sm">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black_70%,transparent_110%)]" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-8">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-700">Trusted by 500+ businesses across East Africa</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.08] mb-6">
              The ERP built for
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                growing businesses
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
              Full-suite accounting, invoicing, inventory, manufacturing, and financial reporting &mdash;
              all in one platform with double-entry bookkeeping at its core.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all text-base"
              >
                Get Started Free
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border border-gray-200 shadow-sm transition-all text-base"
              >
                Sign In to Dashboard
              </Link>
            </div>

            {/* Social proof badges */}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                14-day free trial
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Cancel anytime
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-2xl shadow-gray-200/60 bg-gray-100 p-1">
              <div className="rounded-xl overflow-hidden bg-white">
                {/* Mock browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-white border border-gray-200 rounded-md px-4 py-1.5 text-xs text-gray-400 text-center max-w-md mx-auto">
                      yourbooks.app/demo-company/dashboard
                    </div>
                  </div>
                </div>
                {/* Mock dashboard content */}
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                      <div className="text-blue-100 text-xs font-medium mb-1">Revenue</div>
                      <div className="text-xl font-bold">UGX 124.5M</div>
                      <div className="text-blue-200 text-xs mt-1">+12.5% &uarr;</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <div className="text-gray-500 text-xs font-medium mb-1">Receivables</div>
                      <div className="text-xl font-bold text-gray-900">UGX 42.3M</div>
                      <div className="text-gray-400 text-xs mt-1">6 invoices</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <div className="text-gray-500 text-xs font-medium mb-1">Payables</div>
                      <div className="text-xl font-bold text-gray-900">UGX 18.7M</div>
                      <div className="text-gray-400 text-xs mt-1">3 bills</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white">
                      <div className="text-green-100 text-xs font-medium mb-1">Cash Balance</div>
                      <div className="text-xl font-bold">UGX 89.2M</div>
                      <div className="text-green-200 text-xs mt-1">All accounts</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 bg-gray-50 rounded-xl p-5 h-36 flex items-end gap-1">
                      {[40, 55, 45, 65, 50, 70, 60, 80, 72, 90, 85, 95].map((h, i) => (
                        <div key={i} className="flex-1 bg-blue-400/30 rounded-t" style={{ height: `${h}%` }}>
                          <div className="w-full bg-blue-500 rounded-t" style={{ height: '60%' }} />
                        </div>
                      ))}
                    </div>
                    <div className="bg-gray-50 rounded-xl p-5 flex items-center justify-center">
                      <div className="relative w-24 h-24">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="61 39" strokeLinecap="round" />
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="0 61 24 100" strokeLinecap="round" />
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray="0 85 9 100" strokeLinecap="round" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Banner ───────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '175+', label: 'Data Models' },
              { value: '99.9%', label: 'Uptime SLA' },
              { value: '50K+', label: 'Daily Transactions' },
              { value: '24/7', label: 'System Access' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm font-medium text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ──────────────────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Everything You Need</div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              One system, every department
            </h2>
            <p className="text-lg text-gray-500">
              From invoicing to manufacturing, every business function is connected through a unified chart of accounts.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: '📒', title: 'General Ledger', desc: 'Double-entry bookkeeping with automated journal entries, chart of accounts, and trial balance.', color: 'blue' },
              { icon: '📄', title: 'Accounts Receivable', desc: 'Professional invoicing, customer aging reports, payment tracking, and automated reminders.', color: 'green' },
              { icon: '💳', title: 'Accounts Payable', desc: 'Bill management, vendor payments, purchase orders, and approval workflows.', color: 'purple' },
              { icon: '🏦', title: 'Banking & Reconciliation', desc: 'Multi-currency bank accounts, automatic reconciliation, and real-time cash flow monitoring.', color: 'indigo' },
              { icon: '📦', title: 'Inventory Management', desc: 'Perpetual tracking, warehouse management, stock transfers, landed costs, and lot tracking.', color: 'orange' },
              { icon: '📊', title: 'Financial Reporting', desc: 'Balance Sheet, P&L, Cash Flow, VAT returns, and custom reports with drill-down.', color: 'red' },
              { icon: '🏭', title: 'Manufacturing', desc: 'Bill of materials, work orders, assembly management, and production costing.', color: 'teal' },
              { icon: '👥', title: 'CRM & People', desc: 'Customer contacts, sales pipeline, employees, leave management, and expense claims.', color: 'pink' },
              { icon: '🔌', title: 'Tax & Integrations', desc: 'EFRIS/URA integration, VAT management, multi-currency support, and webhook APIs.', color: 'amber' },
            ].map((feature) => (
              <div key={feature.title} className="group relative bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-300 hover:shadow-lg transition-all duration-300">
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules Showcase ───────────────────────────────────────────── */}
      <section id="modules" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Complete ERP Suite</div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Built for the way you work
            </h2>
            <p className="text-lg text-gray-500">
              Every module is deeply integrated, so data flows seamlessly across your entire operation.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Sales & Revenue */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Sales &amp; Revenue</h3>
                  <p className="text-sm text-gray-500 mt-1">Manage your entire sales cycle from quote to collection</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Invoices', 'Estimates', 'Credit Notes', 'Customer Payments', 'Statements', 'Sales Pipeline', 'Price Lists'].map(t => (
                  <span key={t} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">{t}</span>
                ))}
              </div>
            </div>

            {/* Procurement & Payables */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Procurement &amp; Payables</h3>
                  <p className="text-sm text-gray-500 mt-1">Streamline purchases from order to payment</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Bills', 'Purchase Orders', 'Debit Notes', 'Vendor Payments', 'Expenses', 'Approval Workflows'].map(t => (
                  <span key={t} className="px-3 py-1.5 bg-violet-50 text-violet-700 text-xs font-medium rounded-full">{t}</span>
                ))}
              </div>
            </div>

            {/* Inventory & Operations */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Inventory &amp; Operations</h3>
                  <p className="text-sm text-gray-500 mt-1">Full warehouse and production management</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Stock Tracking', 'Warehouses', 'Transfers', 'Manufacturing', 'BOMs', 'Quality Control', 'Lot Tracking', 'Cycle Counts'].map(t => (
                  <span key={t} className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">{t}</span>
                ))}
              </div>
            </div>

            {/* Finance & Reporting */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Finance &amp; Reporting</h3>
                  <p className="text-sm text-gray-500 mt-1">Real-time financial intelligence at your fingertips</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Balance Sheet', 'Profit & Loss', 'Cash Flow', 'Trial Balance', 'VAT Returns', 'Budgets', 'FX Gain/Loss', 'Custom Reports'].map(t => (
                  <span key={t} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why YourBooks ──────────────────────────────────────────────── */}
      <section id="why" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Why Choose Us</div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Purpose-built for African businesses
            </h2>
            <p className="text-lg text-gray-500">
              We understand the compliance, currency, and operational challenges you face every day.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '🔒', title: 'Multi-Tenant Security', desc: 'Complete data isolation between organizations with role-based access control.' },
              { icon: '💱', title: 'Multi-Currency', desc: 'Full support for UGX, USD, EUR, KES, and more with real-time exchange rates.' },
              { icon: '🇺🇬', title: 'EFRIS Compliant', desc: 'Native URA EFRIS integration for e-invoicing, stock tracking, and tax reporting.' },
              { icon: '⚡', title: 'Real-Time Data', desc: 'Every entry instantly updates your financials — no batch processing, no delays.' },
            ].map((item) => (
              <div key={item.title} className="text-center p-6">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">One Plan, Everything Included</div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Enterprise-grade for every business
            </h2>
            <p className="text-lg text-gray-500">
              No tiers. No feature gates. Every account gets full access to the entire platform.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {/* Billing toggle hint */}
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm font-medium text-green-700">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Save ${ANNUAL_SAVINGS}/year &mdash; Get {FREE_MONTHS} months FREE with annual billing
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Monthly Plan */}
              <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-md relative">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                  7-Day Free Trial
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Monthly</h3>
                  <p className="text-sm text-gray-500">Full access &mdash; pay as you go</p>
                </div>

                <div className="text-center mb-6">
                  <span className="text-5xl font-extrabold text-gray-900">${MONTHLY_PRICE}</span>
                  <span className="text-gray-500 text-base ml-1">/month</span>
                  <p className="text-sm text-gray-400 mt-2">Billed monthly &middot; Cancel anytime</p>
                  <p className="text-xs text-gray-400 mt-1">${ANNUAL_FULL}/year if paid monthly</p>
                </div>

                <Link href="/register" className="block w-full text-center py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-semibold transition shadow-md text-sm mb-4">
                  Start 7-Day Free Trial
                </Link>

                <p className="text-center text-xs text-gray-400">
                  No credit card required to start.
                </p>
              </div>

              {/* Annual Plan */}
              <div className="bg-white rounded-2xl border-2 border-blue-600 p-8 shadow-xl shadow-blue-100/50 relative">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex gap-2">
                  <span className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-full">7-Day Free Trial</span>
                  <span className="px-4 py-1.5 bg-green-600 text-white text-xs font-bold rounded-full">Best Value</span>
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Annual</h3>
                  <p className="text-sm text-gray-500">Full access &mdash; {FREE_MONTHS} months FREE</p>
                </div>

                <div className="text-center mb-4">
                  <span className="text-5xl font-extrabold text-gray-900">${ANNUAL_PRICE}</span>
                  <span className="text-gray-500 text-base ml-1">/year</span>
                  <p className="text-sm text-gray-400 mt-2">That&apos;s only <strong className="text-gray-700">${ANNUAL_MONTHLY}/month</strong></p>
                </div>

                <div className="flex items-center justify-center gap-2 mb-6">
                  <span className="line-through text-gray-400 text-sm">${ANNUAL_FULL}</span>
                  <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                    SAVE ${ANNUAL_SAVINGS}
                  </span>
                </div>

                <Link href="/register" className="block w-full text-center py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-md shadow-blue-200 text-sm mb-4">
                  Start 7-Day Free Trial
                </Link>

                <p className="text-center text-xs text-gray-400">
                  No credit card required. Pay only after your trial ends.
                </p>
              </div>
            </div>

            {/* Feature list below both cards */}
            <div className="mt-10 bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h4 className="text-center text-sm font-semibold text-gray-900 uppercase tracking-wider mb-6">Everything included in both plans</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                {[
                  'Unlimited organizations',
                  'Unlimited users',
                  'Unlimited transactions',
                  'All 9+ modules included',
                  'EFRIS / URA integration',
                  'Multi-currency support',
                  'Financial reporting suite',
                  'Manufacturing & inventory',
                  'Bank reconciliation',
                  'Priority support',
                  'Custom integrations',
                  'API access',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
            Ready to modernize your accounting?
          </h2>
          <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto">
            Join hundreds of businesses that trust YourBooks for their financial operations.
            Set up in minutes, not weeks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all text-base"
            >
              Start Your Free Trial
              <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border border-gray-200 transition-all text-base"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">Y</span>
                </div>
                <span className="text-lg font-bold text-gray-900">YourBooks</span>
              </Link>
              <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
                Enterprise-grade ERP and accounting software built with Next.js, TypeScript, Prisma, and PostgreSQL.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-2.5">
                {['Features', 'Pricing', 'Security', 'Roadmap'].map(l => (
                  <li key={l}><a href={`#${l.toLowerCase()}`} className="text-sm text-gray-500 hover:text-gray-700 transition">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2.5">
                {['About', 'Blog', 'Careers', 'Contact'].map(l => (
                  <li key={l}><a href="#" className="text-sm text-gray-500 hover:text-gray-700 transition">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {['Privacy Policy', 'Terms of Service', 'Compliance', 'Data Processing'].map(l => (
                  <li key={l}><a href="#" className="text-sm text-gray-500 hover:text-gray-700 transition">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} YourBooks ERP. All rights reserved.
            </p>
            <div className="flex items-center gap-5">
              <a href="#" className="text-gray-400 hover:text-gray-600 transition" aria-label="GitHub">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600 transition" aria-label="Twitter">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600 transition" aria-label="LinkedIn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
