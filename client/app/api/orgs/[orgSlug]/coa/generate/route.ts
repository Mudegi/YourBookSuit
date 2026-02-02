/**
 * COA Generation API Endpoint
 * POST /api/orgs/[orgSlug]/coa/generate
 * 
 * Generates Chart of Accounts for an organization based on industry type
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateChartOfAccounts, canGenerateCOA, getAvailableIndustries, previewCOA, type IndustryType } from '@/lib/coa-generator';
import { prisma } from '@/lib/prisma';

/**
 * GET - Get COA generation information (available industries, preview)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const industryType = searchParams.get('industry') as IndustryType;

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true, name: true },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if can generate
    if (action === 'check') {
      const canGenerate = await canGenerateCOA(organization.id);
      return NextResponse.json({
        success: true,
        data: canGenerate,
      });
    }

    // Get available industries
    if (action === 'industries') {
      const industries = getAvailableIndustries();
      return NextResponse.json({
        success: true,
        data: industries,
      });
    }

    // Preview COA for industry
    if (action === 'preview' && industryType) {
      const preview = previewCOA(industryType);
      return NextResponse.json({
        success: true,
        data: preview,
      });
    }

    // Default: Return available industries
    const industries = getAvailableIndustries();
    return NextResponse.json({
      success: true,
      data: {
        industries,
      },
    });
  } catch (error) {
    console.error('COA Info Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get COA information',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Generate Chart of Accounts
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true, name: true, baseCurrency: true },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { industryType, includeOptionalAccounts = true } = body;

    // Validate industry type
    if (!industryType) {
      return NextResponse.json(
        { success: false, error: 'Industry type is required' },
        { status: 400 }
      );
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

    if (!validIndustries.includes(industryType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid industry type',
          validIndustries,
        },
        { status: 400 }
      );
    }

    // Check if organization can have COA generated
    const canGenerate = await canGenerateCOA(organization.id);
    if (!canGenerate.canGenerate) {
      return NextResponse.json(
        {
          success: false,
          error: canGenerate.reason || 'Cannot generate COA for this organization',
        },
        { status: 400 }
      );
    }

    // Generate Chart of Accounts
    const result = await generateChartOfAccounts({
      organizationId: organization.id,
      industryType: industryType as IndustryType,
      baseCurrency: organization.baseCurrency,
      includeOptionalAccounts,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to generate chart of accounts',
        },
        { status: 500 }
      );
    }

    // Update organization's industry field if provided
    if (industryType) {
      await prisma.organization.update({
        where: { id: organization.id },
        data: { industry: industryType } as any,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${result.accountsCreated} accounts for ${organization.name}`,
      data: {
        accountsCreated: result.accountsCreated,
        industryType,
        organization: {
          id: organization.id,
          name: organization.name,
        },
      },
    });
  } catch (error) {
    console.error('COA Generation Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate chart of accounts',
      },
      { status: 500 }
    );
  }
}
