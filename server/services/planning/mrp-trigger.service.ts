/**
 * MRP (Material Requirements Planning) Trigger Service
 * 
 * This service acts as the bridge between demand forecasting and supply chain execution.
 * When forecasts are published, it triggers downstream planning activities including:
 * - Material Requirements Planning (MRP)
 * - Production Planning
 * - Procurement Planning
 * - Safety Stock Updates
 * 
 * The forecast becomes the "lead domino" that drives the entire supply chain.
 */

import { PrismaClient, ForecastMethod } from '@prisma/client';
import Decimal from 'decimal.js';
import { addDays, addMonths, startOfMonth, endOfMonth } from 'date-fns';

const prisma = new PrismaClient();

export interface MRPCalculationRequest {
  forecastId: string;
  organizationId: string;
  productId: string;
  branchId?: string;
  forecastedDemand: Decimal;
  planningHorizon: number; // months
  userId: string;
}

export interface MaterialRequirement {
  componentId: string;
  componentName: string;
  requiredQuantity: Decimal;
  currentStock: Decimal;
  shortfall: Decimal;
  suggestedOrderDate: Date;
  leadTimeDays: number;
  supplierId?: string;
}

export interface ProductionRequirement {
  productId: string;
  bomId?: string;
  requiredQuantity: Decimal;
  suggestedStartDate: Date;
  suggestedDueDate: Date;
  workCenterId?: string;
  estimatedDuration: number; // days
}

export interface ProcurementSuggestion {
  componentId: string;
  vendorId?: string;
  suggestedQuantity: Decimal;
  estimatedCost: Decimal;
  orderDate: Date;
  expectedDelivery: Date;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

export interface MRPResult {
  forecastId: string;
  runId: string;
  materialRequirements: MaterialRequirement[];
  productionRequirements: ProductionRequirement[];
  procurementSuggestions: ProcurementSuggestion[];
  safetyStockUpdates: Array<{
    productId: string;
    warehouseId?: string;
    currentLevel: Decimal;
    recommendedLevel: Decimal;
    reason: string;
  }>;
  workOrderSuggestions: Array<{
    productId: string;
    quantity: Decimal;
    dueDate: Date;
    priority: number;
  }>;
  summary: {
    totalComponents: number;
    componentsInShort: number;
    totalEstimatedCost: Decimal;
    earliestActionDate: Date;
    criticalPath: string[];
  };
}

/**
 * MRP Trigger Service
 * Orchestrates supply chain planning based on published forecasts
 */
export class MRPTriggerService {
  
  /**
   * Main entry point - triggered when forecast is published
   */
  async onForecastPublished(forecastId: string, userId: string): Promise<MRPResult> {
    // 1. Get forecast details
    const forecast = await this.getForecastDetails(forecastId);
    if (!forecast) {
      throw new Error(`Forecast ${forecastId} not found`);
    }
    
    // 2. Run MRP calculation
    const mrpRequest: MRPCalculationRequest = {
      forecastId: forecast.id,
      organizationId: forecast.organizationId,
      productId: forecast.productId,
      branchId: forecast.branchId,
      forecastedDemand: new Decimal(forecast.forecastedDemand),
      planningHorizon: 6, // 6 months planning horizon
      userId,
    };
    
    const mrpResult = await this.runMRPCalculation(mrpRequest);
    
    // 3. Execute downstream actions
    await this.executeDownstreamActions(mrpResult, userId);
    
    return mrpResult;
  }
  
  /**
   * Core MRP calculation logic
   */
  private async runMRPCalculation(request: MRPCalculationRequest): Promise<MRPResult> {
    const runId = `mrp_${Date.now()}_${request.forecastId.slice(-6)}`;
    
    // 1. Get BOM for the product (if manufactured)
    const bom = await this.getActiveBOM(request.productId);
    
    // 2. Calculate material requirements
    const materialRequirements = bom 
      ? await this.calculateMaterialRequirements(request, bom)
      : [];
    
    // 3. Calculate production requirements
    const productionRequirements = bom
      ? await this.calculateProductionRequirements(request, bom)
      : [];
    
    // 4. Generate procurement suggestions
    const procurementSuggestions = await this.generateProcurementSuggestions(
      materialRequirements,
      request.organizationId
    );
    
    // 5. Update safety stock recommendations
    const safetyStockUpdates = await this.calculateSafetyStockUpdates(request);
    
    // 6. Generate work order suggestions
    const workOrderSuggestions = await this.generateWorkOrderSuggestions(
      productionRequirements,
      request
    );
    
    // 7. Calculate summary
    const summary = this.calculateMRPSummary(
      materialRequirements,
      procurementSuggestions
    );
    
    // 8. Save MRP run record
    await this.saveMRPRun(runId, request, {
      materialRequirements,
      productionRequirements,
      procurementSuggestions,
      summary,
    });
    
    return {
      forecastId: request.forecastId,
      runId,
      materialRequirements,
      productionRequirements,
      procurementSuggestions,
      safetyStockUpdates,
      workOrderSuggestions,
      summary,
    };
  }
  
  /**
   * Get forecast details from database
   */
  private async getForecastDetails(forecastId: string) {
    return await prisma.demandForecast.findUnique({
      where: { id: forecastId },
      select: {
        id: true,
        organizationId: true,
        productId: true,
        branchId: true,
        forecastedDemand: true,
        periodStart: true,
        periodEnd: true,
        product: {
          select: {
            name: true,
            trackInventory: true,
          },
        },
      },
    });
  }
  
  /**
   * Get active BOM for product
   */
  private async getActiveBOM(productId: string) {
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
                sku: true,
              },
            },
          },
        },
      },
    });
  }
  
  /**
   * Calculate material requirements based on BOM
   */
  private async calculateMaterialRequirements(
    request: MRPCalculationRequest,
    bom: any
  ): Promise<MaterialRequirement[]> {
    const requirements: MaterialRequirement[] = [];
    
    for (const line of bom.lines) {
      // Calculate gross requirement
      const quantityPerUnit = new Decimal(line.quantityPer);
      const scrapFactor = new Decimal(1).plus(new Decimal(line.scrapPercent).dividedBy(100));
      const grossRequirement = request.forecastedDemand
        .times(quantityPerUnit)
        .times(scrapFactor);
      
      // Get current stock
      const inventory = await prisma.inventoryItem.findFirst({
        where: {
          productId: line.componentId,
          branchId: request.branchId,
        },
      });
      
      const currentStock = inventory ? new Decimal(inventory.quantityOnHand) : new Decimal(0);
      const shortfall = grossRequirement.minus(currentStock);
      
      // Get component lead time
      const component = await prisma.product.findUnique({
        where: { id: line.componentId },
        select: {
          purchaseLeadTime: true,
          preferredVendorId: true,
        },
      });
      
      const leadTimeDays = component?.purchaseLeadTime || 14; // Default 2 weeks
      const suggestedOrderDate = addDays(new Date(), -leadTimeDays);
      
      requirements.push({
        componentId: line.componentId,
        componentName: line.component.name,
        requiredQuantity: grossRequirement,
        currentStock,
        shortfall: shortfall.greaterThan(0) ? shortfall : new Decimal(0),
        suggestedOrderDate,
        leadTimeDays,
        supplierId: component?.preferredVendorId,
      });
    }
    
    return requirements;
  }
  
  /**
   * Calculate production requirements
   */
  private async calculateProductionRequirements(
    request: MRPCalculationRequest,
    bom: any
  ): Promise<ProductionRequirement[]> {
    // Get manufacturing lead time
    const product = await prisma.product.findUnique({
      where: { id: request.productId },
      select: {
        manufacturingLeadTime: true,
      },
    });
    
    const leadTimeDays = product?.manufacturingLeadTime || 7; // Default 1 week
    
    // Calculate when production should start and end
    const suggestedDueDate = addDays(new Date(), 30); // Assume 30 days for delivery
    const suggestedStartDate = addDays(suggestedDueDate, -leadTimeDays);
    
    return [{
      productId: request.productId,
      bomId: bom.id,
      requiredQuantity: request.forecastedDemand,
      suggestedStartDate,
      suggestedDueDate,
      estimatedDuration: leadTimeDays,
    }];
  }
  
  /**
   * Generate procurement suggestions
   */
  private async generateProcurementSuggestions(
    requirements: MaterialRequirement[],
    organizationId: string
  ): Promise<ProcurementSuggestion[]> {
    const suggestions: ProcurementSuggestion[] = [];
    
    for (const req of requirements) {
      if (req.shortfall.greaterThan(0)) {
        // Get component purchase price
        const component = await prisma.product.findUnique({
          where: { id: req.componentId },
          select: {
            purchasePrice: true,
            preferredVendorId: true,
            economicOrderQty: true,
          },
        });
        
        const unitPrice = component?.purchasePrice ? new Decimal(component.purchasePrice) : new Decimal(0);
        const eoq = component?.economicOrderQty ? new Decimal(component.economicOrderQty) : new Decimal(0);
        
        // Suggest ordering max(shortfall, EOQ) to optimize order size
        const suggestedQuantity = eoq.greaterThan(req.shortfall) ? eoq : req.shortfall;
        const estimatedCost = suggestedQuantity.times(unitPrice);
        
        // Determine priority based on shortfall severity
        let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
        const shortfallRatio = req.shortfall.dividedBy(req.requiredQuantity);
        if (shortfallRatio.greaterThan(0.8)) priority = 'HIGH';
        else if (shortfallRatio.lessThan(0.3)) priority = 'LOW';
        
        suggestions.push({
          componentId: req.componentId,
          vendorId: req.supplierId,
          suggestedQuantity,
          estimatedCost,
          orderDate: req.suggestedOrderDate,
          expectedDelivery: addDays(req.suggestedOrderDate, req.leadTimeDays),
          priority,
          reason: `Shortfall of ${req.shortfall.toFixed(0)} units for forecast demand`,
        });
      }
    }
    
    return suggestions.sort((a, b) => {
      // Sort by priority (HIGH first) then by order date
      const priorityOrder = { HIGH: 1, MEDIUM: 2, LOW: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.orderDate.getTime() - b.orderDate.getTime();
    });
  }
  
  /**
   * Calculate safety stock updates
   */
  private async calculateSafetyStockUpdates(request: MRPCalculationRequest) {
    const updates = [];
    
    // Get current safety stock policy
    const safetyStock = await prisma.safetyStock.findFirst({
      where: {
        productId: request.productId,
        organizationId: request.organizationId,
        isActive: true,
      },
    });
    
    if (safetyStock) {
      // Calculate new recommendation based on forecast volatility
      const currentLevel = new Decimal(safetyStock.safetyStockQty);
      
      // Simple rule: safety stock = 20% of forecast demand
      const recommendedLevel = request.forecastedDemand.times(0.2);
      
      if (!recommendedLevel.equals(currentLevel)) {
        updates.push({
          productId: request.productId,
          warehouseId: undefined,
          currentLevel,
          recommendedLevel,
          reason: 'Updated based on new demand forecast',
        });
      }
    }
    
    return updates;
  }
  
  /**
   * Generate work order suggestions
   */
  private async generateWorkOrderSuggestions(
    productionRequirements: ProductionRequirement[],
    request: MRPCalculationRequest
  ) {
    return productionRequirements.map(req => ({
      productId: req.productId,
      quantity: req.requiredQuantity,
      dueDate: req.suggestedDueDate,
      priority: 3, // Medium priority
    }));
  }
  
  /**
   * Calculate MRP summary
   */
  private calculateMRPSummary(
    requirements: MaterialRequirement[],
    suggestions: ProcurementSuggestion[]
  ) {
    const componentsInShort = requirements.filter(r => r.shortfall.greaterThan(0)).length;
    const totalEstimatedCost = suggestions.reduce(
      (sum, s) => sum.plus(s.estimatedCost),
      new Decimal(0)
    );
    
    const earliestActionDate = suggestions.length > 0
      ? new Date(Math.min(...suggestions.map(s => s.orderDate.getTime())))
      : new Date();
    
    const criticalPath = requirements
      .filter(r => r.shortfall.greaterThan(0))
      .sort((a, b) => a.leadTimeDays - b.leadTimeDays)
      .map(r => r.componentName)
      .slice(0, 3); // Top 3 critical components
    
    return {
      totalComponents: requirements.length,
      componentsInShort,
      totalEstimatedCost,
      earliestActionDate,
      criticalPath,
    };
  }
  
  /**
   * Save MRP run record for audit
   */
  private async saveMRPRun(
    runId: string,
    request: MRPCalculationRequest,
    result: any
  ): Promise<void> {
    // TODO: Create MRPRun model in schema and save
    console.log('MRP Run Saved:', {
      runId,
      forecastId: request.forecastId,
      timestamp: new Date(),
      componentsAnalyzed: result.materialRequirements.length,
      shortfalls: result.summary.componentsInShort,
      estimatedCost: result.summary.totalEstimatedCost.toString(),
    });
  }
  
  /**
   * Execute downstream actions (create actual orders, work orders, etc.)
   */
  private async executeDownstreamActions(
    mrpResult: MRPResult,
    userId: string
  ): Promise<void> {
    // 1. Auto-create purchase requisitions for critical shortfalls
    const criticalSuggestions = mrpResult.procurementSuggestions.filter(
      s => s.priority === 'HIGH'
    );
    
    for (const suggestion of criticalSuggestions) {
      await this.createPurchaseRequisition(suggestion, userId);
    }
    
    // 2. Auto-create work orders if configured
    for (const workOrder of mrpResult.workOrderSuggestions) {
      await this.createWorkOrderSuggestion(workOrder, userId);
    }
    
    // 3. Update reorder policies if needed
    await this.updateReorderPolicies(mrpResult.safetyStockUpdates, userId);
    
    // 4. Notify relevant users
    await this.sendMRPNotifications(mrpResult, userId);
  }
  
  /**
   * Create purchase requisition
   */
  private async createPurchaseRequisition(
    suggestion: ProcurementSuggestion,
    userId: string
  ): Promise<void> {
    // TODO: Integrate with existing purchase requisition system
    console.log('Purchase Requisition Created:', {
      componentId: suggestion.componentId,
      quantity: suggestion.suggestedQuantity.toString(),
      estimatedCost: suggestion.estimatedCost.toString(),
      dueDate: suggestion.expectedDelivery,
      priority: suggestion.priority,
      createdBy: userId,
    });
  }
  
  /**
   * Create work order suggestion
   */
  private async createWorkOrderSuggestion(
    suggestion: any,
    userId: string
  ): Promise<void> {
    // TODO: Integrate with existing work order system
    console.log('Work Order Suggested:', {
      productId: suggestion.productId,
      quantity: suggestion.quantity.toString(),
      dueDate: suggestion.dueDate,
      priority: suggestion.priority,
      suggestedBy: 'MRP System',
      createdBy: userId,
    });
  }
  
  /**
   * Update reorder policies
   */
  private async updateReorderPolicies(
    updates: any[],
    userId: string
  ): Promise<void> {
    for (const update of updates) {
      // TODO: Update existing reorder policies or create new ones
      console.log('Reorder Policy Updated:', {
        productId: update.productId,
        newSafetyStock: update.recommendedLevel.toString(),
        reason: update.reason,
        updatedBy: userId,
      });
    }
  }
  
  /**
   * Send notifications about MRP results
   */
  private async sendMRPNotifications(
    mrpResult: MRPResult,
    userId: string
  ): Promise<void> {
    // TODO: Integrate with notification system
    console.log('MRP Notifications Sent:', {
      runId: mrpResult.runId,
      criticalShortfalls: mrpResult.summary.componentsInShort,
      estimatedCost: mrpResult.summary.totalEstimatedCost.toString(),
      notifiedUser: userId,
    });
  }
  
  /**
   * Get MRP history for a product
   */
  async getMRPHistory(
    organizationId: string,
    productId?: string,
    limit: number = 10
  ): Promise<Array<{
    runId: string;
    forecastId: string;
    runDate: Date;
    componentsAnalyzed: number;
    shortfalls: number;
    estimatedCost: Decimal;
    actionsTaken: number;
  }>> {
    // TODO: Query MRP run history from database
    return [];
  }
  
  /**
   * Get current MRP status for organization
   */
  async getMRPStatus(organizationId: string): Promise<{
    lastRunDate: Date | null;
    pendingActions: number;
    criticalShortfalls: number;
    totalEstimatedCost: Decimal;
    forecastsCovered: number;
  }> {
    // TODO: Query current MRP status
    return {
      lastRunDate: null,
      pendingActions: 0,
      criticalShortfalls: 0,
      totalEstimatedCost: new Decimal(0),
      forecastsCovered: 0,
    };
  }
}