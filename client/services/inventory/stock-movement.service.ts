/**
 * Stock Movement Service
 * ──────────────────────
 * The "Black Box" of the warehouse: an immutable, auditable log of every
 * stock change, with WAC recalculation and atomic multi-branch transfers.
 */

import { Prisma, MovementType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { WarehouseService } from '@/services/warehouse/warehouse.service';

/* ─────────── Types ─────────── */

export interface RecordMovementInput {
  organizationId: string;
  productId: string;
  movementType: MovementType;
  /** Positive for stock-in, negative for stock-out */
  quantity: number;
  unitCost?: number;
  warehouseLocation?: string;
  branchId?: string;
  warehouseId?: string;
  performedById?: string;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  notes?: string;
  movementDate?: Date;
  /** For linking to accounting transactions */
  transactionId?: string;
}

export interface TransferStockInput {
  organizationId: string;
  productId: string;
  quantity: number;
  fromBranchId: string;
  toBranchId: string;
  fromWarehouseLocation?: string;
  toWarehouseLocation?: string;
  performedById?: string;
  notes?: string;
}

export interface MovementFilters {
  organizationId: string;
  productId?: string;
  branchId?: string;
  warehouseId?: string;
  movementType?: MovementType;
  performedById?: string;
  startDate?: Date;
  endDate?: Date;
  referenceType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface StockCardEntry {
  id: string;
  movementDate: Date;
  movementType: MovementType;
  quantity: number;
  unitCost: number;
  totalCost: number;
  balanceAfter: number | null;
  referenceType: string | null;
  referenceId: string | null;
  referenceNumber: string | null;
  notes: string | null;
  performedById: string | null;
  branchName: string | null;
  warehouseLocation: string;
}

/* ─────────── Service ─────────── */

export class StockMovementService {
  /**
   * Record a single stock movement.
   * - Updates InventoryItem (qty, WAC, totalValue)
   * - Computes & stores `balanceAfter`
   * - On PURCHASE → recalculates WAC
   * - On SALE → stamps unitCostAtTime for COGS accuracy
   */
  static async recordMovement(input: RecordMovementInput) {
    return prisma.$transaction(async (tx) => {
      return this._recordMovementTx(tx, input);
    });
  }

  /** Internal: record movement within an existing transaction */
  private static async _recordMovementTx(
    tx: Prisma.TransactionClient,
    input: RecordMovementInput,
    transferGroupId?: string
  ) {
    const {
      productId,
      movementType,
      quantity,
      warehouseLocation = 'Main',
      branchId,
      warehouseId,
      performedById,
      referenceType,
      referenceId,
      referenceNumber,
      notes,
      transactionId,
    } = input;

    const movementDate = input.movementDate || new Date();

    // ── Get or create InventoryItem ──
    let inventoryItem = await tx.inventoryItem.findUnique({
      where: {
        productId_warehouseLocation: { productId, warehouseLocation },
      },
    });

    if (!inventoryItem) {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: productId },
        select: { purchasePrice: true },
      });
      inventoryItem = await tx.inventoryItem.create({
        data: {
          productId,
          warehouseLocation,
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityAvailable: 0,
          averageCost: product.purchasePrice,
          totalValue: 0,
        },
      });
    }

    const currentQty = Number(inventoryItem.quantityOnHand);
    const currentAvgCost = Number(inventoryItem.averageCost);
    const currentValue = Number(inventoryItem.totalValue);

    // ── Determine signed quantity ──
    let signedQty: number;
    switch (movementType) {
      case 'PURCHASE':
      case 'RETURN':
        signedQty = Math.abs(quantity);
        break;
      case 'SALE':
      case 'WRITE_OFF':
        signedQty = -Math.abs(quantity);
        break;
      case 'ADJUSTMENT':
        signedQty = quantity; // Can be positive or negative
        break;
      case 'TRANSFER':
        signedQty = quantity; // Signed by caller (- for source, + for destination)
        break;
      default:
        signedQty = quantity;
    }

    // ── Determine unit cost ──
    let unitCost: number;
    if (movementType === 'PURCHASE') {
      // Purchase: use provided cost for WAC calculation
      unitCost = input.unitCost ?? 0;
    } else if (movementType === 'SALE' || movementType === 'WRITE_OFF') {
      // Sale/Write-off: stamp the current WAC as COGS
      unitCost = currentAvgCost;
    } else {
      // Adjustment/Transfer/Return: use provided or current WAC
      unitCost = input.unitCost ?? currentAvgCost;
    }

    const absQty = Math.abs(signedQty);
    const totalCost = unitCost * absQty;

    // ── Stock sufficiency check for outflows ──
    const newQty = currentQty + signedQty;
    if (newQty < 0 && movementType !== 'ADJUSTMENT') {
      // Allow adjustments to go negative (corrections), warn on others
      console.warn(
        `[StockMovement] Going negative: product=${productId}, current=${currentQty}, delta=${signedQty}`
      );
    }

    // ── WAC recalculation (on stock-in) ──
    let newAvgCost = currentAvgCost;
    let newValue = currentValue;

    if (signedQty > 0) {
      // Stock IN: weighted average = (oldValue + newValue) / (oldQty + newQty)
      const addedValue = unitCost * signedQty;
      newValue = currentValue + addedValue;
      newAvgCost = newQty > 0 ? newValue / newQty : unitCost;
    } else {
      // Stock OUT: reduce value by units * avgCost
      const removedValue = currentAvgCost * Math.abs(signedQty);
      newValue = Math.max(0, currentValue - removedValue);
      newAvgCost = newQty > 0 ? newValue / newQty : currentAvgCost;
    }

    // ── Balance after this movement ──
    const balanceAfter = newQty;

    // ── Update inventory item ──
    await tx.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: {
        quantityOnHand: new Prisma.Decimal(newQty),
        quantityAvailable: new Prisma.Decimal(
          newQty - Number(inventoryItem.quantityReserved)
        ),
        averageCost: new Prisma.Decimal(newAvgCost),
        totalValue: new Prisma.Decimal(newValue),
      },
    });

    // ── Create stock movement record ──
    const movement = await tx.stockMovement.create({
      data: {
        productId,
        movementType,
        quantity: new Prisma.Decimal(signedQty),
        unitCost: new Prisma.Decimal(unitCost),
        totalCost: new Prisma.Decimal(signedQty >= 0 ? totalCost : -totalCost),
        balanceAfter: new Prisma.Decimal(balanceAfter),
        warehouseLocation,
        branchId: branchId || null,
        warehouseId: warehouseId || null,
        performedById: performedById || null,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        referenceNumber: referenceNumber || null,
        notes: notes || null,
        movementDate,
        transactionId: transactionId || null,
        transferGroupId: transferGroupId || null,
      },
    });

    // ── Sync WarehouseStockLevel if warehouseId is provided ──
    if (warehouseId) {
      try {
        // Determine organizationId from product
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { organizationId: true },
        });
        if (product) {
          await WarehouseService.updateStockLevel(
            tx,
            product.organizationId,
            warehouseId,
            productId,
            signedQty,
            unitCost
          );
        }
      } catch (err) {
        console.warn('[StockMovement] Failed to sync warehouse stock level:', err);
      }
    }

    return {
      movement,
      inventoryItem: {
        id: inventoryItem.id,
        quantityOnHand: newQty,
        averageCost: newAvgCost,
        totalValue: newValue,
      },
      costOfGoodsSold: signedQty < 0 ? currentAvgCost * Math.abs(signedQty) : 0,
      balanceAfter,
    };
  }

  /**
   * Transfer stock between branches.
   * Creates two atomic movements: -qty from source, +qty to destination.
   * Both share a `transferGroupId` for traceability.
   */
  static async transferStock(input: TransferStockInput) {
    const {
      organizationId,
      productId,
      quantity,
      fromBranchId,
      toBranchId,
      fromWarehouseLocation = 'Main',
      toWarehouseLocation = 'Main',
      performedById,
      notes,
    } = input;

    if (quantity <= 0) throw new Error('Transfer quantity must be positive');
    if (fromBranchId === toBranchId) throw new Error('Cannot transfer to the same branch');

    const transferGroupId = `TRF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      // ── Outbound (source branch) ──
      const outbound = await this._recordMovementTx(
        tx,
        {
          organizationId,
          productId,
          movementType: 'TRANSFER',
          quantity: -Math.abs(quantity), // Negative for sending
          warehouseLocation: fromWarehouseLocation,
          branchId: fromBranchId,
          performedById,
          referenceType: 'TRANSFER',
          referenceNumber: transferGroupId,
          notes: notes || `Transfer OUT to branch`,
          movementDate: now,
        },
        transferGroupId
      );

      // ── Inbound (destination branch) ──
      const inbound = await this._recordMovementTx(
        tx,
        {
          organizationId,
          productId,
          movementType: 'TRANSFER',
          quantity: Math.abs(quantity), // Positive for receiving
          unitCost: Number(outbound.movement.unitCost), // Carry cost from source
          warehouseLocation: toWarehouseLocation,
          branchId: toBranchId,
          performedById,
          referenceType: 'TRANSFER',
          referenceNumber: transferGroupId,
          notes: notes || `Transfer IN from branch`,
          movementDate: now,
        },
        transferGroupId
      );

      return {
        transferGroupId,
        outbound: outbound.movement,
        inbound: inbound.movement,
      };
    });
  }

  /**
   * Fetch movements with rich filters, pagination, and product/branch info.
   */
  static async getMovements(filters: MovementFilters) {
    const {
      organizationId,
      productId,
      branchId,
      warehouseId,
      movementType,
      performedById,
      startDate,
      endDate,
      referenceType,
      search,
      page = 1,
      limit = 50,
    } = filters;

    const where: Prisma.StockMovementWhereInput = {
      product: { organizationId },
    };

    if (productId) where.productId = productId;
    if (branchId) where.branchId = branchId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (movementType) where.movementType = movementType;
    if (performedById) where.performedById = performedById;
    if (referenceType) where.referenceType = referenceType;

    if (startDate || endDate) {
      where.movementDate = {};
      if (startDate) where.movementDate.gte = startDate;
      if (endDate) where.movementDate.lte = endDate;
    }

    if (search) {
      where.OR = [
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { product: { sku: { contains: search, mode: 'insensitive' } } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              unitOfMeasure: { select: { abbreviation: true } },
            },
          },
          branch: { select: { id: true, name: true, code: true } },
          warehouse: { select: { id: true, name: true, code: true } },
        },
        orderBy: { movementDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return {
      movements: movements.map((m) => ({
        id: m.id,
        productId: m.productId,
        productName: m.product?.name || '',
        productSku: m.product?.sku || '',
        unitAbbreviation: m.product?.unitOfMeasure?.abbreviation || 'pcs',
        movementType: m.movementType,
        quantity: Number(m.quantity),
        unitCost: Number(m.unitCost),
        totalCost: Number(m.totalCost),
        balanceAfter: m.balanceAfter ? Number(m.balanceAfter) : null,
        warehouseLocation: m.warehouseLocation,
        branchId: m.branchId,
        branchName: m.branch?.name || null,
        branchCode: m.branch?.code || null,
        warehouseId: m.warehouseId,
        warehouseName: m.warehouse?.name || null,
        performedById: m.performedById,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        referenceNumber: m.referenceNumber,
        notes: m.notes,
        movementDate: m.movementDate,
        transferGroupId: m.transferGroupId,
        createdAt: m.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Stock Card: chronological movement history for a single product.
   */
  static async getStockCard(
    organizationId: string,
    productId: string,
    options?: {
      branchId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ) {
    const where: Prisma.StockMovementWhereInput = {
      productId,
      product: { organizationId },
    };

    if (options?.branchId) where.branchId = options.branchId;
    if (options?.startDate || options?.endDate) {
      where.movementDate = {};
      if (options?.startDate) where.movementDate.gte = options.startDate;
      if (options?.endDate) where.movementDate.lte = options.endDate;
    }

    const [product, movements, summary] = await Promise.all([
      prisma.product.findFirst({
        where: { id: productId, organizationId },
        select: {
          id: true,
          sku: true,
          name: true,
          category: true,
          purchasePrice: true,
          sellingPrice: true,
          unitOfMeasure: { select: { name: true, abbreviation: true } },
          inventoryItems: {
            select: {
              warehouseLocation: true,
              quantityOnHand: true,
              quantityAvailable: true,
              averageCost: true,
              totalValue: true,
            },
          },
        },
      }),
      prisma.stockMovement.findMany({
        where,
        include: {
          branch: { select: { name: true } },
        },
        orderBy: { movementDate: 'asc' }, // Chronological for stock card
        take: options?.limit || 500,
      }),
      // Summary aggregations
      prisma.stockMovement.groupBy({
        by: ['movementType'],
        where: { productId, product: { organizationId } },
        _sum: { quantity: true, totalCost: true },
        _count: true,
      }),
    ]);

    if (!product) throw new Error('Product not found');

    const inventory = product.inventoryItems?.[0];

    return {
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        purchasePrice: Number(product.purchasePrice),
        sellingPrice: Number(product.sellingPrice),
        unit: product.unitOfMeasure?.abbreviation || 'pcs',
      },
      currentStock: {
        quantityOnHand: inventory ? Number(inventory.quantityOnHand) : 0,
        quantityAvailable: inventory ? Number(inventory.quantityAvailable) : 0,
        averageCost: inventory ? Number(inventory.averageCost) : 0,
        totalValue: inventory ? Number(inventory.totalValue) : 0,
        warehouseLocation: inventory?.warehouseLocation || 'Main',
      },
      movements: movements.map((m) => ({
        id: m.id,
        movementDate: m.movementDate,
        movementType: m.movementType,
        quantity: Number(m.quantity),
        unitCost: Number(m.unitCost),
        totalCost: Number(m.totalCost),
        balanceAfter: m.balanceAfter ? Number(m.balanceAfter) : null,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        referenceNumber: m.referenceNumber,
        notes: m.notes,
        performedById: m.performedById,
        branchName: m.branch?.name || null,
        warehouseLocation: m.warehouseLocation,
        transferGroupId: m.transferGroupId,
      })),
      summary: summary.map((s) => ({
        movementType: s.movementType,
        totalQuantity: Number(s._sum.quantity || 0),
        totalCost: Number(s._sum.totalCost || 0),
        count: s._count,
      })),
    };
  }

  /**
   * Get movement summary stats for dashboard KPIs
   */
  static async getMovementStats(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
    branchId?: string
  ) {
    const where: Prisma.StockMovementWhereInput = {
      product: { organizationId },
    };
    if (branchId) where.branchId = branchId;
    if (startDate || endDate) {
      where.movementDate = {};
      if (startDate) where.movementDate.gte = startDate;
      if (endDate) where.movementDate.lte = endDate;
    }

    const [byType, totalCount, recentCount] = await Promise.all([
      prisma.stockMovement.groupBy({
        by: ['movementType'],
        where,
        _sum: { quantity: true, totalCost: true },
        _count: true,
      }),
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.count({
        where: {
          ...where,
          movementDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const stats: Record<string, { count: number; quantity: number; value: number }> = {};
    let totalStockIn = 0;
    let totalStockOut = 0;

    byType.forEach((g) => {
      const qty = Number(g._sum.quantity || 0);
      const val = Number(g._sum.totalCost || 0);
      stats[g.movementType] = { count: g._count, quantity: qty, value: Math.abs(val) };
      if (qty > 0) totalStockIn += qty;
      else totalStockOut += Math.abs(qty);
    });

    return {
      byType: stats,
      totalMovements: totalCount,
      recentMovements: recentCount,
      totalStockIn,
      totalStockOut,
    };
  }
}
