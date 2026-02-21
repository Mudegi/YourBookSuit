'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/api-client';

/**
 * If the user already has a valid session, redirect them to their dashboard.
 * Drop this component at the top of any public page (landing, login, register)
 * so that logged-in users are never shown marketing / auth pages.
 */
export function AuthRedirect() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // If the user just logged out, don't redirect back
    try {
      if (sessionStorage.getItem('just_logged_out')) {
        sessionStorage.removeItem('just_logged_out');
        setChecking(false);
        return;
      }
    } catch {}

    const token = getAuthToken();
    if (!token) {
      setChecking(false);
      return;
    }

    // Token exists — verify session and find org slug
    fetch('/api/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data?.success && data?.data?.user) {
          const user = data.data.user;
          const org  = data.data.organization;

          if (user.isSystemAdmin) {
            router.replace('/system-admin');
          } else if (org?.slug) {
            router.replace(`/${org.slug}/dashboard`);
          } else {
            // Has account but no org yet
            router.replace('/onboarding');
          }
        } else {
          // Token is stale / invalid — let them stay on the page
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (!checking) return null;

  // Brief loading state while verifying — avoids flash of landing page content
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950">
      <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
}
