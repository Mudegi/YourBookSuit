import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Standard currency definitions used for auto-seeding
const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar',             symbol: '$',   decimalPlaces: 2 },
  { code: 'EUR', name: 'Euro',                  symbol: '€',   decimalPlaces: 2 },
  { code: 'GBP', name: 'British Pound',         symbol: '£',   decimalPlaces: 2 },
  { code: 'UGX', name: 'Ugandan Shilling',      symbol: 'USh', decimalPlaces: 0 },
  { code: 'KES', name: 'Kenyan Shilling',       symbol: 'KSh', decimalPlaces: 2 },
  { code: 'TZS', name: 'Tanzanian Shilling',    symbol: 'TSh', decimalPlaces: 0 },
  { code: 'ZAR', name: 'South African Rand',    symbol: 'R',   decimalPlaces: 2 },
  { code: 'NGN', name: 'Nigerian Naira',        symbol: '₦',   decimalPlaces: 2 },
  { code: 'GHS', name: 'Ghanaian Cedi',         symbol: 'GH₵', decimalPlaces: 2 },
  { code: 'RWF', name: 'Rwandan Franc',         symbol: 'FRw', decimalPlaces: 0 },
  { code: 'ETB', name: 'Ethiopian Birr',        symbol: 'Br',  decimalPlaces: 2 },
  { code: 'ZMW', name: 'Zambian Kwacha',        symbol: 'ZK',  decimalPlaces: 2 },
];

async function autoSeedCurrencies(organizationId: string, baseCurrency: string) {
  const baseDef = COMMON_CURRENCIES.find(c => c.code === baseCurrency) || {
    code: baseCurrency, name: baseCurrency, symbol: baseCurrency, decimalPlaces: 2,
  };

  let displayOrder = 1;
  // Always upsert the base currency first
  await prisma.currency.upsert({
    where: { organizationId_code: { organizationId, code: baseDef.code } },
    update: { isBase: true, isActive: true },
    create: { organizationId, ...baseDef, isBase: true, isActive: true, displayOrder: displayOrder++ },
  });

  // Upsert remaining common currencies
  for (const currency of COMMON_CURRENCIES) {
    if (currency.code === baseCurrency) continue;
    await prisma.currency.upsert({
      where: { organizationId_code: { organizationId, code: currency.code } },
      update: { isActive: true },
      create: { organizationId, ...currency, isBase: false, isActive: true, displayOrder: displayOrder++ },
    });
  }
}

/**
 * GET /api/[orgSlug]/currencies
 * List all currencies for the organization.
 * Auto-seeds a default set if none exist yet (handles fresh production orgs).
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
      select: { id: true, baseCurrency: true },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get all currencies for this organization
    let currencies = await prisma.currency.findMany({
      where: { organizationId: organization.id },
      orderBy: [
        { isBase: 'desc' },
        { displayOrder: 'asc' },
        { code: 'asc' },
      ],
    });

    // Auto-seed if none exist (new org or not yet seeded in production)
    if (currencies.length === 0) {
      await autoSeedCurrencies(organization.id, organization.baseCurrency || 'USD');
      currencies = await prisma.currency.findMany({
        where: { organizationId: organization.id },
        orderBy: [{ isBase: 'desc' }, { displayOrder: 'asc' }, { code: 'asc' }],
      });
    }

    return NextResponse.json({
      success: true,
      data: currencies,
    });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch currencies' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/[orgSlug]/currencies
 * Add a new currency
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
    const { code, name, symbol, decimalPlaces = 2, isBase = false } = body;

    if (!code || !name || !symbol) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if currency already exists
    const existing = await prisma.currency.findUnique({
      where: {
        organizationId_code: {
          organizationId: organization.id,
          code: code.toUpperCase(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Currency already exists' },
        { status: 400 }
      );
    }

    // If setting as base, unset other base currencies
    if (isBase) {
      await prisma.currency.updateMany({
        where: {
          organizationId: organization.id,
          isBase: true,
        },
        data: { isBase: false },
      });
    }

    // Create currency
    const currency = await prisma.currency.create({
      data: {
        organizationId: organization.id,
        code: code.toUpperCase(),
        name,
        symbol,
        decimalPlaces: parseInt(decimalPlaces),
        isBase,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: currency,
    });
  } catch (error) {
    console.error('Error creating currency:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create currency' },
      { status: 500 }
    );
  }
}
