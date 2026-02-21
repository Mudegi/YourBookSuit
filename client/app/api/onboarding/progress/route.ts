/**
 * GET /api/onboarding/progress
 *
 * Returns an organisation's onboarding progress so the onboarding wizard
 * can resume from where the user left off and pre-fill fields.
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userOrg = await prisma.organizationUser.findFirst({
      where: { userId: user.id },
      include: {
        organization: {
          include: {
            bankAccounts: {
              take: 1,
              orderBy: { createdAt: 'asc' },
              select: {
                accountName: true,
                bankName: true,
                accountNumber: true,
                currentBalance: true,
              },
            },
            chartOfAccounts: {
              take: 1,
              select: { id: true },
            },
          },
        },
      },
    });

    if (!userOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const org = userOrg.organization;
    const bank = org.bankAccounts[0] ?? null;
    const hasCOA = org.chartOfAccounts.length > 0;

    // Determine furthest completed step
    // Step 1: Company — name + baseCurrency filled
    // Step 2: Business — businessModel set + COA seeded
    // Step 3: Banking — bankAccount exists
    // Step 4: Plan — (just a UI selection, nothing persisted until step 5)
    // Step 5: Payment — onboardingCompleted === true
    let completedStep = 0;
    if (org.name && org.baseCurrency) completedStep = 1;
    if (completedStep >= 1 && org.businessModel && org.businessModel !== 'GENERAL' && hasCOA) completedStep = 2;
    if (completedStep >= 2 && bank) completedStep = 3;
    // Steps 4 + 5 are payment — onboardingCompleted signals they finished
    if (completedStep >= 3 && org.onboardingCompleted) completedStep = 5;

    return NextResponse.json({
      success: true,
      data: {
        completedStep,
        organization: {
          name: org.name,
          slug: org.slug,
          legalName: org.legalName,
          homeCountry: org.homeCountry,
          baseCurrency: org.baseCurrency,
          fiscalYearStart: org.fiscalYearStart,
          businessModel: org.businessModel,
          onboardingCompleted: org.onboardingCompleted,
          subscriptionStatus: org.subscriptionStatus,
        },
        bank: bank
          ? {
              bankName: bank.bankName,
              accountNumber: bank.accountNumber,
              openingBalance: Number(bank.currentBalance ?? 0),
            }
          : null,
        hasCOA,
      },
    });
  } catch (error: any) {
    console.error('Onboarding progress error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
