import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ExchangeRateService } from '@/services/currency/exchange-rate.service';

/**
 * GET /api/[orgSlug]/exchange-rates
 * List exchange rates for a specific date
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { orgSlug } = params;
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const date = dateParam ? new Date(dateParam) : new Date();

    // Set to start of day
    date.setHours(0, 0, 0, 0);

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, baseCurrency: true },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get exchange rates for this date (or most recent before)
    const rates = await prisma.exchangeRate.findMany({
      where: {
        organizationId: organization.id,
        effectiveDate: {
          lte: date,
        },
      },
      orderBy: {
        effectiveDate: 'desc',
      },
      distinct: ['fromCurrencyCode', 'toCurrencyCode'],
    });

    // Filter to get only the most recent rate for each pair
    const uniqueRates = new Map();
    for (const rate of rates) {
      const key = `${rate.fromCurrencyCode}-${rate.toCurrencyCode}`;
      if (!uniqueRates.has(key)) {
        uniqueRates.set(key, rate);
      }
    }

    return NextResponse.json({
      success: true,
      data: Array.from(uniqueRates.values()),
      meta: {
        date: date.toISOString(),
        baseCurrency: organization.baseCurrency,
      },
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch exchange rates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/[orgSlug]/exchange-rates
 * Add or update an exchange rate
 */
export async function POST(
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

    // Validate input
    const { fromCurrency, toCurrency, rate, effectiveDate } = body;

    if (!fromCurrency || !toCurrency || !rate || !effectiveDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (parseFloat(rate) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Rate must be positive' },
        { status: 400 }
      );
    }

    // Save the rate using the service
    const savedRate = await ExchangeRateService.saveRate(organization.id, {
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      rate: parseFloat(rate),
      effectiveDate: new Date(effectiveDate),
      source: 'MANUAL',
    });

    return NextResponse.json({
      success: true,
      data: savedRate,
    });
  } catch (error) {
    console.error('Error saving exchange rate:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save exchange rate' },
      { status: 500 }
    );
  }
}
