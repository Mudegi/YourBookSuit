import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/[orgSlug]/settings/currency
 * Get currency settings for the organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { orgSlug } = params;

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: {
        id: true,
        baseCurrency: true,
        fxGainAccountId: true,
        fxLossAccountId: true,
        unrealizedFxGainAccountId: true,
        unrealizedFxLossAccountId: true,
        defaultExchangeRateProvider: true,
        enableAutoFetchRates: true,
        exchangeRateBufferPercent: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error('Error fetching currency settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch currency settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/[orgSlug]/settings/currency
 * Update currency settings for the organization
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { orgSlug } = params;
    const body = await request.json();

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Update settings
    const updatedOrg = await prisma.organization.update({
      where: { id: organization.id },
      data: {
        fxGainAccountId: body.fxGainAccountId,
        fxLossAccountId: body.fxLossAccountId,
        unrealizedFxGainAccountId: body.unrealizedFxGainAccountId,
        unrealizedFxLossAccountId: body.unrealizedFxLossAccountId,
        defaultExchangeRateProvider: body.defaultExchangeRateProvider,
        enableAutoFetchRates: body.enableAutoFetchRates,
        exchangeRateBufferPercent: body.exchangeRateBufferPercent 
          ? parseFloat(body.exchangeRateBufferPercent) 
          : null,
      },
      select: {
        id: true,
        baseCurrency: true,
        fxGainAccountId: true,
        fxLossAccountId: true,
        unrealizedFxGainAccountId: true,
        unrealizedFxLossAccountId: true,
        defaultExchangeRateProvider: true,
        enableAutoFetchRates: true,
        exchangeRateBufferPercent: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedOrg,
    });
  } catch (error) {
    console.error('Error updating currency settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update currency settings' },
      { status: 500 }
    );
  }
}
