import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/[orgSlug]/currencies
 * List all currencies for the organization
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
    const currencies = await prisma.currency.findMany({
      where: { organizationId: organization.id },
      orderBy: [
        { isBase: 'desc' },
        { displayOrder: 'asc' },
        { code: 'asc' },
      ],
    });

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
