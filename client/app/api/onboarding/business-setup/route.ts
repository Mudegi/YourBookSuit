/**
 * API: Business Model Setup for Onboarding
 * POST /api/onboarding/business-setup - Set business model for organization during onboarding
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get current user from token
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    const { businessModel } = await request.json();

    if (!businessModel) {
      return NextResponse.json({ error: 'Business model is required' }, { status: 400 });
    }

    // Get user's organization
    const userOrg = await prisma.organizationUser.findFirst({
      where: { userId },
      include: { organization: true },
    });

    if (!userOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Update the organization with the business model
    const organization = await prisma.organization.update({
      where: { 
        id: userOrg.organizationId
      },
      data: {
        businessModel,
        // For demo/testing purposes, if it's FULL_FEATURED, enable all features
        ...(businessModel === 'FULL_FEATURED' && {
          package: 'ENTERPRISE'
        })
      },
    });

    return NextResponse.json({
      success: true,
      data: organization,
    });

  } catch (error: any) {
    console.error('Error updating business model:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update business model',
        details: error.message,
      },
      { status: 500 }
    );
  }
}