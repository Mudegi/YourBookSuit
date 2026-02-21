/**
 * Variance Analysis Engine - Financial Truth System
 * 
 * This service provides comprehensive variance analysis that:
 * 1. Calculates Purchase Price, Labor Efficiency, and Material Usage variances
 * 2. Handles multi-currency operations with proper base currency conversion
 * 3. Supports localization with country-specific reason codes
 * 4. Posts variance results to General Ledger automatically
 * 5. Provides drill-down capabilities for variance analysis
 * 
 * Used by CFOs and Finance teams to identify exactly where money is "leaking"
 * in operations, especially critical for companies in volatile economies like Uganda.
 */

import { PrismaClient, Decimal } from '@prisma/client';
import { DoubleEntryService } from '@/services/accounting/double-entry.service';
import { CostingLocalizationManager } from './costing-localization.manager';

interface VarianceCalculationInput {
  organizationId: string;
  productId: string;
  transactionId?: string;
  referenceType?: string;
  referenceId?: string;
  standardCosts: {
    materialCost: number;
    laborCost: number;
    overheadCost: number;
    totalCost: number;
  };
  actualCosts: {
    materialCost: number;
    laborCost: number;
    overheadCost: number;
    totalCost: number;
  };
  quantity: number;
  transactionCurrency?: string;
  exchangeRate?: number;
  branchId?: string;
  reasonCode?: string;
  notes?: string;
  postToGL?: boolean;
}

interface VarianceCalculationResult {
  purchasePriceVariance: number;
  materialUsageVariance: number;
  laborRateVariance: number;
  laborEfficiencyVariance: number;
  overheadSpendingVariance: number;
  overheadVolumeVariance: number;
  totalVariance: number;
  currencyVariance: number;
  varianceInBaseCurrency: number;
  glTransactionId?: string;
  reasonCodes: string[];
}

interface VarianceAnalysisFilter {
  organizationId: string;
  startDate?: Date;
  endDate?: Date;
  branchId?: string;
  productId?: string;
  varianceType?: string[];
  reasonCode?: string;
  minVarianceAmount?: number;
  currency?: 'BASE' | 'TRANSACTION';
}

interface VarianceSummary {
  totalVariance: number;
  purchasePriceVariance: number;
  laborEfficiencyVariance: number;
  materialUsageVariance: number;
  currencyVariance: number;
  variancesByBranch: Record<string, number>;
  variancesByReasonCode: Record<string, number>;
  topVariances: Array<{
    productName: string;
    varianceAmount: number;
    variancePercent: number;
    transactionRef: string;
  }>;
}

export class VarianceAnalysisEngine {
  constructor(private prisma: PrismaClient) {}

  /**
   * Calculate comprehensive variances for a transaction
   * This is the core "Financial Truth" calculation
   */
  async calculateVariances(input: VarianceCalculationInput): Promise<VarianceCalculationResult> {
    // Get organization settings for base currency and GL accounts
    const organization = await this.prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { 
        baseCurrency: true, 
        homeCountry: true,
      },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Get localization manager for region-specific reason codes
    const localizationManager = new CostingLocalizationManager(
      organization.homeCountry,
      organization.baseCurrency
    );

    // Convert to base currency if needed
    const exchangeRate = input.exchangeRate || 1;
    const currencyMultiplier = input.transactionCurrency !== organization.baseCurrency ? exchangeRate : 1;

    // Calculate individual variances
    const purchasePriceVariance = this.calculatePurchasePriceVariance(
      input.standardCosts.materialCost,
      input.actualCosts.materialCost,
      input.quantity
    );

    const materialUsageVariance = this.calculateMaterialUsageVariance(
      input.standardCosts.materialCost,
      input.actualCosts.materialCost,
      input.quantity
    );

    const laborRateVariance = this.calculateLaborRateVariance(
      input.standardCosts.laborCost,
      input.actualCosts.laborCost,
      input.quantity
    );

    const laborEfficiencyVariance = this.calculateLaborEfficiencyVariance(
      input.standardCosts.laborCost,
      input.actualCosts.laborCost,
      input.quantity
    );

    const overheadSpendingVariance = this.calculateOverheadSpendingVariance(
      input.standardCosts.overheadCost,
      input.actualCosts.overheadCost,
      input.quantity
    );

    const overheadVolumeVariance = this.calculateOverheadVolumeVariance(
      input.standardCosts.overheadCost,
      input.actualCosts.overheadCost,
      input.quantity
    );

    const totalVariance = purchasePriceVariance + materialUsageVariance + 
                         laborRateVariance + laborEfficiencyVariance + 
                         overheadSpendingVariance + overheadVolumeVariance;

    // Calculate currency variance if multi-currency
    const currencyVariance = input.transactionCurrency !== organization.baseCurrency
      ? totalVariance * (1 - currencyMultiplier)
      : 0;

    const varianceInBaseCurrency = totalVariance * currencyMultiplier;

    // Get regional reason codes
    const reasonCodes = await localizationManager.getVarianceReasonCodes();
    if (input.reasonCode && !reasonCodes.includes(input.reasonCode)) {
      reasonCodes.push(input.reasonCode);
    }

    // Create variance record
    const costVariance = await this.prisma.costVariance.create({
      data: {
        organizationId: input.organizationId,
        productId: input.productId,
        transactionId: input.transactionId,
        varianceType: this.determinePrimaryVarianceType(
          purchasePriceVariance,
          laborEfficiencyVariance,
          materialUsageVariance
        ),
        materialVariance: new Decimal(materialUsageVariance),
        laborVariance: new Decimal(laborRateVariance + laborEfficiencyVariance),
        overheadVariance: new Decimal(overheadSpendingVariance + overheadVolumeVariance),
        totalVariance: new Decimal(varianceInBaseCurrency),
        quantity: new Decimal(input.quantity),
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        notes: input.notes,
      },
    });

    let glTransactionId: string | undefined;

    // Post to General Ledger if requested
    if (input.postToGL && varianceInBaseCurrency !== 0) {
      glTransactionId = await this.postVarianceToGL(
        input.organizationId,
        varianceInBaseCurrency,
        input.productId,
        costVariance.id,
        input.reasonCode,
        organization.baseCurrency
      );
    }

    return {
      purchasePriceVariance,
      materialUsageVariance,
      laborRateVariance,
      laborEfficiencyVariance,
      overheadSpendingVariance,
      overheadVolumeVariance,
      totalVariance,
      currencyVariance,
      varianceInBaseCurrency,
      glTransactionId,
      reasonCodes,
    };
  }

  /**
   * Get comprehensive variance analysis for reporting
   */
  async getVarianceAnalysis(filter: VarianceAnalysisFilter): Promise<{
    variances: any[];
    summary: VarianceSummary;
  }> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: filter.organizationId },
      select: { baseCurrency: true },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Build where clause
    const where: any = {
      organizationId: filter.organizationId,
    };

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = filter.startDate;
      if (filter.endDate) where.createdAt.lte = filter.endDate;
    }

    if (filter.productId) {
      where.productId = filter.productId;
    }

    if (filter.varianceType && filter.varianceType.length > 0) {
      where.varianceType = { in: filter.varianceType };
    }

    if (filter.minVarianceAmount) {
      where.totalVariance = {
        gte: filter.minVarianceAmount,
      };
    }

    // Get variances with related data
    const variances = await this.prisma.costVariance.findMany({
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

    // Calculate summary statistics
    const summary = this.calculateVarianceSummary(variances, organization.baseCurrency);

    return {
      variances: variances.map(v => ({
        id: v.id,
        product: v.product,
        varianceType: v.varianceType,
        materialVariance: v.materialVariance?.toNumber() || 0,
        laborVariance: v.laborVariance?.toNumber() || 0,
        overheadVariance: v.overheadVariance?.toNumber() || 0,
        totalVariance: v.totalVariance.toNumber(),
        quantity: v.quantity.toNumber(),
        date: v.createdAt,
        referenceType: v.referenceType,
        referenceId: v.referenceId,
        transaction: v.transaction,
        notes: v.notes,
      })),
      summary,
    };
  }

  /**
   * Calculate Purchase Price Variance (PPV)
   * This shows the loss/gain from buying materials at prices different from standard
   */
  private calculatePurchasePriceVariance(
    standardMaterialCost: number,
    actualMaterialCost: number,
    quantity: number
  ): number {
    return (actualMaterialCost - standardMaterialCost) * quantity;
  }

  /**
   * Calculate Material Usage Variance
   * This shows loss/gain from using more or less raw material than BOM specified
   */
  private calculateMaterialUsageVariance(
    standardMaterialCost: number,
    actualMaterialCost: number,
    quantity: number
  ): number {
    // For usage variance, we compare quantities at standard price
    // This is typically calculated when we have actual vs standard quantities
    // For now, simplified calculation
    return (actualMaterialCost - standardMaterialCost) * 0.3; // 30% attributed to usage
  }

  /**
   * Calculate Labor Rate Variance
   * This shows loss/gain from paying labor at rates different from standard
   */
  private calculateLaborRateVariance(
    standardLaborCost: number,
    actualLaborCost: number,
    quantity: number
  ): number {
    return (actualLaborCost - standardLaborCost) * quantity * 0.6; // 60% attributed to rate
  }

  /**
   * Calculate Labor Efficiency Variance
   * This shows loss/gain from production taking more or less time than planned
   */
  private calculateLaborEfficiencyVariance(
    standardLaborCost: number,
    actualLaborCost: number,
    quantity: number
  ): number {
    return (actualLaborCost - standardLaborCost) * quantity * 0.4; // 40% attributed to efficiency
  }

  /**
   * Calculate Overhead Spending Variance
   */
  private calculateOverheadSpendingVariance(
    standardOverheadCost: number,
    actualOverheadCost: number,
    quantity: number
  ): number {
    return (actualOverheadCost - standardOverheadCost) * quantity * 0.7; // 70% attributed to spending
  }

  /**
   * Calculate Overhead Volume Variance
   */
  private calculateOverheadVolumeVariance(
    standardOverheadCost: number,
    actualOverheadCost: number,
    quantity: number
  ): number {
    return (actualOverheadCost - standardOverheadCost) * quantity * 0.3; // 30% attributed to volume
  }

  /**
   * Determine the primary variance type based on largest variance
   */
  private determinePrimaryVarianceType(
    purchasePrice: number,
    laborEfficiency: number,
    materialUsage: number
  ): 'PURCHASE_PRICE' | 'LABOR_EFFICIENCY' | 'MATERIAL_USAGE' | 'PRODUCTION' {
    const variances = [
      { type: 'PURCHASE_PRICE' as const, amount: Math.abs(purchasePrice) },
      { type: 'LABOR_EFFICIENCY' as const, amount: Math.abs(laborEfficiency) },
      { type: 'MATERIAL_USAGE' as const, amount: Math.abs(materialUsage) },
    ];

    const largest = variances.reduce((max, current) => 
      current.amount > max.amount ? current : max
    );

    return largest.type;
  }

  /**
   * Post variance to General Ledger
   */
  private async postVarianceToGL(
    organizationId: string,
    varianceAmount: number,
    productId: string,
    costVarianceId: string,
    reasonCode?: string,
    baseCurrency?: string
  ): Promise<string> {
    // Get variance GL accounts from organization setup
    const varianceAccount = await this.getVarianceGLAccount(organizationId, reasonCode);
    const inventoryAccount = await this.getInventoryGLAccount(organizationId);

    if (!varianceAccount || !inventoryAccount) {
      throw new Error('Variance or Inventory GL accounts not configured');
    }

    // Create GL transaction
    // Unfavorable variance: DR Variance Expense, CR Inventory
    // Favorable variance: DR Inventory, CR Variance Recovery
    const entries = varianceAmount > 0 ? [
      {
        accountId: varianceAccount.id,
        entryType: 'DEBIT' as const,
        amount: Math.abs(varianceAmount),
        description: `Unfavorable variance - ${reasonCode || 'Cost variance'}`,
        currency: baseCurrency || 'USD',
      },
      {
        accountId: inventoryAccount.id,
        entryType: 'CREDIT' as const,
        amount: Math.abs(varianceAmount),
        description: `Inventory adjustment for variance`,
        currency: baseCurrency || 'USD',
      },
    ] : [
      {
        accountId: inventoryAccount.id,
        entryType: 'DEBIT' as const,
        amount: Math.abs(varianceAmount),
        description: `Inventory adjustment for variance`,
        currency: baseCurrency || 'USD',
      },
      {
        accountId: varianceAccount.id,
        entryType: 'CREDIT' as const,
        amount: Math.abs(varianceAmount),
        description: `Favorable variance - ${reasonCode || 'Cost variance'}`,
        currency: baseCurrency || 'USD',
      },
    ];

    const transaction = await DoubleEntryService.createTransaction({
      organizationId,
      transactionDate: new Date(),
      transactionType: 'ADJUSTMENT' as any,
      description: `Cost variance posting - ${reasonCode || 'Variance analysis'}`,
      referenceType: 'COST_VARIANCE',
      referenceId: costVarianceId,
      createdById: 'system', // TODO: Get from context
      entries,
    });

    return transaction.id;
  }

  /**
   * Get appropriate variance GL account based on reason code
   */
  private async getVarianceGLAccount(organizationId: string, reasonCode?: string) {
    // Map reason codes to specific variance accounts
    let accountCode = '5400'; // Default variance expense

    if (reasonCode === 'EXCHANGE_RATE_FLUCTUATION') {
      accountCode = '5450'; // Currency variance
    } else if (reasonCode === 'SUPPLIER_PRICE_HIKE') {
      accountCode = '5410'; // Purchase price variance
    } else if (reasonCode === 'PRODUCTION_INEFFICIENCY') {
      accountCode = '5420'; // Labor efficiency variance
    }

    return await this.prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        code: { startsWith: accountCode },
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Get inventory GL account
   */
  private async getInventoryGLAccount(organizationId: string) {
    return await this.prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        code: { startsWith: '1300' }, // Inventory
        accountType: 'ASSET',
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Calculate variance summary statistics
   */
  private calculateVarianceSummary(variances: any[], baseCurrency: string): VarianceSummary {
    const totalVariance = variances.reduce((sum, v) => sum + v.totalVariance.toNumber(), 0);
    const purchasePriceVariance = variances
      .filter(v => v.varianceType === 'PURCHASE_PRICE')
      .reduce((sum, v) => sum + v.totalVariance.toNumber(), 0);
    const laborEfficiencyVariance = variances
      .filter(v => v.varianceType === 'LABOR_EFFICIENCY')
      .reduce((sum, v) => sum + v.totalVariance.toNumber(), 0);
    const materialUsageVariance = variances
      .filter(v => v.varianceType === 'MATERIAL_USAGE')
      .reduce((sum, v) => sum + v.totalVariance.toNumber(), 0);

    // Group by branch (if available)
    const variancesByBranch: Record<string, number> = {};
    // Group by reason code (from notes)
    const variancesByReasonCode: Record<string, number> = {};

    variances.forEach(v => {
      if (v.notes) {
        const reasonCode = v.notes.split(':')[0] || 'Unknown';
        variancesByReasonCode[reasonCode] = (variancesByReasonCode[reasonCode] || 0) + v.totalVariance.toNumber();
      }
    });

    // Get top variances
    const topVariances = variances
      .map(v => ({
        productName: v.product.name,
        varianceAmount: v.totalVariance.toNumber(),
        variancePercent: v.totalVariance.toNumber() / (v.totalVariance.toNumber() + 100) * 100, // Simplified
        transactionRef: v.referenceId || v.id,
      }))
      .sort((a, b) => Math.abs(b.varianceAmount) - Math.abs(a.varianceAmount))
      .slice(0, 10);

    return {
      totalVariance,
      purchasePriceVariance,
      laborEfficiencyVariance,
      materialUsageVariance,
      currencyVariance: 0, // TODO: Calculate from multi-currency transactions
      variancesByBranch,
      variancesByReasonCode,
      topVariances,
    };
  }
}

export default VarianceAnalysisEngine;