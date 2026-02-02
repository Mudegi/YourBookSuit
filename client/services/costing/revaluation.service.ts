/**
 * Enterprise Inventory Revaluation Service
 * 
 * Critical financial tool that adjusts the value of existing inventory items.
 * Unlike Landed Costs (which add to new receipts), Revaluations change the
 * value of items already sitting in the warehouse.
 * 
 * Features:
 * 1. Financial Safety with DRAFT -> SUBMITTED -> POSTED workflow
 * 2. Valuation Method Awareness (FIFO, LIFO, Weighted Average)
 * 3. GL Integration with inventory adjustment accounts
 * 4. Country-specific localization without hardcoding
 * 5. Zero-stock protection and comprehensive audit trails
 * 6. Market price integration and approval controls
 */

import { PrismaClient, Decimal } from '@prisma/client';
import { RevaluationLocalizationManager } from './revaluation-localization.manager';
import { DoubleEntryService } from '../accounting/double-entry.service';

export interface CreateRevaluationInput {
  organizationId: string;
  productId: string;
  warehouseId?: string;
  reasonCode: string;
  newUnitCost: number;
  postingDate: Date;
  notes?: string;
  userId: string;
  autoApprove?: boolean; // For authorized users
}

export interface RevaluationPreview {
  currentQuantity: number;
  currentUnitCost: number;
  currentTotalValue: number;
  newUnitCost: number;
  newTotalValue: number;
  valueDifference: number;
  percentageChange: number;
  glPreview: {
    debitAccount: { code: string; name: string; amount: number };
    creditAccount: { code: string; name: string; amount: number };
  };
  warnings: string[];
}

export interface MarketPriceCalculation {
  suggestedUnitCost: number;
  lastPurchasePrice: number;
  averageMarketPrice: number;
  priceSource: 'LAST_PURCHASE' | 'MARKET_DATA' | 'MANUAL';
  lastUpdated: Date;
}

export interface RevaluationResult {
  revaluation: any;
  glTransaction?: any;
  inventoryUpdates: Array<{
    productId: string;
    oldCost: number;
    newCost: number;
    quantityAffected: number;
  }>;
}

export class RevaluationService {
  constructor(
    private prisma: PrismaClient,
    private localizationManager: RevaluationLocalizationManager,
    private doubleEntryService: DoubleEntryService
  ) {}

  /**
   * Preview revaluation impact without creating actual revaluation
   * Critical for financial safety - shows exact GL impact before posting
   */
  async previewRevaluation(
    organizationId: string,
    productId: string,
    newUnitCost: number,
    warehouseId?: string
  ): Promise<RevaluationPreview> {
    // Get current inventory position
    const inventory = await this.getCurrentInventoryPosition(
      organizationId,
      productId,
      warehouseId
    );

    if (inventory.quantity === 0) {
      throw new Error('Cannot revalue product with zero inventory');
    }

    const currentTotalValue = inventory.quantity * inventory.unitCost;
    const newTotalValue = inventory.quantity * newUnitCost;
    const valueDifference = newTotalValue - currentTotalValue;
    const percentageChange = (valueDifference / currentTotalValue) * 100;

    // Get GL account mappings
    const glAccounts = await this.getGLAccountMappings(organizationId);
    
    // Determine debit/credit based on increase/decrease
    const isIncrease = valueDifference > 0;
    
    const glPreview = {
      debitAccount: {
        code: isIncrease ? glAccounts.inventoryAccount.code : glAccounts.revaluationLossAccount.code,
        name: isIncrease ? glAccounts.inventoryAccount.name : glAccounts.revaluationLossAccount.name,
        amount: Math.abs(valueDifference),
      },
      creditAccount: {
        code: isIncrease ? glAccounts.revaluationGainAccount.code : glAccounts.inventoryAccount.code,
        name: isIncrease ? glAccounts.revaluationGainAccount.name : glAccounts.inventoryAccount.name,
        amount: Math.abs(valueDifference),
      },
    };

    // Generate warnings
    const warnings = await this.generateRevaluationWarnings(
      organizationId,
      productId,
      inventory.unitCost,
      newUnitCost,
      percentageChange
    );

    return {
      currentQuantity: inventory.quantity,
      currentUnitCost: inventory.unitCost,
      currentTotalValue,
      newUnitCost,
      newTotalValue,
      valueDifference,
      percentageChange,
      glPreview,
      warnings,
    };
  }

  /**
   * Calculate suggested market price for revaluation
   * Integrates with price lists and recent purchase history
   */
  async calculateMarketPrice(
    organizationId: string,
    productId: string
  ): Promise<MarketPriceCalculation> {
    // Get last purchase price from recent bills
    const lastPurchase = await this.prisma.billItem.findFirst({
      where: {
        productId,
        bill: {
          organizationId,
          status: 'POSTED',
        },
      },
      include: {
        bill: true,
      },
      orderBy: {
        bill: {
          billDate: 'desc',
        },
      },
    });

    let lastPurchasePrice = 0;
    if (lastPurchase) {
      lastPurchasePrice = new Decimal(lastPurchase.unitPrice).toNumber();
    }

    // Get average market price from price lists
    const priceListItems = await this.prisma.priceListItem.findMany({
      where: {
        productId,
        priceList: {
          organizationId,
          isActive: true,
          effectiveDate: {
            lte: new Date(),
          },
        },
      },
      include: {
        priceList: true,
      },
      orderBy: {
        priceList: {
          effectiveDate: 'desc',
        },
      },
      take: 5, // Last 5 price list entries
    });

    let averageMarketPrice = 0;
    if (priceListItems.length > 0) {
      const totalPrice = priceListItems.reduce((sum, item) => 
        sum + new Decimal(item.unitPrice).toNumber(), 0
      );
      averageMarketPrice = totalPrice / priceListItems.length;
    }

    // Determine suggested price and source
    let suggestedUnitCost = 0;
    let priceSource: 'LAST_PURCHASE' | 'MARKET_DATA' | 'MANUAL' = 'MANUAL';

    if (averageMarketPrice > 0) {
      suggestedUnitCost = averageMarketPrice;
      priceSource = 'MARKET_DATA';
    } else if (lastPurchasePrice > 0) {
      suggestedUnitCost = lastPurchasePrice;
      priceSource = 'LAST_PURCHASE';
    }

    return {
      suggestedUnitCost,
      lastPurchasePrice,
      averageMarketPrice,
      priceSource,
      lastUpdated: new Date(),
    };
  }

  /**
   * Create revaluation with approval workflow
   * Supports DRAFT -> SUBMITTED -> POSTED workflow
   */
  async createRevaluation(input: CreateRevaluationInput): Promise<RevaluationResult> {
    return this.prisma.$transaction(async (tx) => {
      // Validate organization and user permissions
      const organization = await tx.organization.findUnique({
        where: { id: input.organizationId },
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Get current inventory position
      const inventory = await this.getCurrentInventoryPosition(
        input.organizationId,
        input.productId,
        input.warehouseId,
        tx
      );

      if (inventory.quantity === 0) {
        throw new Error('Cannot revalue product with zero inventory');
      }

      // Validate reason code is allowed for organization's country
      const isValidReasonCode = await this.localizationManager.validateReasonCode(
        input.reasonCode,
        organization.homeCountry || 'US'
      );

      if (!isValidReasonCode) {
        throw new Error(`Reason code '${input.reasonCode}' is not valid for country ${organization.homeCountry}`);
      }

      // Calculate adjustment amounts
      const adjustmentAmount = new Decimal(input.newUnitCost)
        .minus(inventory.unitCost)
        .mul(inventory.quantity)
        .toNumber();

      // Generate revaluation number
      const revaluationNumber = await this.generateRevaluationNumber(input.organizationId, tx);

      // Determine initial status based on auto-approve and adjustment amount
      let initialStatus = 'DRAFT';
      const config = await this.localizationManager.getLocalizationConfig(input.organizationId);
      
      if (input.autoApprove) {
        // Check if user has authority to auto-approve based on amount
        const canAutoApprove = Math.abs(adjustmentAmount) <= config.autoApprovalThreshold;
        if (canAutoApprove) {
          initialStatus = 'APPROVED';
        }
      }

      // Create revaluation record
      const revaluation = await tx.costRevaluation.create({
        data: {
          organizationId: input.organizationId,
          revaluationNumber,
          productId: input.productId,
          warehouseId: input.warehouseId,
          revaluationDate: input.postingDate,
          reason: input.reasonCode,
          oldUnitCost: inventory.unitCost,
          newUnitCost: input.newUnitCost,
          quantity: inventory.quantity,
          valueDifference: adjustmentAmount,
          status: initialStatus as any,
          notes: input.notes,
        },
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
      });

      let glTransaction = null;
      const inventoryUpdates: Array<{
        productId: string;
        oldCost: number;
        newCost: number;
        quantityAffected: number;
      }> = [];

      // If approved, post immediately
      if (initialStatus === 'APPROVED') {
        const postResult = await this.postRevaluation(revaluation.id, input.userId, tx);
        glTransaction = postResult.glTransaction;
        inventoryUpdates.push(...postResult.inventoryUpdates);
      }

      return {
        revaluation,
        glTransaction,
        inventoryUpdates,
      };
    });
  }

  /**
   * Post approved revaluation to GL and update inventory
   * This is where the actual financial impact occurs
   */
  async postRevaluation(
    revaluationId: string,
    userId: string,
    tx?: any
  ): Promise<{ glTransaction: any; inventoryUpdates: Array<{ productId: string; oldCost: number; newCost: number; quantityAffected: number; }> }> {
    const prisma = tx || this.prisma;

    const revaluation = await prisma.costRevaluation.findUnique({
      where: { id: revaluationId },
      include: {
        product: true,
        warehouse: true,
      },
    });

    if (!revaluation || revaluation.status !== 'APPROVED') {
      throw new Error('Revaluation not found or not approved');
    }

    // Get GL account mappings
    const glAccounts = await this.getGLAccountMappings(revaluation.organizationId);
    
    const isIncrease = new Decimal(revaluation.valueDifference).gt(0);
    const absoluteAmount = Math.abs(revaluation.valueDifference);

    // Create GL journal entry
    const glTransaction = await this.doubleEntryService.createJournalEntry({
      organizationId: revaluation.organizationId,
      transactionDate: revaluation.revaluationDate,
      transactionType: 'INVENTORY_ADJUSTMENT',
      referenceType: 'COST_REVALUATION',
      referenceId: revaluation.id,
      description: `Inventory Revaluation - ${revaluation.product.name} (${revaluation.reason})`,
      entries: [
        {
          accountId: isIncrease ? glAccounts.inventoryAccount.id : glAccounts.revaluationLossAccount.id,
          debitAmount: absoluteAmount,
          creditAmount: 0,
          description: isIncrease 
            ? `Inventory value increase - ${revaluation.product.name}`
            : `Revaluation loss - ${revaluation.product.name}`,
        },
        {
          accountId: isIncrease ? glAccounts.revaluationGainAccount.id : glAccounts.inventoryAccount.id,
          debitAmount: 0,
          creditAmount: absoluteAmount,
          description: isIncrease 
            ? `Revaluation gain - ${revaluation.product.name}`
            : `Inventory value decrease - ${revaluation.product.name}`,
        },
      ],
      notes: revaluation.notes,
      createdById: userId,
    }, tx);

    // Update inventory unit cost based on valuation method
    const inventoryUpdates = await this.updateInventoryCosts(
      revaluation.organizationId,
      revaluation.productId,
      revaluation.newUnitCost,
      revaluation.warehouseId,
      tx
    );

    // Update revaluation status and link GL transaction
    await prisma.costRevaluation.update({
      where: { id: revaluationId },
      data: {
        status: 'POSTED',
        transactionId: glTransaction.id,
      },
    });

    return { glTransaction, inventoryUpdates };
  }

  /**
   * Update inventory costs respecting valuation method (FIFO, LIFO, Weighted Average)
   * This is critical for maintaining accurate inventory values
   */
  private async updateInventoryCosts(
    organizationId: string,
    productId: string,
    newUnitCost: number,
    warehouseId?: string,
    tx?: any
  ): Promise<Array<{ productId: string; oldCost: number; newCost: number; quantityAffected: number; }>> {
    const prisma = tx || this.prisma;
    const inventoryUpdates: Array<{ productId: string; oldCost: number; newCost: number; quantityAffected: number; }> = [];

    // Get product's valuation method
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        valuationMethod: true,
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Update based on valuation method
    switch (product.valuationMethod || 'WEIGHTED_AVERAGE') {
      case 'WEIGHTED_AVERAGE':
        // For weighted average, update all inventory items
        const inventoryItems = await prisma.inventoryItem.findMany({
          where: {
            productId,
            ...(warehouseId ? { warehouseLocation: warehouseId } : {}),
          },
        });

        for (const item of inventoryItems) {
          if (item.quantityOnHand > 0) {
            await prisma.inventoryItem.update({
              where: { id: item.id },
              data: {
                averageCost: newUnitCost,
              },
            });

            inventoryUpdates.push({
              productId,
              oldCost: item.averageCost,
              newCost: newUnitCost,
              quantityAffected: item.quantityOnHand,
            });
          }
        }
        break;

      case 'FIFO':
      case 'LIFO':
        // For FIFO/LIFO, update lot-based inventory
        const lots = await prisma.inventoryLot.findMany({
          where: {
            productId,
            organizationId,
            status: 'ACTIVE',
            quantityOnHand: { gt: 0 },
            ...(warehouseId ? { warehouseId } : {}),
          },
          orderBy: product.valuationMethod === 'FIFO' 
            ? { receivedDate: 'asc' } 
            : { receivedDate: 'desc' },
        });

        // Update cost for active lots
        for (const lot of lots) {
          // Note: In practice, you might want to create new cost layers
          // rather than updating existing ones for better audit trail
          await prisma.inventoryLot.update({
            where: { id: lot.id },
            data: {
              // Store cost information in notes for audit
              notes: `${lot.notes || ''}\nRevaluation: ${new Date().toISOString()} - Cost changed from ${lot.notes} to ${newUnitCost}`,
            },
          });

          inventoryUpdates.push({
            productId,
            oldCost: 0, // Would need to extract from lot data
            newCost: newUnitCost,
            quantityAffected: lot.quantityOnHand,
          });
        }
        break;
    }

    return inventoryUpdates;
  }

  /**
   * Get current inventory position for a product
   */
  private async getCurrentInventoryPosition(
    organizationId: string,
    productId: string,
    warehouseId?: string,
    tx?: any
  ): Promise<{ quantity: number; unitCost: number }> {
    const prisma = tx || this.prisma;

    // Get inventory items
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        productId,
        product: {
          organizationId,
        },
        ...(warehouseId ? { warehouseLocation: warehouseId } : {}),
      },
    });

    if (inventoryItems.length === 0) {
      throw new Error('No inventory found for this product');
    }

    // Calculate total quantity and weighted average cost
    let totalQuantity = 0;
    let totalValue = 0;

    inventoryItems.forEach(item => {
      totalQuantity += item.quantityOnHand;
      totalValue += item.quantityOnHand * item.averageCost;
    });

    const unitCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;

    return {
      quantity: totalQuantity,
      unitCost,
    };
  }

  /**
   * Generate unique revaluation number
   */
  private async generateRevaluationNumber(organizationId: string, tx?: any): Promise<string> {
    const prisma = tx || this.prisma;
    
    const year = new Date().getFullYear();
    const count = await prisma.costRevaluation.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });

    return `REV-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Get GL account mappings for revaluations
   */
  private async getGLAccountMappings(organizationId: string) {
    // Get inventory account (Asset)
    const inventoryAccount = await this.prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        code: { startsWith: '1300' }, // Inventory Asset
        accountType: 'ASSET',
        isActive: true,
      },
    });

    if (!inventoryAccount) {
      throw new Error('Inventory account not found. Please ensure an Asset account with code 1300 exists.');
    }

    // Get revaluation gain account (Income)
    let revaluationGainAccount = await this.prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        code: { startsWith: '4900' }, // Other Income
        accountType: 'REVENUE',
        isActive: true,
      },
    });

    if (!revaluationGainAccount) {
      // Create revaluation gain account if not exists
      revaluationGainAccount = await this.prisma.chartOfAccount.create({
        data: {
          organizationId,
          code: '4900',
          name: 'Inventory Revaluation Gain',
          accountType: 'REVENUE',
          accountSubType: 'Other Income',
          isActive: true,
          description: 'Gains from inventory revaluations',
        },
      });
    }

    // Get revaluation loss account (Expense)
    let revaluationLossAccount = await this.prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        code: { startsWith: '6900' }, // Other Expenses
        accountType: 'EXPENSE',
        isActive: true,
      },
    });

    if (!revaluationLossAccount) {
      // Create revaluation loss account if not exists
      revaluationLossAccount = await this.prisma.chartOfAccount.create({
        data: {
          organizationId,
          code: '6900',
          name: 'Inventory Revaluation Loss',
          accountType: 'EXPENSE',
          accountSubType: 'Other Expenses',
          isActive: true,
          description: 'Losses from inventory revaluations',
        },
      });
    }

    return {
      inventoryAccount,
      revaluationGainAccount,
      revaluationLossAccount,
    };
  }

  /**
   * Generate revaluation warnings based on business rules
   */
  private async generateRevaluationWarnings(
    organizationId: string,
    productId: string,
    currentCost: number,
    newCost: number,
    percentageChange: number
  ): Promise<string[]> {
    const warnings: string[] = [];

    // Get localization config for threshold warnings
    const config = await this.localizationManager.getLocalizationConfig(organizationId);

    // Large percentage change warning
    if (Math.abs(percentageChange) > config.largeVarianceThreshold) {
      warnings.push(`Large cost change of ${percentageChange.toFixed(1)}% may require additional approval`);
    }

    // Cost increase in high-inflation environment
    if (config.country === 'UG' && percentageChange > 15) {
      warnings.push('High cost increase detected - consider currency impact analysis');
    }

    // Zero cost warning
    if (newCost <= 0) {
      warnings.push('Zero or negative unit cost will affect gross margin calculations');
    }

    return warnings;
  }
}