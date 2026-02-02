/**
 * API: Enhanced Variance Analysis
 * GET /api/[orgSlug]/costing/variances/analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';
import { hasPermission, Permission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import VarianceAnalysisEngine from '@/services/costing/variance-analysis.engine';

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

    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const filter = {
      organizationId: organization.id,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      branchId: searchParams.get('branchId') || undefined,
      productId: searchParams.get('productId') || undefined,
      varianceType: searchParams.get('varianceType')?.split(',').filter(Boolean) || undefined,
      reasonCode: searchParams.get('reasonCode') || undefined,
      minVarianceAmount: searchParams.get('minVarianceAmount') ? 
        parseFloat(searchParams.get('minVarianceAmount')!) : undefined,
      currency: (searchParams.get('currency') as 'BASE' | 'TRANSACTION') || 'BASE',
    };

    // Initialize variance analysis engine
    const varianceEngine = new VarianceAnalysisEngine(prisma);

    // Get comprehensive variance analysis
    const analysis = await varianceEngine.getVarianceAnalysis(filter);

    return NextResponse.json({
      success: true,
      data: analysis,
      meta: {
        baseCurrency: organization.baseCurrency,
        homeCountry: organization.homeCountry,
        appliedFilters: filter,
      },
    });

  } catch (error: any) {
    console.error('Error fetching variance analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch variance analysis', details: error.message },
      { status: 500 }
    );
  }
}