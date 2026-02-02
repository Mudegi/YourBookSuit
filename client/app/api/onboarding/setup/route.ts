/**
 * API: Organization Onboarding
 * POST /api/onboarding/setup
 * 
 * Handles initial organization setup including country selection
 * and automatic compliance pack initialization
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { 
  getCompliancePackInfo, 
  initializeCompliancePackForCountry 
} from '@/lib/tax/compliance-pack-selector';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      organizationName,
      organizationSlug,
      homeCountry, // 'UG', 'KE', 'US', etc.
      legalName,
      taxIdNumber,
      tradingLicense,
      address,
      phone,
      email,
    } = body;

    // Validation
    if (!organizationName || !organizationSlug || !homeCountry) {
      return NextResponse.json(
        { error: 'organizationName, organizationSlug, and homeCountry are required' },
        { status: 400 }
      );
    }

    // Get compliance pack info for selected country
    const packInfo = getCompliancePackInfo(homeCountry);

    // Create organization with country-specific settings
    const organization = await prisma.organization.create({
      data: {
        name: organizationName,
        slug: organizationSlug,
        legalName: legalName || organizationName,
        taxIdNumber,
        tradingLicense,
        address,
        phone,
        email,
        homeCountry,
        compliancePack: packInfo.compliancePack,
        baseCurrency: packInfo.currency,
        fiscalYearStart: 1, // January
        isActive: true,
      },
    });

    // Initialize compliance pack (creates tax rates, WHT rules, etc.)
    let complianceResult = null;
    try {
      complianceResult = await initializeCompliancePackForCountry(
        organization.id,
        homeCountry
      );
    } catch (error) {
      console.error('Error initializing compliance pack:', error);
      // Continue even if compliance pack initialization fails
      complianceResult = {
        success: false,
        message: 'Compliance pack initialization failed. You can configure taxes manually.',
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          homeCountry: organization.homeCountry,
          compliancePack: organization.compliancePack,
          baseCurrency: organization.baseCurrency,
        },
        compliancePack: {
          name: packInfo.countryName,
          pack: packInfo.compliancePack,
          features: packInfo.features,
          initialized: complianceResult?.success || false,
          message: complianceResult?.message,
        },
      },
    });
  } catch (error: any) {
    console.error('Error during onboarding:', error);
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return NextResponse.json(
        { error: `Organization ${field} already exists` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create organization', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/onboarding/countries
 * Get list of supported countries for onboarding
 */
export async function GET(request: NextRequest) {
  try {
    const { getSupportedCountries, isCountryFullySupported } = await import(
      '@/lib/tax/compliance-pack-selector'
    );

    const countries = getSupportedCountries();

    const countriesWithStatus = countries.map((country) => ({
      code: country.country,
      name: country.countryName,
      currency: country.currency,
      compliancePack: country.compliancePack,
      features: country.features,
      taxTypes: country.taxTypes,
      fullyImplemented: isCountryFullySupported(country.country),
      recommended: country.country === 'UG', // Highlight Uganda as fully supported
    }));

    return NextResponse.json({
      success: true,
      data: countriesWithStatus,
    });
  } catch (error) {
    console.error('Error fetching countries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries', details: String(error) },
      { status: 500 }
    );
  }
}
