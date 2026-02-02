/**
 * API: Landed Cost Impact Analysis
 * POST /api/[orgSlug]/costing/landed-costs/impact-analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';
import { hasPermission, Permission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import LandedCostService from '@/services/costing/landed-cost.service';

export async function POST(
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
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const { items, totalLandedCost, allocationMethod } = body;

    if (!items || !totalLandedCost || !allocationMethod) {
      return NextResponse.json(
        { error: 'Missing required fields: items, totalLandedCost, allocationMethod' },
        { status: 400 }
      );
    }

    // Get cost impact analysis
    const landedCostService = new LandedCostService(prisma);
    const impactSummary = await landedCostService.getCostImpactSummary(
      organization.id,
      items,
      totalLandedCost,
      allocationMethod
    );

    return NextResponse.json({
      success: true,
      data: impactSummary,
      message: 'Cost impact analysis completed',
    });

  } catch (error: any) {
    console.error('Error analyzing cost impact:', error);
    return NextResponse.json(
      { error: 'Failed to analyze cost impact', details: error.message },
      { status: 500 }
    );
  }
}