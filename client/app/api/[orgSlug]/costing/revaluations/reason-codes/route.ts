/**
 * API: Revaluation Reason Codes
 * GET /api/[orgSlug]/costing/revaluations/reason-codes - Get country-specific reason codes
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';
import { RevaluationLocalizationManager } from '@/services/costing/revaluation-localization.manager';

export async function GET(
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
      select: { id: true, homeCountry: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Initialize localization manager
    const localizationManager = new RevaluationLocalizationManager(prisma);
    const config = await localizationManager.getLocalizationConfig(organization.id);

    return NextResponse.json({
      success: true,
      data: {
        reasonCodes: config.reasonCodes,
        country: config.country,
        complianceRequirements: config.complianceRequirements,
      },
    });

  } catch (error: any) {
    console.error('Error fetching reason codes:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch reason codes',
        details: error.message,
      },
      { status: 500 }
    );
  }
}