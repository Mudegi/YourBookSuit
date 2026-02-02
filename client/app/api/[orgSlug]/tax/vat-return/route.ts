/**
 * API: Generate Uganda VAT Return
 * POST /api/[orgSlug]/tax/vat-return
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { generateUgandaVATReturn, saveVATReturn } from '@/lib/tax/tax-return-generator';
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

    // Only generate Uganda-specific VAT return if country is Uganda
    if (organization.compliancePack !== 'UG_URA') {
      return NextResponse.json(
        { error: 'VAT Return generation only available for organizations with Uganda (UG) selected as home country' },
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

    // Generate VAT return
    const vatReturn = await generateUgandaVATReturn(
      organization.id,
      new Date(startDate),
      new Date(endDate)
    );

    // Save to database if requested
    let taxReturnId: string | null = null;
    if (saveToDB) {
      taxReturnId = await saveVATReturn(organization.id, vatReturn);
    }

    return NextResponse.json({
      success: true,
      data: vatReturn,
      taxReturnId,
    });
  } catch (error) {
    console.error('Error generating VAT return:', error);
    return NextResponse.json(
      { error: 'Failed to generate VAT return', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/[orgSlug]/tax/vat-return?period=2025-12
 * Get saved VAT return by period
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
      // Return all VAT returns
      const taxReturns = await prisma.taxReturn.findMany({
        where: {
          organizationId: organization.id,
          returnType: 'VAT_MONTHLY',
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
          returnType: 'VAT_MONTHLY',
          taxPeriod: period,
        },
      },
    });

    if (!taxReturn) {
      return NextResponse.json({ error: 'VAT return not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: taxReturn,
    });
  } catch (error) {
    console.error('Error fetching VAT return:', error);
    return NextResponse.json(
      { error: 'Failed to fetch VAT return', details: String(error) },
      { status: 500 }
    );
  }
}
