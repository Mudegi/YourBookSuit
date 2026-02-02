/**
 * API: Enhanced Cost Revaluations Management
 * POST /api/[orgSlug]/costing/revaluations - Create revaluation with enterprise service
 * GET /api/[orgSlug]/costing/revaluations - List revaluations with comprehensive data
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
    if (!hasPermission(payload.role, Permission.MANAGE_COST_REVALUATIONS)) {
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
    const {
      productId,
      warehouseId,
      reasonCode,
      newUnitCost,
      postingDate,
      notes,
      autoApprove = false,
    } = body;

    // Enhanced validation
    if (!productId || !reasonCode || !newUnitCost || !postingDate) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'productId, reasonCode, newUnitCost, and postingDate are required'
        },
        { status: 400 }
      );
    }

    // Initialize services with proper dependencies
    const localizationManager = new RevaluationLocalizationManager(prisma);
    const doubleEntryService = new DoubleEntryService(prisma);
    const revaluationService = new RevaluationService(
      prisma, 
      localizationManager, 
      doubleEntryService
    );

    // Create comprehensive revaluation
    const result = await revaluationService.createRevaluation({
      organizationId: organization.id,
      productId,
      warehouseId,
      reasonCode,
      newUnitCost,
      postingDate: new Date(postingDate),
      notes,
      userId: payload.userId,
      autoApprove,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: result.glTransaction 
        ? 'Revaluation created and posted successfully'
        : 'Revaluation created and submitted for approval',
    });

  } catch (error: any) {
    console.error('Error creating revaluation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create revaluation',
        details: error.message,
      },
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
    if (!hasPermission(payload.role, Permission.VIEW_COST_REVALUATIONS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { 
        id: true,
        baseCurrency: true,
        homeCountry: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const warehouseId = searchParams.get('warehouseId');
    const status = searchParams.get('status');
    const reasonCode = searchParams.get('reasonCode');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');

    // Build comprehensive filter
    const where: any = {
      organizationId: organization.id,
    };

    if (productId) {
      where.productId = productId;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (status) {
      where.status = status;
    }

    if (reasonCode) {
      where.reason = reasonCode;
    }

    if (startDate || endDate) {
      where.revaluationDate = {};
      if (startDate) where.revaluationDate.gte = new Date(startDate);
      if (endDate) where.revaluationDate.lte = new Date(endDate);
    }

    if (minAmount || maxAmount) {
      where.valueDifference = {};
      if (minAmount) where.valueDifference.gte = parseFloat(minAmount);
      if (maxAmount) where.valueDifference.lte = parseFloat(maxAmount);
    }

    // Get comprehensive revaluation data
    const costRevaluations = await prisma.costRevaluation.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        transaction: {
          select: {
            id: true,
            transactionNumber: true,
          },
        },
      },
      orderBy: {
        revaluationDate: 'desc',
      },
    });

    // Calculate summary statistics
    const summary = {
      totalRevaluations: costRevaluations.length,
      draftCount: costRevaluations.filter(r => r.status === 'DRAFT').length,
      submittedCount: costRevaluations.filter(r => r.status === 'SUBMITTED').length,
      approvedCount: costRevaluations.filter(r => r.status === 'APPROVED').length,
      postedCount: costRevaluations.filter(r => r.status === 'POSTED').length,
      totalValueImpact: costRevaluations.reduce((sum, r) => sum + r.valueDifference, 0),
      pendingApprovalValue: costRevaluations
        .filter(r => r.status === 'SUBMITTED')
        .reduce((sum, r) => sum + Math.abs(r.valueDifference), 0),
      averageValueChange: costRevaluations.length > 0
        ? costRevaluations.reduce((sum, r) => {
            const changePercent = ((r.newUnitCost - r.oldUnitCost) / r.oldUnitCost) * 100;
            return sum + changePercent;
          }, 0) / costRevaluations.length
        : 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        revaluations: costRevaluations,
        summary,
      },
      meta: {
        organization: {
          baseCurrency: organization.baseCurrency,
          homeCountry: organization.homeCountry,
        },
        filters: {
          productId,
          warehouseId,
          status,
          reasonCode,
          startDate,
          endDate,
          minAmount,
          maxAmount,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching cost revaluations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost revaluations', details: error.message },
      { status: 500 }
    );
  }
}
