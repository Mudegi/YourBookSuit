'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  CreditCard,
  Building2,
  Package,
  Factory,
  TrendingUp,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Menu,
  X,
  UserCheck,
  Wrench,
  Briefcase,
  BarChart3,
  CheckSquare,
  Plug,
  Shield,
  Database,
  DollarSign,
  LineChart,
  ClipboardCheck,
  MapPin,
  Lock,
  Plus,
  Repeat,
  PieChart,
  LayoutGrid,
  Keyboard,
  PanelLeftClose,
  PanelLeftOpen,
  Rows3,
} from 'lucide-react';
import { getBusinessModelProfile, isFeatureEnabledForBusiness, type BusinessModel } from '@/lib/business-models';
import { fetchWithAuth } from '@/lib/fetch-client';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSystemAdmin?: boolean;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  onboardingCompleted?: boolean;
  industry?: string;
  businessModel?: string;
  homeCountry?: string;
  subscriptionStatus?: string;
  trialEndDate?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [flyoutPosition, setFlyoutPosition] = useState<{ top: number; left: number } | null>(null);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });
  const [fontFamily, setFontFamily] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('app-font') || "'Inter', sans-serif";
    }
    return "'Inter', sans-serif";
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [density, setDensity] = useState<'comfortable' | 'compact' | 'cozy'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('app-density') as any) || 'comfortable';
    }
    return 'comfortable';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);

  const fontOptions = [
    { label: 'Inter', value: "'Inter', sans-serif" },
    { label: 'Poppins', value: "'Poppins', sans-serif" },
    { label: 'Roboto', value: "'Roboto', sans-serif" },
    { label: 'Open Sans', value: "'Open Sans', sans-serif" },
    { label: 'Nunito', value: "'Nunito', sans-serif" },
    { label: 'Merriweather', value: "'Merriweather', serif" },
    { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  ];

  useEffect(() => {
    fetchSession();
    
    // Close mobile menu on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
      if (e.key === 'Escape' && createMenuOpen) {
        setCreateMenuOpen(false);
      }
    };
    
    // Click outside handler for create menu
    const handleClickOutside = (event: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setCreateMenuOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    if (createMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen, createMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT';
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 10);
      }
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setShortcutsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && shortcutsOpen) {
        setShortcutsOpen(false);
      }
      if (e.key === 'Escape' && preferencesOpen) {
        setPreferencesOpen(false);
      }
      if (e.key === 'b' && !isInput) {
        setSidebarCollapsed(prev => !prev);
      }
      if (e.key === 'g' && !isInput) {
        (window as any).__pendingShortcut = true;
        setTimeout(() => ((window as any).__pendingShortcut = false), 500);
      }
      if ((window as any).__pendingShortcut && e.key === 'i') {
        router.push(`/${orgSlug}/accounts-receivable/invoices`);
      }
      if ((window as any).__pendingShortcut && e.key === 'd') {
        router.push(`/${orgSlug}/dashboard`);
      }
      if ((window as any).__pendingShortcut && e.key === 'b') {
        router.push(`/${orgSlug}/accounts-payable/bills`);
      }
      if ((window as any).__pendingShortcut && e.key === 'c') {
        router.push(`/${orgSlug}/accounts-receivable/customers`);
      }
      if ((window as any).__pendingShortcut && e.key === 'r') {
        router.push(`/${orgSlug}/reports`);
      }
      if ((window as any).__pendingShortcut && e.key === 's') {
        router.push(`/${orgSlug}/settings`);
      }
      if (e.key === 'n' && !isInput) {
        setCreateMenuOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orgSlug, router, shortcutsOpen]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font', fontFamily);
    localStorage.setItem('app-font', fontFamily);
  }, [fontFamily]);



  // Density: apply CSS class to html element
  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
    localStorage.setItem('app-density', density);
  }, [density]);

  // Sidebar collapse: persist
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const fetchSession = async () => {
    try {
      const response = await fetchWithAuth('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        setUser(data.data.user);
        setOrganization(data.data.organization);
        
        // Check if onboarding is completed
        if (data.data.organization && !data.data.organization.onboardingCompleted) {
          router.push('/onboarding');
          return;
        }
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Session fetch error:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    // Strip user preferences from DOM so they don't affect unauthenticated pages
    document.documentElement.classList.remove('dark');
    document.documentElement.style.removeProperty('--app-font');
    document.documentElement.removeAttribute('data-density');
    router.push('/login');
  };

  // Full-screen pages that should bypass the dashboard sidebar/header
  const isFullScreenPage = pathname.includes('/invoices/new-intelligent');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render full-screen pages without sidebar/header
  if (isFullScreenPage) {
    return <>{children}</>;
  }

  // Trial / subscription enforcement
  const subStatus = organization?.subscriptionStatus;
  const trialEnd = organization?.trialEndDate ? new Date(organization.trialEndDate) : null;
  const isTrialExpired = subStatus === 'TRIAL' && trialEnd && trialEnd < new Date();
  const isBlocked = subStatus === 'TRIAL_EXPIRED' || subStatus === 'SUSPENDED' || subStatus === 'CANCELLED' || isTrialExpired;
  const isPendingApproval = subStatus === 'PENDING_APPROVAL';

  if (isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="text-5xl mb-4">{subStatus === 'SUSPENDED' ? '🚫' : '⏰'}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {subStatus === 'SUSPENDED' ? 'Account Suspended' : 'Trial Expired'}
          </h2>
          <p className="text-gray-500 mb-6">
            {subStatus === 'SUSPENDED'
              ? 'Your organization has been suspended. Please contact support for assistance.'
              : 'Your 7-day free trial has ended. To continue using YourBooks, please subscribe to our Enterprise plan.'}
          </p>
          <div className="space-y-3">
            <a
              href="mailto:support@yourbooks.app?subject=Subscription%20Payment"
              className="block w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition"
            >
              Contact Us to Subscribe
            </a>
            <button
              onClick={handleLogout}
              className="block w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isPendingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pending Approval</h2>
          <p className="text-gray-500 mb-6">
            Your payment has been received! We&apos;re reviewing your account and will activate it shortly.
            You&apos;ll be able to access your dashboard once approved.
          </p>
          <button
            onClick={handleLogout}
            className="block w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Filter Settings children based on country - EFRIS only for Uganda
  const settingsChildren = [
    { name: 'General', href: `/${orgSlug}/settings` },
    { name: 'Payment Terms', href: `/${orgSlug}/settings/payment-terms` },
    { name: 'Branches', href: `/${orgSlug}/settings/branches` },
    { name: 'Currencies', href: `/${orgSlug}/settings/currencies` },
    { name: 'Onboarding', href: '/onboarding' },
    { name: 'Integrations', href: `/${orgSlug}/settings/integrations` },
    { name: 'Webhooks', href: `/${orgSlug}/integrations/webhooks` },
    ...(organization?.homeCountry?.toUpperCase() === 'UG' || organization?.homeCountry?.toUpperCase() === 'UGANDA' ? [{ name: 'EFRIS Integration', href: `/${orgSlug}/settings/efris` }] : []),
    { name: 'Users & Roles', href: `/${orgSlug}/settings/users` },
  ];

  const navigation = [
    {
      name: 'Dashboard',
      href: `/${orgSlug}/dashboard`,
      icon: LayoutDashboard,
      featureKey: 'dashboard',
    },
    {
      name: 'Sales',
      icon: Users,
      featureKey: 'sales',
      children: [
        { name: 'Customers', href: `/${orgSlug}/accounts-receivable/customers` },
        { name: 'Invoices', href: `/${orgSlug}/accounts-receivable/invoices` },
        { name: 'New Invoice', href: `/${orgSlug}/accounts-receivable/invoices/new` },
        { name: 'Statements', href: `/${orgSlug}/accounts-receivable/statements/new` },
        { name: 'Credit Notes', href: `/${orgSlug}/credit-notes` },
        { name: 'Customer Payments', href: `/${orgSlug}/payments/customer` },
        { name: 'Sales Pipeline', href: `/${orgSlug}/crm/opportunities` },
        { name: 'Estimates', href: `/${orgSlug}/accounts-receivable/estimates` },
      ],
    },
    {
      name: 'Purchases',
      icon: FileText,
      featureKey: 'purchases',
      children: [
        { name: 'Vendors', href: `/${orgSlug}/accounts-payable/vendors` },
        { name: 'Bills', href: `/${orgSlug}/accounts-payable/bills` },
        { name: 'New Bill', href: `/${orgSlug}/accounts-payable/bills/new` },
        { name: 'Debit Notes', href: `/${orgSlug}/debit-notes` },
        { name: 'Vendor Payments', href: `/${orgSlug}/payments/vendor` },
        { name: 'Purchase Orders', href: `/${orgSlug}/accounts-payable/purchase-orders` },
      ],
    },
    {
      name: 'Inventory',
      icon: Package,
      featureKey: 'inventory',
      children: [
        { name: 'Products & Services', href: `/${orgSlug}/inventory/products` },
        { name: 'Stock Purchases', href: `/${orgSlug}/inventory/goods-receipts` },
        { name: 'Stock Movements', href: `/${orgSlug}/inventory/movements` },
        { name: 'Adjustments', href: `/${orgSlug}/inventory/adjustments` },
        { name: 'Stock Decrease', href: `/${orgSlug}/inventory/stock-decrease` },
        { name: 'Warehouses', href: `/${orgSlug}/warehouse/warehouses` },
        { name: 'Transfer Orders', href: `/${orgSlug}/warehouse/transfer-orders` },
        { name: 'Cycle Counts', href: `/${orgSlug}/inventory/cycle-counts` },
        { name: 'Lot Tracking', href: `/${orgSlug}/inventory/lots` },
        { name: 'Valuations', href: `/${orgSlug}/inventory/valuations` },
      ],
    },
    {
      name: 'Operations',
      icon: Factory,
      featureKey: 'operations',
      children: [
        { name: 'Manufacturing BOMs', href: `/${orgSlug}/manufacturing/boms` },
        { name: 'Work Orders', href: `/${orgSlug}/manufacturing/work-orders` },
        { name: 'Assembly', href: `/${orgSlug}/manufacturing/assembly` },
        { name: 'Demand Forecasts', href: `/${orgSlug}/planning/forecasts` },
        { name: 'Safety Stock', href: `/${orgSlug}/planning/safety-stock` },
        { name: 'Quality Inspections', href: `/${orgSlug}/quality/inspections` },
        { name: 'Quality Holds', href: `/${orgSlug}/quality/holds` },
        { name: 'NCRs', href: `/${orgSlug}/quality/ncr` },
        { name: 'CAPAs', href: `/${orgSlug}/quality/capa` },
        { name: 'Field Service', href: `/${orgSlug}/field-service/work-orders` },
        { name: 'Maintenance', href: `/${orgSlug}/maintenance/work-orders` },
      ],
    },
    {
      name: 'Finance',
      icon: DollarSign,
      featureKey: 'finance',
      children: [
        { name: 'Financial Overview', href: `/${orgSlug}/dashboard/financial` },
        { name: 'Collections', href: `/${orgSlug}/collections` },
        { name: 'Banking', href: `/${orgSlug}/banking/accounts` },
        { name: 'Bank Feeds', href: `/${orgSlug}/bank-feeds` },
        { name: 'Reconciliation', href: `/${orgSlug}/banking/reconciliation` },
        { name: 'Expenses', href: `/${orgSlug}/expenses` },
        { name: 'All Payments', href: `/${orgSlug}/payments` },
        { name: 'Chart of Accounts', href: `/${orgSlug}/general-ledger/chart-of-accounts` },
        { name: 'Journal Entries', href: `/${orgSlug}/general-ledger/journal-entries/list` },
        { name: 'Reports', href: `/${orgSlug}/reports` },
        { name: 'Balance Sheet', href: `/${orgSlug}/reports/balance-sheet` },
        { name: 'Profit & Loss', href: `/${orgSlug}/reports/profit-loss` },
        { name: 'Cash Flow', href: `/${orgSlug}/reports/cash-flow` },
        { name: 'Trial Balance', href: `/${orgSlug}/reports/trial-balance` },
        { name: 'FX Gain/Loss', href: `/${orgSlug}/reports/fx-gain-loss` },
        { name: 'VAT Return', href: `/${orgSlug}/reports/tax/vat-return` },
        { name: 'Budgets', href: `/${orgSlug}/budgets` },
        { name: 'Tax Agencies', href: `/${orgSlug}/settings/taxes/agencies` },
        { name: 'Tax Rates', href: `/${orgSlug}/settings/taxes/rates` },
        { name: 'Tax Jurisdictions', href: `/${orgSlug}/tax/jurisdictions` },
      ],
    },
    {
      name: 'People',
      icon: UserCheck,
      featureKey: 'people',
      children: [
        { name: 'CRM Companies', href: `/${orgSlug}/crm/companies` },
        { name: 'CRM Contacts', href: `/${orgSlug}/crm/contacts` },
        { name: 'Employees', href: `/${orgSlug}/hcm/employees` },
        { name: 'Leave Requests', href: `/${orgSlug}/hcm/leave-requests` },
        { name: 'Expense Claims', href: `/${orgSlug}/hcm/expense-claims` },
      ],
    },
    {
      name: 'More',
      icon: LayoutGrid,
      featureKey: 'more',
      children: [
        { name: 'Projects', href: `/${orgSlug}/projects` },
        { name: 'Service Catalog', href: `/${orgSlug}/services` },
        { name: 'Documents', href: `/${orgSlug}/documents` },
        { name: 'Fixed Assets', href: `/${orgSlug}/fixed-assets` },
        { name: 'Asset Categories', href: `/${orgSlug}/asset-categories` },
        { name: 'Standard Costs', href: `/${orgSlug}/costing/standard-costs` },
        { name: 'Landed Costs', href: `/${orgSlug}/costing/landed-costs` },
        { name: 'Recurring Templates', href: `/${orgSlug}/recurring-templates` },
        { name: 'Recurring Executions', href: `/${orgSlug}/recurring-executions` },
        { name: 'Workflows', href: `/${orgSlug}/workflows/approvals` },
        { name: 'Price Lists', href: `/${orgSlug}/mdm/price-lists` },
        { name: 'Discounts', href: `/${orgSlug}/mdm/discounts` },
        { name: 'Audit Logs', href: `/${orgSlug}/security/audit-logs` },
        { name: 'Advanced Reports', href: `/${orgSlug}/reporting/dashboards` },
      ],
    },
    {
      name: 'Settings',
      icon: Settings,
      featureKey: 'settings',
      children: settingsChildren,
    },
  ];

  // Filter navigation based on business model
  const businessModel = organization?.businessModel || 'GENERAL';
  const businessProfile = getBusinessModelProfile(businessModel);
  
  // Show ALL navigation items - full ERP system with all 175 models
  const filteredNavigation = navigation;

  // No missing features - business model handles visibility
  const missingFeatures: any[] = [];
  
  const showUpgradePrompt = false;

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Keyboard Shortcuts Modal */}
      {shortcutsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShortcutsOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl border dark:border-slate-600 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-blue-500" />
                Keyboard Shortcuts
              </h2>
              <button onClick={() => setShortcutsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-5">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Global</h3>
                <div className="space-y-2">
                  {[
                    { keys: ['?'], desc: 'Show this help' },
                    { keys: ['/'], desc: 'Focus search' },
                    { keys: ['N'], desc: 'Open create menu' },
                    { keys: ['B'], desc: 'Toggle sidebar' },
                    { keys: ['Esc'], desc: 'Close modals & menus' },
                  ].map(s => (
                    <div key={s.desc} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-slate-300">{s.desc}</span>
                      <div className="flex items-center gap-1">
                        {s.keys.map(k => (
                          <kbd key={k} className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded border border-gray-200 dark:border-slate-600 min-w-[28px] text-center">{k}</kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Navigation (press G then...)</h3>
                <div className="space-y-2">
                  {[
                    { keys: ['G', 'D'], desc: 'Go to Dashboard' },
                    { keys: ['G', 'I'], desc: 'Go to Invoices' },
                    { keys: ['G', 'B'], desc: 'Go to Bills' },
                    { keys: ['G', 'C'], desc: 'Go to Customers' },
                    { keys: ['G', 'R'], desc: 'Go to Reports' },
                    { keys: ['G', 'S'], desc: 'Go to Settings' },
                  ].map(s => (
                    <div key={s.desc} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-slate-300">{s.desc}</span>
                      <div className="flex items-center gap-1">
                        {s.keys.map((k, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded border border-gray-200 dark:border-slate-600 min-w-[28px] text-center">{k}</kbd>
                            {i < s.keys.length - 1 && <span className="text-gray-400 text-xs">then</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-3 bg-gray-50 dark:bg-slate-700/50 text-xs text-gray-500 dark:text-slate-400 rounded-b-xl">
              Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-200 dark:bg-slate-600 rounded">?</kbd> anytime to toggle this panel
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {preferencesOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPreferencesOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl border dark:border-slate-600 w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-xl z-10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-500" />
                Preferences
              </h2>
              <button onClick={() => setPreferencesOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-6">

              {/* Theme */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  Appearance
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition ${
                      theme === 'light'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center text-lg">☀️</div>
                    <span className={`text-sm font-medium ${theme === 'light' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-slate-300'}`}>Light</span>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition ${
                      theme === 'dark'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-slate-800 flex items-center justify-center text-lg">🌙</div>
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-slate-300'}`}>Dark</span>
                  </button>
                </div>
              </div>

              {/* Font */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Font Family
                </h3>
                <div className="space-y-1">
                  {fontOptions.map((font) => (
                    <button
                      key={font.label}
                      onClick={() => setFontFamily(font.value)}
                      className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition flex items-center justify-between ${
                        fontFamily === font.value
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold ring-1 ring-blue-200 dark:ring-blue-700'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                      style={{ fontFamily: font.value }}
                    >
                      <span>{font.label}</span>
                      {fontFamily === font.value && <span className="text-blue-500">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Density */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Display Density
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Compact', value: 'compact' as const, icon: '▪️' },
                    { label: 'Default', value: 'comfortable' as const, icon: '◾' },
                    { label: 'Cozy', value: 'cozy' as const, icon: '⬛' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDensity(opt.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition text-center ${
                        density === opt.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                      }`}
                    >
                      <Rows3 className={`h-5 w-5 ${density === opt.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'}`} />
                      <span className={`text-xs font-medium ${density === opt.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-slate-400'}`}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sidebar */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Sidebar
                </h3>
                <button
                  onClick={() => setSidebarCollapsed(prev => !prev)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition ${
                    sidebarCollapsed
                      ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" /> : <PanelLeftClose className="h-5 w-5 text-gray-500 dark:text-slate-400" />}
                    <div className="text-left">
                      <div className={`text-sm font-medium ${sidebarCollapsed ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-slate-300'}`}>
                        {sidebarCollapsed ? 'Sidebar collapsed' : 'Sidebar expanded'}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-slate-500">Press B to toggle</div>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full flex items-center transition-colors ${sidebarCollapsed ? 'bg-blue-500 justify-end' : 'bg-gray-300 dark:bg-slate-600 justify-start'}`}>
                    <div className="w-4 h-4 bg-white rounded-full mx-1 shadow-sm" />
                  </div>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed ? 'w-16' : 'w-56'} bg-slate-900 border-r border-slate-700 transform transition-all duration-200 ease-in-out flex flex-col overflow-visible ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
          {!sidebarCollapsed ? (
            <Link href={`/${orgSlug}/dashboard`} className="text-xl font-bold text-blue-400">
              YourBooks
            </Link>
          ) : (
            <Link href={`/${orgSlug}/dashboard`} className="text-xl font-bold text-blue-400 mx-auto">
              YB
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Organization */}
        {!sidebarCollapsed && (
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {organization?.name}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
        </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto min-h-0">
          {filteredNavigation.map((item) => {
            const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
              // Clear any pending close timeout
              if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
              }
              
              setHoveredCategory(item.name);
              const rect = e.currentTarget.getBoundingClientRect();
              
              // Calculate smart positioning to avoid off-screen flyouts
              // Estimate flyout height: 48px header + (children * 40px per item) + 16px padding
              const estimatedFlyoutHeight = 48 + ((item.children?.length || 0) * 40) + 16;
              const viewportHeight = window.innerHeight;
              const spaceBelow = viewportHeight - rect.top;
              
              // If not enough space below, align to bottom with padding
              let topPosition = rect.top;
              if (spaceBelow < estimatedFlyoutHeight + 20) {
                // Not enough space below - position upward
                topPosition = Math.max(8, viewportHeight - estimatedFlyoutHeight - 8);
              }
              
              setFlyoutPosition({
                top: topPosition,
                left: rect.right + 8 // 8px gap between sidebar and flyout
              });
            };

            const handleMouseLeave = () => {
              // Delay closing to allow mouse to reach flyout
              closeTimeoutRef.current = setTimeout(() => {
                setHoveredCategory(null);
              }, 150);
            };

            return (
              <div
                key={item.name}
                ref={(el) => { categoryRefs.current[item.name] = el; }}
                className="relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {item.children ? (
                  <div className={`flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2 text-sm font-medium text-slate-300 rounded-md hover:bg-slate-800 cursor-pointer group`} title={sidebarCollapsed ? item.name : undefined}>
                    <div className="flex items-center">
                      <item.icon className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-3'} text-slate-400`} />
                      {!sidebarCollapsed && <span>{item.name}</span>}
                    </div>
                    {!sidebarCollapsed && <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-400" />}
                  </div>
                ) : (
                  <Link
                    href={item.href!}
                    className={`flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      pathname === item.href
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <item.icon className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </Link>
                )}
              </div>
            );
          })}
          {showUpgradePrompt && (
            <div className="mt-4 rounded-md border border-blue-900 bg-gradient-to-br from-blue-950 to-purple-950 p-3 text-xs">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-yellow-400" />
                <span className="font-semibold text-white">Unlock More Features</span>
              </div>
              <p className="text-blue-200 mb-2">
                Upgrade to access {missingFeatures.length} more feature{missingFeatures.length > 1 ? 's' : ''} including:
              </p>
              <ul className="text-blue-300 space-y-1 mb-3">
                {missingFeatures.slice(0, 3).map((feature) => (
                  <li key={feature.name} className="flex items-center gap-1">
                    <span className="text-yellow-400">•</span> {feature.name}
                  </li>
                ))}
                {missingFeatures.length > 3 && (
                  <li className="text-blue-400">and {missingFeatures.length - 3} more...</li>
                )}
              </ul>
              <div className="flex gap-2">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:from-blue-600 hover:to-purple-700 shadow-lg"
                >
                  View Plans
                </Link>
                <Link
                  href={`/${orgSlug}/settings/billing`}
                  className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold text-blue-300 hover:text-blue-100"
                >
                  Upgrade
                </Link>
              </div>
            </div>
          )}
        </nav>

        {/* Collapse Toggle + Logout - Fixed at Bottom */}
        <div className="mt-auto border-t border-slate-700 p-2 space-y-1">
          <button
            onClick={() => setSidebarCollapsed(prev => !prev)}
            className={`hidden lg:flex items-center w-full ${sidebarCollapsed ? 'justify-center' : 'px-3'} py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition`}
            title={sidebarCollapsed ? 'Expand sidebar (B)' : 'Collapse sidebar (B)'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <><PanelLeftClose className="h-5 w-5 mr-3" /><span>Collapse</span></>}
          </button>
          <button
            onClick={handleLogout}
            className={`flex items-center w-full ${sidebarCollapsed ? 'justify-center' : 'px-3'} py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-md transition`}
            title={sidebarCollapsed ? 'Logout' : undefined}
          >
            <LogOut className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-3'} text-slate-400`} />
            {!sidebarCollapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Flyout Menu Portal */}
      {hoveredCategory && flyoutPosition && (() => {
        const item = filteredNavigation.find(nav => nav.name === hoveredCategory);
        if (!item?.children) return null;
        
        const handleFlyoutMouseEnter = () => {
          // Clear any pending close timeout when mouse enters flyout
          if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
          }
        };

        const handleFlyoutMouseLeave = () => {
          // Close immediately when leaving flyout
          setHoveredCategory(null);
        };
        
        return (
          <div
            className="fixed w-64 max-h-[calc(100vh-16px)] rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl z-[100] animate-in fade-in slide-in-from-left-2 duration-150 overflow-hidden flex flex-col"
            style={{ 
              top: `${flyoutPosition.top}px`, 
              left: `${flyoutPosition.left}px` 
            }}
            onMouseEnter={handleFlyoutMouseEnter}
            onMouseLeave={handleFlyoutMouseLeave}
          >
            <div className="px-2 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">{item.name}</div>
            <div className="overflow-y-auto p-2">
              {item.children.map((child) => (
                <Link
                  key={child.name}
                  href={child.href}
                  className={`block px-3 py-2 text-sm rounded-md transition ${
                    pathname === child.href
                      ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {child.name}
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Main Content */}
      <div className={`transition-all duration-200 bg-gray-50 dark:bg-slate-900 min-h-screen ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-56'}`}>
        {/* Header */}
        <header className="h-16 bg-slate-900 dark:bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shadow-sm relative">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-300 hover:text-white lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex items-center space-x-6 w-full justify-between">
            <div className="flex items-center gap-4">
              {/* Create Button with Dropdown */}
              <div className="relative" ref={createMenuRef}>
                <button
                  onClick={() => setCreateMenuOpen(!createMenuOpen)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow-md transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Create
                </button>
                
                {createMenuOpen && (
                  <div className="absolute left-0 mt-2 w-[680px] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-600 z-50 overflow-hidden">
                    <div className="grid grid-cols-4 divide-x divide-gray-200 dark:divide-slate-700">
                      {/* Customers Column */}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 text-sm mb-3">Customers</h3>
                        <div className="space-y-1">
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/accounts-receivable/invoices/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors">Invoice</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/payments/customer`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors">Receive payment</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/accounts-receivable/statements/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors">Statement</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/accounts-receivable/estimates/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors">Estimate</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/credit-notes/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors">Credit note</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/accounts-receivable/sales-receipts/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors">Sales receipt</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/accounts-receivable/refunds/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors">Refund receipt</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/accounts-receivable/delayed-credits/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors">Delayed credit</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/accounts-receivable/delayed-charges/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors">Delayed charge</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/accounts-receivable/customers/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors font-medium">Add customer</button>
                        </div>
                      </div>
                      
                      {/* Suppliers Column */}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 text-sm mb-3">Suppliers</h3>
                        <div className="space-y-1">
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/accounts-payable/expenses/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors">Expense</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/accounts-payable/cheques/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors">Cheque</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/accounts-payable/bills/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors">Bill</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/accounts-payable/bill-payments/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors">Pay bills</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/procurement/purchase-orders/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors">Purchase order</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/inventory/goods-receipts/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors">Stock purchase</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/accounts-payable/supplier-credits/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors">Supplier credit</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/accounts-payable/credit-card-credits/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors">Credit card credit</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/accounts-payable/vendors/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors font-medium">Add supplier</button>
                        </div>
                      </div>
                      
                      {/* Team Column */}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 text-sm mb-3">Team</h3>
                        <div className="space-y-1">
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/hcm/employees/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-md transition-colors">Employee</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/hcm/timesheets/single`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-md transition-colors">Single time activity</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/hcm/timesheets/weekly`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-md transition-colors">Weekly timesheet</button>
                        </div>
                      </div>
                      
                      {/* Other Column */}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 text-sm mb-3">Other</h3>
                        <div className="space-y-1">
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/expenses/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors">Record expense</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/tasks/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors">Task</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/banking/deposits/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors">Bank deposit</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/banking/transfers/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors">Transfer</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/general-ledger/journal-entries/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors">Journal entry</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/inventory/adjustments/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors">Stock qty adjustment</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/payments/credit-card/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors">Pay down credit card</button>
                          <button onClick={() => { setCreateMenuOpen(false); window.location.href = `/${orgSlug}/inventory/products/new`; }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors font-medium">Add product/service</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <span className="text-lg font-bold text-white hidden md:inline-block">{organization?.name}</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Global Search Bar */}
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 100)}
                  placeholder="Search customers, invoices, accounts... (/)"
                  className="w-64 px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500"
                />
                {searchOpen && search && (
                  <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg shadow-lg p-2 z-50">
                    <div className="text-sm text-gray-600 dark:text-slate-300">Search results for "{search}"</div>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="text-slate-300 hover:text-white relative"
                aria-label="Notifications"
              >
                <span className="text-xl">🔔</span>
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Profile */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 text-slate-300 hover:text-white"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                </button>
                
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b dark:border-slate-700">
                      <div className="font-semibold text-gray-900 dark:text-slate-100">{user?.firstName} {user?.lastName}</div>
                      <div className="text-sm text-gray-600 dark:text-slate-400">{user?.email}</div>
                    </div>
                    <button
                      onClick={() => { setPreferencesOpen(true); setProfileOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Preferences
                    </button>
                    <button
                      onClick={() => { setShortcutsOpen(true); setProfileOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Keyboard className="w-4 h-4" />
                      Keyboard Shortcuts
                    </button>
                    {user?.isSystemAdmin && (
                      <Link
                        href="/system-admin"
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        onClick={() => setProfileOpen(false)}
                      >
                        <Shield className="w-4 h-4" />
                        System Admin Panel
                      </Link>
                    )}
                    <div className="border-t dark:border-slate-700 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="min-h-[calc(100vh-4rem)] p-6 max-w-[1600px] mx-auto dark:text-slate-200">
          {/* Trial countdown banner */}
          {subStatus === 'TRIAL' && trialEnd && (() => {
            const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000));
            return daysLeft <= 7 ? (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between ${daysLeft <= 2 ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                <span>⏳ Your free trial ends in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>. Subscribe to keep full access.</span>
                <a href="mailto:support@yourbooks.app?subject=Subscribe" className={`px-3 py-1 rounded-lg text-xs font-bold ${daysLeft <= 2 ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}>Subscribe Now</a>
              </div>
            ) : null;
          })()}
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 lg:hidden z-40 flex justify-around py-2">
          <Link href={`/${orgSlug}/dashboard`} className="flex flex-col items-center text-slate-300 hover:text-white">
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-xs mt-1">Dashboard</span>
          </Link>
          <Link href={`/${orgSlug}/accounts-receivable/invoices`} className="flex flex-col items-center text-slate-300 hover:text-white">
            <FileText className="w-5 h-5" />
            <span className="text-xs mt-1">Invoices</span>
          </Link>
          <Link href={`/${orgSlug}/accounts-payable/bills`} className="flex flex-col items-center text-slate-300 hover:text-white">
            <CreditCard className="w-5 h-5" />
            <span className="text-xs mt-1">Bills</span>
          </Link>
          <button onClick={() => setSearchOpen(true)} className="flex flex-col items-center text-slate-300 hover:text-white">
            <span className="text-xl">🔍</span>
            <span className="text-xs mt-1">Search</span>
          </button>
        </div>
      </div>
    </div>
  );
}
