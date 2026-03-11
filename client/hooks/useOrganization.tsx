'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchWithAuth } from '@/lib/fetch-client';

interface Organization {
  id: string;
  name: string;
  slug: string;
  baseCurrency: string;
  homeCountry: string;
  legalName?: string;
  fiscalYearStart: number;
  onboardingCompleted: boolean;
}

/**
 * Hook to get organization data and currency
 * Fetches from session API
 */
export function useOrganization() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [cachedCurrency, setCachedCurrency] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hydrate cached currency from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('orgCurrency');
      if (stored) setCachedCurrency(stored);
    } catch {}
  }, []);

  useEffect(() => {
    async function fetchOrganization() {
      try {
        const response = await fetchWithAuth('/api/auth/session');
        const data = await response.json();
        
        // API returns { success, data: { user, organization, role } }
        const org = data?.data?.organization;
        if (data.success && org) {
          setOrganization(org);
          try {
            if (typeof window !== 'undefined' && org?.baseCurrency) {
              localStorage.setItem('orgCurrency', org.baseCurrency);
            }
          } catch {}
        } else {
          setError('Organization not found');
        }
      } catch (err) {
        console.error('Error fetching organization:', err);
        setError('Failed to load organization');
      } finally {
        setLoading(false);
      }
    }

    if (orgSlug) {
      fetchOrganization();
    }
  }, [orgSlug]);

  return {
    organization,
    currency: organization?.baseCurrency || cachedCurrency,
    loading,
    error,
  };
}
