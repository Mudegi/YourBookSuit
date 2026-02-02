/**
 * API: Market Price Calculation
 * POST /api/[orgSlug]/costing/revaluations/market-price - Calculate suggested market price
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';
import { RevaluationService } from '@/services/costing/revaluation.service';
import { RevaluationLocalizationManager } from '@/services/costing/revaluation-localization.manager';
import { DoubleEntryService } from '@/services/accounting/double-entry.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(payload.role, Permission.VIEW_COST_REVALUATIONS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true, baseCurrency: true, homeCountry: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const { productId } = body;

    // Validation
    if (!productId) {
      return NextResponse.json(
        { error: 'Missing required field: productId' },
        { status: 400 }
      );
    }

    // Initialize services
    const localizationManager = new RevaluationLocalizationManager(prisma);
    const doubleEntryService = new DoubleEntryService(prisma);
    const revaluationService = new RevaluationService(
      prisma,
      localizationManager,
      doubleEntryService
    );

    // Calculate market price
    const marketPrice = await revaluationService.calculateMarketPrice(
      organization.id,
      productId
    );

    // Get seasonal adjustment
    const seasonalAdjustment = await localizationManager.getSeasonalAdjustment(
      organization.homeCountry || 'US'
    );

    // Apply seasonal adjustment if applicable
    if (marketPrice.suggestedUnitCost > 0 && seasonalAdjustment !== 1.0) {
      marketPrice.suggestedUnitCost *= seasonalAdjustment;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...marketPrice,
        seasonalAdjustment,
        adjustedSuggestedCost: marketPrice.suggestedUnitCost,
      },
    });

  } catch (error: any) {
    console.error('Error calculating market price:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate market price',
        details: error.message,
      },
      { status: 500 }
    );
  }
}