/**
 * API: Tax Jurisdictions Management
 * POST /api/[orgSlug]/tax/jurisdictions - Create tax jurisdiction
 * GET /api/[orgSlug]/tax/jurisdictions - List tax jurisdictions
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(payload.role, Permission.MANAGE_TAX_JURISDICTIONS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      code,
      jurisdictionType,
      country,
      countryCode,
      stateProvince,
      countyDistrict,
      city,
      postalCode,
      postalCodeStart,
      postalCodeEnd,
      taxAuthority,
      taxLiabilityAccountId,
      eInvoiceFormat,
      requiresEInvoicing,
      metadata,
      parentJurisdictionId,
      isActive = true,
      notes,
    } = body;

    // Validation
    if (!name || !code || !jurisdictionType || !country) {
      return NextResponse.json(
        { error: 'Missing required fields: name, code, jurisdictionType, country' },
        { status: 400 }
      );
    }

    // Validate tax liability account belongs to organization
    if (taxLiabilityAccountId) {
      const account = await prisma.chartOfAccount.findFirst({
        where: {
          id: taxLiabilityAccountId,
          organizationId: organization.id,
        },
      });
      if (!account) {
        return NextResponse.json(
          { error: 'Tax liability account not found or does not belong to organization' },
          { status: 400 }
        );
      }
    }

    // Create tax jurisdiction
    const taxJurisdiction = await prisma.taxJurisdiction.create({
      data: {
        organizationId: organization.id,
        name,
        code,
        jurisdictionType,
        country,
        countryCode,
        stateProvince,
        countyDistrict,
        city,
        postalCode,
        postalCodeStart,
        postalCodeEnd,
        taxAuthority,
        taxLiabilityAccountId,
        eInvoiceFormat,
        requiresEInvoicing,
        metadata,
        parentJurisdictionId,
        isActive,
        notes,
      },
      include: {
        parentJurisdiction: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        taxLiabilityAccount: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: taxJurisdiction,
    });
  } catch (error: any) {
    console.error('Error creating tax jurisdiction:', error);
    return NextResponse.json(
      { error: 'Failed to create tax jurisdiction', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(payload.role, Permission.VIEW_TAX_JURISDICTIONS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const jurisdictionType = searchParams.get('jurisdictionType');
    const country = searchParams.get('country');
    const isActive = searchParams.get('isActive');

    // Build filter
    const where: any = {
      organizationId: organization.id,
    };

    if (jurisdictionType) {
      where.jurisdictionType = jurisdictionType;
    }

    if (country) {
      where.country = country;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const taxJurisdictions = await prisma.taxJurisdiction.findMany({
      where,
      include: {
        parentJurisdiction: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        childJurisdictions: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        taxLiabilityAccount: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: taxJurisdictions,
    });
  } catch (error: any) {
    console.error('Error fetching tax jurisdictions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax jurisdictions', details: error.message },
      { status: 500 }
    );
  }
}
