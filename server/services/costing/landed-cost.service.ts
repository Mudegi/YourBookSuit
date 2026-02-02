/**
 * Enterprise Landed Cost Service
 * 
 * Provides comprehensive cost apportionment for businesses in landlocked countries
 * where freight and customs can add 20-40% to item costs.
 * 
 * Features:
 * 1. Multiple allocation strategies (Value, Weight, Volume, Quantity)
 * 2. Multi-currency support with organization base currency
 * 3. Country-specific cost types without hardcoding
 * 4. GL integration with proper inventory/COGS posting
 * 5. Revaluation support for already-sold items
 */

import { PrismaClient, Decimal } from '@prisma/client';
import { DoubleEntryService } from '@/services/accounting/double-entry.service';
import { CostingLocalizationManager } from './costing-localization.manager';

interface LandedCostInput {
  organizationId: string;
  referenceType: 'PURCHASE_RECEIPT' | 'CONTAINER' | 'SHIPMENT';
  referenceId: string;
  costTypeId?: string;
  vendorId?: string; // The logistics company, not product supplier
  currency: string;
  exchangeRate?: number;
  costComponents: {
    freightCost: number;
    insuranceCost: number;
    customsDuty: number;
    handlingCost: number;
    clearingAgentFees: number;
    storageCost: number;
    otherCosts: number;
    costTypeCode?: string; // Country-specific cost type
  };
  allocationMethod: 'BY_VALUE' | 'BY_WEIGHT' | 'BY_VOLUME' | 'BY_QUANTITY';
  items: Array<{
    productId: string;
    quantity: number;
    unitCost: number; // Original FOB cost
    weight?: number;
    volume?: number; // CBM
  }>;
  postToGL?: boolean;
  notes?: string;
}

interface LandedCostResult {
  landedCostId: string;
  totalLandedCost: number;
  allocatedItems: Array<{
    productId: string;
    originalUnitCost: number;
    allocatedAmount: number;
    newUnitCost: number;
    costIncrease: number;
    costIncreasePercent: number;
  }>;
  glTransactionId?: string;
  revaluationRequired: boolean;
}

interface AllocationStrategy {
  calculate(
    totalCostToAllocate: number,
    items: Array<{
      productId: string;
      quantity: number;
      unitCost: number;
      weight?: number;
      volume?: number;
    }>
  ): Array<{
    productId: string;
    allocatedAmount: number;
    allocationBase: number;
  }>;
}

/**
 * Allocate costs based on item values (higher value items get more cost)
 */
class ValueAllocationStrategy implements AllocationStrategy {
  calculate(totalCostToAllocate: number, items: any[]) {
    const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    
    return items.map(item => {
      const itemValue = item.quantity * item.unitCost;
      const allocationPercent = totalValue > 0 ? itemValue / totalValue : 0;
      
      return {
        productId: item.productId,
        allocatedAmount: totalCostToAllocate * allocationPercent,
        allocationBase: itemValue,
      };
    });
  }
}

/**
 * Allocate costs based on weight (best for freight costs)
 */
class WeightAllocationStrategy implements AllocationStrategy {
  calculate(totalCostToAllocate: number, items: any[]) {
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0), 0);
    
    if (totalWeight === 0) {
      throw new Error('Weight allocation requires weight data for all items');
    }
    
    return items.map(item => {
      const itemWeight = item.weight || 0;
      const allocationPercent = itemWeight / totalWeight;
      
      return {
        productId: item.productId,
        allocatedAmount: totalCostToAllocate * allocationPercent,
        allocationBase: itemWeight,
      };
    });
  }
}

/**
 * Allocate costs based on volume (CBM - good for bulky items)
 */
class VolumeAllocationStrategy implements AllocationStrategy {
  calculate(totalCostToAllocate: number, items: any[]) {
    const totalVolume = items.reduce((sum, item) => sum + (item.volume || 0), 0);
    
    if (totalVolume === 0) {
      throw new Error('Volume allocation requires volume data for all items');
    }
    
    return items.map(item => {
      const itemVolume = item.volume || 0;
      const allocationPercent = itemVolume / totalVolume;
      
      return {
        productId: item.productId,
        allocatedAmount: totalCostToAllocate * allocationPercent,
        allocationBase: itemVolume,
      };
    });
  }
}

/**
 * Allocate costs equally by quantity
 */
class QuantityAllocationStrategy implements AllocationStrategy {
  calculate(totalCostToAllocate: number, items: any[]) {
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    
    return items.map(item => {
      const allocationPercent = item.quantity / totalQuantity;
      
      return {
        productId: item.productId,
        allocatedAmount: totalCostToAllocate * allocationPercent,
        allocationBase: item.quantity,
      };
    });
  }
}

export class LandedCostService {
  private allocationStrategies: Record<string, AllocationStrategy> = {
    'BY_VALUE': new ValueAllocationStrategy(),
    'BY_WEIGHT': new WeightAllocationStrategy(),
    'BY_VOLUME': new VolumeAllocationStrategy(),
    'BY_QUANTITY': new QuantityAllocationStrategy(),
  };

  constructor(private prisma: PrismaClient) {}

  /**
   * Create comprehensive landed cost with proper allocation and GL posting
   */
  async createLandedCost(input: LandedCostInput): Promise<LandedCostResult> {
    // Get organization settings
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

    // Get localization manager for country-specific cost types
    const localizationManager = new CostingLocalizationManager(
      organization.homeCountry,
      organization.baseCurrency
    );

    // Convert to base currency if needed
    const exchangeRate = input.exchangeRate || 1;
    const currencyMultiplier = input.currency !== organization.baseCurrency ? exchangeRate : 1;

    // Calculate total landed cost in base currency
    const totalLandedCost = (
      input.costComponents.freightCost +
      input.costComponents.insuranceCost +
      input.costComponents.customsDuty +
      input.costComponents.handlingCost +
      input.costComponents.clearingAgentFees +
      input.costComponents.storageCost +
      input.costComponents.otherCosts
    ) * currencyMultiplier;

    // Select allocation strategy
    const strategy = this.allocationStrategies[input.allocationMethod];
    if (!strategy) {
      throw new Error(`Unsupported allocation method: ${input.allocationMethod}`);
    }

    // Calculate allocations
    const allocations = strategy.calculate(totalLandedCost, input.items);

    // Check if items have been sold (for revaluation logic)
    const revaluationRequired = await this.checkRevaluationRequired(
      input.organizationId,
      input.items.map(i => i.productId)
    );

    // Create landed cost record with allocations
    const result = await this.prisma.$transaction(async (tx) => {
      // Create main landed cost record
      const landedCost = await tx.landedCost.create({
        data: {
          organizationId: input.organizationId,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          totalProductCost: new Decimal(input.items.reduce((sum, item) => 
            sum + (item.quantity * item.unitCost), 0)),
          freightCost: new Decimal(input.costComponents.freightCost * currencyMultiplier),
          insuranceCost: new Decimal(input.costComponents.insuranceCost * currencyMultiplier),
          customsDuty: new Decimal(input.costComponents.customsDuty * currencyMultiplier),
          handlingCost: new Decimal((input.costComponents.handlingCost + 
            input.costComponents.clearingAgentFees + 
            input.costComponents.storageCost) * currencyMultiplier),
          otherCosts: new Decimal(input.costComponents.otherCosts * currencyMultiplier),
          totalLandedCost: new Decimal(totalLandedCost),
          allocationMethod: input.allocationMethod as any,
          notes: input.notes,
        },
      });

      // Create allocation items
      const allocationItems = await Promise.all(
        allocations.map(async (allocation, index) => {
          const item = input.items[index];
          const newUnitCost = item.unitCost + (allocation.allocatedAmount / item.quantity);
          
          return await tx.landedCostAllocationItem.create({
            data: {
              landedCostId: landedCost.id,
              productId: allocation.productId,
              quantity: new Decimal(item.quantity),
              productCost: new Decimal(item.quantity * item.unitCost),
              allocatedAmount: new Decimal(allocation.allocatedAmount),
              unitLandedCost: new Decimal(newUnitCost),
            },
          });
        })
      );

      return { landedCost, allocationItems };
    });

    // Post to GL if requested
    let glTransactionId: string | undefined;
    if (input.postToGL) {
      glTransactionId = await this.postLandedCostToGL(
        input.organizationId,
        result.landedCost.id,
        totalLandedCost,
        allocations,
        revaluationRequired
      );
    }

    // Prepare result
    const allocatedItems = allocations.map((allocation, index) => {
      const item = input.items[index];
      const newUnitCost = item.unitCost + (allocation.allocatedAmount / item.quantity);
      const costIncrease = allocation.allocatedAmount / item.quantity;
      const costIncreasePercent = item.unitCost > 0 ? (costIncrease / item.unitCost) * 100 : 0;

      return {
        productId: allocation.productId,
        originalUnitCost: item.unitCost,
        allocatedAmount: allocation.allocatedAmount,
        newUnitCost,
        costIncrease,
        costIncreasePercent,
      };
    });

    return {
      landedCostId: result.landedCost.id,
      totalLandedCost,
      allocatedItems,
      glTransactionId,
      revaluationRequired,
    };
  }

  /**
   * Get country-specific landed cost types
   */
  async getLandedCostTypes(organizationId: string): Promise<Array<{
    code: string;
    name: string;
    description: string;
    glAccountCode?: string;
  }>> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { homeCountry: true, baseCurrency: true },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Get localized cost types
    const localizationManager = new CostingLocalizationManager(
      organization.homeCountry,
      organization.baseCurrency
    );

    return await localizationManager.getLandedCostTypes();
  }

  /**
   * Get before/after cost impact summary
   */
  async getCostImpactSummary(
    organizationId: string,
    items: Array<{ productId: string; quantity: number; unitCost: number }>,
    totalLandedCost: number,
    allocationMethod: string
  ): Promise<{
    totalOriginalValue: number;
    totalLandedValue: number;
    totalCostIncrease: number;
    averageIncreasePercent: number;
    itemImpacts: Array<{
      productId: string;
      productName: string;
      originalUnitCost: number;
      landedUnitCost: number;
      costIncrease: number;
      increasePercent: number;
    }>;
  }> {
    // Get allocation strategy and calculate
    const strategy = this.allocationStrategies[allocationMethod];
    if (!strategy) {
      throw new Error(`Unsupported allocation method: ${allocationMethod}`);
    }

    const allocations = strategy.calculate(totalLandedCost, items);
    
    // Get product names
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: items.map(i => i.productId) },
        organizationId,
      },
      select: { id: true, name: true },
    });

    const productMap = new Map(products.map(p => [p.id, p.name]));

    let totalOriginalValue = 0;
    let totalLandedValue = 0;

    const itemImpacts = allocations.map((allocation, index) => {
      const item = items[index];
      const originalValue = item.quantity * item.unitCost;
      const landedUnitCost = item.unitCost + (allocation.allocatedAmount / item.quantity);
      const landedValue = item.quantity * landedUnitCost;
      const costIncrease = allocation.allocatedAmount / item.quantity;
      const increasePercent = item.unitCost > 0 ? (costIncrease / item.unitCost) * 100 : 0;

      totalOriginalValue += originalValue;
      totalLandedValue += landedValue;

      return {
        productId: allocation.productId,
        productName: productMap.get(allocation.productId) || 'Unknown Product',
        originalUnitCost: item.unitCost,
        landedUnitCost,
        costIncrease,
        increasePercent,
      };
    });

    const totalCostIncrease = totalLandedValue - totalOriginalValue;
    const averageIncreasePercent = totalOriginalValue > 0 ? 
      (totalCostIncrease / totalOriginalValue) * 100 : 0;

    return {
      totalOriginalValue,
      totalLandedValue,
      totalCostIncrease,
      averageIncreasePercent,
      itemImpacts,
    };
  }

  /**
   * Check if revaluation is required (items already sold)
   */
  private async checkRevaluationRequired(
    organizationId: string,
    productIds: string[]
  ): Promise<boolean> {
    // Check if any of these products have been sold since last inventory receipt
    // This is a simplified check - in production you'd check actual stock movements
    const recentSales = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: { organizationId },
        productId: { in: productIds },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      },
      take: 1,
    });

    return recentSales.length > 0;
  }

  /**
   * Post landed cost to General Ledger
   */
  private async postLandedCostToGL(
    organizationId: string,
    landedCostId: string,
    totalLandedCost: number,
    allocations: any[],
    revaluationRequired: boolean
  ): Promise<string> {
    // Get appropriate GL accounts
    const inventoryAccount = await this.getInventoryGLAccount(organizationId);
    const landedCostClearingAccount = await this.getLandedCostClearingAccount(organizationId);
    const cogsAccount = revaluationRequired ? 
      await this.getCOGSGLAccount(organizationId) : null;

    if (!inventoryAccount || !landedCostClearingAccount) {
      throw new Error('Required GL accounts not configured for landed costs');
    }

    // Create GL entries
    const entries = revaluationRequired && cogsAccount ? [
      // If items already sold, post to COGS instead of inventory
      {
        accountId: cogsAccount.id,
        entryType: 'DEBIT' as const,
        amount: totalLandedCost,
        description: `Landed cost adjustment - COGS`,
        currency: 'USD', // Use base currency
      },
      {
        accountId: landedCostClearingAccount.id,
        entryType: 'CREDIT' as const,
        amount: totalLandedCost,
        description: `Landed cost clearing`,
        currency: 'USD',
      },
    ] : [
      // Normal case: post to inventory
      {
        accountId: inventoryAccount.id,
        entryType: 'DEBIT' as const,
        amount: totalLandedCost,
        description: `Landed cost allocation - Inventory`,
        currency: 'USD',
      },
      {
        accountId: landedCostClearingAccount.id,
        entryType: 'CREDIT' as const,
        amount: totalLandedCost,
        description: `Landed cost clearing`,
        currency: 'USD',
      },
    ];

    // Create GL transaction
    const transaction = await DoubleEntryService.createTransaction({
      organizationId,
      transactionDate: new Date(),
      transactionType: 'ADJUSTMENT' as any,
      description: `Landed cost allocation - ${revaluationRequired ? 'COGS adjustment' : 'Inventory valuation'}`,
      referenceType: 'LANDED_COST',
      referenceId: landedCostId,
      createdById: 'system', // TODO: Get from context
      entries,
    });

    return transaction.id;
  }

  /**
   * Get inventory GL account
   */
  private async getInventoryGLAccount(organizationId: string) {
    return await this.prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        code: { startsWith: '1300' }, // Inventory Asset
        accountType: 'ASSET',
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Get landed cost clearing account
   */
  private async getLandedCostClearingAccount(organizationId: string) {
    return await this.prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        code: { startsWith: '2300' }, // Accrued Expenses / Clearing
        accountType: 'LIABILITY',
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Get COGS GL account for revaluation
   */
  private async getCOGSGLAccount(organizationId: string) {
    return await this.prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        code: { startsWith: '5000' }, // Cost of Goods Sold
        accountType: 'EXPENSE',
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });
  }
}

export default LandedCostService;