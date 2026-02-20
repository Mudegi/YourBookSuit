'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-client';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSystemAdmin: boolean;
}

export default function SystemAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const response = await fetchWithAuth('/api/auth/session');
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        if (!data.data?.user?.isSystemAdmin) {
          // Not a system admin — redirect to their org dashboard
          if (data.data?.organization?.slug) {
            router.push(`/${data.data.organization.slug}/dashboard`);
          } else {
            router.push('/login');
          }
          return;
        }
        setUser(data.data.user);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    verifyAdmin();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    document.documentElement.classList.remove('dark');
    document.documentElement.style.removeProperty('--app-font');
    document.documentElement.removeAttribute('data-density');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const navItems = [
    { label: 'Dashboard', href: '/system-admin', icon: '📊' },
    { label: 'Organizations', href: '/system-admin/organizations', icon: '🏢' },
    { label: 'Users', href: '/system-admin/users', icon: '👥' },
    { label: 'Subscriptions', href: '/system-admin/subscriptions', icon: '💳' },
    { label: 'Audit Log', href: '/system-admin/audit', icon: '📋' },
    { label: 'Settings', href: '/system-admin/settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-gray-900 text-white flex flex-col transition-all duration-200 flex-shrink-0`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-800 gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">SA</span>
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-white truncate">System Admin</div>
              <div className="text-xs text-gray-400 truncate">YourBooks Platform</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                title={item.label}
              >
                <span className="text-base flex-shrink-0">{item.icon}</span>
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom controls */}
        <div className="p-3 border-t border-gray-800 space-y-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <span className="flex-shrink-0">{sidebarOpen ? '◀' : '▶'}</span>
            {sidebarOpen && <span>Collapse</span>}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 transition-colors"
          >
            <span className="flex-shrink-0">🚪</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <h1 className="text-lg font-bold text-gray-900">
            {navItems.find(n => n.href === pathname)?.label || 'System Administration'}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {user.firstName} {user.lastName}
            </span>
            <div className="w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold">
              {user.firstName[0]}{user.lastName[0]}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
