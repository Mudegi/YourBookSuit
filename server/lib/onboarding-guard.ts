/**
 * Onboarding Guard
 * 
 * Utility functions to check if an organization has completed onboarding.
 * Ensures users cannot access dashboard, ledger, or transaction pages
 * without first setting up their Chart of Accounts and Company Profile.
 */

import { prisma } from '@/lib/prisma';

export interface OnboardingStatus {
  completed: boolean;
  hasChartOfAccounts: boolean;
  hasCompanyProfile: boolean;
  organizationId: string;
  organizationName: string;
}

/**
 * Check if an organization has completed the onboarding process
 * 
 * @param organizationId - The organization ID to check
 * @returns Onboarding status with details
 */
export async function checkOnboardingStatus(
  organizationId: string
): Promise<OnboardingStatus | null> {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        chartOfAccounts: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!organization) {
      return null;
    }

    // Check if COA exists
    const hasChartOfAccounts = organization.chartOfAccounts.length > 0;

    // Check if company profile is filled
    const hasCompanyProfile = !!(
      organization.legalName &&
      organization.homeCountry &&
      organization.baseCurrency
    );

    // Type assertion needed because Prisma's include doesn't properly type all fields
    const org = organization as typeof organization & { onboardingCompleted: boolean | null };

    return {
      completed: org.onboardingCompleted ?? false,
      hasChartOfAccounts,
      hasCompanyProfile,
      organizationId: org.id,
      organizationName: org.name,
    };
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return null;
  }
}

/**
 * Check if organization has completed onboarding by slug
 * 
 * @param orgSlug - The organization slug
 * @returns Onboarding status or null if not found
 */
export async function checkOnboardingBySlug(
  orgSlug: string
): Promise<OnboardingStatus | null> {
  try {
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      include: {
        chartOfAccounts: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!organization) {
      return null;
    }

    const hasChartOfAccounts = organization.chartOfAccounts.length > 0;
    const hasCompanyProfile = !!(
      organization.legalName &&
      organization.homeCountry &&
      organization.baseCurrency
    );

    // Type assertion needed because Prisma's include doesn't properly type all fields
    const org = organization as typeof organization & { onboardingCompleted: boolean | null };

    return {
      completed: org.onboardingCompleted ?? false,
      hasChartOfAccounts,
      hasCompanyProfile,
      organizationId: org.id,
      organizationName: org.name,
    };
  } catch (error) {
    console.error('Error checking onboarding by slug:', error);
    return null;
  }
}

/**
 * Routes that require completed onboarding
 * Users will be redirected to onboarding if they access these without completion
 */
export const PROTECTED_ROUTES = [
  '/dashboard',
  '/ledger',
  '/general-ledger',
  '/accounts',
  '/chart-of-accounts',
  '/transactions',
  '/journals',
  '/invoices',
  '/bills',
  '/payments',
  '/customers',
  '/vendors',
  '/inventory',
  '/products',
  '/assets',
  '/reporting',
  '/financial-statements',
  '/bank',
  '/reconciliation',
  '/tax',
  '/compliance',
  '/payroll',
  '/manufacturing',
  '/projects',
  '/settings',
];

/**
 * Check if a path requires onboarding completion
 * 
 * @param pathname - The path to check
 * @returns True if the path requires onboarding
 */
export function requiresOnboarding(pathname: string): boolean {
  // Remove org slug from path (e.g., /my-org/dashboard -> /dashboard)
  const pathWithoutOrg = pathname.replace(/^\/[^\/]+/, '');
  
  // Check if the path matches any protected route
  return PROTECTED_ROUTES.some(route => 
    pathWithoutOrg.startsWith(route) || pathname.includes(route)
  );
}

/**
 * Check if user can access a specific route
 * 
 * @param pathname - The path user is trying to access
 * @param organizationId - The organization ID
 * @returns Object with access decision and redirect URL if needed
 */
export async function checkRouteAccess(
  pathname: string,
  organizationId: string
): Promise<{
  allowed: boolean;
  redirectTo?: string;
  reason?: string;
}> {
  // Allow onboarding routes
  if (pathname.includes('/onboarding')) {
    return { allowed: true };
  }

  // Allow API routes for onboarding
  if (pathname.includes('/api/onboarding')) {
    return { allowed: true };
  }

  // Check if route requires onboarding
  if (!requiresOnboarding(pathname)) {
    return { allowed: true };
  }

  // Check onboarding status
  const status = await checkOnboardingStatus(organizationId);

  if (!status) {
    return {
      allowed: false,
      redirectTo: '/onboarding',
      reason: 'Organization not found',
    };
  }

  if (!status.completed) {
    return {
      allowed: false,
      redirectTo: '/onboarding',
      reason: 'Onboarding not completed',
    };
  }

  if (!status.hasChartOfAccounts) {
    return {
      allowed: false,
      redirectTo: '/onboarding',
      reason: 'Chart of Accounts not set up',
    };
  }

  if (!status.hasCompanyProfile) {
    return {
      allowed: false,
      redirectTo: '/onboarding',
      reason: 'Company profile not completed',
    };
  }

  return { allowed: true };
}

/**
 * Validate that organization has minimum requirements for transactions
 * 
 * @param organizationId - The organization ID
 * @returns Validation result with details
 */
export async function validateTransactionReadiness(
  organizationId: string
): Promise<{
  ready: boolean;
  missingRequirements: string[];
}> {
  const status = await checkOnboardingStatus(organizationId);

  if (!status) {
    return {
      ready: false,
      missingRequirements: ['Organization not found'],
    };
  }

  const missing: string[] = [];

  if (!status.completed) {
    missing.push('Onboarding process not completed');
  }

  if (!status.hasChartOfAccounts) {
    missing.push('Chart of Accounts not set up');
  }

  if (!status.hasCompanyProfile) {
    missing.push('Company profile information incomplete');
  }

  return {
    ready: missing.length === 0,
    missingRequirements: missing,
  };
}
