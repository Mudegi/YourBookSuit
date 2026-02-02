/**
 * API: Calculate WHT on Bill
 * POST /api/[orgSlug]/tax/calculate-wht
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { calculateUgandaWHT } from '@/lib/tax/uganda-ura-compliance';
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

    // Only calculate Uganda-specific WHT if country is Uganda
    if (organization.compliancePack !== 'UG_URA') {
      return NextResponse.json(
        { error: 'WHT calculation only available for organizations with Uganda (UG) selected as home country' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { grossAmount, whtType, vendorId, description } = body;

    if (!grossAmount || !whtType || !vendorId) {
      return NextResponse.json(
        { error: 'grossAmount, whtType, and vendorId are required' },
        { status: 400 }
      );
    }

    // Find matching WHT rule
    const whtRule = await prisma.wHTRule.findFirst({
      where: {
        organizationId: organization.id,
        whtType,
        isActive: true,
      },
    });

    if (!whtRule) {
      return NextResponse.json(
        { error: `No active WHT rule found for type: ${whtType}` },
        { status: 404 }
      );
    }

    // Calculate WHT
    const whtCalculation = calculateUgandaWHT(
      parseFloat(grossAmount),
      whtType as any,
      true // Apply threshold
    );

    return NextResponse.json({
      success: true,
      data: {
        ...whtCalculation,
        whtRule: {
          id: whtRule.id,
          name: whtRule.name,
          rate: whtRule.rate,
          threshold: whtRule.threshold,
        },
      },
    });
  } catch (error) {
    console.error('Error calculating WHT:', error);
    return NextResponse.json(
      { error: 'Failed to calculate WHT', details: String(error) },
      { status: 500 }
    );
  }
}
