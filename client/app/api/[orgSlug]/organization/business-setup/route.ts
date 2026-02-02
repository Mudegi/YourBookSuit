/**
 * API: Business Model Setup
 * POST /api/[orgSlug]/organization/business-setup - Set business model for organization
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCOAIndustryType } from '@/lib/business-models';

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    // Get user ID from headers (set by middleware)
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessModel } = await request.json();

    if (!businessModel) {
      return NextResponse.json({ error: 'Business model is required' }, { status: 400 });
    }

    // Get user's organization by slug
    const userOrg = await prisma.organizationUser.findFirst({
      where: { 
        userId,
        organization: { slug: params.orgSlug }
      },
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
        industry: getCOAIndustryType(businessModel),
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