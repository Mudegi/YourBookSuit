/**
 * API: Variance Reason Codes
 * GET /api/[orgSlug]/costing/variances/reason-codes
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';
import { hasPermission, Permission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { CostingLocalizationManager } from '@/services/costing/costing-localization.manager';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(payload.role, Permission.VIEW_COST_VARIANCES)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true, baseCurrency: true, homeCountry: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get localized reason codes
    const localizationManager = new CostingLocalizationManager(
      organization.homeCountry,
      organization.baseCurrency
    );

    const reasonCodes = await localizationManager.getVarianceReasonCodes();
    const glAccountMapping = await localizationManager.getVarianceGLAccountMapping();

    return NextResponse.json({
      success: true,
      data: reasonCodes,
      meta: {
        country: organization.homeCountry,
        glAccountMapping,
      },
    });

  } catch (error: any) {
    console.error('Error fetching variance reason codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch variance reason codes', details: error.message },
      { status: 500 }
    );
  }
}