/**
 * API Route: Check Onboarding Status
 * 
 * GET /api/onboarding/status
 * Returns the current onboarding status for the user's organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkOnboardingStatus } from '@/lib/onboarding-guard';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get user ID from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const userOrg = await prisma.organizationUser.findFirst({
      where: { userId },
      select: {
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!userOrg) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check onboarding status
    const status = await checkOnboardingStatus(userOrg.organizationId);

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Failed to check onboarding status' },
        { status: 500 }
      );
    }

    // Determine what's missing
    const missingRequirements: string[] = [];
    if (!status.hasChartOfAccounts) {
      missingRequirements.push('Chart of Accounts not set up');
    }
    if (!status.hasCompanyProfile) {
      missingRequirements.push('Company profile incomplete');
    }
    if (!status.completed) {
      missingRequirements.push('Onboarding not marked as completed');
    }

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        organizationSlug: userOrg.organization.slug,
        isReady: status.completed && status.hasChartOfAccounts && status.hasCompanyProfile,
        missingRequirements,
      },
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
