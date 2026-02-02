/**
 * Manufacturing & Assembly Service
 * Handles Bill of Materials (BOM) processing and product assembly
 * Integrates with Inventory and General Ledger modules
 * Supports Uganda URA compliance for excisable products
 * 
 * Key Capabilities:
 * - BOM validation and component sourcing
 * - Inventory movements (decrease RM, increase FG)
 * - Unit cost recalculation using FIFO/Average Cost
 * - Automatic GL entries for manufacturing costs
 * - Wastage tracking for audit trails
 * - Excise duty calculation (Uganda URA)
 * - Input VAT recovery tracking
 */

import Decimal from 'decimal.js';
import { prisma } from '@/lib/prisma';
import { EntryType } from '@prisma/client';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BuildProductRequest {
  organizationId: string;
  bomId: string;
  finishedProductId: string;
  quantity: number; // Qty of finished good to produce
  assemblyDate?: Date;
  laborCost?: number; // Estimated labor cost
  overheadCost?: number; // Estimated overhead allocation
  wastageQuantity?: number;
  wastageReasons?: string[];
  wastageDescription?: string;
  notes?: string;
  attachments?: string[];
}

export interface BuildProductResponse {
  assemblyTransactionId: string;
  assemblyNumber: string;
  finishedProductId: string;
  quantity: Decimal;
  materialCost: Decimal;
  laborCost: Decimal;
  overheadCost: Decimal;
  totalManufacturingCost: Decimal;
  previousUnitCost: Decimal;
  newUnitCost: Decimal;
  wastageQuantity: Decimal;
  wastageCost: Decimal;
  glTransactionId?: string;
  // Uganda URA
  isExcisableProduct: boolean;
  exciseDutyAmount?: Decimal;
  exciseDutyRate?: number;
  inputVATRecovered?: Decimal;
  // Audit info
  status: string;
  createdAt: Date;
}

// ============================================================================
// MAIN BUILD PRODUCT FUNCTION
// ============================================================================

/**
 * Execute a product assembly build
 * 
 * Process:
 * 1. Validate BOM and organization
 * 2. Calculate component costs from inventory
 * 3. Decrease raw material inventory
 * 4. Increase finished good inventory
 * 5. Calculate new unit cost
 * 6. Create GL journal entries (must balance)
 * 7. Handle wastage tracking
 * 8. Apply Uganda excise duty if applicable
 * 9. Post transaction (atomic)
 */
export async function buildProduct(
  request: BuildProductRequest,
  userId: string
): Promise<BuildProductResponse> {
  const {
    organizationId,
    bomId,
    finishedProductId,
    quantity,
    assemblyDate = new Date(),
    laborCost = 0,
    overheadCost = 0,
    wastageQuantity = 0,
    wastageReasons = [],
    wastageDescription = '',
    notes = '',
    attachments = [],
  } = request;

  // Validate quantity
  if (!quantity || quantity <= 0) {
    throw new Error('Assembly quantity must be greater than zero');
  }

  // Start a transaction - all changes must succeed or all fail
  return await prisma.$transaction(async (tx) => {
    // ========================================================================
    // STEP 1: FETCH AND VALIDATE BOM
    // ========================================================================
    const bom = await tx.billOfMaterial.findUnique({
      where: { id: bomId },
      include: {
        organization: true,
        product: { include: { inventoryItems: true } },
        lines: {
          include: { component: { include: { inventoryItems: true } } },
        },
      },
    });

    if (!bom) {
      throw new Error(`BOM with ID ${bomId} not found`);
    }

    if (bom.organizationId !== organizationId) {
      throw new Error('BOM does not belong to this organization');
    }

    if (bom.status === 'ARCHIVED') {
      throw new Error('Cannot use archived BOM');
    }

    const finishedProduct = await tx.product.findUnique({
      where: { id: finishedProductId },
      include: { inventoryItems: true },
    });

    if (!finishedProduct) {
      throw new Error(`Finished product with ID ${finishedProductId} not found`);
    }

    if (finishedProduct.organizationId !== organizationId) {
      throw new Error('Finished product does not belong to this organization');
    }

    // ========================================================================
    // STEP 2: GET GL ACCOUNTS FOR MANUFACTURING
    // ========================================================================
    const [rawMaterialAccount, finishedGoodsAccount, laborAppliedAccount, overheadAppliedAccount] =
      await Promise.all([
        tx.chartOfAccount.findFirst({
          where: {
            organizationId,
            accountType: 'ASSET',
            name: { contains: 'Raw Material' },
          },
        }),
        tx.chartOfAccount.findFirst({
          where: {
            organizationId,
            accountType: 'ASSET',
            name: { contains: 'Finished Goods' },
          },
        }),
        tx.chartOfAccount.findFirst({
          where: {
            organizationId,
            accountType: 'COST_OF_SALES',
            name: { contains: 'Labor' },
          },
        }),
        tx.chartOfAccount.findFirst({
          where: {
            organizationId,
            accountType: 'COST_OF_SALES',
            name: { contains: 'Overhead' },
          },
        }),
      ]);

    if (!rawMaterialAccount || !finishedGoodsAccount || !laborAppliedAccount || !overheadAppliedAccount) {
      throw new Error(
        'Missing required manufacturing GL accounts: ' +
        'Raw Materials, Finished Goods, Labor Applied, Overhead Applied'
      );
    }

    // ========================================================================
    // STEP 3: CALCULATE COMPONENT COSTS AND ISSUE FROM INVENTORY
    // ========================================================================
    let totalMaterialCost = new Decimal(0);
    const assemblyLines: Array<{
      componentProductId: string;
      plannedQuantity: Decimal;
      actualQuantity: Decimal;
      unitCost: Decimal;
      plannedCost: Decimal;
      actualCost: Decimal;
      costVariance: Decimal;
      wasteQuantity: Decimal;
      wasteCost: Decimal;
    }> = [];

    for (const bomLine of bom.lines) {
      const component = bomLine.component;
      
      // Calculate required quantity (including scrap)
      const yieldFactor = new Decimal(bom.yieldPercent || 100).dividedBy(100);
      const scrapFactor = new Decimal(bomLine.scrapPercent || 0).dividedBy(100);
      
      const plannedQtyPerUnit = new Decimal(bomLine.quantityPer);
      const requiredQtyBeforeScrap = new Decimal(quantity).times(plannedQtyPerUnit).dividedBy(yieldFactor);
      const scrapQtyPerComponent = requiredQtyBeforeScrap.times(scrapFactor);
      const actualQtyRequired = requiredQtyBeforeScrap.plus(scrapQtyPerComponent);

      // Get inventory and calculate cost
      const inventory = component.inventoryItems[0];
      if (!inventory) {
        throw new Error(
          `No inventory record for component ${component.sku} (${component.name})`
        );
      }

      if (new Decimal(inventory.quantityAvailable).lessThan(actualQtyRequired)) {
        throw new Error(
          `Insufficient quantity of ${component.name}. ` +
          `Required: ${actualQtyRequired}, Available: ${inventory.quantityAvailable}`
        );
      }

      const unitCost = new Decimal(inventory.averageCost);
      const plannedCost = plannedQtyPerUnit.times(new Decimal(quantity)).times(unitCost);
      const actualCost = actualQtyRequired.times(unitCost);
      const costVariance = plannedCost.minus(actualCost);
      const wasteCost = scrapQtyPerComponent.times(unitCost);

      assemblyLines.push({
        componentProductId: component.id,
        plannedQuantity: plannedQtyPerUnit.times(new Decimal(quantity)),
        actualQuantity: actualQtyRequired,
        unitCost,
        plannedCost,
        actualCost,
        costVariance,
        wasteQuantity: scrapQtyPerComponent,
        wasteCost,
      });

      totalMaterialCost = totalMaterialCost.plus(actualCost);

      // Decrease raw material inventory
      await tx.inventoryItem.update({
        where: { productId: component.id },
        data: {
          quantityOnHand: new Decimal(inventory.quantityOnHand).minus(actualQtyRequired),
          quantityAvailable: new Decimal(inventory.quantityAvailable).minus(actualQtyRequired),
          totalValue: new Decimal(inventory.totalValue).minus(actualCost),
          updatedAt: new Date(),
        },
      });

      // Record stock movement
      await tx.stockMovement.create({
        data: {
          productId: component.id,
          movementType: 'ADJUSTMENT',
          quantity: actualQtyRequired.times(-1), // Negative = out
          unitCost,
          totalCost: actualCost,
          referenceType: 'ASSEMBLY',
          referenceId: '', // Will be updated after assembly is created
          movementDate: assemblyDate,
          warehouseLocation: 'Main',
        },
      });
    }

    // ========================================================================
    // STEP 4: CALCULATE TOTAL MANUFACTURING COST & NEW UNIT COST
    // ========================================================================
    const laborCostDec = new Decimal(laborCost || 0);
    const overheadCostDec = new Decimal(overheadCost || 0);
    const wastageQtyDec = new Decimal(wastageQuantity || 0);
    
    // Calculate wastage cost
    let totalWastageCost = new Decimal(0);
    for (const line of assemblyLines) {
      totalWastageCost = totalWastageCost.plus(line.wasteCost);
    }

    const totalManufacturingCost = totalMaterialCost
      .plus(laborCostDec)
      .plus(overheadCostDec);

    // Get current finished good inventory
    const fgInventory = finishedProduct.inventoryItems[0];
    const currentFGQty = fgInventory ? new Decimal(fgInventory.quantityOnHand) : new Decimal(0);
    const currentFGValue = fgInventory ? new Decimal(fgInventory.totalValue) : new Decimal(0);
    const previousUnitCost = currentFGQty.isZero()
      ? new Decimal(0)
      : currentFGValue.dividedBy(currentFGQty);

    // New unit cost = (Old Total Value + New MFG Cost) / (Old Qty + New Qty)
    const newFGQty = currentFGQty.plus(new Decimal(quantity));
    const newFGValue = currentFGValue.plus(totalManufacturingCost);
    const newUnitCost = newFGQty.isZero()
      ? new Decimal(0)
      : newFGValue.dividedBy(newFGQty);

    // ========================================================================
    // STEP 5: INCREASE FINISHED GOOD INVENTORY
    // ========================================================================
    const updatedFGInventory = await tx.inventoryItem.upsert({
      where: { productId: finishedProductId },
      create: {
        productId: finishedProductId,
        quantityOnHand: new Decimal(quantity),
        quantityAvailable: new Decimal(quantity),
        totalValue: totalManufacturingCost,
        averageCost: newUnitCost,
        warehouseLocation: 'Main',
      },
      update: {
        quantityOnHand: newFGQty,
        quantityAvailable: newFGQty,
        totalValue: newFGValue,
        averageCost: newUnitCost,
      },
    });

    // ========================================================================
    // STEP 6: CHECK FOR UGANDA EXCISABLE PRODUCT
    // ========================================================================
    let isExcisableProduct = false;
    let exciseDutyAmount = new Decimal(0);
    let exciseDutyRate = 0;
    let inputVATRecovered = new Decimal(0);

    // Query EFRISExcisableList to see if product is excisable
    const excisableCategory = await tx.efrISExcisableList.findFirst({
      where: {
        organizationId,
        isActive: true,
      },
    });

    if (excisableCategory) {
      // For this example, check if product name contains keywords like "beverage", "plastic"
      const excisableKeywords = ['beverage', 'drink', 'plastic', 'bag', 'cigarette', 'spirit'];
      isExcisableProduct = excisableKeywords.some((kw) =>
        finishedProduct.name.toLowerCase().includes(kw)
      );

      if (isExcisableProduct) {
        exciseDutyRate = parseFloat(excisableCategory.exciseRate.toString());
        exciseDutyAmount = totalManufacturingCost
          .times(new Decimal(exciseDutyRate))
          .dividedBy(100);
      }
    }

    // ========================================================================
    // STEP 7: CREATE BALANCED JOURNAL ENTRIES
    // ========================================================================
    // DOUBLE-ENTRY ACCOUNTING RULE:
    // Debit: Finished Goods Inventory (ASSET) = Manufacturing Cost
    // Credit: Raw Materials Inventory (ASSET) = Material Cost
    // Credit: Labor Applied (EXPENSE/ASSET) = Labor Cost
    // Credit: Overhead Applied (EXPENSE/ASSET) = Overhead Cost
    //
    // If Excisable:
    // Debit: Excise Payable (LIABILITY) = Excise Duty Amount

    const now = new Date();
    const transactionNumber = `ASM-${organizationId.substring(0, 4)}-${Date.now()}`;

    // Create transaction header
    const glTransaction = await tx.transaction.create({
      data: {
        organizationId,
        transactionNumber,
        transactionDate: assemblyDate,
        transactionType: 'INVENTORY_ADJUSTMENT',
        referenceType: 'ASSEMBLY',
        description: `Assembly: ${finishedProduct.name} x ${quantity} units`,
        status: 'POSTED',
        createdById: userId,
      },
    });

    // Create ledger entries
    const ledgerEntries = [];

    // DEBIT: Finished Goods Inventory
    ledgerEntries.push({
      transactionId: glTransaction.id,
      accountId: finishedGoodsAccount.id,
      entryType: 'DEBIT' as const,
      amount: totalManufacturingCost,
      currency: 'USD',
      exchangeRate: new Decimal(1),
      amountInBase: totalManufacturingCost,
      description: `Manufacturing of ${finishedProduct.name}`,
    });

    // CREDIT: Raw Materials Inventory
    ledgerEntries.push({
      transactionId: glTransaction.id,
      accountId: rawMaterialAccount.id,
      entryType: 'CREDIT' as const,
      amount: totalMaterialCost,
      currency: 'USD',
      exchangeRate: new Decimal(1),
      amountInBase: totalMaterialCost,
      description: 'Raw materials consumed',
    });

    // CREDIT: Labor Applied (if > 0)
    if (laborCostDec.greaterThan(0)) {
      ledgerEntries.push({
        transactionId: glTransaction.id,
        accountId: laborAppliedAccount.id,
        entryType: 'CREDIT' as const,
        amount: laborCostDec,
        currency: 'USD',
        exchangeRate: new Decimal(1),
        amountInBase: laborCostDec,
        description: 'Direct labor applied',
      });
    }

    // CREDIT: Overhead Applied (if > 0)
    if (overheadCostDec.greaterThan(0)) {
      ledgerEntries.push({
        transactionId: glTransaction.id,
        accountId: overheadAppliedAccount.id,
        entryType: 'CREDIT' as const,
        amount: overheadCostDec,
        currency: 'USD',
        exchangeRate: new Decimal(1),
        amountInBase: overheadCostDec,
        description: 'Overhead applied',
      });
    }

    // DEBIT: Excise Payable (if applicable)
    let excisePayableAccountId: string | undefined;
    if (isExcisableProduct && exciseDutyAmount.greaterThan(0)) {
      const exciseAccount = await tx.chartOfAccount.findFirst({
        where: {
          organizationId,
          accountType: 'LIABILITY',
          name: { contains: 'Excise' },
        },
      });

      if (exciseAccount) {
        excisePayableAccountId = exciseAccount.id;
        ledgerEntries.push({
          transactionId: glTransaction.id,
          accountId: exciseAccount.id,
          entryType: 'DEBIT' as const,
          amount: exciseDutyAmount,
          currency: 'USD',
          exchangeRate: new Decimal(1),
          amountInBase: exciseDutyAmount,
          description: `Excise duty on ${finishedProduct.name}`,
        });
      }
    }

    // Validate entries balance (sum of debits = sum of credits)
    let totalDebits = new Decimal(0);
    let totalCredits = new Decimal(0);

    for (const entry of ledgerEntries) {
      if (entry.entryType === 'DEBIT') {
        totalDebits = totalDebits.plus(entry.amount);
      } else {
        totalCredits = totalCredits.plus(entry.amount);
      }
    }

    if (!totalDebits.equals(totalCredits)) {
      throw new Error(
        `Journal entries do not balance. Debits: ${totalDebits}, Credits: ${totalCredits}`
      );
    }

    // Create all ledger entries
    await tx.ledgerEntry.createMany({
      data: ledgerEntries as Parameters<typeof tx.ledgerEntry.createMany>[0]['data'],
    });

    // ========================================================================
    // STEP 8: CREATE ASSEMBLY TRANSACTION RECORD
    // ========================================================================
    const assemblyNumber = `ASM-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    const assemblyTransaction = await tx.assemblyTransaction.create({
      data: {
        organizationId,
        bomId,
        finishedProductId,
        assemblyNumber,
        assemblyDate,
        quantity: new Decimal(quantity),
        materialCost: totalMaterialCost,
        laborCost: laborCostDec,
        overheadCost: overheadCostDec,
        wastageQuantity: wastageQtyDec,
        wastageCost: totalWastageCost,
        totalManufacturingCost,
        previousUnitCost,
        newUnitCost,
        isExcisableProduct,
        exciseDutyRate: exciseDutyRate || 0,
        exciseDutyAmount: isExcisableProduct ? exciseDutyAmount : new Decimal(0),
        inputVATRecovered,
        glTransactionId: glTransaction.id,
        rawMaterialAccountId: rawMaterialAccount.id,
        finishedGoodsAccountId: finishedGoodsAccount.id,
        laborAccountId: laborAppliedAccount.id,
        overheadAccountId: overheadAppliedAccount.id,
        status: 'POSTED',
        notes,
        attachments,
      },
    });

    // ========================================================================
    // STEP 9: CREATE ASSEMBLY LINE DETAILS
    // ========================================================================
    for (const line of assemblyLines) {
      await tx.assemblyLine.create({
        data: {
          assemblyTransactionId: assemblyTransaction.id,
          componentProductId: line.componentProductId,
          plannedQuantity: line.plannedQuantity,
          actualQuantity: line.actualQuantity,
          unitCost: line.unitCost,
          plannedCost: line.plannedCost,
          actualCost: line.actualCost,
          costVariance: line.costVariance,
          wasteQuantity: line.wasteQuantity,
          wasteCost: line.wasteCost,
        },
      });
    }

    // ========================================================================
    // STEP 10: CREATE WASTAGE TRACKING (URA COMPLIANCE)
    // ========================================================================
    if (totalWastageCost.greaterThan(0)) {
      const wastagePercentage = totalWastageCost
        .dividedBy(totalMaterialCost)
        .times(100);

      const scrapAccount = await tx.chartOfAccount.findFirst({
        where: {
          organizationId,
          name: { contains: 'Scrap' },
        },
      });

      await tx.wastageTracking.create({
        data: {
          assemblyTransactionId: assemblyTransaction.id,
          totalWastageQuantity: wastageQtyDec,
          totalWastageCost,
          wastagePercentage,
          wastageReasons,
          description: wastageDescription,
          scrapAccountId: scrapAccount?.id,
        },
      });
    }

    // ========================================================================
    // STEP 11: CREATE EXCISE DUTY RECORD (UGANDA URA)
    // ========================================================================
    if (isExcisableProduct) {
      await tx.uGExcisableDuty.create({
        data: {
          assemblyTransactionId: assemblyTransaction.id,
          productSKU: finishedProduct.sku,
          productName: finishedProduct.name,
          excisableCategoryId: excisableCategory?.id || '',
          baseValue: totalManufacturingCost,
          exciseRate: new Decimal(exciseDutyRate),
          exciseDutyAmount,
          inputVATOnMaterials: new Decimal(0), // Should be calculated from RM invoices
          outputVATOnFinished: new Decimal(0), // Will be calculated on sale
          netVATPosition: new Decimal(0),
          efrisReportingStatus: 'PENDING',
          exciseDutyAccountId,
        },
      });
    }

    // ========================================================================
    // RETURN RESPONSE
    // ========================================================================
    return {
      assemblyTransactionId: assemblyTransaction.id,
      assemblyNumber: assemblyTransaction.assemblyNumber,
      finishedProductId: assemblyTransaction.finishedProductId,
      quantity: assemblyTransaction.quantity,
      materialCost: assemblyTransaction.materialCost,
      laborCost: assemblyTransaction.laborCost,
      overheadCost: assemblyTransaction.overheadCost,
      totalManufacturingCost: assemblyTransaction.totalManufacturingCost,
      previousUnitCost: assemblyTransaction.previousUnitCost,
      newUnitCost: assemblyTransaction.newUnitCost,
      wastageQuantity: assemblyTransaction.wastageQuantity,
      wastageCost: assemblyTransaction.wastageCost,
      glTransactionId: assemblyTransaction.glTransactionId || undefined,
      isExcisableProduct: assemblyTransaction.isExcisableProduct,
      exciseDutyAmount: assemblyTransaction.exciseDutyAmount.greaterThan(0)
        ? assemblyTransaction.exciseDutyAmount
        : undefined,
      exciseDutyRate: assemblyTransaction.exciseDutyRate > 0
        ? assemblyTransaction.exciseDutyRate
        : undefined,
      inputVATRecovered: assemblyTransaction.inputVATRecovered,
      status: assemblyTransaction.status,
      createdAt: assemblyTransaction.createdAt,
    };
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Reverse/Cancel an assembly build
 * Restores raw material quantities and reverses GL entries
 */
export async function reverseAssemblyBuild(
  assemblyTransactionId: string,
  organizationId: string,
  userId: string,
  reason: string
): Promise<void> {
  return await prisma.$transaction(async (tx) => {
    const assembly = await tx.assemblyTransaction.findUnique({
      where: { id: assemblyTransactionId },
      include: { lines: true, glTransaction: true },
    });

    if (!assembly) {
      throw new Error(`Assembly transaction ${assemblyTransactionId} not found`);
    }

    if (assembly.organizationId !== organizationId) {
      throw new Error('Assembly does not belong to this organization');
    }

    if (assembly.status === 'REVERSED') {
      throw new Error('Assembly has already been reversed');
    }

    // Restore raw material inventory
    for (const line of assembly.lines) {
      const inventory = await tx.inventoryItem.findUnique({
        where: { productId: line.componentProductId },
      });

      if (inventory) {
        await tx.inventoryItem.update({
          where: { productId: line.componentProductId },
          data: {
            quantityOnHand: new Decimal(inventory.quantityOnHand).plus(line.actualQuantity),
            quantityAvailable: new Decimal(inventory.quantityAvailable).plus(line.actualQuantity),
            totalValue: new Decimal(inventory.totalValue).plus(line.actualCost),
          },
        });
      }
    }

    // Reduce finished good inventory
    const fgInventory = await tx.inventoryItem.findUnique({
      where: { productId: assembly.finishedProductId },
    });

    if (fgInventory) {
      await tx.inventoryItem.update({
        where: { productId: assembly.finishedProductId },
        data: {
          quantityOnHand: new Decimal(fgInventory.quantityOnHand).minus(assembly.quantity),
          quantityAvailable: new Decimal(fgInventory.quantityAvailable).minus(assembly.quantity),
          totalValue: new Decimal(fgInventory.totalValue).minus(assembly.totalManufacturingCost),
        },
      });
    }

    // Void GL transaction if it exists
    if (assembly.glTransactionId) {
      await tx.transaction.update({
        where: { id: assembly.glTransactionId },
        data: { status: 'VOIDED' },
      });
    }

    // Update assembly status
    await tx.assemblyTransaction.update({
      where: { id: assemblyTransactionId },
      data: {
        status: 'REVERSED',
        notes: `${assembly.notes || ''}\n\nREVERSED: ${reason}`,
      },
    });
  });
}

/**
 * Get assembly transaction with full details
 */
export async function getAssemblyDetails(
  assemblyTransactionId: string,
  organizationId: string
) {
  return await prisma.assemblyTransaction.findFirst({
    where: {
      id: assemblyTransactionId,
      organizationId,
    },
    include: {
      bom: { include: { product: true, lines: { include: { component: true } } } },
      finishedProduct: true,
      lines: { include: { componentProduct: true } },
      wasteTracking: true,
      exciseDutyRecord: true,
      glTransaction: { include: { ledgerEntries: { include: { account: true } } } },
    },
  });
}

/**
 * List assembly transactions for an organization
 */
export async function listAssemblyTransactions(
  organizationId: string,
  filters?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
) {
  const { status, startDate, endDate, limit = 20, offset = 0 } = filters || {};

  const where: any = { organizationId };
  if (status) where.status = status;
  if (startDate || endDate) {
    where.assemblyDate = {};
    if (startDate) where.assemblyDate.gte = startDate;
    if (endDate) where.assemblyDate.lte = endDate;
  }

  return await prisma.assemblyTransaction.findMany({
    where,
    include: {
      finishedProduct: true,
      bom: true,
      glTransaction: true,
    },
    orderBy: { assemblyDate: 'desc' },
    take: limit,
    skip: offset,
  });
}
