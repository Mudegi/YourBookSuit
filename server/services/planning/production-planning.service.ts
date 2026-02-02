/**
 * Production Planning Service
 * 
 * Handles production scheduling and capacity planning based on demand forecasts.
 * Integrates with MRP results to create optimized production schedules that
 * balance demand requirements with capacity constraints.
 */

import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';
import { addDays, differenceInDays, isBefore, isAfter } from 'date-fns';

const prisma = new PrismaClient();

export interface ProductionPlanningRequest {
  organizationId: string;
  forecastId: string;
  planningHorizon: number; // days
  considerCapacityConstraints: boolean;
  userId: string;
}

export interface ProductionCapacity {
  workCenterId: string;
  workCenterName: string;
  dailyCapacity: number; // hours
  availableCapacity: number; // hours
  utilization: number; // percentage
  bottleneck: boolean;
}

export interface ProductionScheduleItem {
  workOrderId?: string;
  productId: string;
  productName: string;
  quantity: Decimal;
  bomId: string;
  workCenterId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  duration: number; // days
  priority: number; // 1-5 (1 = highest)
  status: 'PLANNED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  dependencies: string[]; // Other work order IDs
  resourceRequirements: Array<{
    resourceType: 'LABOR' | 'MACHINE' | 'MATERIAL';
    resourceId: string;
    hours?: number;
    quantity?: Decimal;
  }>;
}

export interface ProductionPlan {
  planId: string;
  forecastId: string;
  planningPeriod: {
    start: Date;
    end: Date;
  };
  scheduleItems: ProductionScheduleItem[];
  capacityAnalysis: ProductionCapacity[];
  feasibilityAssessment: {
    feasible: boolean;
    constraintViolations: string[];
    recommendations: string[];
    maxThroughput: Decimal;
    bottleneckResources: string[];
  };
  kpis: {
    plannedThroughput: Decimal;
    averageUtilization: number;
    onTimeDeliveryRisk: number; // percentage
    totalProductionDays: number;
    costEstimate: Decimal;
  };
}

/**
 * Production Planning Service
 */
export class ProductionPlanningService {
  
  /**
   * Create production plan from forecast
   */
  async createProductionPlan(request: ProductionPlanningRequest): Promise<ProductionPlan> {
    const planId = `prod_plan_${Date.now()}_${request.forecastId.slice(-6)}`;
    
    // 1. Get forecast and product details
    const forecast = await this.getForecastDetails(request.forecastId);
    if (!forecast) {
      throw new Error(`Forecast ${request.forecastId} not found`);
    }
    
    // 2. Get BOM and routing information
    const bom = await this.getProductBOM(forecast.productId);
    const routing = await this.getProductRouting(forecast.productId);
    
    // 3. Calculate production requirements
    const productionQuantity = new Decimal(forecast.forecastedDemand);
    
    // 4. Get capacity information
    const capacityAnalysis = await this.analyzeProductionCapacity(
      request.organizationId,
      request.planningHorizon
    );
    
    // 5. Create initial schedule
    let scheduleItems = await this.createInitialSchedule(
      forecast,
      bom,
      routing,
      productionQuantity,
      request.planningHorizon
    );
    
    // 6. Optimize schedule if capacity constraints are considered
    if (request.considerCapacityConstraints) {
      scheduleItems = await this.optimizeScheduleForCapacity(
        scheduleItems,
        capacityAnalysis
      );
    }
    
    // 7. Assess feasibility
    const feasibilityAssessment = this.assessScheduleFeasibility(
      scheduleItems,
      capacityAnalysis,
      forecast.periodEnd
    );
    
    // 8. Calculate KPIs
    const kpis = this.calculateProductionKPIs(scheduleItems, capacityAnalysis);
    
    // 9. Save production plan
    await this.saveProductionPlan(planId, request, {
      scheduleItems,
      feasibilityAssessment,
      kpis,
    });
    
    return {
      planId,
      forecastId: request.forecastId,
      planningPeriod: {
        start: new Date(),
        end: addDays(new Date(), request.planningHorizon),
      },
      scheduleItems,
      capacityAnalysis,
      feasibilityAssessment,
      kpis,
    };
  }
  
  /**
   * Get forecast details
   */
  private async getForecastDetails(forecastId: string) {
    return await prisma.demandForecast.findUnique({
      where: { id: forecastId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            manufacturingLeadTime: true,
            standardCost: true,
          },
        },
      },
    });
  }
  
  /**
   * Get product BOM
   */
  private async getProductBOM(productId: string) {
    return await prisma.billOfMaterial.findFirst({
      where: {
        productId,
        status: 'ACTIVE',
        isDefault: true,
      },
      include: {
        lines: {
          include: {
            component: {
              select: {
                id: true,
                name: true,
                standardCost: true,
              },
            },
          },
        },
      },
    });
  }
  
  /**
   * Get product routing (work centers and operations)
   */
  private async getProductRouting(productId: string) {
    // TODO: Implement routing model and query
    // For now, return default single work center
    return {
      id: `routing_${productId}`,
      operations: [
        {
          sequence: 10,
          operationType: 'ASSEMBLY',
          workCenterId: 'wc_main_assembly',
          setupTime: 30, // minutes
          runTimePerUnit: 15, // minutes per unit
          description: 'Main assembly operation',
        },
      ],
    };
  }
  
  /**
   * Analyze production capacity
   */
  private async analyzeProductionCapacity(
    organizationId: string,
    planningHorizon: number
  ): Promise<ProductionCapacity[]> {
    // TODO: Implement WorkCenter model and capacity analysis
    // For now, return sample capacity data
    const workCenters = [
      {
        workCenterId: 'wc_main_assembly',
        workCenterName: 'Main Assembly Line',
        dailyCapacity: 8 * 60, // 8 hours * 60 minutes
        availableCapacity: 7 * 60, // Assuming 87.5% utilization
        utilization: 87.5,
        bottleneck: false,
      },
      {
        workCenterId: 'wc_quality_check',
        workCenterName: 'Quality Control Station',
        dailyCapacity: 6 * 60, // 6 hours * 60 minutes
        availableCapacity: 5.5 * 60,
        utilization: 91.7,
        bottleneck: true, // This is the bottleneck
      },
    ];
    
    return workCenters;
  }
  
  /**
   * Create initial production schedule
   */
  private async createInitialSchedule(
    forecast: any,
    bom: any,
    routing: any,
    quantity: Decimal,
    planningHorizon: number
  ): Promise<ProductionScheduleItem[]> {
    const scheduleItems: ProductionScheduleItem[] = [];
    
    if (!bom || !routing) {
      // No BOM or routing - treat as simple production
      const leadTime = forecast.product.manufacturingLeadTime || 7;
      const scheduledStart = new Date();
      const scheduledEnd = addDays(scheduledStart, leadTime);
      
      scheduleItems.push({
        productId: forecast.productId,
        productName: forecast.product.name,
        quantity,
        bomId: bom?.id || '',
        workCenterId: 'wc_main_assembly',
        scheduledStart,
        scheduledEnd,
        duration: leadTime,
        priority: 3,
        status: 'PLANNED',
        dependencies: [],
        resourceRequirements: [
          {
            resourceType: 'LABOR',
            resourceId: 'assembly_team',
            hours: quantity.toNumber() * 0.25, // 15 minutes per unit
          },
        ],
      });
      
      return scheduleItems;
    }
    
    // Calculate production time for each operation
    for (const operation of routing.operations) {
      const setupTimeHours = operation.setupTime / 60;
      const runTimeHours = (operation.runTimePerUnit * quantity.toNumber()) / 60;
      const totalHours = setupTimeHours + runTimeHours;
      const durationDays = Math.ceil(totalHours / 8); // Assuming 8-hour work days
      
      const scheduledStart = new Date();
      const scheduledEnd = addDays(scheduledStart, durationDays);
      
      scheduleItems.push({
        productId: forecast.productId,
        productName: `${forecast.product.name} - ${operation.description}`,
        quantity,
        bomId: bom.id,
        workCenterId: operation.workCenterId,
        scheduledStart,
        scheduledEnd,
        duration: durationDays,
        priority: 3,
        status: 'PLANNED',
        dependencies: operation.sequence > 10 ? [`op_${operation.sequence - 10}`] : [],
        resourceRequirements: [
          {
            resourceType: 'LABOR',
            resourceId: operation.workCenterId,
            hours: totalHours,
          },
          {
            resourceType: 'MACHINE',
            resourceId: operation.workCenterId,
            hours: runTimeHours,
          },
        ],
      });
    }
    
    return scheduleItems;
  }
  
  /**
   * Optimize schedule considering capacity constraints
   */
  private async optimizeScheduleForCapacity(
    scheduleItems: ProductionScheduleItem[],
    capacityAnalysis: ProductionCapacity[]
  ): Promise<ProductionScheduleItem[]> {
    const optimizedItems = [...scheduleItems];
    
    // Simple optimization: delay operations if capacity is exceeded
    for (const item of optimizedItems) {
      const workCenter = capacityAnalysis.find(wc => wc.workCenterId === item.workCenterId);
      
      if (workCenter && workCenter.utilization > 95) {
        // Bottleneck - add delay
        const delayDays = Math.ceil(workCenter.utilization / 100);
        item.scheduledStart = addDays(item.scheduledStart, delayDays);
        item.scheduledEnd = addDays(item.scheduledEnd, delayDays);
      }
    }
    
    return optimizedItems;
  }
  
  /**
   * Assess schedule feasibility
   */
  private assessScheduleFeasibility(
    scheduleItems: ProductionScheduleItem[],
    capacityAnalysis: ProductionCapacity[],
    demandDate: Date
  ) {
    const constraintViolations: string[] = [];
    const recommendations: string[] = [];
    const bottleneckResources: string[] = [];
    
    // Check if we can meet demand date
    const latestCompletion = scheduleItems.reduce((latest, item) => {
      return isAfter(item.scheduledEnd, latest) ? item.scheduledEnd : latest;
    }, new Date());
    
    const feasible = !isAfter(latestCompletion, demandDate);
    
    if (!feasible) {
      const delayDays = differenceInDays(latestCompletion, demandDate);
      constraintViolations.push(`Production will be ${delayDays} days late`);
      recommendations.push('Consider overtime or additional capacity');
    }
    
    // Check capacity constraints
    for (const workCenter of capacityAnalysis) {
      if (workCenter.utilization > 95) {
        constraintViolations.push(`Work center ${workCenter.workCenterName} over capacity (${workCenter.utilization}%)`);
        bottleneckResources.push(workCenter.workCenterId);
        
        if (workCenter.bottleneck) {
          recommendations.push(`Focus on improving ${workCenter.workCenterName} capacity`);
        }
      }
    }
    
    // Calculate max throughput
    const bottleneckCapacity = Math.min(...capacityAnalysis.map(wc => wc.availableCapacity));
    const maxThroughput = new Decimal(bottleneckCapacity).dividedBy(15); // Assuming 15 min per unit
    
    return {
      feasible,
      constraintViolations,
      recommendations,
      maxThroughput,
      bottleneckResources,
    };
  }
  
  /**
   * Calculate production KPIs
   */
  private calculateProductionKPIs(
    scheduleItems: ProductionScheduleItem[],
    capacityAnalysis: ProductionCapacity[]
  ) {
    const plannedThroughput = scheduleItems.reduce(
      (sum, item) => sum.plus(item.quantity),
      new Decimal(0)
    );
    
    const averageUtilization = capacityAnalysis.reduce(
      (sum, wc) => sum + wc.utilization,
      0
    ) / capacityAnalysis.length;
    
    const totalProductionDays = scheduleItems.reduce(
      (max, item) => Math.max(max, item.duration),
      0
    );
    
    // Simple risk assessment based on utilization
    const onTimeDeliveryRisk = averageUtilization > 90 ? 
      (averageUtilization - 90) * 2 : 0; // Risk increases with utilization
    
    // Estimate cost based on resource requirements
    const costEstimate = scheduleItems.reduce((sum, item) => {
      const laborCost = item.resourceRequirements
        .filter(req => req.resourceType === 'LABOR')
        .reduce((cost, req) => cost + (req.hours || 0) * 25, 0); // $25/hour
      
      return sum.plus(laborCost);
    }, new Decimal(0));
    
    return {
      plannedThroughput,
      averageUtilization,
      onTimeDeliveryRisk,
      totalProductionDays,
      costEstimate,
    };
  }
  
  /**
   * Save production plan
   */
  private async saveProductionPlan(
    planId: string,
    request: ProductionPlanningRequest,
    planData: any
  ): Promise<void> {
    // TODO: Create ProductionPlan model and save
    console.log('Production Plan Saved:', {
      planId,
      forecastId: request.forecastId,
      organizationId: request.organizationId,
      planningHorizon: request.planningHorizon,
      scheduleItemCount: planData.scheduleItems.length,
      feasible: planData.feasibilityAssessment.feasible,
      plannedThroughput: planData.kpis.plannedThroughput.toString(),
      costEstimate: planData.kpis.costEstimate.toString(),
    });
  }
  
  /**
   * Update production schedule based on actual progress
   */
  async updateScheduleProgress(
    planId: string,
    workOrderId: string,
    progress: {
      status: 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
      actualStart?: Date;
      actualEnd?: Date;
      quantityProduced?: Decimal;
      notes?: string;
    }
  ): Promise<void> {
    // TODO: Update schedule item with actual progress
    console.log('Schedule Progress Updated:', {
      planId,
      workOrderId,
      progress,
    });
  }
  
  /**
   * Get production plan status
   */
  async getProductionPlanStatus(planId: string): Promise<{
    planId: string;
    status: 'DRAFT' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED';
    progress: {
      totalItems: number;
      completedItems: number;
      inProgressItems: number;
      delayedItems: number;
      percentComplete: number;
    };
    performance: {
      onTimeDelivery: number;
      actualVsPlannedThroughput: number;
      utilizationVariance: number;
    };
  }> {
    // TODO: Query production plan status from database
    return {
      planId,
      status: 'DRAFT',
      progress: {
        totalItems: 0,
        completedItems: 0,
        inProgressItems: 0,
        delayedItems: 0,
        percentComplete: 0,
      },
      performance: {
        onTimeDelivery: 0,
        actualVsPlannedThroughput: 0,
        utilizationVariance: 0,
      },
    };
  }
  
  /**
   * Create work orders from production plan
   */
  async createWorkOrdersFromPlan(
    planId: string,
    userId: string
  ): Promise<Array<{ workOrderId: string; productId: string; status: string }>> {
    // TODO: Integration with existing work order creation
    const workOrders = [];
    
    console.log('Work Orders Created from Production Plan:', {
      planId,
      createdBy: userId,
      count: workOrders.length,
    });
    
    return workOrders;
  }
  
  /**
   * Get capacity utilization forecast
   */
  async getCapacityUtilizationForecast(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    date: Date;
    workCenterId: string;
    plannedUtilization: number;
    actualUtilization?: number;
    availableCapacity: number;
    overCapacity: boolean;
  }>> {
    // TODO: Calculate capacity utilization over time
    return [];
  }
}