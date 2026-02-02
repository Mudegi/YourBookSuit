/**
 * API: Initialize Compliance Pack
 * POST /api/[orgSlug]/tax/compliance-pack
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { initializeUgandaURAPack } from '@/lib/tax/uganda-ura-compliance';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true, compliancePack: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const { homeCountry } = body;

    if (!homeCountry) {
      return NextResponse.json(
        { error: 'homeCountry is required (e.g., "UG", "KE", "US")' },
        { status: 400 }
      );
    }

    // Import compliance pack selector
    const { 
      initializeCompliancePackForCountry, 
      getCompliancePackInfo 
    } = await import('@/lib/tax/compliance-pack-selector');

    // Get compliance pack info for country
    const packInfo = getCompliancePackInfo(homeCountry);

    // Update organization with country and pack
    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        homeCountry,
        compliancePack: packInfo.compliancePack,
        baseCurrency: packInfo.currency,
      },
    });

    // Initialize compliance pack (creates tax rates, WHT rules, etc.)
    const result = await initializeCompliancePackForCountry(
      organization.id,
      homeCountry
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error initializing compliance pack:', error);
    return NextResponse.json(
      { error: 'Failed to initialize compliance pack', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/[orgSlug]/tax/compliance-pack
 * Get current compliance pack settings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: {
        id: true,
        name: true,
        homeCountry: true,
        compliancePack: true,
        baseCurrency: true,
        taxRates: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        whtRules: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error('Error fetching compliance pack:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compliance pack', details: String(error) },
      { status: 500 }
    );
  }
}
