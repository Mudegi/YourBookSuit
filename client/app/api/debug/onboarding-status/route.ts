/**
 * Debug endpoint to check onboarding status
 * GET /api/debug/onboarding-status
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const session = await verifyToken(token);
    if (!session?.organizationId) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 404 }
      );
    }

    // Get full organization details
    const org = await prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        onboardingCompleted: true,
        legalName: true,
        homeCountry: true,
        baseCurrency: true,
        industry: true,
        _count: {
          select: {
            chartOfAccounts: true,
          },
        },
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get first few COA entries
    const sampleAccounts = await prisma.chartOfAccount.findMany({
      where: { organizationId: org.id },
      take: 5,
      select: {
        code: true,
        name: true,
        accountType: true,
      },
    });

    // Calculate what's missing
    const checks = {
      onboardingCompleted: org.onboardingCompleted,
      hasChartOfAccounts: org._count.chartOfAccounts > 0,
      accountCount: org._count.chartOfAccounts,
      hasCompanyProfile: !!(org.legalName && org.homeCountry && org.baseCurrency),
      legalName: org.legalName || '❌ MISSING',
      homeCountry: org.homeCountry || '❌ MISSING',
      baseCurrency: org.baseCurrency || '❌ MISSING',
      industry: org.industry || '❌ MISSING',
    };

    const allGood = 
      checks.onboardingCompleted && 
      checks.hasChartOfAccounts && 
      checks.hasCompanyProfile;

    return NextResponse.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      checks,
      sampleAccounts,
      verdict: allGood 
        ? '✅ All checks passed - Dashboard should work' 
        : '❌ Onboarding incomplete - Need to fix issues',
      recommendations: !allGood ? [
        !checks.onboardingCompleted && 'Set onboardingCompleted = true after completing all steps',
        !checks.hasChartOfAccounts && 'Go to Step 2 and select an industry to generate COA',
        !checks.hasCompanyProfile && 'Complete company profile (legalName, homeCountry, baseCurrency)',
      ].filter(Boolean) : [],
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
