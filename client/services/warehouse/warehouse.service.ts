/**
 * Warehouse Service
 * ─────────────────
 * Comprehensive warehouse management: CRUD, stock levels per warehouse,
 * inter-warehouse transfers, stock validation, and capacity tracking.
 *
 * Every inventory movement MUST include a warehouseId for accurate
 * per-location stock ledger tracking.
 */

import { Prisma, MovementType, WarehouseType, TransferOrderStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { StockMovementService } from '@/services/inventory/stock-movement.service';

/* ─────────── Types ─────────── */

export interface CreateWarehouseInput {
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  type?: WarehouseType;
  branchId?: string;
  isDefault?: boolean;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  managerId?: string;
  capacityVolume?: number;
  capacityWeight?: number;
}

export interface UpdateWarehouseInput {
  name?: string;
  code?: string;
  description?: string;
  type?: WarehouseType;
  branchId?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  managerId?: string | null;
  capacityVolume?: number | null;
  capacityWeight?: number | null;
}

export interface WarehouseTransferInput {
  organizationId: string;
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  performedById?: string;
  notes?: string;
  referenceNumber?: string;
}

export interface WarehouseStockQuery {
  organizationId: string;
  warehouseId: string;
  productId?: string;
  search?: string;
  belowReorder?: boolean;
  page?: number;
  limit?: number;
}

export interface WarehouseListFilters {
  organizationId: string;
  branchId?: string;
  type?: WarehouseType;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface StockAvailabilityCheck {
  organizationId: string;
  warehouseId: string;
  productId: string;
  requestedQty: number;
}

/* ─────────── Service ─────────── */

export class WarehouseService {
  // ═══════════════════════════════════
  //  CRUD Operations
  // ═══════════════════════════════════

  /**
   * List warehouses with optional filters
   */
  static async list(filters: WarehouseListFilters) {
    const {
      organizationId,
      branchId,
      type,
      isActive,
      search,
      page = 1,
      limit = 50,
    } = filters;

    const where: Prisma.InventoryWarehouseWhereInput = {
      organizationId,
      ...(branchId && { branchId }),
      ...(type && { type }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } },
          { address: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [warehouses, total] = await Promise.all([
      prisma.inventoryWarehouse.findMany({
        where,
        include: {
          branch: { select: { id: true, code: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: {
            select: {
              bins: true,
              stockLevels: true,
              stockMovements: true,
            },
          },
        },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inventoryWarehouse.count({ where }),
    ]);

    // Compute stock value per warehouse
    const warehouseIds = warehouses.map(w => w.id);
    const stockValues = await prisma.warehouseStockLevel.groupBy({
      by: ['warehouseId'],
      where: {
        warehouseId: { in: warehouseIds },
        organizationId,
      },
      _sum: { totalValue: true },
      _count: { productId: true },
    });

    const valueMap = new Map(
      stockValues.map(sv => [sv.warehouseId, {
        totalValue: Number(sv._sum.totalValue || 0),
        productCount: sv._count.productId,
      }])
    );

    const data = warehouses.map(w => ({
      id: w.id,
      code: w.code,
      name: w.name,
      description: w.description,
      type: w.type,
      isDefault: w.isDefault,
      isActive: w.isActive,
      address: w.address,
      city: w.city,
      country: w.country,
      phone: w.phone,
      email: w.email,
      branchId: w.branchId,
      branchCode: w.branch?.code,
      branchName: w.branch?.name,
      managerId: w.managerId,
      managerName: w.manager ? `${w.manager.firstName} ${w.manager.lastName}` : null,
      managerEmail: w.manager?.email,
      capacityVolume: w.capacityVolume ? Number(w.capacityVolume) : null,
      capacityWeight: w.capacityWeight ? Number(w.capacityWeight) : null,
      usedVolume: w.usedVolume ? Number(w.usedVolume) : null,
      usedWeight: w.usedWeight ? Number(w.usedWeight) : null,
      capacityPct: w.capacityVolume && w.usedVolume
        ? Math.min(100, Math.round((Number(w.usedVolume) / Number(w.capacityVolume)) * 100))
        : null,
      bins: w._count.bins,
      stockLevels: w._count.stockLevels,
      movementCount: w._count.stockMovements,
      stockValue: valueMap.get(w.id)?.totalValue ?? 0,
      productCount: valueMap.get(w.id)?.productCount ?? 0,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));

    return { data, total, page, limit };
  }

  /**
   * Get a single warehouse with full details
   */
  static async getById(organizationId: string, warehouseId: string) {
    const warehouse = await prisma.inventoryWarehouse.findFirst({
      where: { id: warehouseId, organizationId },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        bins: {
          orderBy: { code: 'asc' },
          take: 100,
        },
      },
    });

    if (!warehouse) return null;

    // Get recent movements + stock summary
    const [recentMovements, stockSummary, totalValue] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { warehouseId },
        include: {
          product: { select: { id: true, sku: true, name: true } },
        },
        orderBy: { movementDate: 'desc' },
        take: 20,
      }),
      prisma.warehouseStockLevel.findMany({
        where: { warehouseId, organizationId },
        include: {
          product: { select: { id: true, sku: true, name: true, category: true } },
        },
        orderBy: { totalValue: 'desc' },
        take: 50,
      }),
      prisma.warehouseStockLevel.aggregate({
        where: { warehouseId, organizationId },
        _sum: { totalValue: true, quantityOnHand: true },
        _count: { productId: true },
      }),
    ]);

    return {
      ...warehouse,
      capacityVolume: warehouse.capacityVolume ? Number(warehouse.capacityVolume) : null,
      capacityWeight: warehouse.capacityWeight ? Number(warehouse.capacityWeight) : null,
      usedVolume: warehouse.usedVolume ? Number(warehouse.usedVolume) : null,
      usedWeight: warehouse.usedWeight ? Number(warehouse.usedWeight) : null,
      recentMovements: recentMovements.map(m => ({
        id: m.id,
        productId: m.productId,
        productSku: m.product.sku,
        productName: m.product.name,
        movementType: m.movementType,
        quantity: Number(m.quantity),
        unitCost: Number(m.unitCost),
        totalCost: Number(m.totalCost),
        balanceAfter: m.balanceAfter ? Number(m.balanceAfter) : null,
        referenceType: m.referenceType,
        referenceNumber: m.referenceNumber,
        notes: m.notes,
        movementDate: m.movementDate,
      })),
      stockLevels: stockSummary.map(sl => ({
        id: sl.id,
        productId: sl.productId,
        productSku: sl.product.sku,
        productName: sl.product.name,
        productCategory: sl.product.category,
        quantityOnHand: Number(sl.quantityOnHand),
        quantityReserved: Number(sl.quantityReserved),
        quantityAvailable: Number(sl.quantityAvailable),
        averageCost: Number(sl.averageCost),
        totalValue: Number(sl.totalValue),
        reorderLevel: sl.reorderLevel ? Number(sl.reorderLevel) : null,
        belowReorder: sl.reorderLevel ? Number(sl.quantityAvailable) < Number(sl.reorderLevel) : false,
        lastMovementDate: sl.lastMovementDate,
      })),
      totalStockValue: Number(totalValue._sum.totalValue || 0),
      totalQuantity: Number(totalValue._sum.quantityOnHand || 0),
      totalProducts: totalValue._count.productId,
    };
  }

  /**
   * Create a new warehouse
   */
  static async create(input: CreateWarehouseInput) {
    return prisma.$transaction(async (tx) => {
      // If setting as default, clear existing defaults for the org (or branch)
      if (input.isDefault) {
        const updateWhere: Prisma.InventoryWarehouseUpdateManyMutationInput = { isDefault: false };
        await tx.inventoryWarehouse.updateMany({
          where: {
            organizationId: input.organizationId,
            isDefault: true,
            ...(input.branchId && { branchId: input.branchId }),
          },
          data: updateWhere,
        });
      }

      const warehouse = await tx.inventoryWarehouse.create({
        data: {
          organizationId: input.organizationId,
          code: input.code,
          name: input.name,
          description: input.description,
          type: input.type || 'GENERAL',
          branchId: input.branchId,
          isDefault: input.isDefault ?? false,
          address: input.address,
          city: input.city,
          country: input.country,
          phone: input.phone,
          email: input.email,
          managerId: input.managerId,
          capacityVolume: input.capacityVolume,
          capacityWeight: input.capacityWeight,
        },
        include: {
          branch: { select: { id: true, code: true, name: true } },
        },
      });

      return warehouse;
    });
  }

  /**
   * Update a warehouse
   */
  static async update(organizationId: string, warehouseId: string, input: UpdateWarehouseInput) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryWarehouse.findFirst({
        where: { id: warehouseId, organizationId },
      });

      if (!existing) throw new Error('Warehouse not found');

      // If setting as default, clear existing defaults
      if (input.isDefault && !existing.isDefault) {
        await tx.inventoryWarehouse.updateMany({
          where: {
            organizationId,
            isDefault: true,
            id: { not: warehouseId },
            ...(existing.branchId && { branchId: existing.branchId }),
          },
          data: { isDefault: false },
        });
      }

      return tx.inventoryWarehouse.update({
        where: { id: warehouseId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.code !== undefined && { code: input.code }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.type !== undefined && { type: input.type }),
          ...(input.branchId !== undefined && { branchId: input.branchId }),
          ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.address !== undefined && { address: input.address }),
          ...(input.city !== undefined && { city: input.city }),
          ...(input.country !== undefined && { country: input.country }),
          ...(input.phone !== undefined && { phone: input.phone }),
          ...(input.email !== undefined && { email: input.email }),
          ...(input.managerId !== undefined && { managerId: input.managerId }),
          ...(input.capacityVolume !== undefined && { capacityVolume: input.capacityVolume }),
          ...(input.capacityWeight !== undefined && { capacityWeight: input.capacityWeight }),
        },
        include: {
          branch: { select: { id: true, code: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });
    });
  }

  /**
   * Toggle default warehouse for a branch
   */
  static async setDefault(organizationId: string, warehouseId: string) {
    return prisma.$transaction(async (tx) => {
      const warehouse = await tx.inventoryWarehouse.findFirst({
        where: { id: warehouseId, organizationId },
      });
      if (!warehouse) throw new Error('Warehouse not found');

      // Clear existing defaults in same branch
      await tx.inventoryWarehouse.updateMany({
        where: {
          organizationId,
          isDefault: true,
          ...(warehouse.branchId && { branchId: warehouse.branchId }),
        },
        data: { isDefault: false },
      });

      return tx.inventoryWarehouse.update({
        where: { id: warehouseId },
        data: { isDefault: true },
      });
    });
  }

  // ═══════════════════════════════════
  //  Stock Level Management
  // ═══════════════════════════════════

  /**
   * Get stock levels for a warehouse
   */
  static async getStockLevels(query: WarehouseStockQuery) {
    const {
      organizationId,
      warehouseId,
      productId,
      search,
      belowReorder,
      page = 1,
      limit = 50,
    } = query;

    const where: Prisma.WarehouseStockLevelWhereInput = {
      organizationId,
      warehouseId,
      ...(productId && { productId }),
      ...(belowReorder && {
        reorderLevel: { not: null },
        quantityAvailable: { lt: prisma.warehouseStockLevel.fields?.reorderLevel as any },
      }),
      ...(search && {
        product: {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { sku: { contains: search, mode: 'insensitive' as const } },
          ],
        },
      }),
    };

    const [levels, total] = await Promise.all([
      prisma.warehouseStockLevel.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              category: true,
              unitOfMeasure: { select: { abbreviation: true } },
              sellingPrice: true,
              purchasePrice: true,
            },
          },
        },
        orderBy: { product: { name: 'asc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.warehouseStockLevel.count({ where }),
    ]);

    return {
      data: levels.map(sl => ({
        id: sl.id,
        productId: sl.productId,
        productSku: sl.product.sku,
        productName: sl.product.name,
        productCategory: sl.product.category,
        unitAbbreviation: sl.product.unitOfMeasure?.abbreviation || 'ea',
        quantityOnHand: Number(sl.quantityOnHand),
        quantityReserved: Number(sl.quantityReserved),
        quantityAvailable: Number(sl.quantityAvailable),
        averageCost: Number(sl.averageCost),
        totalValue: Number(sl.totalValue),
        sellingPrice: Number(sl.product.sellingPrice),
        reorderLevel: sl.reorderLevel ? Number(sl.reorderLevel) : null,
        maxStockLevel: sl.maxStockLevel ? Number(sl.maxStockLevel) : null,
        belowReorder: sl.reorderLevel
          ? Number(sl.quantityAvailable) < Number(sl.reorderLevel)
          : false,
        lastMovementDate: sl.lastMovementDate,
        lastCountDate: sl.lastCountDate,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Update warehouse stock level (called after every movement).
   * Uses upsert to create or update the stock level.
   */
  static async updateStockLevel(
    tx: Prisma.TransactionClient,
    organizationId: string,
    warehouseId: string,
    productId: string,
    quantityDelta: number,
    unitCost: number
  ) {
    const existing = await tx.warehouseStockLevel.findUnique({
      where: { warehouseId_productId: { warehouseId, productId } },
    });

    if (existing) {
      const oldQty = Number(existing.quantityOnHand);
      const oldAvgCost = Number(existing.averageCost);
      const oldValue = Number(existing.totalValue);
      const newQty = oldQty + quantityDelta;

      // Recalculate WAC
      let newAvgCost = oldAvgCost;
      let newValue = oldValue;

      if (quantityDelta > 0) {
        // Stock IN: WAC = (old value + new value) / (old qty + new qty)
        const addedValue = unitCost * quantityDelta;
        newValue = oldValue + addedValue;
        newAvgCost = newQty > 0 ? newValue / newQty : unitCost;
      } else {
        // Stock OUT: reduce value at current WAC
        const removedValue = oldAvgCost * Math.abs(quantityDelta);
        newValue = Math.max(0, oldValue - removedValue);
        newAvgCost = newQty > 0 ? newValue / newQty : oldAvgCost;
      }

      return tx.warehouseStockLevel.update({
        where: { warehouseId_productId: { warehouseId, productId } },
        data: {
          quantityOnHand: new Prisma.Decimal(newQty),
          quantityAvailable: new Prisma.Decimal(
            newQty - Number(existing.quantityReserved)
          ),
          averageCost: new Prisma.Decimal(newAvgCost),
          totalValue: new Prisma.Decimal(newValue),
          lastMovementDate: new Date(),
        },
      });
    } else {
      // No existing record - create one
      const absQty = Math.abs(quantityDelta);
      return tx.warehouseStockLevel.create({
        data: {
          organizationId,
          warehouseId,
          productId,
          quantityOnHand: new Prisma.Decimal(quantityDelta),
          quantityReserved: 0,
          quantityAvailable: new Prisma.Decimal(quantityDelta),
          averageCost: new Prisma.Decimal(unitCost),
          totalValue: new Prisma.Decimal(unitCost * absQty),
          lastMovementDate: new Date(),
        },
      });
    }
  }

  // ═══════════════════════════════════
  //  Stock Validation & Reservation
  // ═══════════════════════════════════

  /**
   * Check if stock is available in a specific warehouse.
   * Returns { available, onHand, reserved, sufficient }
   */
  static async checkAvailability(check: StockAvailabilityCheck) {
    const { organizationId, warehouseId, productId, requestedQty } = check;

    const stockLevel = await prisma.warehouseStockLevel.findUnique({
      where: { warehouseId_productId: { warehouseId, productId } },
    });

    if (!stockLevel) {
      return {
        available: 0,
        onHand: 0,
        reserved: 0,
        sufficient: false,
        shortfall: requestedQty,
      };
    }

    const available = Number(stockLevel.quantityAvailable);
    return {
      available,
      onHand: Number(stockLevel.quantityOnHand),
      reserved: Number(stockLevel.quantityReserved),
      sufficient: available >= requestedQty,
      shortfall: Math.max(0, requestedQty - available),
    };
  }

  /**
   * Reserve stock in a warehouse (e.g., when creating a sales order).
   */
  static async reserveStock(
    tx: Prisma.TransactionClient,
    organizationId: string,
    warehouseId: string,
    productId: string,
    quantity: number,
    referenceType: string,
    referenceId: string
  ) {
    // Update stock level
    const stockLevel = await tx.warehouseStockLevel.findUnique({
      where: { warehouseId_productId: { warehouseId, productId } },
    });

    if (!stockLevel) {
      throw new Error(`No stock record found for product in warehouse`);
    }

    const available = Number(stockLevel.quantityAvailable);
    if (available < quantity) {
      throw new Error(
        `Insufficient stock. Available: ${available}, Requested: ${quantity}`
      );
    }

    // Update reserved/available
    await tx.warehouseStockLevel.update({
      where: { warehouseId_productId: { warehouseId, productId } },
      data: {
        quantityReserved: { increment: quantity },
        quantityAvailable: { decrement: quantity },
      },
    });

    // Create reservation record
    return tx.stockReservation.create({
      data: {
        organizationId,
        productId,
        warehouseId,
        quantity,
        reservationType: referenceType,
        referenceId,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Release a stock reservation (e.g., when cancelling an order).
   */
  static async releaseReservation(
    tx: Prisma.TransactionClient,
    reservationId: string
  ) {
    const reservation = await tx.stockReservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation || reservation.status !== 'ACTIVE') return;

    const warehouseId = reservation.warehouseId;
    if (!warehouseId) return;

    await tx.warehouseStockLevel.update({
      where: {
        warehouseId_productId: {
          warehouseId,
          productId: reservation.productId,
        },
      },
      data: {
        quantityReserved: { decrement: Number(reservation.quantity) },
        quantityAvailable: { increment: Number(reservation.quantity) },
      },
    });

    await tx.stockReservation.update({
      where: { id: reservationId },
      data: { status: 'CANCELLED' },
    });
  }

  // ═══════════════════════════════════
  //  Inter-Warehouse Transfers
  // ═══════════════════════════════════

  /**
   * Transfer stock between warehouses.
   * This is a NON-accounting movement unless the warehouses belong to different branches.
   * Creates paired stock movements and updates stock levels atomically.
   */
  static async warehouseTransfer(input: WarehouseTransferInput) {
    const {
      organizationId,
      productId,
      fromWarehouseId,
      toWarehouseId,
      quantity,
      performedById,
      notes,
      referenceNumber,
    } = input;

    if (quantity <= 0) throw new Error('Transfer quantity must be positive');
    if (fromWarehouseId === toWarehouseId) {
      throw new Error('Source and destination warehouse cannot be the same');
    }

    const transferGroupId = `WH-TRF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      // Validate warehouses
      const [fromWarehouse, toWarehouse, product] = await Promise.all([
        tx.inventoryWarehouse.findFirst({
          where: { id: fromWarehouseId, organizationId },
          include: { branch: true },
        }),
        tx.inventoryWarehouse.findFirst({
          where: { id: toWarehouseId, organizationId },
          include: { branch: true },
        }),
        tx.product.findFirst({
          where: { id: productId, organizationId },
          select: { id: true, sku: true, name: true },
        }),
      ]);

      if (!fromWarehouse) throw new Error('Source warehouse not found');
      if (!toWarehouse) throw new Error('Destination warehouse not found');
      if (!product) throw new Error('Product not found');

      // Check availability in source warehouse
      const sourceLevel = await tx.warehouseStockLevel.findUnique({
        where: { warehouseId_productId: { warehouseId: fromWarehouseId, productId } },
      });

      const sourceAvailable = sourceLevel ? Number(sourceLevel.quantityAvailable) : 0;
      if (sourceAvailable < quantity) {
        throw new Error(
          `Insufficient stock in ${fromWarehouse.code}. Available: ${sourceAvailable}, Requested: ${quantity}`
        );
      }

      const unitCost = sourceLevel ? Number(sourceLevel.averageCost) : 0;

      // ── Deduct from source ──
      await this.updateStockLevel(tx, organizationId, fromWarehouseId, productId, -quantity, unitCost);

      // ── Add to destination ──
      await this.updateStockLevel(tx, organizationId, toWarehouseId, productId, quantity, unitCost);

      // ── Record outbound movement ──
      const outMovement = await tx.stockMovement.create({
        data: {
          productId,
          movementType: 'TRANSFER',
          quantity: new Prisma.Decimal(-quantity),
          unitCost: new Prisma.Decimal(unitCost),
          totalCost: new Prisma.Decimal(-(unitCost * quantity)),
          warehouseLocation: fromWarehouse.name,
          branchId: fromWarehouse.branchId,
          warehouseId: fromWarehouseId,
          performedById,
          referenceType: 'WAREHOUSE_TRANSFER',
          referenceNumber: referenceNumber || transferGroupId,
          notes: notes || `Transfer OUT to ${toWarehouse.code}`,
          movementDate: now,
          transferGroupId,
        },
      });

      // ── Record inbound movement ──
      const inMovement = await tx.stockMovement.create({
        data: {
          productId,
          movementType: 'TRANSFER',
          quantity: new Prisma.Decimal(quantity),
          unitCost: new Prisma.Decimal(unitCost),
          totalCost: new Prisma.Decimal(unitCost * quantity),
          warehouseLocation: toWarehouse.name,
          branchId: toWarehouse.branchId,
          warehouseId: toWarehouseId,
          performedById,
          referenceType: 'WAREHOUSE_TRANSFER',
          referenceNumber: referenceNumber || transferGroupId,
          notes: notes || `Transfer IN from ${fromWarehouse.code}`,
          movementDate: now,
          transferGroupId,
        },
      });

      // Determine if this is cross-branch (requires accounting)
      const isCrossBranch =
        fromWarehouse.branchId &&
        toWarehouse.branchId &&
        fromWarehouse.branchId !== toWarehouse.branchId;

      return {
        transferGroupId,
        outMovement,
        inMovement,
        isCrossBranch,
        fromWarehouse: { id: fromWarehouse.id, code: fromWarehouse.code, name: fromWarehouse.name },
        toWarehouse: { id: toWarehouse.id, code: toWarehouse.code, name: toWarehouse.name },
        product: { id: product.id, sku: product.sku, name: product.name },
        quantity,
        unitCost,
        totalValue: unitCost * quantity,
      };
    });
  }

  // ═══════════════════════════════════
  //  Dashboard & Analytics
  // ═══════════════════════════════════

  /**
   * Get stock distribution across all warehouses
   */
  static async getStockDistribution(organizationId: string) {
    const warehouses = await prisma.inventoryWarehouse.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        branchId: true,
        branch: { select: { name: true } },
        address: true,
        city: true,
        country: true,
        capacityVolume: true,
        usedVolume: true,
      },
    });

    const stockData = await prisma.warehouseStockLevel.groupBy({
      by: ['warehouseId'],
      where: { organizationId },
      _sum: {
        totalValue: true,
        quantityOnHand: true,
      },
      _count: { productId: true },
    });

    const stockMap = new Map(
      stockData.map(sd => [sd.warehouseId, {
        totalValue: Number(sd._sum.totalValue || 0),
        totalQuantity: Number(sd._sum.quantityOnHand || 0),
        productCount: sd._count.productId,
      }])
    );

    // Low stock alerts
    const lowStockAlerts = await prisma.warehouseStockLevel.findMany({
      where: {
        organizationId,
        reorderLevel: { not: null },
        quantityAvailable: { lte: 0 }, // We'll filter in JS for proper comparison
      },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
      },
      take: 50,
    });

    // Filter to actually below reorder level
    const actualLowStock = lowStockAlerts.filter(
      a => a.reorderLevel && Number(a.quantityAvailable) < Number(a.reorderLevel)
    );

    return {
      warehouses: warehouses.map(w => ({
        id: w.id,
        code: w.code,
        name: w.name,
        type: w.type,
        branchName: w.branch?.name,
        address: w.address,
        city: w.city,
        country: w.country,
        capacityPct: w.capacityVolume && w.usedVolume
          ? Math.min(100, Math.round((Number(w.usedVolume) / Number(w.capacityVolume)) * 100))
          : null,
        ...(stockMap.get(w.id) || { totalValue: 0, totalQuantity: 0, productCount: 0 }),
      })),
      totalValue: Array.from(stockMap.values()).reduce((sum, v) => sum + v.totalValue, 0),
      totalWarehouses: warehouses.length,
      lowStockAlerts: actualLowStock.map(a => ({
        productId: a.productId,
        productSku: a.product.sku,
        productName: a.product.name,
        warehouseId: a.warehouseId,
        warehouseCode: a.warehouse.code,
        warehouseName: a.warehouse.name,
        available: Number(a.quantityAvailable),
        reorderLevel: Number(a.reorderLevel),
      })),
    };
  }

  /**
   * Get stock for a specific product across all warehouses
   */
  static async getProductStockAcrossWarehouses(organizationId: string, productId: string) {
    const levels = await prisma.warehouseStockLevel.findMany({
      where: { organizationId, productId },
      include: {
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            branchId: true,
            branch: { select: { name: true } },
          },
        },
      },
      orderBy: { warehouse: { name: 'asc' } },
    });

    return levels.map(l => ({
      warehouseId: l.warehouseId,
      warehouseCode: l.warehouse.code,
      warehouseName: l.warehouse.name,
      warehouseType: l.warehouse.type,
      branchName: l.warehouse.branch?.name,
      quantityOnHand: Number(l.quantityOnHand),
      quantityReserved: Number(l.quantityReserved),
      quantityAvailable: Number(l.quantityAvailable),
      averageCost: Number(l.averageCost),
      totalValue: Number(l.totalValue),
    }));
  }

  /**
   * Get the default warehouse for a branch (or org if no branch specified)
   */
  static async getDefaultWarehouse(organizationId: string, branchId?: string) {
    return prisma.inventoryWarehouse.findFirst({
      where: {
        organizationId,
        isDefault: true,
        isActive: true,
        ...(branchId && { branchId }),
      },
      select: { id: true, code: true, name: true, branchId: true },
    });
  }
}
