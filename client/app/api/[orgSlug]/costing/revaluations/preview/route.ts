/**
 * API: Revaluation Preview
 * POST /api/[orgSlug]/costing/revaluations/preview - Preview GL impact before creating
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
    const { productId, warehouseId, newUnitCost } = body;

    // Validation
    if (!productId || !newUnitCost) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, newUnitCost' },
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

    // Get preview
    const preview = await revaluationService.previewRevaluation(
      organization.id,
      productId,
      newUnitCost,
      warehouseId
    );

    return NextResponse.json({
      success: true,
      data: preview,
    });

  } catch (error: any) {
    console.error('Error generating revaluation preview:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate preview',
        details: error.message,
      },
      { status: 500 }
    );
  }
}