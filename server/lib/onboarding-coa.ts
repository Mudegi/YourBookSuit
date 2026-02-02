/**
 * Onboarding Helper for Chart of Accounts
 * 
 * This module provides utilities to integrate COA generation into the onboarding process.
 * It ensures new organizations start with a complete, industry-appropriate account structure.
 */

import { generateChartOfAccounts, type IndustryType } from './coa-generator';
import { prisma } from './prisma';

export interface OnboardingCOAOptions {
  organizationId: string;
  industryType: IndustryType;
  baseCurrency?: string;
}

/**
 * Generate COA as part of organization onboarding
 * This is the primary function to call during new organization setup
 */
export async function setupOrganizationCOA(options: OnboardingCOAOptions) {
  const { organizationId, industryType, baseCurrency } = options;

  // Generate the chart of accounts
  const result = await generateChartOfAccounts({
    organizationId,
    industryType,
    baseCurrency,
    includeOptionalAccounts: true,
  });

  if (!result.success) {
    throw new Error(`Failed to setup COA: ${result.error}`);
  }

  // Mark onboarding as having COA setup completed
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      industry: industryType,
    } as any,
  });

  return result;
}

/**
 * Complete organization onboarding with COA generation
 * Use this in your onboarding API route
 */
export async function completeOnboardingWithCOA(
  organizationData: {
    name: string;
    slug: string;
    baseCurrency: string;
    industryType: IndustryType;
    [key: string]: any;
  },
  userId: string
) {
  // This wraps the entire onboarding in a transaction for safety
  return await prisma.$transaction(async (tx) => {
    // 1. Create organization
    const organization = await tx.organization.create({
      data: {
        name: organizationData.name,
        slug: organizationData.slug,
        baseCurrency: organizationData.baseCurrency,
        industry: organizationData.industryType,
        isActive: true,
      } as any,
    });

    // 2. Link user to organization
    await tx.organizationUser.create({
      data: {
        organizationId: organization.id,
        userId: userId,
        role: 'ADMIN',
        isActive: true,
      },
    });

    // 3. Generate Chart of Accounts (within the same transaction)
    // Note: We need to use tx instead of prisma for COA generation
    const accountTemplates = await import('./coa-generator').then((mod) =>
      mod.getAccountTemplates(organizationData.industryType, true)
    );

    const createdAccounts = [];
    for (const template of accountTemplates) {
      const account = await tx.chartOfAccount.create({
        data: {
          organizationId: organization.id,
          code: template.code,
          name: template.name,
          accountType: template.accountType,
          accountSubType: template.accountSubType,
          description: template.description,
          currency: organizationData.baseCurrency,
          isActive: true,
          isSystem: template.isSystem ?? false,
          balance: 0,
        },
      });
      createdAccounts.push(account);
    }

    // 4. Mark onboarding as completed
    await tx.organization.update({
      where: { id: organization.id },
      data: { onboardingCompleted: true } as any,
    });

    return {
      organization,
      accountsCreated: createdAccounts.length,
      accounts: createdAccounts,
    };
  });
}

/**
 * Validate onboarding data before processing
 */
export function validateOnboardingData(data: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push('Organization name must be at least 2 characters');
  }

  if (!data.slug || !/^[a-z0-9-]+$/.test(data.slug)) {
    errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
  }

  if (!data.baseCurrency || data.baseCurrency.length !== 3) {
    errors.push('Currency must be a valid 3-letter code (e.g., USD, EUR)');
  }

  const validIndustries = [
    'GENERAL',
    'RETAIL',
    'MANUFACTURING',
    'SERVICES',
    'CONSTRUCTION',
    'HOSPITALITY',
    'HEALTHCARE',
    'TECHNOLOGY',
    'REAL_ESTATE',
    'NONPROFIT',
  ];

  if (!data.industryType || !validIndustries.includes(data.industryType)) {
    errors.push('Invalid industry type');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Example usage in an onboarding API route:
 * 
 * ```typescript
 * import { completeOnboardingWithCOA } from '@/lib/onboarding-coa';
 * 
 * export async function POST(req: NextRequest) {
 *   const userId = await getUserId(); // Your auth logic
 *   const data = await req.json();
 *   
 *   const result = await completeOnboardingWithCOA(
 *     {
 *       name: data.organizationName,
 *       slug: data.organizationSlug,
 *       baseCurrency: data.currency,
 *       industryType: data.industry,
 *     },
 *     userId
 *   );
 *   
 *   return NextResponse.json({ success: true, data: result });
 * }
 * ```
 */
