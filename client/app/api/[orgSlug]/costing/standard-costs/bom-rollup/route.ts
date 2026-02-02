/**
 * API: BOM Roll-up Calculation
 * POST /api/[orgSlug]/costing/standard-costs/bom-rollup
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';
import { hasPermission, Permission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const bomRollupRequestSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  includeLocalization: z.boolean().default(true),
  createStandardCost: z.boolean().default(false),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(payload.role, Permission.MANAGE_STANDARD_COSTS)) {
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
    const validatedData = bomRollupRequestSchema.parse(body);

    // For now, return a mock response since BOM rollup requires enhanced schema
    const mockRollupResult = {
      productId: validatedData.productId,
      productName: 'Mock Product',
      calculatedCosts: {
        materialCost: 100,
        laborCost: 50,
        overheadCost: 25,
        totalCost: 175,
      },
      rollupDetails: [],
      varianceAnalysis: {
        currentStandardCost: 150,
        calculatedCost: 175,
        variance: 25,
        variancePercent: 16.7,
        recommendation: 'Consider updating standard cost due to significant variance.',
      },
    };

    return NextResponse.json({
      success: true,
      data: mockRollupResult,
      message: 'BOM roll-up calculation completed (mock data - requires schema migration)',
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error performing BOM roll-up:', error);
    return NextResponse.json(
      { error: 'Failed to perform BOM roll-up', details: error.message },
      { status: 500 }
    );
  }
}