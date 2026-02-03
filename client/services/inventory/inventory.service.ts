/**
 * Inventory Service
 * Handles inventory stock movements (deductions and additions)
 * Uses weighted average costing and atomic transactions
 */

import { Prisma, MovementType } from '@prisma/client';

interface StockMovementContext {
  transactionType: string;
  transactionId: string;
  transactionNumber: string;
  lotNumber?: string;
  serialNumber?: string;
  notes?: string;
}

export class InventoryService {
  /**
   * Deduct inventory from stock (for sales, consumption, etc.)
   */
  static async deductInventory(
    tx: any,
    organizationId: string,
    productId: string,
    warehouseLocation: string,
    quantity: number,
    context: StockMovementContext
  ) {
    // Get or create inventory item
    let inventoryItem = await tx.inventoryItem.findUnique({
      where: {
        productId_warehouseLocation: {
          productId,
          warehouseLocation: warehouseLocation || 'Main',
        },
      },
    });

    // If no inventory record exists, skip deduction (product may not be tracked)
    if (!inventoryItem) {
      console.warn(
        `No inventory record for product ${productId} at ${warehouseLocation}. Skipping stock deduction.`
      );
      return {
        productId,
        quantityDeducted: 0,
        costOfGoodsSold: 0,
      };
    }

    const currentQty = Number(inventoryItem.quantityOnHand);
    const currentAvailable = Number(inventoryItem.quantityAvailable);
    const averageCost = Number(inventoryItem.averageCost);

    // Check if sufficient stock available
    if (currentAvailable < quantity) {
      console.warn(
        `Insufficient stock for product ${productId}. Available: ${currentAvailable}, Requested: ${quantity}. Proceeding with partial or full deduction.`
      );
      // Don't throw error - allow sales even if stock insufficient (backorder handling)
    }

    const deductQty = Math.min(quantity, currentAvailable);
    const newQty = currentQty - deductQty;
    const newAvailable = currentAvailable - deductQty;
    const totalCost = deductQty * averageCost;

    // Update inventory item
    await tx.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: {
        quantityOnHand: new Prisma.Decimal(newQty),
        quantityAvailable: new Prisma.Decimal(newAvailable),
        totalValue: new Prisma.Decimal(Number(inventoryItem.totalValue) - totalCost),
      },
    });

    // Create stock movement record
    const stockMovement = await tx.stockMovement.create({
      data: {
        productId,
        movementType: MovementType.SALE,
        quantity: new Prisma.Decimal(-deductQty), // Negative for deduction
        unitCost: new Prisma.Decimal(averageCost),
        totalCost: new Prisma.Decimal(-totalCost), // Negative for deduction
        warehouseLocation: warehouseLocation || 'Main',
        referenceType: context.transactionType,
        referenceId: context.transactionId,
        notes: context.notes || `${context.transactionType}: ${context.transactionNumber}`,
        movementDate: new Date(),
      },
    });

    return {
      inventoryItem,
      stockMovement,
      quantityDeducted: deductQty,
      costOfGoodsSold: totalCost,
    };
  }

  /**
   * Add inventory to stock (for returns, adjustments, etc.)
   */
  static async addInventory(
    tx: any,
    organizationId: string,
    productId: string,
    warehouseLocation: string,
    quantity: number,
    context: StockMovementContext,
    unitCost?: number
  ) {
    // Get or create inventory item
    let inventoryItem = await tx.inventoryItem.findUnique({
      where: {
        productId_warehouseLocation: {
          productId,
          warehouseLocation: warehouseLocation || 'Main',
        },
      },
    });

    if (!inventoryItem) {
      // Create new inventory item if it doesn't exist
      inventoryItem = await tx.inventoryItem.create({
        data: {
          productId,
          warehouseLocation: warehouseLocation || 'Main',
          quantityOnHand: 0,
          quantityAvailable: 0,
          averageCost: 0,
          totalValue: 0,
        },
      });
    }

    const currentQty = Number(inventoryItem.quantityOnHand);
    const currentAvailable = Number(inventoryItem.quantityAvailable);
    const currentAvgCost = Number(inventoryItem.averageCost);
    const currentValue = Number(inventoryItem.totalValue);

    // Use provided unit cost or current average cost
    const addCost = unitCost ?? currentAvgCost;
    const addedValue = quantity * addCost;

    const newQty = currentQty + quantity;
    const newAvailable = currentAvailable + quantity;
    const newValue = currentValue + addedValue;

    // Recalculate weighted average cost
    const newAvgCost = newQty > 0 ? newValue / newQty : addCost;

    // Update inventory item
    await tx.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: {
        quantityOnHand: new Prisma.Decimal(newQty),
        quantityAvailable: new Prisma.Decimal(newAvailable),
        averageCost: new Prisma.Decimal(newAvgCost),
        totalValue: new Prisma.Decimal(newValue),
      },
    });

    // Create stock movement record
    const stockMovement = await tx.stockMovement.create({
      data: {
        productId,
        movementType: MovementType.RETURN,
        quantity: new Prisma.Decimal(quantity), // Positive for addition
        unitCost: new Prisma.Decimal(addCost),
        totalCost: new Prisma.Decimal(addedValue), // Positive for addition
        warehouseLocation: warehouseLocation || 'Main',
        referenceType: context.transactionType,
        referenceId: context.transactionId,
        notes: context.notes || `${context.transactionType}: ${context.transactionNumber}`,
        movementDate: new Date(),
      },
    });

    return {
      inventoryItem,
      stockMovement,
      quantityAdded: quantity,
      valueAdded: addedValue,
    };
  }

  /**
   * Check if sufficient stock is available
   */
  static async checkAvailability(
    tx: any,
    productId: string,
    warehouseLocation: string,
    requiredQuantity: number
  ): Promise<{ available: boolean; currentStock: number }> {
    const inventoryItem = await tx.inventoryItem.findUnique({
      where: {
        productId_warehouseLocation: {
          productId,
          warehouseLocation: warehouseLocation || 'Main',
        },
      },
    });

    if (!inventoryItem) {
      return { available: false, currentStock: 0 };
    }

    const currentAvailable = Number(inventoryItem.quantityAvailable);
    return {
      available: currentAvailable >= requiredQuantity,
      currentStock: currentAvailable,
    };
  }
}
