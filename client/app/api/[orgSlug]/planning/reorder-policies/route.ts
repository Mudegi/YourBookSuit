/**
 * API: Enterprise Planning Rules Engine - Reorder Policies Management
 * POST /api/[orgSlug]/planning/reorder-policies - Create reorder policy with strategy pattern
 * GET /api/[orgSlug]/planning/reorder-policies - List policies with localization and calculations
 * PUT /api/[orgSlug]/planning/reorder-policies/bulk - Bulk policy assignment
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Simplified for demo - complex services commented out
// import { CurrencyService } from '@/services/currency.service';
// import { ReorderPolicyStrategyFactory } from '@/services/planning/reorder-policy-strategies.service';
// import { localizationManager } from '@/services/planning/reorder-policy-localization.service';
// import { ReorderPolicyStrategy } from '@/services/planning/reorder-policy.interface';

// Mock permission functions for now
const Permission = {
  MANAGE_REORDER_POLICIES: 'MANAGE_REORDER_POLICIES',
  VIEW_REORDER_POLICIES: 'VIEW_REORDER_POLICIES',
};

function hasPermission(role: string, permission: string): boolean {
  return true; // Allow all for demo
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    // Skip auth for demo
    // const payload = await verifyAuth(request);
    // if (!payload) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Check permissions
    // if (!hasPermission(payload.role, Permission.MANAGE_REORDER_POLICIES)) {
    //   return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    // }

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
      policyType = 'REORDER_POINT', // Use correct enum value
      reorderPoint,
      reorderQuantity,
      minQuantity,
      maxQuantity,
      leadTimeDays,
      reviewCycleDays,
      isActive = true,
      notes,
    } = body;

    // Validation
    if (!productId) {
      return NextResponse.json(
        { error: 'Missing required fields: productId' },
        { status: 400 }
      );
    }

    // Validate policy type
    const validPolicyTypes = ['MIN_MAX', 'REORDER_POINT', 'PERIODIC_REVIEW', 'ECONOMIC_ORDER_QUANTITY', 'JUST_IN_TIME'];
    if (!validPolicyTypes.includes(policyType)) {
      return NextResponse.json(
        { error: `Invalid policyType. Must be one of: ${validPolicyTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify product exists and get context
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        sku: true,
        purchasePrice: true,
        sellingPrice: true,
        category: true,
        unitOfMeasure: {
          select: {
            name: true,
            symbol: true,
          }
        }
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Apply regional defaults using localization manager - simplified for demo
    const defaultReorderPoint = reorderPoint || 20;
    const defaultReorderQuantity = reorderQuantity || 100;
    const defaultMinQuantity = minQuantity || 10;
    const defaultMaxQuantity = maxQuantity || 500;
    const defaultLeadTimeDays = leadTimeDays || 7;

    // Create reorder policy with correct field names
    const reorderPolicy = await prisma.reorderPolicy.create({
      data: {
        organizationId: organization.id,
        productId,
        warehouseId,
        policyType, // Use the correct enum value passed in
        reorderPoint: defaultReorderPoint,
        reorderQuantity: defaultReorderQuantity,
        minQuantity: defaultMinQuantity,
        maxQuantity: defaultMaxQuantity,
        leadTimeDays: defaultLeadTimeDays,
        reviewCycleDays: reviewCycleDays || 7,
        effectiveFrom: new Date(),
        isActive,
        notes: notes || `Policy type: ${policyType}. Created for ${organization.homeCountry} operations.`,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unitCost: true,
            unit: true,
          },
        },
        // Note: warehouse relation might not exist, commenting out for now
        // warehouse: {
        //   select: {
        //     id: true,
        //     name: true,
        //   },
        // },
      },
    });

    // Return simple success response for demo
    return NextResponse.json({
      success: true,
      data: {
        ...reorderPolicy,
        policyType,
        formattedValues: {
          reorderPoint: `${defaultReorderPoint} ${product.unitOfMeasure?.symbol || 'units'}`,
          reorderQuantity: `${defaultReorderQuantity} ${product.unitOfMeasure?.symbol || 'units'}`,
        }
      },
    });

  } catch (error: any) {
    console.error('Error creating reorder policy:', error);
    return NextResponse.json(
      { error: 'Failed to create reorder policy', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    console.log('API called for org:', params.orgSlug);
    
    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { 
        id: true, 
        baseCurrency: true, 
        homeCountry: true,
        name: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    console.log('Found organization:', organization.name);

    // Query reorder policies with simplified query first
    const reorderPolicies = await prisma.reorderPolicy.findMany({
      where: {
        organizationId: organization.id,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            purchasePrice: true,
            sellingPrice: true,
            category: true,
            // Comment out unitOfMeasure for now to avoid relation issues
            // unitOfMeasure: {
            //   select: {
            //     name: true,
            //     symbol: true,
            //   }
            // }
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    console.log('Found policies:', reorderPolicies.length);

    // Transform data for response
    const enhancedPolicies = reorderPolicies.map((policy) => ({
      ...policy,
      strategy: mapPolicyTypeToStrategy(policy.policyType),
      formattedValues: {
        reorderPoint: `${policy.reorderPoint} units`,
        reorderQuantity: `${policy.reorderQuantity} units`,
        unitCost: `${organization.baseCurrency} ${policy.product.purchasePrice || 0}`,
      },
      localization: {
        currency: organization.baseCurrency,
        country: organization.homeCountry,
      },
    }));

    return NextResponse.json({
      success: true,
      data: enhancedPolicies,
      meta: {
        total: enhancedPolicies.length,
        active: enhancedPolicies.filter(p => p.isActive).length,
        strategies: getStrategyDistribution(enhancedPolicies),
        localization: {
          country: organization.homeCountry,
          currency: organization.baseCurrency,
        },
      }
    });

  } catch (error: any) {
    console.error('Error fetching reorder policies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reorder policies', details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

// Helper functions (simplified for demo)
function mapPolicyTypeToStrategy(policyType: string): string {
  const mapping: Record<string, string> = {
    'MIN_MAX': 'MAX_QTY',
    'REORDER_POINT': 'FIXED_QTY', 
    'ECONOMIC_ORDER_QUANTITY': 'FIXED_QTY',
    'JUST_IN_TIME': 'LOT_FOR_LOT',
    'PERIODIC_REVIEW': 'MAX_QTY',
  };
  
  return mapping[policyType] || 'FIXED_QTY';
}

function assessStrategySuitability(policy: any, unitCost: number): string {
  if (unitCost > 1000) return 'Consider ORDER_TO_ORDER for high-value items';
  if (unitCost < 10) return 'FIXED_QTY suitable for low-cost items';
  return 'Current strategy appropriate';
}

function checkCompliance(policy: any, localizationConfig: any): string {
  // Basic compliance check
  if (!policy.isActive) return 'INACTIVE';
  if (policy.leadTimeDays > localizationConfig.regionalConstraints?.maxLeadTime) return 'LEAD_TIME_VIOLATION';
  return 'COMPLIANT';
}

function calculatePolicyAnalytics(policies: any[], organization: any) {
  const totalPolicies = policies.length;
  const activePolicies = policies.filter(p => p.isActive).length;
  const avgLeadTime = policies.reduce((sum, p) => sum + p.leadTimeDays, 0) / totalPolicies;
  
  const totalValue = policies.reduce((sum, p) => 
    sum + (Number(p.product.unitCost || 0) * Number(p.reorderQuantity)), 0
  );

  return {
    summary: {
      totalPolicies,
      activePolicies,
      inactivePolicies: totalPolicies - activePolicies,
      avgLeadTime: Math.round(avgLeadTime * 10) / 10,
      totalValue,
      currency: organization.baseCurrency,
    },
    performance: {
      efficiencyScore: activePolicies / totalPolicies * 100,
      coverageRate: 85, // Placeholder - would be calculated from actual inventory coverage
      complianceRate: 90, // Placeholder - would check against regional requirements
    }
  };
}

function getStrategyDistribution(policies: any[]) {
  const distribution = policies.reduce((acc, policy) => {
    const strategy = policy.strategy;
    acc[strategy] = (acc[strategy] || 0) + 1;
    return acc;
  }, {});

  return distribution;
}

// Bulk Policy Assignment - Enterprise Feature (Simplified for demo)
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    // Skip auth for demo
    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true, baseCurrency: true, homeCountry: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();

    // Simple response for demo
    return NextResponse.json({
      success: true,
      message: 'Bulk operations not implemented in demo',
      organization: organization.id,
    });

  } catch (error: any) {
    console.error('Error in bulk policy operation:', error);
    return NextResponse.json(
      { error: 'Bulk operation failed', details: error.message },
      { status: 500 }
    );
  }
}
