/**
 * Warehouse Dashboard Service
 * ════════════════════════════
 * Provides operational intelligence for the Warehouse Command Center.
 *
 * Answers three key questions:
 *  1. What needs to be shipped today?
 *  2. What is arriving that we need to offload?
 *  3. Where are we losing money (stockouts / dead stock)?
 */

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

/* ─────────── Types ─────────── */

export interface WarehouseKPIs {
  totalStockValue: number;
  totalSKUs: number;
  lowStockAlerts: number;
  pendingReceives: number;
  pendingShipments: number;
}

export interface WarehouseSummary {
  id: string;
  code: string;
  name: string;
  type: string;
  branchName?: string;
  city?: string;
  country?: string;
  stockValue: number;
  skuCount: number;
  capacityPct: number | null;
}

export interface StockByCategoryItem {
  category: string;
  value: number;
  quantity: number;
}

export interface TopMoverItem {
  productId: string;
  sku: string;
  name: string;
  category: string | null;
  totalQty: number;
  warehouseName?: string;
}

export interface DeadStockItem {
  productId: string;
  sku: string;
  name: string;
  category: string | null;
  quantityOnHand: number;
  value: number;
  lastMovementDate: Date | null;
  warehouseName: string;
}

export interface LowStockAlertItem {
  productId: string;
  sku: string;
  name: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  available: number;
  reorderLevel: number;
  deficit: number;
}

export interface RecentAdjustment {
  id: string;
  productName: string;
  productSku: string;
  movementType: string;
  quantity: number;
  notes: string | null;
  performedBy?: string;
  movementDate: Date;
  warehouseName?: string;
}

export interface PendingInboundOrder {
  id: string;
  poNumber: string;
  vendorName: string;
  expectedDate: Date | null;
  total: number;
  status: string;
  warehouseName?: string;
}

export interface PendingOutboundOrder {
  id: string;
  invoiceNumber: string;
  customerName: string;
  dueDate: Date;
  total: number;
  status: string;
  warehouseName?: string;
}

export interface WarehouseDashboardData {
  kpis: WarehouseKPIs;
  warehouses: WarehouseSummary[];
  stockByCategory: StockByCategoryItem[];
  topMovers: TopMoverItem[];
  deadStock: DeadStockItem[];
  lowStockAlerts: LowStockAlertItem[];
  recentAdjustments: RecentAdjustment[];
  pendingInbound: PendingInboundOrder[];
  pendingOutbound: PendingOutboundOrder[];
  stockDistribution: { name: string; value: number }[];
}

/* ─────────── Service ─────────── */

export class WarehouseDashboardService {
  /**
   * Get the complete dashboard payload for an organization.
   * Optionally filter by warehouseId for per-location drill-down.
   */
  static async getDashboard(
    organizationId: string,
    warehouseId?: string,
  ): Promise<WarehouseDashboardData> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const warehouseFilter = warehouseId ? { warehouseId } : {};

    // ── Parallel query batch ────────────────────────────────────────────
    const [
      warehouses,
      stockAgg,
      stockByWarehouse,
      lowStockRaw,
      pendingPOs,
      pendingInvoices,
      stockByCategory,
      topMoversRaw,
      deadStockRaw,
      recentAdjustmentsRaw,
    ] = await Promise.all([
      // 1. All active warehouses
      prisma.inventoryWarehouse.findMany({
        where: { organizationId, isActive: true },
        select: {
          id: true, code: true, name: true, type: true,
          branchId: true, branch: { select: { name: true } },
          city: true, country: true,
          capacityVolume: true, usedVolume: true,
        },
      }),

      // 2. Total stock value & SKU count
      prisma.warehouseStockLevel.aggregate({
        where: { organizationId, ...warehouseFilter },
        _sum: { totalValue: true, quantityOnHand: true },
        _count: { productId: true },
      }),

      // 3. Stock value per warehouse (for pie chart)
      prisma.warehouseStockLevel.groupBy({
        by: ['warehouseId'],
        where: { organizationId },
        _sum: { totalValue: true, quantityOnHand: true },
        _count: { productId: true },
      }),

      // 4. Low stock: items at or below reorder level
      prisma.warehouseStockLevel.findMany({
        where: {
          organizationId,
          ...warehouseFilter,
          reorderLevel: { not: null },
        },
        include: {
          product: { select: { id: true, sku: true, name: true } },
          warehouse: { select: { id: true, code: true, name: true } },
        },
      }),

      // 5. Pending Purchase Orders (inbound)
      prisma.purchaseOrder.findMany({
        where: {
          organizationId,
          status: { in: ['DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED'] },
          ...(warehouseId ? { warehouseId } : {}),
        },
        select: {
          id: true, poNumber: true, expectedDate: true, total: true, status: true,
          vendor: { select: { id: true, companyName: true, firstName: true, lastName: true } },
          warehouse: { select: { name: true } },
        },
        orderBy: { expectedDate: 'asc' },
        take: 20,
      }),

      // 6. Pending outbound (invoices not yet shipped / committed)
      prisma.invoice.findMany({
        where: {
          organizationId,
          status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID'] },
          inventoryCommitted: false,
          ...(warehouseId ? { warehouseId } : {}),
        },
        select: {
          id: true, invoiceNumber: true, dueDate: true, total: true, status: true,
          customer: { select: { companyName: true, firstName: true, lastName: true } },
          warehouse: { select: { name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),

      // 7. Stock value by product category
      (async () => {
        const levels = await prisma.warehouseStockLevel.findMany({
          where: { organizationId, ...warehouseFilter, quantityOnHand: { gt: 0 } },
          select: {
            totalValue: true,
            quantityOnHand: true,
            product: { select: { category: true } },
          },
        });
        const catMap = new Map<string, { value: number; quantity: number }>();
        for (const l of levels) {
          const cat = l.product.category || 'Uncategorized';
          const existing = catMap.get(cat) || { value: 0, quantity: 0 };
          catMap.set(cat, {
            value: existing.value + Number(l.totalValue || 0),
            quantity: existing.quantity + Number(l.quantityOnHand || 0),
          });
        }
        return Array.from(catMap.entries())
          .map(([category, data]) => ({ category, ...data }))
          .sort((a, b) => b.value - a.value);
      })(),

      // 8. Top movers (by SALE quantity in last 30 days)
      (async () => {
        const movements = await prisma.stockMovement.findMany({
          where: {
            product: { organizationId },
            movementType: 'SALE',
            movementDate: { gte: thirtyDaysAgo },
            ...(warehouseId ? { warehouseId } : {}),
          },
          select: {
            productId: true,
            quantity: true,
            product: { select: { sku: true, name: true, category: true } },
            warehouse: { select: { name: true } },
          },
        });

        const productMap = new Map<string, {
          sku: string; name: string; category: string | null; totalQty: number; warehouseName?: string;
        }>();
        for (const m of movements) {
          const existing = productMap.get(m.productId);
          const qty = Math.abs(Number(m.quantity));
          if (existing) {
            existing.totalQty += qty;
          } else {
            productMap.set(m.productId, {
              sku: m.product.sku,
              name: m.product.name,
              category: m.product.category,
              totalQty: qty,
              warehouseName: m.warehouse?.name,
            });
          }
        }

        return Array.from(productMap.entries())
          .map(([productId, data]) => ({ productId, ...data }))
          .sort((a, b) => b.totalQty - a.totalQty)
          .slice(0, 10);
      })(),

      // 9. Dead stock: items with no SALE movements in 90 days
      (async () => {
        // Get all products with stock
        const withStock = await prisma.warehouseStockLevel.findMany({
          where: {
            organizationId,
            ...warehouseFilter,
            quantityOnHand: { gt: 0 },
          },
          select: {
            productId: true,
            quantityOnHand: true,
            totalValue: true,
            lastMovementDate: true,
            product: { select: { id: true, sku: true, name: true, category: true } },
            warehouse: { select: { name: true } },
          },
        });

        // Get products that DID have sales in the last 90 days
        const recentSales = await prisma.stockMovement.findMany({
          where: {
            product: { organizationId },
            movementType: 'SALE',
            movementDate: { gte: ninetyDaysAgo },
            ...(warehouseId ? { warehouseId } : {}),
          },
          select: { productId: true },
          distinct: ['productId'],
        });
        const recentSaleIds = new Set(recentSales.map(s => s.productId));

        return withStock
          .filter(s => !recentSaleIds.has(s.productId))
          .map(s => ({
            productId: s.productId,
            sku: s.product.sku,
            name: s.product.name,
            category: s.product.category,
            quantityOnHand: Number(s.quantityOnHand),
            value: Number(s.totalValue || 0),
            lastMovementDate: s.lastMovementDate,
            warehouseName: s.warehouse.name,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 20);
      })(),

      // 10. Recent adjustments (last 15)
      prisma.stockMovement.findMany({
        where: {
          product: { organizationId },
          movementType: { in: ['ADJUSTMENT', 'WRITE_OFF'] },
          ...(warehouseId ? { warehouseId } : {}),
        },
        select: {
          id: true,
          movementType: true,
          quantity: true,
          notes: true,
          movementDate: true,
          product: { select: { sku: true, name: true } },
          warehouse: { select: { name: true } },
        },
        orderBy: { movementDate: 'desc' },
        take: 15,
      }),
    ]);

    // ── Build warehouse stock map ─────────────────────────────────────
    const stockMap = new Map(
      stockByWarehouse.map(sd => [sd.warehouseId, {
        stockValue: Number(sd._sum.totalValue || 0),
        skuCount: sd._count.productId,
      }])
    );

    // ── Low stock: filter to actually below reorder level ─────────────
    const lowStockAlerts: LowStockAlertItem[] = lowStockRaw
      .filter(a => a.reorderLevel && Number(a.quantityAvailable) <= Number(a.reorderLevel))
      .map(a => ({
        productId: a.productId,
        sku: a.product.sku,
        name: a.product.name,
        warehouseId: a.warehouseId,
        warehouseCode: a.warehouse.code,
        warehouseName: a.warehouse.name,
        available: Number(a.quantityAvailable),
        reorderLevel: Number(a.reorderLevel),
        deficit: Number(a.reorderLevel) - Number(a.quantityAvailable),
      }))
      .sort((a, b) => b.deficit - a.deficit);

    // ── Build response ────────────────────────────────────────────────
    return {
      kpis: {
        totalStockValue: Number(stockAgg._sum.totalValue || 0),
        totalSKUs: stockAgg._count.productId || 0,
        lowStockAlerts: lowStockAlerts.length,
        pendingReceives: pendingPOs.length,
        pendingShipments: pendingInvoices.length,
      },

      warehouses: warehouses.map(w => ({
        id: w.id,
        code: w.code,
        name: w.name,
        type: w.type,
        branchName: w.branch?.name,
        city: w.city ?? undefined,
        country: w.country ?? undefined,
        stockValue: stockMap.get(w.id)?.stockValue ?? 0,
        skuCount: stockMap.get(w.id)?.skuCount ?? 0,
        capacityPct: w.capacityVolume && w.usedVolume
          ? Math.min(100, Math.round((Number(w.usedVolume) / Number(w.capacityVolume)) * 100))
          : null,
      })),

      stockDistribution: warehouses
        .map(w => ({
          name: w.name,
          value: stockMap.get(w.id)?.stockValue ?? 0,
        }))
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value),

      stockByCategory,
      topMovers: topMoversRaw,

      deadStock: deadStockRaw,

      lowStockAlerts,

      recentAdjustments: recentAdjustmentsRaw.map(a => ({
        id: a.id,
        productName: a.product.name,
        productSku: a.product.sku,
        movementType: a.movementType,
        quantity: Number(a.quantity),
        notes: a.notes,
        movementDate: a.movementDate,
        warehouseName: a.warehouse?.name,
      })),

      pendingInbound: pendingPOs.map(po => ({
        id: po.id,
        poNumber: po.poNumber,
        vendorName: (po.vendor as any).companyName || `${(po.vendor as any).firstName} ${(po.vendor as any).lastName}`,
        expectedDate: po.expectedDate,
        total: Number(po.total),
        status: po.status,
        warehouseName: po.warehouse?.name,
      })),

      pendingOutbound: pendingInvoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer.companyName || `${inv.customer.firstName} ${inv.customer.lastName}`,
        dueDate: inv.dueDate,
        total: Number(inv.total),
        status: inv.status,
        warehouseName: inv.warehouse?.name,
      })),
    };
  }
}
