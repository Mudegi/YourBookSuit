/**
 * API: Enterprise Landed Costs Management
 * POST /api/[orgSlug]/costing/landed-costs - Create comprehensive landed cost with allocation
 * GET /api/[orgSlug]/costing/landed-costs - List landed costs with summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';
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

    // Check permissions
    if (!hasPermission(payload.role, Permission.MANAGE_LANDED_COSTS)) {
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
    const {
      referenceType,
      referenceId,
      costTypeId,
      vendorId,
      currency,
      exchangeRate,
      costComponents,
      allocationMethod,
      items,
      postToGL = false,
      notes,
    } = body;

    // Enhanced validation
    if (!referenceType || !referenceId || !allocationMethod || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: referenceType, referenceId, allocationMethod, items' },
        { status: 400 }
      );
    }

    if (!costComponents || Object.keys(costComponents).length === 0) {
      return NextResponse.json(
        { error: 'Cost components are required' },
        { status: 400 }
      );
    }

    // Initialize landed cost service
    const landedCostService = new LandedCostService(prisma);

    // Create comprehensive landed cost
    const result = await landedCostService.createLandedCost({
      organizationId: organization.id,
      referenceType: referenceType as any,
      referenceId,
      costTypeId,
      vendorId,
      currency: currency || 'USD',
      exchangeRate,
      costComponents: {
        freightCost: costComponents.freightCost || 0,
        insuranceCost: costComponents.insuranceCost || 0,
        customsDuty: costComponents.customsDuty || 0,
        handlingCost: costComponents.handlingCost || 0,
        clearingAgentFees: costComponents.clearingAgentFees || 0,
        storageCost: costComponents.storageCost || 0,
        otherCosts: costComponents.otherCosts || 0,
        costTypeCode: costComponents.costTypeCode,
      },
      allocationMethod: allocationMethod as any,
      items,
      postToGL,
      notes,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Landed cost created and allocated successfully',
    });

  } catch (error: any) {
    console.error('Error creating landed cost:', error);
    return NextResponse.json(
      { error: 'Failed to create landed cost', details: error.message },
      { status: 500 }
    );
  }
}

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
    if (!hasPermission(payload.role, Permission.VIEW_LANDED_COSTS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true, baseCurrency: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const referenceType = searchParams.get('referenceType');
    const referenceId = searchParams.get('referenceId');
    const allocationMethod = searchParams.get('allocationMethod');
    const isAllocated = searchParams.get('isAllocated');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build filter
    const where: any = {
      organizationId: organization.id,
    };

    if (referenceType) {
      where.referenceType = referenceType;
    }

    if (referenceId) {
      where.referenceId = referenceId;
    }

    if (allocationMethod) {
      where.allocationMethod = allocationMethod;
    }

    if (isAllocated !== null && isAllocated !== '') {
      where.isAllocated = isAllocated === 'true';
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get landed costs with comprehensive data
    const landedCosts = await prisma.landedCost.findMany({
      where,
      include: {
        allocations: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate summary statistics
    const totalLandedCosts = landedCosts.length;
    const totalValue = landedCosts.reduce((sum, lc) => sum + lc.totalLandedCost.toNumber(), 0);
    const totalAllocatedItems = landedCosts.reduce((sum, lc) => sum + lc.allocations.length, 0);
    const allocatedCount = landedCosts.filter(lc => lc.isAllocated).length;
    const pendingCount = totalLandedCosts - allocatedCount;

    // Calculate average cost increase
    const totalOriginalValue = landedCosts.reduce((sum, lc) => sum + lc.totalProductCost.toNumber(), 0);
    const totalLandedValue = landedCosts.reduce((sum, lc) => sum + lc.totalLandedCost.toNumber(), 0);
    const averageCostIncrease = totalOriginalValue > 0 ? 
      ((totalLandedValue - totalOriginalValue) / totalOriginalValue) * 100 : 0;

    // Transform data for response
    const transformedLandedCosts = landedCosts.map(lc => ({
      id: lc.id,
      referenceType: lc.referenceType,
      referenceId: lc.referenceId,
      totalProductCost: lc.totalProductCost.toNumber(),
      freightCost: lc.freightCost.toNumber(),
      insuranceCost: lc.insuranceCost.toNumber(),
      customsDuty: lc.customsDuty.toNumber(),
      handlingCost: lc.handlingCost.toNumber(),
      otherCosts: lc.otherCosts.toNumber(),
      totalLandedCost: lc.totalLandedCost.toNumber(),
      allocationMethod: lc.allocationMethod,
      isAllocated: lc.isAllocated,
      allocatedAt: lc.allocatedAt?.toISOString(),
      createdAt: lc.createdAt.toISOString(),
      notes: lc.notes,
      allocations: lc.allocations.map(allocation => ({
        id: allocation.id,
        product: allocation.product,
        quantity: allocation.quantity.toNumber(),
        productCost: allocation.productCost.toNumber(),
        allocatedAmount: allocation.allocatedAmount.toNumber(),
        unitLandedCost: allocation.unitLandedCost.toNumber(),
      })),
    }));

    const summary = {
      totalLandedCosts,
      totalValue,
      totalAllocatedItems,
      allocatedCount,
      pendingCount,
      averageCostIncrease,
      baseCurrency: organization.baseCurrency,
    };

    return NextResponse.json({
      success: true,
      data: transformedLandedCosts,
      summary,
      meta: {
        total: totalLandedCosts,
        baseCurrency: organization.baseCurrency,
      },
    });

  } catch (error: any) {
    console.error('Error fetching landed costs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch landed costs', details: error.message },
      { status: 500 }
    );
  }
}
