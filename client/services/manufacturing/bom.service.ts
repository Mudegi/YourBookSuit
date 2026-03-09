/**
 * Bill of Materials (BOM) Service
 * ════════════════════════════════
 * Core service for BOM management and costing.
 *
 * Provides:
 *  - Standard cost calculation (material + scrap)
 *  - Multi-level BOM tree resolution (nested BOMs)
 *  - Circular reference detection
 *  - Version management
 */

import Decimal from 'decimal.js';
import prisma from '@/lib/prisma';

/* ─────────── Types ─────────── */

export interface BOMTreeNode {
  bomLineId: string | null;
  productId: string;
  sku: string;
  name: string;
  unitOfMeasure: string | null;
  quantityPer: number;
  scrapPercent: number;
  effectiveQty: number; // quantityPer * (1 + scrapPercent/100)
  unitCost: number;
  extendedCost: number; // effectiveQty * unitCost
  isSubAssembly: boolean;
  depth: number;
  children: BOMTreeNode[];
}

export interface BOMCostBreakdown {
  bomId: string;
  bomName: string;
  version: string;
  finishedProductId: string;
  finishedProductSku: string;
  finishedProductName: string;
  totalMaterialCost: number;
  scrapAllowanceCost: number;
  standardCost: number;
  tree: BOMTreeNode[];
  calculatedAt: string;
}

export interface BOMListItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  productCategory: string | null;
  name: string;
  version: string;
  status: string;
  isDefault: boolean;
  yieldPercent: number;
  scrapPercent: number;
  componentCount: number;
  estimatedCost: number | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ─────────── Service ─────────── */

export class BOMService {

  /**
   * List all BOMs for an organization, enriched with component counts and estimated cost.
   */
  static async listBOMs(organizationId: string): Promise<BOMListItem[]> {
    const boms = await prisma.billOfMaterial.findMany({
      where: { organizationId },
      include: {
        product: {
          select: { id: true, sku: true, name: true, category: true },
        },
        lines: {
          include: {
            component: {
              select: { id: true, sku: true, name: true },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    // Batch-load current average costs for all components
    const allComponentIds = [...new Set(boms.flatMap(b => b.lines.map(l => l.componentId)))];
    const costMap = await BOMService.getAverageCosts(allComponentIds);

    return boms.map(bom => {
      // Quick inline cost estimate
      let estimatedCost: number | null = null;
      try {
        let total = new Decimal(0);
        for (const line of bom.lines) {
          const unitCost = costMap.get(line.componentId) ?? new Decimal(0);
          const effectiveQty = new Decimal(line.quantityPer).mul(
            new Decimal(1).plus(new Decimal(line.scrapPercent).div(100))
          );
          total = total.plus(effectiveQty.mul(unitCost));
        }
        estimatedCost = total.toNumber();
      } catch { /* skip if cost calc fails */ }

      return {
        id: bom.id,
        productId: bom.productId,
        productSku: bom.product.sku,
        productName: bom.product.name,
        productCategory: bom.product.category,
        name: bom.name,
        version: bom.version,
        status: bom.status,
        isDefault: bom.isDefault,
        yieldPercent: Number(bom.yieldPercent),
        scrapPercent: Number(bom.scrapPercent),
        componentCount: bom.lines.length,
        estimatedCost,
        effectiveFrom: bom.effectiveFrom?.toISOString() ?? null,
        effectiveTo: bom.effectiveTo?.toISOString() ?? null,
        createdAt: bom.createdAt.toISOString(),
        updatedAt: bom.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Calculate the full standard cost of a BOM, resolving nested sub-BOMs.
   * Returns a tree structure showing every level of the recipe.
   */
  static async calculateBOMCost(bomId: string, organizationId: string): Promise<BOMCostBreakdown> {
    const bom = await prisma.billOfMaterial.findFirst({
      where: { id: bomId, organizationId },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        lines: {
          include: {
            component: {
              select: {
                id: true,
                sku: true,
                name: true,
                unitOfMeasure: { select: { abbreviation: true } },
              },
            },
          },
          orderBy: { operationSeq: 'asc' },
        },
      },
    });

    if (!bom) throw new Error('BOM not found');

    // Collect all product IDs we might need costs for
    const allProductIds = bom.lines.map(l => l.componentId);
    const costMap = await BOMService.getAverageCosts(allProductIds);

    // Resolve nested BOMs  
    const visited = new Set<string>([bom.productId]); // prevent circular refs
    const tree = await BOMService.resolveTree(bom.lines, costMap, organizationId, visited, 0);

    let totalMaterialCost = new Decimal(0);
    let scrapAllowanceCost = new Decimal(0);

    function sumCosts(nodes: BOMTreeNode[]) {
      for (const node of nodes) {
        if (node.children.length > 0) {
          sumCosts(node.children);
        } else {
          const baseCost = new Decimal(node.quantityPer).mul(node.unitCost);
          const withScrap = new Decimal(node.effectiveQty).mul(node.unitCost);
          totalMaterialCost = totalMaterialCost.plus(baseCost);
          scrapAllowanceCost = scrapAllowanceCost.plus(withScrap.minus(baseCost));
        }
      }
    }
    sumCosts(tree);

    const standardCost = totalMaterialCost.plus(scrapAllowanceCost);

    return {
      bomId: bom.id,
      bomName: bom.name,
      version: bom.version,
      finishedProductId: bom.productId,
      finishedProductSku: bom.product.sku,
      finishedProductName: bom.product.name,
      totalMaterialCost: totalMaterialCost.toDecimalPlaces(4).toNumber(),
      scrapAllowanceCost: scrapAllowanceCost.toDecimalPlaces(4).toNumber(),
      standardCost: standardCost.toDecimalPlaces(4).toNumber(),
      tree,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Detect circular references before saving a BOM.
   * Returns the cycle path if one is found, or null if safe.
   */
  static async detectCircularReference(
    finishedProductId: string,
    componentIds: string[],
    organizationId: string
  ): Promise<string[] | null> {
    // If the finished product is in its own component list, that's immediate circular
    if (componentIds.includes(finishedProductId)) {
      return [finishedProductId, finishedProductId];
    }

    // Check if any component has a BOM that eventually references finishedProductId
    const queue = [...componentIds];
    const visited = new Set<string>([finishedProductId]);
    const parentMap = new Map<string, string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) {
        // Build the cycle path
        const path = [current];
        let p = current;
        while (parentMap.has(p) && p !== finishedProductId) {
          p = parentMap.get(p)!;
          path.unshift(p);
        }
        path.unshift(finishedProductId);
        return path;
      }
      visited.add(current);

      // Find active BOMs where this component is the finished product
      const subBoms = await prisma.billOfMaterial.findMany({
        where: {
          organizationId,
          productId: current,
          status: 'ACTIVE',
        },
        include: {
          lines: { select: { componentId: true } },
        },
      });

      for (const subBom of subBoms) {
        for (const line of subBom.lines) {
          if (!visited.has(line.componentId)) {
            parentMap.set(line.componentId, current);
            queue.push(line.componentId);
          }
        }
      }
    }

    return null;
  }

  /**
   * Get a single BOM with full details for the builder UI.
   */
  static async getBOM(bomId: string, organizationId: string) {
    const bom = await prisma.billOfMaterial.findFirst({
      where: { id: bomId, organizationId },
      include: {
        product: {
          select: {
            id: true, sku: true, name: true, category: true,
            unitOfMeasure: { select: { id: true, code: true, abbreviation: true } },
          },
        },
        lines: {
          include: {
            component: {
              select: {
                id: true, sku: true, name: true, category: true,
                unitOfMeasure: { select: { id: true, code: true, abbreviation: true } },
              },
            },
          },
          orderBy: { operationSeq: 'asc' },
        },
      },
    });

    if (!bom) return null;

    const componentIds = bom.lines.map(l => l.componentId);
    const costMap = await BOMService.getAverageCosts(componentIds);

    return {
      id: bom.id,
      productId: bom.productId,
      productSku: bom.product.sku,
      productName: bom.product.name,
      productCategory: bom.product.category,
      productUOM: bom.product.unitOfMeasure?.abbreviation ?? null,
      name: bom.name,
      version: bom.version,
      status: bom.status,
      isDefault: bom.isDefault,
      revisionNotes: bom.revisionNotes,
      yieldPercent: Number(bom.yieldPercent),
      scrapPercent: Number(bom.scrapPercent),
      effectiveFrom: bom.effectiveFrom?.toISOString() ?? null,
      effectiveTo: bom.effectiveTo?.toISOString() ?? null,
      lines: bom.lines.map(line => {
        const cost = costMap.get(line.componentId) ?? new Decimal(0);
        const effQty = new Decimal(line.quantityPer).mul(
          new Decimal(1).plus(new Decimal(line.scrapPercent).div(100))
        );
        return {
          id: line.id,
          componentId: line.componentId,
          componentSku: line.component.sku,
          componentName: line.component.name,
          componentCategory: line.component.category,
          componentUOM: line.component.unitOfMeasure?.abbreviation ?? null,
          quantityPer: Number(line.quantityPer),
          scrapPercent: Number(line.scrapPercent),
          effectiveQty: effQty.toDecimalPlaces(4).toNumber(),
          unitCost: cost.toDecimalPlaces(4).toNumber(),
          extendedCost: effQty.mul(cost).toDecimalPlaces(4).toNumber(),
          backflush: line.backflush,
          operationSeq: line.operationSeq,
        };
      }),
      createdAt: bom.createdAt.toISOString(),
      updatedAt: bom.updatedAt.toISOString(),
    };
  }

  /**
   * Update a BOM — replaces all lines.
   */
  static async updateBOM(
    bomId: string,
    organizationId: string,
    data: {
      name?: string;
      version?: string;
      status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
      isDefault?: boolean;
      revisionNotes?: string;
      yieldPercent?: number;
      scrapPercent?: number;
      lines?: Array<{
        componentId: string;
        quantityPer: number;
        scrapPercent?: number;
        backflush?: boolean;
        operationSeq?: number;
      }>;
    }
  ) {
    const existing = await prisma.billOfMaterial.findFirst({
      where: { id: bomId, organizationId },
    });
    if (!existing) throw new Error('BOM not found');

    // If activating, run circular reference check
    if (data.status === 'ACTIVE' && data.lines) {
      const componentIds = data.lines.map(l => l.componentId);
      const cycle = await BOMService.detectCircularReference(
        existing.productId,
        componentIds,
        organizationId
      );
      if (cycle) {
        throw new Error(`Circular reference detected: ${cycle.join(' → ')}`);
      }
    }

    // If setting as default, unset other defaults for same product
    if (data.isDefault) {
      await prisma.billOfMaterial.updateMany({
        where: {
          organizationId,
          productId: existing.productId,
          id: { not: bomId },
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return prisma.$transaction(async (tx) => {
      // Delete old lines if new lines provided
      if (data.lines) {
        await tx.billOfMaterialLine.deleteMany({ where: { bomId } });
      }

      return tx.billOfMaterial.update({
        where: { id: bomId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.version !== undefined && { version: data.version }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
          ...(data.revisionNotes !== undefined && { revisionNotes: data.revisionNotes }),
          ...(data.yieldPercent !== undefined && { yieldPercent: data.yieldPercent }),
          ...(data.scrapPercent !== undefined && { scrapPercent: data.scrapPercent }),
          ...(data.lines && {
            lines: {
              create: data.lines.map(l => ({
                componentId: l.componentId,
                quantityPer: l.quantityPer,
                scrapPercent: l.scrapPercent ?? 0,
                backflush: l.backflush ?? true,
                operationSeq: l.operationSeq,
              })),
            },
          }),
        },
        include: {
          product: { select: { id: true, sku: true, name: true } },
          lines: {
            include: {
              component: { select: { id: true, sku: true, name: true } },
            },
          },
        },
      });
    });
  }

  /**
   * Delete a BOM (only DRAFT status).
   */
  static async deleteBOM(bomId: string, organizationId: string) {
    const bom = await prisma.billOfMaterial.findFirst({
      where: { id: bomId, organizationId },
    });
    if (!bom) throw new Error('BOM not found');
    if (bom.status === 'ACTIVE') {
      throw new Error('Cannot delete an Active BOM. Archive it first.');
    }

    await prisma.billOfMaterial.delete({ where: { id: bomId } });
  }

  /* ─────────── Private helpers ─────────── */

  /**
   * Get current weighted average costs for a set of product IDs.
   * Uses WarehouseStockLevel (summed across warehouses) as the cost source.
   */
  private static async getAverageCosts(productIds: string[]): Promise<Map<string, Decimal>> {
    if (productIds.length === 0) return new Map();

    const stockLevels = await prisma.warehouseStockLevel.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds } },
      _sum: { totalValue: true, quantityOnHand: true },
    });

    const costMap = new Map<string, Decimal>();
    for (const sl of stockLevels) {
      const totalVal = new Decimal(sl._sum.totalValue?.toString() ?? '0');
      const totalQty = new Decimal(sl._sum.quantityOnHand?.toString() ?? '0');
      if (totalQty.gt(0)) {
        costMap.set(sl.productId, totalVal.div(totalQty));
      }
    }

    // Fallback to InventoryItem for products not in WarehouseStockLevel
    const missing = productIds.filter(id => !costMap.has(id));
    if (missing.length > 0) {
      const items = await prisma.inventoryItem.findMany({
        where: { productId: { in: missing } },
        select: { productId: true, averageCost: true },
      });
      for (const item of items) {
        const cost = new Decimal(item.averageCost.toString());
        if (cost.gt(0)) costMap.set(item.productId, cost);
      }
    }

    // Final fallback to product purchasePrice
    const stillMissing = productIds.filter(id => !costMap.has(id));
    if (stillMissing.length > 0) {
      const products = await prisma.product.findMany({
        where: { id: { in: stillMissing } },
        select: { id: true, purchasePrice: true },
      });
      for (const p of products) {
        costMap.set(p.id, new Decimal(p.purchasePrice.toString()));
      }
    }

    return costMap;
  }

  /**
   * Recursively resolve BOM lines into a tree, expanding sub-assembly BOMs.
   */
  private static async resolveTree(
    lines: Array<{
      id: string;
      componentId: string;
      quantityPer: any;
      scrapPercent: any;
      component: {
        id: string;
        sku: string;
        name: string;
        unitOfMeasure?: { abbreviation: string } | null;
      };
    }>,
    costMap: Map<string, Decimal>,
    organizationId: string,
    visited: Set<string>,
    depth: number
  ): Promise<BOMTreeNode[]> {
    const nodes: BOMTreeNode[] = [];

    for (const line of lines) {
      const qtyPer = Number(line.quantityPer);
      const scrap = Number(line.scrapPercent);
      const effectiveQty = qtyPer * (1 + scrap / 100);
      const unitCost = (costMap.get(line.componentId) ?? new Decimal(0)).toNumber();

      // Check if this component has its own active BOM (sub-assembly)
      let children: BOMTreeNode[] = [];
      let isSubAssembly = false;

      if (!visited.has(line.componentId)) {
        const subBom = await prisma.billOfMaterial.findFirst({
          where: {
            organizationId,
            productId: line.componentId,
            status: 'ACTIVE',
            isDefault: true,
          },
          include: {
            lines: {
              include: {
                component: {
                  select: {
                    id: true,
                    sku: true,
                    name: true,
                    unitOfMeasure: { select: { abbreviation: true } },
                  },
                },
              },
              orderBy: { operationSeq: 'asc' },
            },
          },
        });

        if (subBom) {
          isSubAssembly = true;
          const subVisited = new Set(visited);
          subVisited.add(line.componentId);

          // Get costs for sub-BOM components
          const subIds = subBom.lines.map(l => l.componentId);
          const subCosts = await BOMService.getAverageCosts(subIds);

          children = await BOMService.resolveTree(
            subBom.lines,
            subCosts,
            organizationId,
            subVisited,
            depth + 1
          );
        }
      }

      const extendedCost = isSubAssembly
        ? children.reduce((sum, c) => sum + c.extendedCost * effectiveQty, 0)
        : effectiveQty * unitCost;

      nodes.push({
        bomLineId: line.id,
        productId: line.componentId,
        sku: line.component.sku,
        name: line.component.name,
        unitOfMeasure: line.component.unitOfMeasure?.abbreviation ?? null,
        quantityPer: qtyPer,
        scrapPercent: scrap,
        effectiveQty,
        unitCost: isSubAssembly ? extendedCost / effectiveQty : unitCost,
        extendedCost,
        isSubAssembly,
        depth,
        children,
      });
    }

    return nodes;
  }
}
