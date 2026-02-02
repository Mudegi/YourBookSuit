/**
 * Enhanced Forecasting API
 * 
 * This API provides enterprise-grade forecasting capabilities with:
 * - Strategy-based forecast generation (Strategy Pattern)
 * - Historical data analysis with Uganda localization
 * - Automatic MRP and supply chain integration
 * - Method recommendations and accuracy tracking
 * - Collaborative planning workflows
 * 
 * Available Endpoints:
 * - POST /forecasts/generate - Generate forecast using strategy pattern
 * - POST /forecasts/batch - Batch generate forecasts  
 * - POST /forecasts/publish - Publish forecast to trigger MRP
 * - GET /forecasts/methods - Get available forecasting methods
 * - GET /forecasts/recommendations - Get method recommendations
 * - GET /forecasts/accuracy - Get forecast accuracy metrics
 * - POST /forecasts/supply-chain-plan - Create integrated supply chain plan
 * - GET /forecasts - List existing forecasts (legacy support)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromHeaders } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ForecastMethod } from '@prisma/client';

// Lazy load services only when needed to avoid initialization errors
let forecastingService: any = null;
let supplyChainService: any = null;
let mrpTriggerService: any = null;

async function loadServices() {
  if (!forecastingService) {
    try {
      const ForecastingModule = await import('@/services/planning/forecasting.service');
      const SupplyChainModule = await import('@/services/planning/supply-chain-integration.service');
      const MRPModule = await import('@/services/planning/mrp-trigger.service');
      
      forecastingService = new ForecastingModule.ForecastingService();
      supplyChainService = new SupplyChainModule.SupplyChainIntegrationService();
      mrpTriggerService = new MRPModule.MRPTriggerService();
    } catch (error) {
      console.error('Error loading forecasting services:', error);
      // Services will remain null, API will work in basic mode
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { pathname, searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'generate';

    const session = await getSessionFromHeaders(request.headers);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Load services if needed for advanced operations
    await loadServices();

    const body = await request.json();

    switch (action) {
      case 'generate':
        if (!forecastingService) {
          return NextResponse.json(
            { error: 'Advanced forecasting service not available' },
            { status: 503 }
          );
        }
        return await generateForecast(organization.id, body, session.userId);
      
      case 'batch':
        if (!forecastingService) {
          return NextResponse.json(
            { error: 'Advanced forecasting service not available' },
            { status: 503 }
          );
        }
        return await generateBatchForecasts(organization.id, body, session.userId);
      
      case 'publish':
        if (!mrpTriggerService) {
          return NextResponse.json(
            { error: 'MRP trigger service not available' },
            { status: 503 }
          );
        }
        return await publishForecast(organization.id, body, session.userId);
      
      case 'supply-chain-plan':
        if (!supplyChainService) {
          return NextResponse.json(
            { error: 'Supply chain service not available' },
            { status: 503 }
          );
        }
        return await createSupplyChainPlan(organization.id, body, session.userId);
      
      case 'accuracy-update':
        return await updateForecastAccuracy(organization.id);
      
      default:
        return NextResponse.json(
          { 
            error: 'Invalid action', 
            available: ['generate', 'batch', 'publish', 'supply-chain-plan', 'accuracy-update'] 
          },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Error in forecasting API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Generate forecast using strategy pattern
async function generateForecast(organizationId: string, body: any, userId: string) {
  const {
    productId,
    branchId,
    warehouseId,
    customerSegmentId,
    scenarioId,
    periodStart,
    periodEnd,
    granularity = 'MONTH',
    method,
    parameters = {},
    historyMonths,
    includeExternalEvents = true,
    notes,
  } = body;

  if (!productId || !periodStart || !periodEnd || !method) {
    return NextResponse.json({
      error: 'Missing required fields: productId, periodStart, periodEnd, method'
    }, { status: 400 });
  }

  const forecastRequest: ForecastGenerationRequest = {
    organizationId,
    productId,
    branchId,
    warehouseId,
    customerSegmentId,
    scenarioId,
    periodStart: new Date(periodStart),
    periodEnd: new Date(periodEnd),
    granularity,
    method: method as ForecastMethod,
    parameters,
    historyMonths,
    includeExternalEvents,
    notes,
    userId,
  };

  const forecast = await forecastingService.generateForecast(forecastRequest);

  return NextResponse.json({
    success: true,
    data: {
      forecastId: forecast.forecastId,
      systemForecast: forecast.systemForecast.toString(),
      confidenceLower: forecast.confidenceLower?.toString(),
      confidenceUpper: forecast.confidenceUpper?.toString(),
      confidenceLevel: forecast.confidenceLevel.toString(),
      algorithm: forecast.algorithm,
      parameters: forecast.parameters,
      dataQualityScore: forecast.dataQualityScore,
      recommendations: forecast.recommendations,
      metadata: forecast.metadata,
    },
  });
}

// Generate batch forecasts
async function generateBatchForecasts(organizationId: string, body: any, userId: string) {
  const { requests } = body;

  if (!Array.isArray(requests) || requests.length === 0) {
    return NextResponse.json({
      error: 'requests must be a non-empty array'
    }, { status: 400 });
  }

  const enhancedRequests: ForecastGenerationRequest[] = requests.map(req => ({
    ...req,
    organizationId,
    userId,
    periodStart: new Date(req.periodStart),
    periodEnd: new Date(req.periodEnd),
  }));

  const results = await forecastingService.generateBatchForecasts(enhancedRequests);

  return NextResponse.json({
    success: true,
    data: {
      totalRequests: requests.length,
      successfulForecasts: results.length,
      forecasts: results,
    },
  });
}

// Publish forecast and trigger downstream processes
async function publishForecast(organizationId: string, body: any, userId: string) {
  const { forecastId, triggerMRP = true, triggerProduction = true } = body;

  if (!forecastId) {
    return NextResponse.json({
      error: 'forecastId is required'
    }, { status: 400 });
  }

  // Verify forecast exists
  const forecast = await prisma.demandForecast.findFirst({
    where: {
      id: forecastId,
      organizationId,
    },
  });

  if (!forecast) {
    return NextResponse.json({ error: 'Forecast not found' }, { status: 404 });
  }

  const results: any = {
    forecastId,
    published: true,
    timestamp: new Date(),
  };

  // Trigger MRP
  if (triggerMRP) {
    const mrpResult = await mrpTriggerService.onForecastPublished(forecastId, userId);
    
    results.mrpResult = {
      runId: mrpResult.runId,
      materialRequirements: mrpResult.materialRequirements.length,
      componentsInShort: mrpResult.summary.componentsInShort,
      estimatedCost: mrpResult.summary.totalEstimatedCost.toString(),
      procurementActions: mrpResult.procurementSuggestions.length,
    };
  }

  return NextResponse.json({
    success: true,
    data: results,
  });
}

// Create comprehensive supply chain plan
async function createSupplyChainPlan(organizationId: string, body: any, userId: string) {
  const {
    forecastIds,
    planningHorizon = 90,
    includeCapacityConstraints = true,
    autoExecuteActions = false,
  } = body;

  if (!Array.isArray(forecastIds) || forecastIds.length === 0) {
    return NextResponse.json({
      error: 'forecastIds must be a non-empty array'
    }, { status: 400 });
  }

  const planningRequest: SupplyChainPlanningRequest = {
    organizationId,
    forecastIds,
    planningHorizon,
    includeCapacityConstraints,
    autoExecuteActions,
    userId,
  };

  const plan = await supplyChainService.createSupplyChainPlan(planningRequest);

  return NextResponse.json({
    success: true,
    data: {
      planId: plan.planId,
      planningPeriod: plan.planningPeriod,
      forecastSummary: {
        ...plan.forecastSummary,
        totalDemand: plan.forecastSummary.totalDemand.toString(),
      },
      integrationStatus: plan.integrationStatus,
      kpis: plan.kpis,
      recommendations: plan.recommendations,
    },
  });
}

// Update forecast accuracy
async function updateForecastAccuracy(organizationId: string) {
  const result = await supplyChainService.updateForecastAccuracy(organizationId);
  
  return NextResponse.json({
    success: true,
    data: result,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const session = await getSessionFromHeaders(request.headers);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Handle different GET actions
    switch (action) {
      case 'methods':
        return await getAvailableMethods();
      
      case 'recommendations':
        const productId = searchParams.get('productId');
        const branchId = searchParams.get('branchId');
        return await getMethodRecommendations(organization.id, productId, branchId);
      
      case 'accuracy':
        const accuracyProductId = searchParams.get('productId');
        return await getForecastAccuracy(organization.id, accuracyProductId);
      
      case 'metrics':
        return await getSupplyChainMetrics(organization.id);
      
      default:
        return await listForecasts(organization.id, searchParams);
    }

  } catch (error: any) {
    console.error('Error in GET forecasting API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error.message },
      { status: 500 }
    );
  }
}

// Get available forecasting methods
async function getAvailableMethods() {
  const methods = forecastingService.getAvailableMethods();
  
  return NextResponse.json({
    success: true,
    data: methods,
  });
}

// Get method recommendations for a product
async function getMethodRecommendations(organizationId: string, productId: string | null, branchId: string | null) {
  if (!productId) {
    return NextResponse.json({
      error: 'productId is required for recommendations'
    }, { status: 400 });
  }

  const recommendations = await forecastingService.getMethodRecommendations(
    organizationId,
    productId,
    branchId || undefined
  );

  return NextResponse.json({
    success: true,
    data: recommendations,
  });
}

// Get forecast accuracy metrics
async function getForecastAccuracy(organizationId: string, productId: string | null) {
  const accuracy = await forecastingService.getForecastAccuracy(
    organizationId,
    productId || undefined
  );

  return NextResponse.json({
    success: true,
    data: accuracy,
  });
}

// Get supply chain metrics
async function getSupplyChainMetrics(organizationId: string) {
  const metrics = await supplyChainService.getSupplyChainMetrics(organizationId);

  return NextResponse.json({
    success: true,
    data: {
      ...metrics,
      procurementMetrics: {
        ...metrics.procurementMetrics,
        totalValue: metrics.procurementMetrics.totalValue.toString(),
      },
    },
  });
}

// List existing forecasts (legacy support)
async function listForecasts(organizationId: string, searchParams: URLSearchParams) {
  const productId = searchParams.get('productId');
  const warehouseId = searchParams.get('warehouseId');
  const forecastMethod = searchParams.get('forecastMethod');
  const startDate = searchParams.get('startDate');

  // Build filter
  const where: any = {
    organizationId,
  };

  if (productId) {
    where.productId = productId;
  }

  if (warehouseId) {
    where.warehouseId = warehouseId;
  }

  if (forecastMethod) {
    where.forecastMethod = forecastMethod;
  }

  if (startDate) {
    where.periodStart = { gte: new Date(startDate) };
  }

  const demandForecasts = await prisma.demandForecast.findMany({
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
    },
    orderBy: {
      periodStart: 'desc',
    },
  });

  // Calculate accuracy summary
  const forecastsWithAccuracy = demandForecasts.filter(f => f.accuracy !== null);
  const avgAccuracy = forecastsWithAccuracy.length > 0
    ? forecastsWithAccuracy.reduce((sum, f) => sum + (f.accuracy || 0), 0) / forecastsWithAccuracy.length
    : null;

  return NextResponse.json({
    success: true,
    data: demandForecasts,
    summary: {
      totalForecasts: demandForecasts.length,
      averageAccuracy: avgAccuracy,
      enhancedFeatures: {
        strategyPattern: true,
        historicalAnalysis: true,
        supplyChainIntegration: true,
        ugandaLocalization: true,
      },
    },
  });
}
