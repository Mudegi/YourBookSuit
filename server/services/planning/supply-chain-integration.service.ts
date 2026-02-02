/**
 * Supply Chain Integration Service
 * 
 * Main orchestrator that coordinates between forecasting, MRP, production planning,
 * and procurement to create a unified supply chain planning system.
 * 
 * This service acts as the central coordinator ensuring that published forecasts
 * properly drive all downstream planning activities.
 */

import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';
import { ForecastingService, GeneratedForecast } from './forecasting.service';
import { MRPTriggerService, MRPResult } from './mrp-trigger.service';
import { ProductionPlanningService, ProductionPlan } from './production-planning.service';

const prisma = new PrismaClient();

export interface SupplyChainPlanningRequest {
  organizationId: string;
  forecastIds: string[]; // Can handle multiple forecasts
  planningHorizon: number; // days
  includeCapacityConstraints: boolean;
  autoExecuteActions: boolean; // Whether to auto-create orders/work orders
  userId: string;
}

export interface SupplyChainPlan {
  planId: string;
  organizationId: string;
  planningPeriod: {
    start: Date;
    end: Date;
  };
  forecastSummary: {
    totalForecasts: number;
    totalDemand: Decimal;
    confidenceLevel: number;
    methods: string[];
  };
  mrpResults: MRPResult[];
  productionPlans: ProductionPlan[];
  procurementSummary: {
    totalComponents: number;
    totalCost: Decimal;
    criticalShortfalls: number;
    suggestedActions: number;
  };
  integrationStatus: {
    mrpCompleted: boolean;
    productionPlanned: boolean;
    procurementPlanned: boolean;
    workOrdersCreated: boolean;
    purchaseRequisitionsCreated: boolean;
  };
  recommendations: string[];
  kpis: {
    planFeasibility: number; // 0-1
    costEfficiency: number; // 0-1
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    expectedDeliveryPerformance: number; // 0-1
  };
}

/**
 * Main supply chain integration service
 */
export class SupplyChainIntegrationService {
  private forecastingService: ForecastingService;
  private mrpService: MRPTriggerService;
  private productionService: ProductionPlanningService;
  
  constructor() {
    this.forecastingService = new ForecastingService();
    this.mrpService = new MRPTriggerService();
    this.productionService = new ProductionPlanningService();
  }
  
  /**
   * Main entry point: Create comprehensive supply chain plan
   */
  async createSupplyChainPlan(request: SupplyChainPlanningRequest): Promise<SupplyChainPlan> {
    const planId = `sc_plan_${Date.now()}_${request.organizationId.slice(-6)}`;
    
    try {
      // 1. Validate and get forecast data
      const forecasts = await this.getForecasts(request.forecastIds);
      const forecastSummary = this.calculateForecastSummary(forecasts);
      
      // 2. Run MRP for each forecast
      const mrpResults: MRPResult[] = [];
      for (const forecastId of request.forecastIds) {
        const mrpResult = await this.mrpService.onForecastPublished(forecastId, request.userId);
        mrpResults.push(mrpResult);
      }
      
      // 3. Create production plans
      const productionPlans: ProductionPlan[] = [];
      for (const forecastId of request.forecastIds) {
        const productionPlan = await this.productionService.createProductionPlan({
          organizationId: request.organizationId,
          forecastId,
          planningHorizon: request.planningHorizon,
          considerCapacityConstraints: request.includeCapacityConstraints,
          userId: request.userId,
        });
        productionPlans.push(productionPlan);
      }
      
      // 4. Consolidate procurement requirements
      const procurementSummary = this.consolidateProcurementSummary(mrpResults);
      
      // 5. Assess integration status
      const integrationStatus = await this.assessIntegrationStatus(
        mrpResults,
        productionPlans,
        request.autoExecuteActions,
        request.userId
      );
      
      // 6. Generate recommendations
      const recommendations = this.generateRecommendations(
        mrpResults,
        productionPlans,
        procurementSummary
      );
      
      // 7. Calculate KPIs
      const kpis = this.calculateSupplyChainKPIs(
        mrpResults,
        productionPlans,
        procurementSummary
      );
      
      // 8. Save supply chain plan
      const plan: SupplyChainPlan = {
        planId,
        organizationId: request.organizationId,
        planningPeriod: {
          start: new Date(),
          end: new Date(Date.now() + request.planningHorizon * 24 * 60 * 60 * 1000),
        },
        forecastSummary,
        mrpResults,
        productionPlans,
        procurementSummary,
        integrationStatus,
        recommendations,
        kpis,
      };
      
      await this.saveSupplyChainPlan(plan, request.userId);
      
      return plan;
      
    } catch (error) {
      console.error('Error creating supply chain plan:', error);
      throw new Error(`Failed to create supply chain plan: ${error.message}`);
    }
  }
  
  /**
   * Get forecast data
   */
  private async getForecasts(forecastIds: string[]) {
    const forecasts = await prisma.demandForecast.findMany({
      where: {
        id: { in: forecastIds },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });
    
    if (forecasts.length !== forecastIds.length) {
      throw new Error('Some forecasts not found');
    }
    
    return forecasts;
  }
  
  /**
   * Calculate forecast summary
   */
  private calculateForecastSummary(forecasts: any[]) {
    const totalDemand = forecasts.reduce(
      (sum, f) => sum.plus(new Decimal(f.forecastedDemand)),
      new Decimal(0)
    );
    
    const avgConfidence = forecasts.reduce(
      (sum, f) => sum + Number(f.confidenceLevel || 0),
      0
    ) / forecasts.length;
    
    const methods = [...new Set(forecasts.map(f => f.forecastMethod))];
    
    return {
      totalForecasts: forecasts.length,
      totalDemand,
      confidenceLevel: avgConfidence,
      methods,
    };
  }
  
  /**
   * Consolidate procurement summary from MRP results
   */
  private consolidateProcurementSummary(mrpResults: MRPResult[]) {
    const allSuggestions = mrpResults.flatMap(result => result.procurementSuggestions);
    
    const totalComponents = new Set(allSuggestions.map(s => s.componentId)).size;
    const totalCost = allSuggestions.reduce(
      (sum, s) => sum.plus(s.estimatedCost),
      new Decimal(0)
    );
    const criticalShortfalls = allSuggestions.filter(s => s.priority === 'HIGH').length;
    
    return {
      totalComponents,
      totalCost,
      criticalShortfalls,
      suggestedActions: allSuggestions.length,
    };
  }
  
  /**
   * Assess integration status and execute actions if requested
   */
  private async assessIntegrationStatus(
    mrpResults: MRPResult[],
    productionPlans: ProductionPlan[],
    autoExecute: boolean,
    userId: string
  ) {
    const status = {
      mrpCompleted: mrpResults.length > 0,
      productionPlanned: productionPlans.length > 0,
      procurementPlanned: mrpResults.some(r => r.procurementSuggestions.length > 0),
      workOrdersCreated: false,
      purchaseRequisitionsCreated: false,
    };
    
    if (autoExecute) {
      // Create work orders from production plans
      for (const plan of productionPlans) {
        try {
          await this.productionService.createWorkOrdersFromPlan(plan.planId, userId);
          status.workOrdersCreated = true;
        } catch (error) {
          console.error('Failed to create work orders:', error);
        }
      }
      
      // Create purchase requisitions from MRP
      const criticalSuggestions = mrpResults.flatMap(r => 
        r.procurementSuggestions.filter(s => s.priority === 'HIGH')
      );
      
      if (criticalSuggestions.length > 0) {
        try {
          await this.createPurchaseRequisitions(criticalSuggestions, userId);
          status.purchaseRequisitionsCreated = true;
        } catch (error) {
          console.error('Failed to create purchase requisitions:', error);
        }
      }
    }
    
    return status;
  }
  
  /**
   * Generate recommendations
   */
  private generateRecommendations(
    mrpResults: MRPResult[],
    productionPlans: ProductionPlan[],
    procurementSummary: any
  ): string[] {
    const recommendations: string[] = [];
    
    // MRP-based recommendations
    const totalShortfalls = mrpResults.reduce((sum, r) => sum + r.summary.componentsInShort, 0);
    if (totalShortfalls > 0) {
      recommendations.push(`${totalShortfalls} components have shortfalls - prioritize procurement`);
    }
    
    // Production-based recommendations
    const infeasiblePlans = productionPlans.filter(p => !p.feasibilityAssessment.feasible);
    if (infeasiblePlans.length > 0) {
      recommendations.push(`${infeasiblePlans.length} production plans are infeasible - consider capacity expansion`);
    }
    
    // Bottleneck recommendations
    const bottlenecks = productionPlans.flatMap(p => p.feasibilityAssessment.bottleneckResources);
    if (bottlenecks.length > 0) {
      const uniqueBottlenecks = [...new Set(bottlenecks)];
      recommendations.push(`Bottlenecks identified: ${uniqueBottlenecks.join(', ')} - focus improvement efforts`);
    }
    
    // Cost-based recommendations
    if (procurementSummary.totalCost.greaterThan(100000)) {
      recommendations.push('High procurement costs identified - review supplier negotiations');
    }
    
    // Critical shortfall recommendations
    if (procurementSummary.criticalShortfalls > 0) {
      recommendations.push(`${procurementSummary.criticalShortfalls} critical shortfalls require immediate action`);
    }
    
    return recommendations;
  }
  
  /**
   * Calculate supply chain KPIs
   */
  private calculateSupplyChainKPIs(
    mrpResults: MRPResult[],
    productionPlans: ProductionPlan[],
    procurementSummary: any
  ) {
    // Plan feasibility (percentage of feasible production plans)
    const feasiblePlans = productionPlans.filter(p => p.feasibilityAssessment.feasible).length;
    const planFeasibility = productionPlans.length > 0 ? feasiblePlans / productionPlans.length : 0;
    
    // Cost efficiency (inverse of cost per unit)
    const totalDemand = productionPlans.reduce(
      (sum, p) => sum.plus(p.kpis.plannedThroughput),
      new Decimal(0)
    );
    const costPerUnit = totalDemand.greaterThan(0) 
      ? procurementSummary.totalCost.dividedBy(totalDemand).toNumber()
      : 0;
    const costEfficiency = costPerUnit > 0 ? Math.max(0, 1 - (costPerUnit / 1000)) : 1; // Normalize
    
    // Risk level based on shortfalls and bottlenecks
    const totalShortfalls = mrpResults.reduce((sum, r) => sum + r.summary.componentsInShort, 0);
    const totalBottlenecks = productionPlans.reduce(
      (sum, p) => sum + p.feasibilityAssessment.bottleneckResources.length,
      0
    );
    
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (totalShortfalls > 5 || totalBottlenecks > 3) {
      riskLevel = 'HIGH';
    } else if (totalShortfalls > 2 || totalBottlenecks > 1) {
      riskLevel = 'MEDIUM';
    }
    
    // Expected delivery performance (inverse of risk)
    const avgDeliveryRisk = productionPlans.reduce(
      (sum, p) => sum + p.kpis.onTimeDeliveryRisk,
      0
    ) / productionPlans.length;
    const expectedDeliveryPerformance = Math.max(0, 1 - (avgDeliveryRisk / 100));
    
    return {
      planFeasibility,
      costEfficiency,
      riskLevel,
      expectedDeliveryPerformance,
    };
  }
  
  /**
   * Save supply chain plan
   */
  private async saveSupplyChainPlan(plan: SupplyChainPlan, userId: string): Promise<void> {
    // TODO: Create SupplyChainPlan model and save
    console.log('Supply Chain Plan Saved:', {
      planId: plan.planId,
      organizationId: plan.organizationId,
      forecastCount: plan.forecastSummary.totalForecasts,
      totalDemand: plan.forecastSummary.totalDemand.toString(),
      mrpResults: plan.mrpResults.length,
      productionPlans: plan.productionPlans.length,
      procurementCost: plan.procurementSummary.totalCost.toString(),
      feasibility: plan.kpis.planFeasibility,
      riskLevel: plan.kpis.riskLevel,
      createdBy: userId,
    });
  }
  
  /**
   * Create purchase requisitions
   */
  private async createPurchaseRequisitions(suggestions: any[], userId: string): Promise<void> {
    // TODO: Integrate with purchase requisition system
    for (const suggestion of suggestions) {
      console.log('Purchase Requisition Created:', {
        componentId: suggestion.componentId,
        vendorId: suggestion.vendorId,
        quantity: suggestion.suggestedQuantity.toString(),
        estimatedCost: suggestion.estimatedCost.toString(),
        priority: suggestion.priority,
        orderDate: suggestion.orderDate,
        expectedDelivery: suggestion.expectedDelivery,
        createdBy: userId,
      });
    }
  }
  
  /**
   * Get supply chain plan status
   */
  async getSupplyChainPlanStatus(planId: string): Promise<{
    planId: string;
    status: 'DRAFT' | 'APPROVED' | 'EXECUTING' | 'COMPLETED';
    progress: {
      mrpExecuted: boolean;
      productionScheduled: boolean;
      workOrdersCreated: number;
      purchaseOrdersCreated: number;
      overallProgress: number; // 0-100
    };
    performance: {
      forecastAccuracy: number;
      deliveryPerformance: number;
      costVariance: number;
      qualityMetrics: number;
    };
  }> {
    // TODO: Query plan status from database
    return {
      planId,
      status: 'DRAFT',
      progress: {
        mrpExecuted: false,
        productionScheduled: false,
        workOrdersCreated: 0,
        purchaseOrdersCreated: 0,
        overallProgress: 0,
      },
      performance: {
        forecastAccuracy: 0,
        deliveryPerformance: 0,
        costVariance: 0,
        qualityMetrics: 0,
      },
    };
  }
  
  /**
   * Update forecast accuracy with actual sales data
   */
  async updateForecastAccuracy(organizationId: string): Promise<{
    forecastsUpdated: number;
    averageAccuracy: number;
    improvementTrend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  }> {
    // Get forecasts that need accuracy updates
    const forecastsToUpdate = await prisma.demandForecast.findMany({
      where: {
        organizationId,
        actualDemand: null, // Not yet updated with actuals
        periodEnd: {
          lt: new Date(), // Period has ended
        },
      },
      take: 100, // Process in batches
    });
    
    let updatedCount = 0;
    let totalAccuracy = 0;
    
    for (const forecast of forecastsToUpdate) {
      try {
        // Get actual sales data for the forecast period
        const actualSales = await this.getActualSalesForPeriod(
          forecast.organizationId,
          forecast.productId,
          forecast.periodStart,
          forecast.periodEnd
        );
        
        // Calculate accuracy
        const forecasted = new Decimal(forecast.forecastedDemand);
        const actual = new Decimal(actualSales);
        
        const accuracy = this.calculateForecastAccuracy(forecasted, actual);
        
        // Update forecast record
        await prisma.demandForecast.update({
          where: { id: forecast.id },
          data: {
            actualDemand: actual,
            accuracy,
          },
        });
        
        updatedCount++;
        totalAccuracy += accuracy.toNumber();
        
      } catch (error) {
        console.error(`Failed to update accuracy for forecast ${forecast.id}:`, error);
      }
    }
    
    const averageAccuracy = updatedCount > 0 ? totalAccuracy / updatedCount : 0;
    
    // Determine trend (simplified)
    const improvementTrend: 'IMPROVING' | 'DECLINING' | 'STABLE' = 'STABLE';
    
    return {
      forecastsUpdated: updatedCount,
      averageAccuracy,
      improvementTrend,
    };
  }
  
  /**
   * Get actual sales data for period
   */
  private async getActualSalesForPeriod(
    organizationId: string,
    productId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const result = await prisma.invoiceLine.aggregate({
      where: {
        productId,
        invoice: {
          organizationId,
          status: { in: ['SENT', 'PAID'] },
          invoiceDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      _sum: {
        quantity: true,
      },
    });
    
    return Number(result._sum.quantity) || 0;
  }
  
  /**
   * Calculate forecast accuracy
   */
  private calculateForecastAccuracy(forecasted: Decimal, actual: Decimal): Decimal {
    if (forecasted.equals(0) && actual.equals(0)) {
      return new Decimal(1); // Perfect accuracy
    }
    
    if (forecasted.equals(0)) {
      return new Decimal(0); // Cannot forecast zero when actual > 0
    }
    
    const error = forecasted.minus(actual).abs();
    const mape = error.dividedBy(actual.greaterThan(0) ? actual : forecasted);
    const accuracy = new Decimal(1).minus(mape);
    
    return Decimal.max(0, accuracy); // Ensure non-negative
  }
  
  /**
   * Get supply chain metrics dashboard
   */
  async getSupplyChainMetrics(organizationId: string): Promise<{
    forecastingMetrics: {
      totalActiveForecasts: number;
      averageAccuracy: number;
      methodPerformance: Array<{ method: string; accuracy: number }>;
    };
    mrpMetrics: {
      lastRunDate: Date | null;
      componentsAnalyzed: number;
      shortfallsIdentified: number;
      actionsGenerated: number;
    };
    productionMetrics: {
      activePlans: number;
      averageUtilization: number;
      bottleneckCount: number;
      onTimeDelivery: number;
    };
    procurementMetrics: {
      pendingRequisitions: number;
      totalValue: Decimal;
      criticalShortfalls: number;
      supplierPerformance: number;
    };
  }> {
    // TODO: Implement comprehensive metrics gathering
    return {
      forecastingMetrics: {
        totalActiveForecasts: 0,
        averageAccuracy: 0,
        methodPerformance: [],
      },
      mrpMetrics: {
        lastRunDate: null,
        componentsAnalyzed: 0,
        shortfallsIdentified: 0,
        actionsGenerated: 0,
      },
      productionMetrics: {
        activePlans: 0,
        averageUtilization: 0,
        bottleneckCount: 0,
        onTimeDelivery: 0,
      },
      procurementMetrics: {
        pendingRequisitions: 0,
        totalValue: new Decimal(0),
        criticalShortfalls: 0,
        supplierPerformance: 0,
      },
    };
  }
}