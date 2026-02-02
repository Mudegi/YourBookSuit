/**
 * Enterprise Reorder Policy Strategies Implementation
 * Implements the strategy pattern for different reorder policies
 */

import { 
  IReorderPolicyStrategy, 
  ReorderPolicyStrategy, 
  ReorderPolicyConfig, 
  ReorderCalculationContext, 
  ReorderRecommendation,
  OrderModifiers
} from './reorder-policy.interface';
import { CurrencyService } from '../currency.service';

/**
 * Fixed Quantity Strategy
 * Always orders a predetermined fixed amount when reorder point is hit
 */
export class FixedQuantityStrategy implements IReorderPolicyStrategy {
  readonly strategy = ReorderPolicyStrategy.FIXED_QTY;
  readonly displayName = 'Fixed Quantity';
  readonly description = 'Always order a specific amount (e.g., 1 full container) when stock hits reorder point';

  async calculateOrderQuantity(
    config: ReorderPolicyConfig, 
    context: ReorderCalculationContext
  ): Promise<ReorderRecommendation> {
    const availableStock = context.currentStock - context.reservedStock;
    const shouldReorder = availableStock <= (config.reorderPoint || 0);
    
    if (!shouldReorder) {
      return this.createNoOrderRecommendation(config, context);
    }

    let recommendedQty = config.fixedOrderQty || 0;
    
    // Apply order modifiers
    const finalQty = this.applyOrderModifiers(recommendedQty, config.modifiers);
    const constraintViolations = this.validateConstraints(recommendedQty, finalQty, config.modifiers);
    
    const orderValue = finalQty * context.unitCost;
    const formattedOrderValue = await CurrencyService.formatCurrency(
      orderValue, 
      config.organizationId
    );

    return {
      strategy: this.strategy,
      recommendedOrderQty: finalQty,
      urgencyLevel: this.calculateUrgency(availableStock, config.reorderPoint || 0, context.avgDailyDemand),
      reasoning: `Fixed quantity strategy: Always order ${config.fixedOrderQty} units when stock drops to ${config.reorderPoint}`,
      financialImpact: {
        orderValue,
        formattedOrderValue,
        estimatedHoldingCost: this.calculateHoldingCost(finalQty, context),
        estimatedOrderingCost: context.orderingCost || 0,
      },
      constraints: {
        appliedModifiers: config.modifiers,
        constraintViolations,
      },
      nextReviewDate: this.calculateNextReviewDate(config.timeBucket),
    };
  }

  isApplicable(context: ReorderCalculationContext): boolean {
    // Fixed quantity works well for bulk items, containers, standard packages
    return true;
  }

  getConfigurationSchema(): Record<string, any> {
    return {
      fixedOrderQty: { type: 'number', required: true, min: 1, description: 'Fixed quantity to order' },
      reorderPoint: { type: 'number', required: true, min: 0, description: 'Stock level that triggers reorder' },
    };
  }

  private applyOrderModifiers(baseQty: number, modifiers: OrderModifiers): number {
    let adjustedQty = baseQty;

    // Apply minimum order quantity
    if (modifiers.minOrderQty && adjustedQty < modifiers.minOrderQty) {
      adjustedQty = modifiers.minOrderQty;
    }

    // Apply maximum order quantity
    if (modifiers.maxOrderQty && adjustedQty > modifiers.maxOrderQty) {
      adjustedQty = modifiers.maxOrderQty;
    }

    // Apply order multiple (round up to nearest multiple)
    if (modifiers.orderMultiple && modifiers.orderMultiple > 1) {
      adjustedQty = Math.ceil(adjustedQty / modifiers.orderMultiple) * modifiers.orderMultiple;
    }

    return adjustedQty;
  }

  private validateConstraints(originalQty: number, finalQty: number, modifiers: OrderModifiers): string[] {
    const violations: string[] = [];

    if (modifiers.minOrderQty && originalQty < modifiers.minOrderQty) {
      violations.push(`Increased from ${originalQty} to meet minimum order quantity of ${modifiers.minOrderQty}`);
    }

    if (modifiers.maxOrderQty && originalQty > modifiers.maxOrderQty) {
      violations.push(`Reduced from ${originalQty} to respect maximum order quantity of ${modifiers.maxOrderQty}`);
    }

    if (modifiers.orderMultiple && finalQty !== originalQty) {
      violations.push(`Rounded to nearest multiple of ${modifiers.orderMultiple}`);
    }

    return violations;
  }

  private calculateUrgency(currentStock: number, reorderPoint: number, avgDailyDemand: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const stockoutRisk = (reorderPoint - currentStock) / avgDailyDemand;
    
    if (stockoutRisk >= 7) return 'CRITICAL';
    if (stockoutRisk >= 3) return 'HIGH';
    if (stockoutRisk >= 1) return 'MEDIUM';
    return 'LOW';
  }

  private calculateHoldingCost(quantity: number, context: ReorderCalculationContext): number {
    if (!context.holdingCostRate) return 0;
    return quantity * context.unitCost * (context.holdingCostRate / 100) / 2; // Average inventory holding cost
  }

  private calculateNextReviewDate(timeBucket: any): Date {
    const now = new Date();
    switch (timeBucket) {
      case 'DAILY': return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'WEEKLY': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'BIWEEKLY': return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      case 'MONTHLY': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  private createNoOrderRecommendation(config: ReorderPolicyConfig, context: ReorderCalculationContext): ReorderRecommendation {
    return {
      strategy: this.strategy,
      recommendedOrderQty: 0,
      urgencyLevel: 'LOW',
      reasoning: 'Stock level is above reorder point. No order needed.',
      financialImpact: {
        orderValue: 0,
        formattedOrderValue: '0',
        estimatedHoldingCost: 0,
        estimatedOrderingCost: 0,
      },
      constraints: {
        appliedModifiers: config.modifiers,
        constraintViolations: [],
      },
      nextReviewDate: this.calculateNextReviewDate(config.timeBucket),
    };
  }
}

/**
 * Maximum Quantity Strategy  
 * Orders enough to reach a predefined maximum level
 */
export class MaximumQuantityStrategy implements IReorderPolicyStrategy {
  readonly strategy = ReorderPolicyStrategy.MAX_QTY;
  readonly displayName = 'Maximum Quantity';
  readonly description = 'Order enough to reach a maximum ceiling (good for perishable or high-volume items)';

  async calculateOrderQuantity(
    config: ReorderPolicyConfig, 
    context: ReorderCalculationContext
  ): Promise<ReorderRecommendation> {
    const availableStock = context.currentStock - context.reservedStock;
    const shouldReorder = availableStock <= (config.reorderPoint || 0);
    
    if (!shouldReorder) {
      return this.createNoOrderRecommendation(config, context);
    }

    const maxLevel = config.maxLevel || 0;
    const shortfall = maxLevel - availableStock;
    const recommendedQty = Math.max(0, shortfall);
    
    const finalQty = this.applyOrderModifiers(recommendedQty, config.modifiers);
    const constraintViolations = this.validateConstraints(recommendedQty, finalQty, config.modifiers);
    
    const orderValue = finalQty * context.unitCost;
    const formattedOrderValue = await CurrencyService.formatCurrency(
      orderValue, 
      config.organizationId
    );

    return {
      strategy: this.strategy,
      recommendedOrderQty: finalQty,
      urgencyLevel: this.calculateUrgency(availableStock, config.reorderPoint || 0, context.avgDailyDemand),
      reasoning: `Maximum quantity strategy: Order ${recommendedQty} units to reach maximum level of ${maxLevel}`,
      financialImpact: {
        orderValue,
        formattedOrderValue,
        estimatedHoldingCost: this.calculateHoldingCost(finalQty, context),
        estimatedOrderingCost: context.orderingCost || 0,
      },
      constraints: {
        appliedModifiers: config.modifiers,
        constraintViolations,
      },
      nextReviewDate: this.calculateNextReviewDate(config.timeBucket),
    };
  }

  isApplicable(context: ReorderCalculationContext): boolean {
    return true;
  }

  getConfigurationSchema(): Record<string, any> {
    return {
      reorderPoint: { type: 'number', required: true, min: 0, description: 'Stock level that triggers reorder' },
      maxLevel: { type: 'number', required: true, min: 1, description: 'Maximum stock level to order up to' },
    };
  }

  // Helper methods similar to FixedQuantityStrategy...
  private applyOrderModifiers(baseQty: number, modifiers: OrderModifiers): number {
    let adjustedQty = baseQty;

    if (modifiers.minOrderQty && adjustedQty < modifiers.minOrderQty) {
      adjustedQty = modifiers.minOrderQty;
    }

    if (modifiers.maxOrderQty && adjustedQty > modifiers.maxOrderQty) {
      adjustedQty = modifiers.maxOrderQty;
    }

    if (modifiers.orderMultiple && modifiers.orderMultiple > 1) {
      adjustedQty = Math.ceil(adjustedQty / modifiers.orderMultiple) * modifiers.orderMultiple;
    }

    return adjustedQty;
  }

  private validateConstraints(originalQty: number, finalQty: number, modifiers: OrderModifiers): string[] {
    const violations: string[] = [];
    if (modifiers.minOrderQty && originalQty < modifiers.minOrderQty) {
      violations.push(`Increased from ${originalQty} to meet minimum order quantity of ${modifiers.minOrderQty}`);
    }
    return violations;
  }

  private calculateUrgency(currentStock: number, reorderPoint: number, avgDailyDemand: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const stockoutRisk = (reorderPoint - currentStock) / avgDailyDemand;
    if (stockoutRisk >= 7) return 'CRITICAL';
    if (stockoutRisk >= 3) return 'HIGH';
    if (stockoutRisk >= 1) return 'MEDIUM';
    return 'LOW';
  }

  private calculateHoldingCost(quantity: number, context: ReorderCalculationContext): number {
    if (!context.holdingCostRate) return 0;
    return quantity * context.unitCost * (context.holdingCostRate / 100) / 2;
  }

  private calculateNextReviewDate(timeBucket: any): Date {
    const now = new Date();
    switch (timeBucket) {
      case 'DAILY': return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'WEEKLY': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  private createNoOrderRecommendation(config: ReorderPolicyConfig, context: ReorderCalculationContext): ReorderRecommendation {
    return {
      strategy: this.strategy,
      recommendedOrderQty: 0,
      urgencyLevel: 'LOW',
      reasoning: 'Stock level is above reorder point. No order needed.',
      financialImpact: {
        orderValue: 0,
        formattedOrderValue: '0',
        estimatedHoldingCost: 0,
        estimatedOrderingCost: 0,
      },
      constraints: {
        appliedModifiers: config.modifiers,
        constraintViolations: [],
      },
      nextReviewDate: this.calculateNextReviewDate(config.timeBucket),
    };
  }
}

/**
 * Lot-for-Lot Strategy
 * Orders exactly what's needed for a specific period
 */
export class LotForLotStrategy implements IReorderPolicyStrategy {
  readonly strategy = ReorderPolicyStrategy.LOT_FOR_LOT;
  readonly displayName = 'Lot-for-Lot';
  readonly description = 'Order exactly what is needed for a specific period (good for expensive, custom, or JIT items)';

  async calculateOrderQuantity(
    config: ReorderPolicyConfig, 
    context: ReorderCalculationContext
  ): Promise<ReorderRecommendation> {
    const availableStock = context.currentStock - context.reservedStock;
    const leadTimeBuffer = context.leadTimeDays + (config.modifiers.leadTimeBufferDays || 0);
    const demandDuringLeadTime = context.avgDailyDemand * leadTimeBuffer;
    const shortfall = Math.max(0, demandDuringLeadTime - availableStock);
    
    if (shortfall <= 0) {
      return this.createNoOrderRecommendation(config, context);
    }

    // Order exactly what's needed (lot-for-lot)
    const exactNeed = context.demandForecast || shortfall;
    const finalQty = this.applyOrderModifiers(exactNeed, config.modifiers);
    const constraintViolations = this.validateConstraints(exactNeed, finalQty, config.modifiers);
    
    const orderValue = finalQty * context.unitCost;
    const formattedOrderValue = await CurrencyService.formatCurrency(
      orderValue, 
      config.organizationId
    );

    return {
      strategy: this.strategy,
      recommendedOrderQty: finalQty,
      urgencyLevel: this.calculateUrgency(shortfall, context.avgDailyDemand),
      reasoning: `Lot-for-Lot strategy: Order ${exactNeed} units to cover exact demand forecast`,
      financialImpact: {
        orderValue,
        formattedOrderValue,
        estimatedHoldingCost: this.calculateHoldingCost(finalQty, context),
        estimatedOrderingCost: context.orderingCost || 0,
      },
      constraints: {
        appliedModifiers: config.modifiers,
        constraintViolations,
      },
      nextReviewDate: this.calculateNextReviewDate(config.timeBucket),
    };
  }

  isApplicable(context: ReorderCalculationContext): boolean {
    // Best for expensive items or when demand forecast is available
    return context.demandForecast > 0 || context.unitCost > 100;
  }

  getConfigurationSchema(): Record<string, any> {
    return {
      demandForecastPeriod: { type: 'number', required: true, min: 1, description: 'Forecast period in days' },
    };
  }

  // Similar helper methods as other strategies...
  private applyOrderModifiers(baseQty: number, modifiers: OrderModifiers): number {
    let adjustedQty = baseQty;
    if (modifiers.minOrderQty && adjustedQty < modifiers.minOrderQty) {
      adjustedQty = modifiers.minOrderQty;
    }
    if (modifiers.maxOrderQty && adjustedQty > modifiers.maxOrderQty) {
      adjustedQty = modifiers.maxOrderQty;
    }
    if (modifiers.orderMultiple && modifiers.orderMultiple > 1) {
      adjustedQty = Math.ceil(adjustedQty / modifiers.orderMultiple) * modifiers.orderMultiple;
    }
    return adjustedQty;
  }

  private validateConstraints(originalQty: number, finalQty: number, modifiers: OrderModifiers): string[] {
    const violations: string[] = [];
    if (modifiers.minOrderQty && originalQty < modifiers.minOrderQty) {
      violations.push(`Increased from ${originalQty} to meet minimum order quantity of ${modifiers.minOrderQty}`);
    }
    return violations;
  }

  private calculateUrgency(shortfall: number, avgDailyDemand: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const daysOfStock = shortfall / avgDailyDemand;
    if (daysOfStock <= 1) return 'CRITICAL';
    if (daysOfStock <= 3) return 'HIGH';
    if (daysOfStock <= 7) return 'MEDIUM';
    return 'LOW';
  }

  private calculateHoldingCost(quantity: number, context: ReorderCalculationContext): number {
    if (!context.holdingCostRate) return 0;
    return quantity * context.unitCost * (context.holdingCostRate / 100) / 2;
  }

  private calculateNextReviewDate(timeBucket: any): Date {
    const now = new Date();
    switch (timeBucket) {
      case 'DAILY': return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'WEEKLY': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  private createNoOrderRecommendation(config: ReorderPolicyConfig, context: ReorderCalculationContext): ReorderRecommendation {
    return {
      strategy: this.strategy,
      recommendedOrderQty: 0,
      urgencyLevel: 'LOW',
      reasoning: 'Current stock is sufficient to cover forecasted demand.',
      financialImpact: {
        orderValue: 0,
        formattedOrderValue: '0',
        estimatedHoldingCost: 0,
        estimatedOrderingCost: 0,
      },
      constraints: {
        appliedModifiers: config.modifiers,
        constraintViolations: [],
      },
      nextReviewDate: this.calculateNextReviewDate(config.timeBucket),
    };
  }
}

/**
 * Order-to-Order Strategy
 * Creates one purchase order for every sales order
 */
export class OrderToOrderStrategy implements IReorderPolicyStrategy {
  readonly strategy = ReorderPolicyStrategy.ORDER_TO_ORDER;
  readonly displayName = 'Order-to-Order';
  readonly description = 'Create one purchase order for every one sales order (standard for dropshipping or high-value machinery)';

  async calculateOrderQuantity(
    config: ReorderPolicyConfig, 
    context: ReorderCalculationContext
  ): Promise<ReorderRecommendation> {
    // This strategy is event-driven (triggered by sales orders)
    // For now, return a placeholder recommendation
    const orderValue = 0;
    const formattedOrderValue = await CurrencyService.formatCurrency(
      orderValue, 
      config.organizationId
    );

    return {
      strategy: this.strategy,
      recommendedOrderQty: 0,
      urgencyLevel: 'LOW',
      reasoning: 'Order-to-Order strategy is event-driven. Orders are created automatically when sales orders are received.',
      financialImpact: {
        orderValue,
        formattedOrderValue,
        estimatedHoldingCost: 0,
        estimatedOrderingCost: context.orderingCost || 0,
      },
      constraints: {
        appliedModifiers: config.modifiers,
        constraintViolations: [],
      },
      nextReviewDate: new Date(), // Immediate review on sales order events
    };
  }

  isApplicable(context: ReorderCalculationContext): boolean {
    // Good for high-value items, custom products, or dropshipping
    return context.unitCost > 1000;
  }

  getConfigurationSchema(): Record<string, any> {
    return {
      autoCreatePO: { type: 'boolean', default: true, description: 'Automatically create PO when SO is received' },
      supplierLeadTime: { type: 'number', required: true, min: 1, description: 'Supplier lead time in days' },
    };
  }
}

/**
 * Strategy Factory
 * Creates appropriate strategy instances
 */
export class ReorderPolicyStrategyFactory {
  private static strategies = new Map<ReorderPolicyStrategy, IReorderPolicyStrategy>([
    [ReorderPolicyStrategy.FIXED_QTY, new FixedQuantityStrategy()],
    [ReorderPolicyStrategy.MAX_QTY, new MaximumQuantityStrategy()],
    [ReorderPolicyStrategy.LOT_FOR_LOT, new LotForLotStrategy()],
    [ReorderPolicyStrategy.ORDER_TO_ORDER, new OrderToOrderStrategy()],
  ]);

  static getStrategy(strategyType: ReorderPolicyStrategy): IReorderPolicyStrategy {
    const strategy = this.strategies.get(strategyType);
    if (!strategy) {
      throw new Error(`Unsupported reorder policy strategy: ${strategyType}`);
    }
    return strategy;
  }

  static getAllStrategies(): IReorderPolicyStrategy[] {
    return Array.from(this.strategies.values());
  }

  static getAvailableStrategies(): Array<{ value: ReorderPolicyStrategy; label: string; description: string }> {
    return Array.from(this.strategies.values()).map(strategy => ({
      value: strategy.strategy,
      label: strategy.displayName,
      description: strategy.description,
    }));
  }
}