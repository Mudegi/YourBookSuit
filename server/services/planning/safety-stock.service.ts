/**
 * Safety Stock Strategy Pattern Implementation
 * 
 * This service implements different safety stock calculation methods:
 * - Simple Min/Max approach
 * - Statistical method with Z-score
 * - Lead Time Variable method
 * - Percentage of demand method
 * 
 * All methods support regional risk multipliers through LocalizationService
 */

import { SafetyStockMethod } from '@prisma/client';
import prisma from '@/lib/prisma';

export interface SafetyStockCalculationParams {
  productId: string;
  warehouseId?: string;
  serviceLevel?: number; // 90, 95, 99 etc.
  leadTimeDays?: number;
  reviewPeriodDays?: number;
  regionalRiskMultiplier?: number;
  organizationId: string;
}

export interface SafetyStockResult {
  suggestedQuantity: number;
  currentQuantity: number;
  method: SafetyStockMethod;
  financialImpact: number;
  riskReduction: number;
  calculation: {
    avgDailyDemand: number;
    maxDailyDemand: number;
    avgLeadTime: number;
    maxLeadTime: number;
    demandStdDev?: number;
    leadTimeStdDev?: number;
    zScore?: number;
    regionalMultiplier: number;
  };
}

export interface ISafetyStockStrategy {
  calculate(params: SafetyStockCalculationParams): Promise<SafetyStockResult>;
  getMethodName(): SafetyStockMethod;
  getDescription(): string;
}

/**
 * Simple Safety Stock Strategy
 * Formula: (Max Daily Sales * Max Lead Time) - (Avg Daily Sales * Avg Lead Time)
 */
export class SimpleSafetyStockStrategy implements ISafetyStockStrategy {
  getMethodName(): SafetyStockMethod {
    return SafetyStockMethod.BASED_ON_LEAD_TIME;
  }

  getDescription(): string {
    return 'Simple approach using max and average demand/lead time';
  }

  async calculate(params: SafetyStockCalculationParams): Promise<SafetyStockResult> {
    const { productId, warehouseId, organizationId, regionalRiskMultiplier = 1.0 } = params;
    
    // Get historical sales data (last 90 days)
    const historicalData = await this.getHistoricalDemand(productId, warehouseId, organizationId);
    
    // Get lead time data from suppliers/purchase history
    const leadTimeData = await this.getLeadTimeData(productId, organizationId);
    
    // Calculate daily demand statistics
    const avgDailyDemand = historicalData.totalQuantity / Math.max(historicalData.days, 1);
    const maxDailyDemand = historicalData.maxDailyQuantity;
    
    // Use actual lead time or fallback to estimated
    const avgLeadTime = leadTimeData.avgLeadTime || params.leadTimeDays || 14;
    const maxLeadTime = leadTimeData.maxLeadTime || avgLeadTime * 1.5;
    
    // Simple formula with regional adjustment
    const baseQuantity = (maxDailyDemand * maxLeadTime) - (avgDailyDemand * avgLeadTime);
    const suggestedQuantity = Math.max(0, baseQuantity * regionalRiskMultiplier);
    
    // Get current safety stock
    const currentSafetyStock = await this.getCurrentSafetyStock(productId, warehouseId, organizationId);
    
    // Calculate financial impact (assuming average cost)
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { purchasePrice: true },
    });
    
    const financialImpact = Number(product?.purchasePrice || 0) * (suggestedQuantity - currentSafetyStock);
    
    return {
      suggestedQuantity,
      currentQuantity: currentSafetyStock,
      method: this.getMethodName(),
      financialImpact,
      riskReduction: this.calculateRiskReduction(suggestedQuantity, currentSafetyStock),
      calculation: {
        avgDailyDemand,
        maxDailyDemand,
        avgLeadTime,
        maxLeadTime,
        regionalMultiplier: regionalRiskMultiplier,
      },
    };
  }

  private async getHistoricalDemand(productId: string, warehouseId?: string, organizationId?: string) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const salesData = await prisma.invoiceItem.findMany({
      where: {
        productId,
        invoice: {
          organizationId,
          invoiceDate: { gte: ninetyDaysAgo },
          status: 'PAID',
        },
      },
      include: { invoice: true },
      orderBy: { invoice: { invoiceDate: 'asc' } },
    });

    if (salesData.length === 0) {
      return { totalQuantity: 0, days: 90, maxDailyQuantity: 0, dailyQuantities: [] };
    }

    // Group by day and calculate daily quantities
    const dailyQuantities: { [date: string]: number } = {};
    let totalQuantity = 0;

    salesData.forEach(item => {
      const date = item.invoice.invoiceDate.toISOString().split('T')[0];
      const quantity = Number(item.quantity);
      dailyQuantities[date] = (dailyQuantities[date] || 0) + quantity;
      totalQuantity += quantity;
    });

    const quantities = Object.values(dailyQuantities);
    const maxDailyQuantity = Math.max(...quantities, 0);

    return {
      totalQuantity,
      days: 90,
      maxDailyQuantity,
      dailyQuantities: quantities,
    };
  }

  private async getLeadTimeData(productId: string, organizationId: string) {
    // Get lead time from recent purchase orders
    const recentPOs = await prisma.purchaseOrderItem.findMany({
      where: {
        productId,
        purchaseOrder: {
          organizationId,
          poDate: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) }, // Last 6 months
          status: 'RECEIVED'
        },
      },
      include: {
        purchaseOrder: true,
      },
      take: 20,
    });

    if (recentPOs.length === 0) {
      return { avgLeadTime: null, maxLeadTime: null };
    }

    const leadTimes = recentPOs
      .filter(po => po.purchaseOrder.expectedDate)
      .map(po => {
        const orderDate = po.purchaseOrder.poDate;
        const expectedDate = po.purchaseOrder.expectedDate!;
        return Math.ceil((expectedDate.getTime() - orderDate.getTime()) / (24 * 60 * 60 * 1000));
      });

    if (leadTimes.length === 0) {
      return { avgLeadTime: null, maxLeadTime: null };
    }

    const avgLeadTime = leadTimes.reduce((sum, lt) => sum + lt, 0) / leadTimes.length;
    const maxLeadTime = Math.max(...leadTimes);

    return { avgLeadTime, maxLeadTime };
  }

  private async getCurrentSafetyStock(productId: string, warehouseId?: string, organizationId?: string): Promise<number> {
    const safetyStock = await prisma.safetyStock.findFirst({
      where: {
        productId,
        warehouseId,
        organizationId,
        isActive: true,
        effectiveFrom: { lte: new Date() },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date() } },
        ],
      },
    });

    return safetyStock ? Number(safetyStock.safetyStockQty) : 0;
  }

  private calculateRiskReduction(suggested: number, current: number): number {
    if (current === 0) return suggested > 0 ? 50 : 0;
    const improvement = (suggested - current) / current;
    return Math.min(Math.max(improvement * 30, -20), 80); // Cap between -20% and +80%
  }
}

/**
 * Statistical Safety Stock Strategy
 * Formula: Z-score * √(Lead Time) * Demand Standard Deviation
 */
export class StatisticalSafetyStockStrategy implements ISafetyStockStrategy {
  getMethodName(): SafetyStockMethod {
    return SafetyStockMethod.STATISTICAL;
  }

  getDescription(): string {
    return 'Statistical method using standard deviation and service level Z-score';
  }

  async calculate(params: SafetyStockCalculationParams): Promise<SafetyStockResult> {
    const { productId, warehouseId, organizationId, serviceLevel = 95, regionalRiskMultiplier = 1.0 } = params;
    
    // Get historical demand data
    const historicalData = await this.getHistoricalDemand(productId, warehouseId, organizationId);
    
    if (historicalData.dailyQuantities.length < 7) {
      // Fall back to simple method if insufficient data
      const simpleStrategy = new SimpleSafetyStockStrategy();
      return await simpleStrategy.calculate(params);
    }

    // Calculate demand standard deviation
    const avgDailyDemand = historicalData.totalQuantity / Math.max(historicalData.days, 1);
    const variance = historicalData.dailyQuantities.reduce((sum, qty) => {
      return sum + Math.pow(qty - avgDailyDemand, 2);
    }, 0) / historicalData.dailyQuantities.length;
    const demandStdDev = Math.sqrt(variance);

    // Get lead time
    const leadTimeData = await this.getLeadTimeData(productId, organizationId);
    const avgLeadTime = leadTimeData.avgLeadTime || params.leadTimeDays || 14;

    // Get Z-score for service level
    const zScore = this.getZScore(serviceLevel);

    // Statistical formula with regional adjustment
    const baseQuantity = zScore * Math.sqrt(avgLeadTime) * demandStdDev;
    const suggestedQuantity = Math.max(0, baseQuantity * regionalRiskMultiplier);

    // Get current safety stock
    const currentSafetyStock = await this.getCurrentSafetyStock(productId, warehouseId, organizationId);

    // Calculate financial impact
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { purchasePrice: true },
    });

    const financialImpact = Number(product?.purchasePrice || 0) * (suggestedQuantity - currentSafetyStock);

    return {
      suggestedQuantity,
      currentQuantity: currentSafetyStock,
      method: this.getMethodName(),
      financialImpact,
      riskReduction: this.calculateRiskReduction(suggestedQuantity, currentSafetyStock, serviceLevel),
      calculation: {
        avgDailyDemand,
        maxDailyDemand: Math.max(...historicalData.dailyQuantities, 0),
        avgLeadTime,
        maxLeadTime: leadTimeData.maxLeadTime || avgLeadTime * 1.5,
        demandStdDev,
        zScore,
        regionalMultiplier: regionalRiskMultiplier,
      },
    };
  }

  private getZScore(serviceLevel: number): number {
    // Service level to Z-score mapping
    const zScores: { [key: number]: number } = {
      50: 0.00,
      60: 0.25,
      70: 0.52,
      75: 0.67,
      80: 0.84,
      85: 1.04,
      90: 1.28,
      92: 1.41,
      95: 1.65,
      96: 1.75,
      97: 1.88,
      98: 2.05,
      99: 2.33,
      99.5: 2.58,
      99.9: 3.09,
    };

    return zScores[serviceLevel] || 1.65; // Default to 95%
  }

  // Reuse methods from SimpleSafetyStockStrategy
  private getHistoricalDemand = SimpleSafetyStockStrategy.prototype['getHistoricalDemand'];
  private getLeadTimeData = SimpleSafetyStockStrategy.prototype['getLeadTimeData'];
  private getCurrentSafetyStock = SimpleSafetyStockStrategy.prototype['getCurrentSafetyStock'];
  
  private calculateRiskReduction(suggested: number, current: number, serviceLevel: number): number {
    const baseReduction = ((suggested - current) / Math.max(current, 1)) * 40;
    const serviceLevelBonus = (serviceLevel - 90) * 0.5; // Bonus for higher service levels
    return Math.min(Math.max(baseReduction + serviceLevelBonus, -30), 90);
  }
}

/**
 * Percentage of Demand Strategy
 * Formula: Average Monthly Demand * Percentage Factor * Regional Multiplier
 */
export class PercentageOfDemandStrategy implements ISafetyStockStrategy {
  getMethodName(): SafetyStockMethod {
    return SafetyStockMethod.PERCENTAGE_OF_DEMAND;
  }

  getDescription(): string {
    return 'Percentage of average demand over specified period';
  }

  async calculate(params: SafetyStockCalculationParams): Promise<SafetyStockResult> {
    const { productId, warehouseId, organizationId, regionalRiskMultiplier = 1.0 } = params;
    
    // Get historical demand
    const historicalData = await SimpleSafetyStockStrategy.prototype['getHistoricalDemand'].call(
      this, productId, warehouseId, organizationId
    );
    
    // Calculate monthly average demand
    const avgMonthlyDemand = (historicalData.totalQuantity / 90) * 30; // Convert 90-day to monthly
    
    // Use 25% as default percentage (typical range is 10-50%)
    const percentageFactor = 0.25;
    
    // Apply percentage with regional adjustment
    const suggestedQuantity = Math.max(0, avgMonthlyDemand * percentageFactor * regionalRiskMultiplier);
    
    // Get current safety stock
    const currentSafetyStock = await SimpleSafetyStockStrategy.prototype['getCurrentSafetyStock'].call(
      this, productId, warehouseId, organizationId
    );

    // Calculate financial impact
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { purchasePrice: true },
    });

    const financialImpact = Number(product?.purchasePrice || 0) * (suggestedQuantity - currentSafetyStock);

    return {
      suggestedQuantity,
      currentQuantity: currentSafetyStock,
      method: this.getMethodName(),
      financialImpact,
      riskReduction: ((suggestedQuantity - currentSafetyStock) / Math.max(currentSafetyStock, 1)) * 25,
      calculation: {
        avgDailyDemand: historicalData.totalQuantity / 90,
        maxDailyDemand: historicalData.maxDailyQuantity,
        avgLeadTime: params.leadTimeDays || 14,
        maxLeadTime: (params.leadTimeDays || 14) * 1.5,
        regionalMultiplier: regionalRiskMultiplier,
      },
    };
  }
}

/**
 * Main Safety Stock Service with Strategy Pattern
 */
export class SafetyStockService {
  private strategies: Map<SafetyStockMethod, ISafetyStockStrategy>;

  constructor() {
    this.strategies = new Map([
      [SafetyStockMethod.BASED_ON_LEAD_TIME, new SimpleSafetyStockStrategy()],
      [SafetyStockMethod.STATISTICAL, new StatisticalSafetyStockStrategy()],
      [SafetyStockMethod.PERCENTAGE_OF_DEMAND, new PercentageOfDemandStrategy()],
    ]);
  }

  async calculateSafetyStock(
    method: SafetyStockMethod,
    params: SafetyStockCalculationParams
  ): Promise<SafetyStockResult> {
    const strategy = this.strategies.get(method);
    if (!strategy) {
      throw new Error(`Unsupported safety stock method: ${method}`);
    }

    return await strategy.calculate(params);
  }

  async calculateAllMethods(params: SafetyStockCalculationParams): Promise<SafetyStockResult[]> {
    const results: SafetyStockResult[] = [];
    
    for (const [method, strategy] of this.strategies) {
      try {
        const result = await strategy.calculate(params);
        results.push(result);
      } catch (error) {
        console.error(`Error calculating safety stock with method ${method}:`, error);
      }
    }

    return results;
  }

  getAvailableMethods(): { method: SafetyStockMethod; description: string }[] {
    return Array.from(this.strategies.entries()).map(([method, strategy]) => ({
      method,
      description: strategy.getDescription(),
    }));
  }
}