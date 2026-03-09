/**
 * Work Order Service — Manufacturing Execution
 *
 * Manages the full lifecycle of production work orders:
 *   PLANNED → RELEASED → IN_PROGRESS → COMPLETED → CLOSED
 *
 * Handles material allocation, issue-to-production stock movements,
 * production output receipt, and unit-cost calculation for finished goods.
 */

import Decimal from 'decimal.js';
import { prisma } from '@/lib/prisma';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface CreateWorkOrderInput {
  productId: string;
  bomId: string;
  quantityPlanned: number;
  branchId?: string;
  warehouseId?: string;
  dueDate?: string;
  priority?: number;
  notes?: string;
}

export interface CompleteWorkOrderInput {
  actualProduced: number;
  actualScrapped?: number;
  laborCost?: number;
  overheadCost?: number;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Service
// ═══════════════════════════════════════════════════════════════════════════

export class WorkOrderService {

  /* ─── List ─── */
  static async listWorkOrders(organizationId: string) {
    const orders = await prisma.workOrder.findMany({
      where: { organizationId },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        bom: { select: { id: true, name: true, version: true } },
        branch: { select: { id: true, name: true } },
        materials: { select: { id: true, requiredQuantity: true, issuedQuantity: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map(o => {
      const totalRequired = o.materials.reduce((s, m) => s + Number(m.requiredQuantity), 0);
      const totalIssued = o.materials.reduce((s, m) => s + Number(m.issuedQuantity), 0);
      const materialProgress = totalRequired > 0
        ? Math.min(100, Math.round((totalIssued / totalRequired) * 100))
        : 0;
      const outputProgress = Number(o.quantityPlanned) > 0
        ? Math.min(100, Math.round((Number(o.quantityCompleted) / Number(o.quantityPlanned)) * 100))
        : 0;

      return {
        id: o.id,
        workOrderNumber: o.workOrderNumber,
        productId: o.product.id,
        productSku: o.product.sku,
        productName: o.product.name,
        bomName: o.bom ? `${o.bom.name} v${o.bom.version}` : null,
        bomId: o.bomId,
        branchName: o.branch?.name ?? null,
        status: o.status,
        priority: o.priority,
        quantityPlanned: Number(o.quantityPlanned),
        quantityCompleted: Number(o.quantityCompleted),
        quantityScrapped: Number(o.quantityScrapped),
        outputProgress,
        materialProgress,
        materialCount: o.materials.length,
        startDate: o.startDate,
        dueDate: o.dueDate,
        completedAt: o.completedAt,
        createdAt: o.createdAt,
      };
    });
  }

  /* ─── Get Single ─── */
  static async getWorkOrder(workOrderId: string, organizationId: string) {
    const wo = await prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId },
      include: {
        product: { select: { id: true, sku: true, name: true, unitOfMeasure: true } },
        bom: { select: { id: true, name: true, version: true, status: true } },
        branch: { select: { id: true, name: true } },
        materials: {
          include: {
            component: {
              select: {
                id: true,
                sku: true,
                name: true,
                unitOfMeasure: true,
                inventoryItems: { select: { quantityAvailable: true, averageCost: true }, take: 1 },
              },
            },
          },
          orderBy: { component: { sku: 'asc' } },
        },
        operations: { orderBy: { sequence: 'asc' } },
      },
    });
    if (!wo) return null;

    return {
      id: wo.id,
      workOrderNumber: wo.workOrderNumber,
      productId: wo.product.id,
      productSku: wo.product.sku,
      productName: wo.product.name,
      productUOM: wo.product.unitOfMeasure,
      bomId: wo.bomId,
      bomName: wo.bom ? `${wo.bom.name} v${wo.bom.version}` : null,
      bomStatus: wo.bom?.status ?? null,
      branchId: wo.branch?.id ?? null,
      branchName: wo.branch?.name ?? null,
      status: wo.status,
      priority: wo.priority,
      quantityPlanned: Number(wo.quantityPlanned),
      quantityCompleted: Number(wo.quantityCompleted),
      quantityScrapped: Number(wo.quantityScrapped),
      startDate: wo.startDate,
      dueDate: wo.dueDate,
      completedAt: wo.completedAt,
      notes: wo.notes,
      createdAt: wo.createdAt,
      updatedAt: wo.updatedAt,
      materials: wo.materials.map(m => {
        const inv = m.component.inventoryItems[0];
        return {
          id: m.id,
          componentId: m.componentId,
          componentSku: m.component.sku,
          componentName: m.component.name,
          componentUOM: m.component.unitOfMeasure,
          requiredQuantity: Number(m.requiredQuantity),
          issuedQuantity: Number(m.issuedQuantity),
          scrapPercent: Number(m.scrapPercent),
          backflush: m.backflush,
          available: inv ? Number(inv.quantityAvailable) : 0,
          unitCost: inv ? Number(inv.averageCost) : 0,
        };
      }),
      operations: wo.operations.map(op => ({
        id: op.id,
        sequence: op.sequence,
        status: op.status,
        setupTimeMins: op.setupTimeMins,
        runTimeMins: op.runTimeMins,
        laborTimeMins: op.laborTimeMins,
        startedAt: op.startedAt,
        completedAt: op.completedAt,
      })),
    };
  }

  /* ─── Create ─── */
  static async createWorkOrder(organizationId: string, input: CreateWorkOrderInput) {
    // Validate product
    const product = await prisma.product.findFirst({
      where: { id: input.productId, organizationId },
    });
    if (!product) throw new Error('Product not found');

    // Validate BOM
    const bom = await prisma.billOfMaterial.findFirst({
      where: { id: input.bomId, organizationId },
      include: {
        lines: {
          include: { component: { select: { id: true } } },
        },
      },
    });
    if (!bom) throw new Error('BOM not found');
    if (bom.status === 'ARCHIVED') throw new Error('Cannot use an archived BOM');

    // Generate work order number
    const count = await prisma.workOrder.count({ where: { organizationId } });
    const woNumber = `WO-${String(count + 1).padStart(5, '0')}`;

    // Create WO + material requirements (snapshot of BOM lines)
    const wo = await prisma.workOrder.create({
      data: {
        organizationId,
        productId: input.productId,
        bomId: input.bomId,
        branchId: input.branchId || null,
        workOrderNumber: woNumber,
        quantityPlanned: input.quantityPlanned,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        priority: input.priority ?? 3,
        notes: input.notes || null,
        status: 'PLANNED',
        materials: {
          create: bom.lines.map(line => {
            const scrapFactor = new Decimal(line.scrapPercent || 0).dividedBy(100);
            const baseQty = new Decimal(line.quantityPer).times(input.quantityPlanned);
            const requiredQty = baseQty.plus(baseQty.times(scrapFactor));
            return {
              componentId: line.componentId,
              requiredQuantity: requiredQty,
              scrapPercent: line.scrapPercent,
              backflush: line.backflush,
            };
          }),
        },
      },
    });

    return wo;
  }

  /* ─── Release (PLANNED → RELEASED) ─── */
  static async releaseWorkOrder(workOrderId: string, organizationId: string) {
    const wo = await prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId },
      include: {
        materials: {
          include: {
            component: {
              include: { inventoryItems: { select: { quantityAvailable: true }, take: 1 } },
            },
          },
        },
      },
    });
    if (!wo) throw new Error('Work order not found');
    if (wo.status !== 'PLANNED') throw new Error('Only PLANNED orders can be released');

    // Availability check
    const shortages: string[] = [];
    for (const m of wo.materials) {
      const avail = m.component.inventoryItems[0]
        ? Number(m.component.inventoryItems[0].quantityAvailable)
        : 0;
      if (avail < Number(m.requiredQuantity)) {
        shortages.push(`${m.component.sku}: need ${Number(m.requiredQuantity)}, available ${avail}`);
      }
    }
    if (shortages.length > 0) {
      throw new Error(`Insufficient materials:\n${shortages.join('\n')}`);
    }

    return prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'RELEASED' },
    });
  }

  /* ─── Start (RELEASED → IN_PROGRESS) ─── */
  static async startWorkOrder(workOrderId: string, organizationId: string) {
    const wo = await prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId },
    });
    if (!wo) throw new Error('Work order not found');
    if (wo.status !== 'RELEASED') throw new Error('Only RELEASED orders can be started');

    return prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'IN_PROGRESS', startDate: new Date() },
    });
  }

  /* ─── Hold / Resume ─── */
  static async holdWorkOrder(workOrderId: string, organizationId: string, reason?: string) {
    const wo = await prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId },
    });
    if (!wo) throw new Error('Work order not found');
    if (wo.status !== 'IN_PROGRESS' && wo.status !== 'RELEASED') {
      throw new Error('Only IN_PROGRESS or RELEASED orders can be put on hold');
    }
    return prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'HOLD', notes: reason ? `${wo.notes ?? ''}\n[HOLD] ${reason}`.trim() : wo.notes },
    });
  }

  static async resumeWorkOrder(workOrderId: string, organizationId: string) {
    const wo = await prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId },
    });
    if (!wo) throw new Error('Work order not found');
    if (wo.status !== 'HOLD') throw new Error('Only orders on HOLD can be resumed');
    return prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'IN_PROGRESS' },
    });
  }

  /* ─── Complete (IN_PROGRESS → COMPLETED) ─── */
  /**
   * Atomic production completion:
   *  1. Issue raw materials (StockMovement ADJUSTMENT -qty, update InventoryItem)
   *  2. Receive finished goods (StockMovement ADJUSTMENT +qty, update InventoryItem)
   *  3. Create GL journal (DR: Finished Goods, CR: Raw Materials + Labor + Overhead)
   *  4. Update work order quantities
   */
  static async completeWorkOrder(
    workOrderId: string,
    organizationId: string,
    input: CompleteWorkOrderInput,
    userId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.findFirst({
        where: { id: workOrderId, organizationId },
        include: {
          product: { include: { inventoryItems: { take: 1 } } },
          organization: { select: { baseCurrency: true } },
          materials: {
            include: {
              component: { include: { inventoryItems: { take: 1 } } },
            },
          },
        },
      });
      if (!wo) throw new Error('Work order not found');
      if (wo.status !== 'IN_PROGRESS') throw new Error('Only IN_PROGRESS orders can be completed');
      if (input.actualProduced <= 0) throw new Error('Produced quantity must be positive');

      const baseCurrency = wo.organization.baseCurrency;
      const now = new Date();

      // ── 1. Issue Raw Materials ──
      let totalMaterialCost = new Decimal(0);

      for (const mat of wo.materials) {
        const inv = mat.component.inventoryItems[0];
        if (!inv) throw new Error(`No inventory record for ${mat.component.sku}`);

        const issueQty = new Decimal(mat.requiredQuantity).minus(mat.issuedQuantity);
        if (issueQty.lte(0)) continue; // Already fully issued

        const availableQty = new Decimal(inv.quantityAvailable);
        if (availableQty.lt(issueQty)) {
          throw new Error(`Insufficient ${mat.component.sku}: need ${issueQty}, available ${availableQty}`);
        }

        const unitCost = new Decimal(inv.averageCost);
        const lineCost = issueQty.times(unitCost);
        totalMaterialCost = totalMaterialCost.plus(lineCost);

        // Decrease component inventory
        await tx.inventoryItem.update({
          where: { productId_warehouseLocation: { productId: mat.componentId, warehouseLocation: 'Main' } },
          data: {
            quantityOnHand: new Decimal(inv.quantityOnHand).minus(issueQty),
            quantityAvailable: availableQty.minus(issueQty),
            totalValue: new Decimal(inv.totalValue).minus(lineCost),
          },
        });

        // Stock movement — issue to production
        await tx.stockMovement.create({
          data: {
            productId: mat.componentId,
            movementType: 'ADJUSTMENT',
            quantity: issueQty.times(-1),
            unitCost,
            totalCost: lineCost,
            referenceType: 'WORK_ORDER',
            referenceId: wo.id,
            referenceNumber: wo.workOrderNumber,
            notes: `Issued to WO ${wo.workOrderNumber}`,
            movementDate: now,
            warehouseLocation: 'Main',
          },
        });

        // Update issued qty on material line
        await tx.workOrderMaterial.update({
          where: { id: mat.id },
          data: { issuedQuantity: new Decimal(mat.issuedQuantity).plus(issueQty) },
        });
      }

      // ── 2. Receive Finished Goods ──
      const laborCostDec = new Decimal(input.laborCost ?? 0);
      const overheadCostDec = new Decimal(input.overheadCost ?? 0);
      const totalMfgCost = totalMaterialCost.plus(laborCostDec).plus(overheadCostDec);

      const fgInv = wo.product.inventoryItems[0];
      const prevQty = fgInv ? new Decimal(fgInv.quantityOnHand) : new Decimal(0);
      const prevValue = fgInv ? new Decimal(fgInv.totalValue) : new Decimal(0);
      const newQty = prevQty.plus(input.actualProduced);
      const newValue = prevValue.plus(totalMfgCost);
      const newUnitCost = newQty.gt(0) ? newValue.dividedBy(newQty) : new Decimal(0);

      await tx.inventoryItem.upsert({
        where: { productId_warehouseLocation: { productId: wo.productId, warehouseLocation: 'Main' } },
        create: {
          productId: wo.productId,
          quantityOnHand: new Decimal(input.actualProduced),
          quantityAvailable: new Decimal(input.actualProduced),
          totalValue: totalMfgCost,
          averageCost: newUnitCost,
          warehouseLocation: 'Main',
        },
        update: {
          quantityOnHand: newQty,
          quantityAvailable: newQty,
          totalValue: newValue,
          averageCost: newUnitCost,
        },
      });

      // Stock movement — production output
      await tx.stockMovement.create({
        data: {
          productId: wo.productId,
          movementType: 'ADJUSTMENT',
          quantity: new Decimal(input.actualProduced),
          unitCost: newUnitCost,
          totalCost: totalMfgCost,
          referenceType: 'WORK_ORDER',
          referenceId: wo.id,
          referenceNumber: wo.workOrderNumber,
          notes: `Output from WO ${wo.workOrderNumber}`,
          movementDate: now,
          warehouseLocation: 'Main',
        },
      });

      // ── 3. GL Journal Entries ──
      const [rawMaterialAccount, finishedGoodsAccount, laborAccount, overheadAccount] =
        await Promise.all([
          tx.chartOfAccount.findFirst({
            where: { organizationId, accountType: 'ASSET', name: { contains: 'Raw Material' } },
          }),
          tx.chartOfAccount.findFirst({
            where: { organizationId, accountType: 'ASSET', name: { contains: 'Finished Goods' } },
          }),
          tx.chartOfAccount.findFirst({
            where: { organizationId, accountType: 'COST_OF_SALES', name: { contains: 'Labor' } },
          }),
          tx.chartOfAccount.findFirst({
            where: { organizationId, accountType: 'COST_OF_SALES', name: { contains: 'Overhead' } },
          }),
        ]);

      if (!rawMaterialAccount || !finishedGoodsAccount) {
        throw new Error('Missing required GL accounts (Raw Materials, Finished Goods)');
      }

      const txnNumber = `WO-${wo.workOrderNumber}-${Date.now().toString().slice(-6)}`;
      const glTxn = await tx.transaction.create({
        data: {
          organizationId,
          transactionNumber: txnNumber,
          transactionDate: now,
          transactionType: 'INVENTORY_ADJUSTMENT',
          referenceType: 'WORK_ORDER',
          description: `Work Order ${wo.workOrderNumber} completion: ${wo.product.name} x ${input.actualProduced}`,
          status: 'POSTED',
          createdById: userId,
        },
      });

      const entries: any[] = [];

      // DR Finished Goods
      entries.push({
        transactionId: glTxn.id,
        accountId: finishedGoodsAccount.id,
        entryType: 'DEBIT' as const,
        amount: totalMfgCost,
        currency: baseCurrency,
        exchangeRate: new Decimal(1),
        amountInBase: totalMfgCost,
        description: `Production output: ${wo.product.name}`,
      });

      // CR Raw Materials
      entries.push({
        transactionId: glTxn.id,
        accountId: rawMaterialAccount.id,
        entryType: 'CREDIT' as const,
        amount: totalMaterialCost,
        currency: baseCurrency,
        exchangeRate: new Decimal(1),
        amountInBase: totalMaterialCost,
        description: 'Raw materials consumed',
      });

      if (laborCostDec.gt(0) && laborAccount) {
        entries.push({
          transactionId: glTxn.id,
          accountId: laborAccount.id,
          entryType: 'CREDIT' as const,
          amount: laborCostDec,
          currency: baseCurrency,
          exchangeRate: new Decimal(1),
          amountInBase: laborCostDec,
          description: 'Direct labor applied',
        });
      }

      if (overheadCostDec.gt(0) && overheadAccount) {
        entries.push({
          transactionId: glTxn.id,
          accountId: overheadAccount.id,
          entryType: 'CREDIT' as const,
          amount: overheadCostDec,
          currency: baseCurrency,
          exchangeRate: new Decimal(1),
          amountInBase: overheadCostDec,
          description: 'Manufacturing overhead applied',
        });
      }

      await tx.ledgerEntry.createMany({ data: entries });

      // ── 4. Update Work Order ──
      const updated = await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          status: 'COMPLETED',
          quantityCompleted: new Decimal(wo.quantityCompleted).plus(input.actualProduced),
          quantityScrapped: new Decimal(wo.quantityScrapped).plus(input.actualScrapped ?? 0),
          completedAt: now,
          notes: input.notes
            ? `${wo.notes ?? ''}\n[COMPLETION] ${input.notes}`.trim()
            : wo.notes,
        },
      });

      return {
        workOrderId: updated.id,
        workOrderNumber: updated.workOrderNumber,
        quantityProduced: input.actualProduced,
        quantityScrapped: input.actualScrapped ?? 0,
        totalMaterialCost: Number(totalMaterialCost),
        laborCost: Number(laborCostDec),
        overheadCost: Number(overheadCostDec),
        totalManufacturingCost: Number(totalMfgCost),
        newUnitCost: Number(newUnitCost),
        yield: Number(wo.quantityPlanned) > 0
          ? Math.round((input.actualProduced / Number(wo.quantityPlanned)) * 100)
          : 0,
      };
    });
  }

  /* ─── Close (COMPLETED → CLOSED) ─── */
  static async closeWorkOrder(workOrderId: string, organizationId: string) {
    const wo = await prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId },
    });
    if (!wo) throw new Error('Work order not found');
    if (wo.status !== 'COMPLETED') throw new Error('Only COMPLETED orders can be closed');
    return prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'CLOSED' },
    });
  }

  /* ─── Cancel ─── */
  static async cancelWorkOrder(workOrderId: string, organizationId: string, reason?: string) {
    const wo = await prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId },
    });
    if (!wo) throw new Error('Work order not found');
    if (wo.status === 'COMPLETED' || wo.status === 'CLOSED') {
      throw new Error('Cannot cancel a completed or closed order');
    }
    return prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${wo.notes ?? ''}\n[CANCELLED] ${reason}`.trim() : wo.notes,
      },
    });
  }
}
