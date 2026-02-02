/**
 * API: Variance Analysis
 * GET /api/[orgSlug]/costing/standard-costs/variance-analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';
import { hasPermission, Permission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(payload.role, Permission.VIEW_STANDARD_COSTS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const threshold = parseFloat(searchParams.get('threshold') || '10');

    // For now, return mock variance data since variance analysis requires enhanced schema
    const mockVariances = [
      {
        productId: 'prod1',
        productName: 'Sample Product A',
        productSku: 'SKU001',
        standardCost: 100,
        lastPurchasePrice: 120,
        variance: 20,
        variancePercent: 20,
        threshold: threshold,
        flagged: true,
        recommendation: 'Significant variance detected. Consider updating standard cost.',
      },
      {
        productId: 'prod2',
        productName: 'Sample Product B',
        productSku: 'SKU002',
        standardCost: 75,
        lastPurchasePrice: 80,
        variance: 5,
        variancePercent: 6.67,
        threshold: threshold,
        flagged: false,
        recommendation: 'Variance is within acceptable range.',
      },
    ];

    const critical = mockVariances.filter(v => Math.abs(v.variancePercent) > 20);
    const warning = mockVariances.filter(v => Math.abs(v.variancePercent) > threshold && Math.abs(v.variancePercent) <= 20);
    const normal = mockVariances.filter(v => Math.abs(v.variancePercent) <= threshold);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProducts: mockVariances.length,
          critical: critical.length,
          warning: warning.length,
          normal: normal.length,
          averageVariance: mockVariances.length > 0 
            ? mockVariances.reduce((sum, v) => sum + Math.abs(v.variancePercent), 0) / mockVariances.length 
            : 0,
        },
        variances: {
          critical,
          warning,
          normal,
        },
        all: mockVariances,
      },
      message: 'Variance analysis completed (mock data - requires schema migration)',
    });

  } catch (error: any) {
    console.error('Error analyzing variances:', error);
    return NextResponse.json(
      { error: 'Failed to analyze variances', details: error.message },
      { status: 500 }
    );
  }
}