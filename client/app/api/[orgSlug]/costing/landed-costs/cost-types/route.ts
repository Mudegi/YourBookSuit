/**
 * API: Landed Cost Types (Country-Specific)
 * GET /api/[orgSlug]/costing/landed-costs/cost-types
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';
import { hasPermission, Permission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import LandedCostService from '@/services/costing/landed-cost.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(payload.role, Permission.VIEW_LANDED_COSTS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true, homeCountry: true, baseCurrency: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get localized landed cost types
    const landedCostService = new LandedCostService(prisma);
    const costTypes = await landedCostService.getLandedCostTypes(organization.id);

    return NextResponse.json({
      success: true,
      data: costTypes,
      meta: {
        country: organization.homeCountry,
        baseCurrency: organization.baseCurrency,
      },
    });

  } catch (error: any) {
    console.error('Error fetching landed cost types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch landed cost types', details: error.message },
      { status: 500 }
    );
  }
}