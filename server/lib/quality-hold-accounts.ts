/**
 * Quality Hold Accounting Utilities
 *
 * Provides functions to retrieve appropriate GL accounts for quality hold dispositions
 * and validate cost basis against organization's costing method.
 */

import { PrismaClient } from '@prisma/client';
import { CostingMethod } from '@prisma/client';

export interface QualityHoldAccounts {
  inventoryAccount: string;
  lossAccount: string;
  rtvAccount?: string;
  reworkAccount?: string;
}

/**
 * Get GL accounts for quality hold dispositions
 */
export async function getQualityHoldAccounts(
  prisma: PrismaClient,
  organizationId: string
): Promise<QualityHoldAccounts> {
  // Get inventory account (ASSET, code 1300)
  const inventoryAccount = await prisma.chartOfAccount.findFirst({
    where: {
      organizationId,
      code: { startsWith: '1300' },
      accountType: 'ASSET',
      isActive: true,
    },
    orderBy: { code: 'asc' },
  });

  if (!inventoryAccount) {
    throw new Error('Inventory account not found. Please ensure an ASSET account with code 1300 exists.');
  }

  // Get loss/scrap account (COST_OF_SALES or EXPENSE, code 5030 for shrinkage)
  let lossAccount = await prisma.chartOfAccount.findFirst({
    where: {
      organizationId,
      code: { startsWith: '5030' }, // Inventory Shrinkage
      isActive: true,
    },
    orderBy: { code: 'asc' },
  });

  // Fallback to general expense account if shrinkage account doesn't exist
  if (!lossAccount) {
    lossAccount = await prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        accountType: 'EXPENSE',
        code: { startsWith: '9000' }, // Miscellaneous Expense
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });
  }

  if (!lossAccount) {
    throw new Error('Loss account not found. Please ensure a COST_OF_SALES or EXPENSE account exists.');
  }

  // Get RTV account (optional - could be inventory adjustment or specific RTV expense)
  const rtvAccount = await prisma.chartOfAccount.findFirst({
    where: {
      organizationId,
      OR: [
        { code: '7400' }, // RTV Expense
        { name: { contains: 'RTV' } },
        { name: { contains: 'Return' } },
        { code: { startsWith: '5300' } }, // Inventory Adjustments
      ],
      isActive: true,
    },
    orderBy: { code: 'asc' },
  });

  // Get rework account (optional - could be manufacturing expense)
  const reworkAccount = await prisma.chartOfAccount.findFirst({
    where: {
      organizationId,
      OR: [
        { code: '7300' }, // Rework Expense
        { name: { contains: 'Rework' } },
        { name: { contains: 'Manufacturing' } },
        { code: { startsWith: '5150' } }, // Manufacturing Overhead
      ],
      isActive: true,
    },
    orderBy: { code: 'asc' },
  });

  return {
    inventoryAccount: inventoryAccount.id,
    lossAccount: lossAccount.id,
    rtvAccount: rtvAccount?.id,
    reworkAccount: reworkAccount?.id,
  };
}

/**
 * Get cost basis for a product based on organization's costing method
 */
export async function getProductCostBasis(
  prisma: PrismaClient,
  organizationId: string,
  productId: string,
  quantity: number,
  warehouseId?: string
): Promise<{ costBasis: number; costingMethod: CostingMethod }> {
  // Get organization's default costing method from standard costs
  const standardCost = await prisma.standardCost.findFirst({
    where: {
      organizationId,
      productId,
      isActive: true,
    },
    orderBy: {
      effectiveFrom: 'desc',
    },
  });

  const costingMethod = standardCost?.costingMethod || 'WEIGHTED_AVERAGE';

  // Get current inventory cost
  const inventory = await prisma.inventoryItem.findFirst({
    where: {
      productId,
      warehouseLocation: warehouseId ? undefined : 'Main',
      ...(warehouseId && { warehouseId }),
    },
  });

  if (!inventory) {
    throw new Error('Inventory record not found for product');
  }

  let costBasis: number;

  switch (costingMethod) {
    case 'STANDARD':
      if (!standardCost) {
        throw new Error('Standard cost not found for product');
      }
      costBasis = Number(standardCost.totalStandardCost);
      break;

    case 'WEIGHTED_AVERAGE':
    case 'FIFO':
    case 'LIFO':
    default:
      // Use inventory average cost for these methods
      costBasis = Number(inventory.averageCost);
      break;
  }

  if (costBasis <= 0) {
    throw new Error('Invalid cost basis: cost must be greater than zero');
  }

  return { costBasis, costingMethod };
}