import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ExchangeRateService } from '@/services/currency/exchange-rate.service';

/**
 * POST /api/[orgSlug]/exchange-rates/fetch
 * Fetch latest rates from external API
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { orgSlug } = params;
    const body = await request.json();
    const { provider, apiKey } = body;

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

    // Fetch rates using the service
    const result = await ExchangeRateService.fetchLatestRates(organization.id, {
      provider,
      apiKey,
    });

    return NextResponse.json({
      success: result.success,
      ratesFetched: result.ratesFetched,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Error fetching rates:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch rates',
        ratesFetched: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      },
      { status: 500 }
    );
  }
}
