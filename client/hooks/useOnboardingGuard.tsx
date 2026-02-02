/**
 * Onboarding Guard Hook
 * 
 * React hook to check onboarding status and redirect if needed.
 * Use this in pages that require onboarding completion.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';import { fetchWithAuth } from '@/lib/fetch-client';
export interface OnboardingCheckResult {
  loading: boolean;
  completed: boolean;
  hasChartOfAccounts: boolean;
  hasCompanyProfile: boolean;
  error: string | null;
}

/**
 * Hook to check if organization has completed onboarding
 * Automatically redirects to onboarding wizard if not completed
 * 
 * @param options - Configuration options
 * @returns Onboarding status
 */
export function useOnboardingGuard(options?: {
  redirect?: boolean;
  redirectUrl?: string;
}): OnboardingCheckResult {
  const router = useRouter();
  const [state, setState] = useState<OnboardingCheckResult>({
    loading: true,
    completed: false,
    hasChartOfAccounts: false,
    hasCompanyProfile: false,
    error: null,
  });
  const [isRedirecting, setIsRedirecting] = useState(false);

  const redirect = options?.redirect !== false; // Default to true
  const redirectUrl = options?.redirectUrl || '/onboarding';

  useEffect(() => {
    let mounted = true;

    const checkOnboarding = async () => {
      // Prevent redirect loop - don't redirect if already redirecting
      if (isRedirecting) {
        return;
      }

      try {
        // Get current session which includes organization info
        const response = await fetchWithAuth('/api/auth/session');
        
        if (!response.ok) {
          throw new Error('Failed to fetch session');
        }

        const data = await response.json();
        const org = data.data?.organization;

        if (!org) {
          throw new Error('No organization found');
        }

        // Check Chart of Accounts
        const coaResponse = await fetchWithAuth(
          `/api/orgs/${org.slug}/coa/generate?action=check`
        );
        const coaData = await coaResponse.json();
        // canGenerate: false means COA exists (inverted logic from the API)
        const hasChartOfAccounts = coaData.data?.canGenerate === false;

        // Check if company profile is complete
        const hasCompanyProfile = !!(
          org.legalName &&
          org.homeCountry &&
          org.baseCurrency
        );

        const completed = org.onboardingCompleted;

        if (mounted) {
          setState({
            loading: false,
            completed,
            hasChartOfAccounts,
            hasCompanyProfile,
            error: null,
          });

          // Redirect if onboarding not completed and redirect is enabled
          if (redirect && (!completed || !hasChartOfAccounts || !hasCompanyProfile)) {
            console.log('🔄 Onboarding incomplete, redirecting to:', redirectUrl);
            console.log('📊 Status:', { completed, hasChartOfAccounts, hasCompanyProfile });
            setIsRedirecting(true);
            
            // Small delay to prevent immediate re-execution
            setTimeout(() => {
              router.push(redirectUrl);
            }, 100);
          } else {
            console.log('✅ Onboarding complete, staying on page');
          }
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
        
        if (mounted) {
          setState({
            loading: false,
            completed: false,
            hasChartOfAccounts: false,
            hasCompanyProfile: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          // Redirect on error if enabled
          if (redirect && !isRedirecting) {
            setIsRedirecting(true);
            router.push(redirectUrl);
          }
        }
      }
    };

    checkOnboarding();

    return () => {
      mounted = false;
    };
  }, []); // Empty deps - only run once on mount to prevent redirect loops

  return state;
}

/**
 * Higher-order component to protect pages with onboarding guard
 * 
 * @example
 * export default withOnboardingGuard(DashboardPage);
 */
export function withOnboardingGuard<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function OnboardingGuardedComponent(props: P) {
    const { loading, completed, hasChartOfAccounts, hasCompanyProfile } = 
      useOnboardingGuard({ redirect: true });

    // Show loading state while checking
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Checking organization setup...</p>
          </div>
        </div>
      );
    }

    // Only render component if onboarding is complete
    if (completed && hasChartOfAccounts && hasCompanyProfile) {
      return <Component {...props} />;
    }

    // Show message while redirecting
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to onboarding...</p>
        </div>
      </div>
    );
  };
}

/**
 * Component to display onboarding status and requirements
 */
export function OnboardingStatusBanner() {
  const { loading, completed, hasChartOfAccounts, hasCompanyProfile, error } = 
    useOnboardingGuard({ redirect: false });

  if (loading || (completed && hasChartOfAccounts && hasCompanyProfile)) {
    return null;
  }

  const missingItems: string[] = [];
  if (!hasChartOfAccounts) missingItems.push('Chart of Accounts');
  if (!hasCompanyProfile) missingItems.push('Company Profile');
  if (!completed) missingItems.push('Onboarding completion');

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            {error ? (
              <span className="font-medium">Error checking onboarding status: {error}</span>
            ) : (
              <>
                <span className="font-medium">Setup Required: </span>
                Your organization needs to complete the following: {missingItems.join(', ')}
              </>
            )}
          </p>
          <p className="mt-2">
            <a
              href="/onboarding"
              className="text-sm font-medium text-yellow-700 underline hover:text-yellow-600"
            >
              Complete setup now →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
