/**
 * API: Cost Variances Management - Enhanced with Financial Truth Engine
 * POST /api/[orgSlug]/costing/variances - Record comprehensive cost variance with GL posting
 * GET /api/[orgSlug]/costing/variances - List cost variances with summary analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';
import VarianceAnalysisEngine from '@/services/costing/variance-analysis.engine';

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
    if (!hasPermission(payload.role, Permission.MANAGE_COST_VARIANCES)) {
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
      productId,
      transactionId,
      referenceType,
      referenceId,
      standardCosts,
      actualCosts,
      quantity,
      transactionCurrency,
      exchangeRate,
      branchId,
      reasonCode,
      notes,
      postToGL = false,
    } = body;

    // Enhanced validation
    if (!productId || !standardCosts || !actualCosts || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, standardCosts, actualCosts, quantity' },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Initialize variance analysis engine
    const varianceEngine = new VarianceAnalysisEngine(prisma);

    // Calculate comprehensive variances with localization
    const varianceResult = await varianceEngine.calculateVariances({
      organizationId: organization.id,
      productId,
      transactionId,
      referenceType,
      referenceId,
      standardCosts: {
        materialCost: standardCosts.materialCost || 0,
        laborCost: standardCosts.laborCost || 0,
        overheadCost: standardCosts.overheadCost || 0,
        totalCost: standardCosts.totalCost || 0,
      },
      actualCosts: {
        materialCost: actualCosts.materialCost || 0,
        laborCost: actualCosts.laborCost || 0,
        overheadCost: actualCosts.overheadCost || 0,
        totalCost: actualCosts.totalCost || 0,
      },
      quantity,
      transactionCurrency,
      exchangeRate,
      branchId,
      reasonCode,
      notes,
      postToGL,
    });

    return NextResponse.json({
      success: true,
      data: varianceResult,
      message: 'Comprehensive variance analysis completed',
    });
  } catch (error: any) {
    console.error('Error recording cost variance:', error);
    return NextResponse.json(
      { error: 'Failed to record cost variance', details: error.message },
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
    if (!hasPermission(payload.role, Permission.VIEW_COST_VARIANCES)) {
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
    const productId = searchParams.get('productId');
    const varianceType = searchParams.get('varianceType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build filter
    const where: any = {
      organizationId: organization.id,
    };

    if (productId) {
      where.productId = productId;
    }

    if (varianceType) {
      where.varianceType = varianceType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get variances with enhanced data
    const costVariances = await prisma.costVariance.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        transaction: {
          select: {
            id: true,
            transactionType: true,
            referenceId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate enhanced summary statistics
    const totalVariance = costVariances.reduce((sum, v) => sum + v.totalVariance.toNumber(), 0);
    const materialVariance = costVariances.reduce((sum, v) => sum + (v.materialVariance?.toNumber() || 0), 0);
    const laborVariance = costVariances.reduce((sum, v) => sum + (v.laborVariance?.toNumber() || 0), 0);
    const overheadVariance = costVariances.reduce((sum, v) => sum + (v.overheadVariance?.toNumber() || 0), 0);
    
    const favorableVariances = costVariances.filter(v => v.totalVariance.toNumber() < 0).length;
    const unfavorableVariances = costVariances.filter(v => v.totalVariance.toNumber() > 0).length;

    // Group by variance type
    const byType: Record<string, number> = {};
    costVariances.forEach(v => {
      if (!byType[v.varianceType]) {
        byType[v.varianceType] = 0;
      }
      byType[v.varianceType] += v.totalVariance.toNumber();
    });

    const summary = {
      totalVariance,
      materialVariance,
      laborVariance,
      overheadVariance,
      favorableVariances,
      unfavorableVariances,
      byType,
      currency: organization.baseCurrency,
    };

    // Transform data for response
    const transformedVariances = costVariances.map(v => ({
      id: v.id,
      product: v.product,
      varianceType: v.varianceType,
      materialVariance: v.materialVariance?.toNumber() || 0,
      laborVariance: v.laborVariance?.toNumber() || 0,
      overheadVariance: v.overheadVariance?.toNumber() || 0,
      totalVariance: v.totalVariance.toNumber(),
      quantity: v.quantity.toNumber(),
      date: v.createdAt.toISOString(),
      referenceType: v.referenceType,
      referenceId: v.referenceId,
      transaction: v.transaction,
      notes: v.notes,
    }));

    return NextResponse.json({
      success: true,
      data: transformedVariances,
      summary,
      meta: {
        total: costVariances.length,
        baseCurrency: organization.baseCurrency,
      },
    });
  } catch (error: any) {
    console.error('Error fetching cost variances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost variances', details: error.message },
      { status: 500 }
    );
  }
}
