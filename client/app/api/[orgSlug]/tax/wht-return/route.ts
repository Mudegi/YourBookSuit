/**
 * API: Generate Uganda WHT Return
 * POST /api/[orgSlug]/tax/wht-return
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { generateUgandaWHTReturn, saveWHTReturn } from '@/lib/tax/tax-return-generator';
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

    if (organization.compliancePack !== 'UG_URA') {
      return NextResponse.json(
        { error: 'WHT Return generation only available for Uganda URA compliance pack' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { startDate, endDate, saveToDB = true } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Generate WHT return
    const whtReturn = await generateUgandaWHTReturn(
      organization.id,
      new Date(startDate),
      new Date(endDate)
    );

    // Save to database if requested
    let taxReturnId: string | null = null;
    if (saveToDB) {
      taxReturnId = await saveWHTReturn(organization.id, whtReturn);
    }

    return NextResponse.json({
      success: true,
      data: whtReturn,
      taxReturnId,
    });
  } catch (error) {
    console.error('Error generating WHT return:', error);
    return NextResponse.json(
      { error: 'Failed to generate WHT return', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/[orgSlug]/tax/wht-return?period=2025-12
 * Get saved WHT return by period
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
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');

    if (!period) {
      // Return all WHT returns
      const taxReturns = await prisma.taxReturn.findMany({
        where: {
          organizationId: organization.id,
          returnType: 'WHT_MONTHLY',
        },
        orderBy: {
          taxPeriod: 'desc',
        },
      });

      return NextResponse.json({
        success: true,
        data: taxReturns,
      });
    }

    // Get specific period
    const taxReturn = await prisma.taxReturn.findUnique({
      where: {
        organizationId_returnType_taxPeriod: {
          organizationId: organization.id,
          returnType: 'WHT_MONTHLY',
          taxPeriod: period,
        },
      },
    });

    if (!taxReturn) {
      return NextResponse.json({ error: 'WHT return not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: taxReturn,
    });
  } catch (error) {
    console.error('Error fetching WHT return:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WHT return', details: String(error) },
      { status: 500 }
    );
  }
}
