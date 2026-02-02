/**
 * StandardCostService
 * 
 * Core service for managing Standard Costs with multi-currency support,
 * BOM roll-up calculations, and localization integration.
 */

import { Decimal } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { costingLocalizationManager } from './costing-localization.manager';

export interface StandardCostInput {
  productId: string;
  costingMethod: string;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  costingVersion?: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  notes?: string;
  bomId?: string;
  routingId?: string;
  rollupSource?: 'MANUAL' | 'BOM_ROLLUP' | 'IMPORT';
}

export interface BomRollupResult {
  productId: string;
  productName: string;
  calculatedCosts: {
    materialCost: number;
    laborCost: number;
    overheadCost: number;
    totalCost: number;
  };
  localizedCosts?: {
    materialCost: number;
    laborCost: number;
    overheadCost: number;
    totalCost: number;
  };
  rollupDetails: BomCostComponent[];
  varianceAnalysis?: {
    currentStandardCost: number;
    calculatedCost: number;
    variance: number;
    variancePercent: number;
    recommendation: string;
  };
}

export interface BomCostComponent {
  componentId: string;
  componentName: string;
  componentSku: string;
  quantityPer: number;
  unitCost: number;
  extendedCost: number;
  level: number; // For nested BOM visualization
  source: 'STANDARD_COST' | 'LAST_PURCHASE' | 'MANUAL' | 'DEFAULT';
}

export interface VarianceAnalysis {
  productId: string;
  standardCost: number;
  lastPurchasePrice?: number;
  actualCost?: number;
  variance: number;
  variancePercent: number;
  threshold: number; // 10% by default
  flagged: boolean;
  recommendation: string;
}

export interface MassUpdateRequest {
  filter: {
    categoryId?: string;
    costingMethod?: string;
    effectiveDateRange?: { from: Date; to: Date };
    productIds?: string[];
  };
  adjustment: {
    type: 'PERCENTAGE' | 'AMOUNT';
    materialAdjustment?: number;
    laborAdjustment?: number;
    overheadAdjustment?: number;
    reason: string;
  };
}

export class StandardCostService {
  
  /**
   * Create or update standard cost with full validation and localization
   */
  async createStandardCost(
    organizationId: string,
    data: StandardCostInput
  ): Promise<any> {
    
    // Validate product exists
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: {
        id: true,
        name: true,
        sku: true,
        organizationId: true,
      },
    });

    if (!product || product.organizationId !== organizationId) {
      throw new Error('Product not found or access denied');
    }

    // Get organization settings
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        baseCurrency: true,
        homeCountry: true,
      },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Apply localization adjustments if requested
    const localizedCosts = await costingLocalizationManager.applyLocalizationAdjustments(
      organizationId,
      {
        materialCost: data.materialCost,
        laborCost: data.laborCost,
        overheadCost: data.overheadCost,
      }
    );

    // Generate version if not provided
    const costingVersion = data.costingVersion || await this.generateNextVersion(organizationId, data.productId);

    // Calculate total cost
    const totalCost = data.materialCost + data.laborCost + data.overheadCost;

    // Check for existing standard cost to perform variance analysis
    const currentStandardCost = await this.getCurrentStandardCost(organizationId, data.productId);

    let priceVariance = 0;
    if (currentStandardCost) {
      priceVariance = totalCost - Number(currentStandardCost.totalStandardCost);
    }

    // Get last purchase price for variance analysis
    const lastPurchasePrice = await this.getLastPurchasePrice(organizationId, data.productId);

    const standardCost = await prisma.standardCost.create({
      data: {
        organizationId,
        productId: data.productId,
        costingMethod: data.costingMethod as any,
        materialCost: new Decimal(data.materialCost),
        laborCost: new Decimal(data.laborCost),
        overheadCost: new Decimal(data.overheadCost),
        totalStandardCost: new Decimal(totalCost),
        costingVersion,
        status: 'DRAFT',
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo,
        baseCurrency: organization.baseCurrency,
        localizedCosts: {
          material: localizedCosts.localizedMaterialCost,
          labor: localizedCosts.localizedLaborCost,
          overhead: localizedCosts.localizedOverheadCost,
          total: localizedCosts.totalLocalizedCost,
          adjustmentSummary: localizedCosts.adjustmentSummary,
        },
        lastPurchasePrice: lastPurchasePrice ? new Decimal(lastPurchasePrice) : null,
        priceDelta: lastPurchasePrice ? new Decimal(totalCost - lastPurchasePrice) : null,
        priceVariance: new Decimal(priceVariance),
        bomId: data.bomId,
        routingId: data.routingId,
        rollupSource: data.rollupSource || 'MANUAL',
        lastRollupDate: data.rollupSource === 'BOM_ROLLUP' ? new Date() : null,
        notes: data.notes,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });

    return standardCost;
  }

  /**
   * Perform BOM roll-up calculation for manufactured items
   */
  async performBomRollup(organizationId: string, productId: string): Promise<BomRollupResult> {
    
    // Get the active BOM for this product
    const bom = await prisma.billOfMaterial.findFirst({
      where: {
        organizationId,
        productId,
        status: 'ACTIVE',
        isDefault: true,
      },
      include: {
        lines: {
          include: {
            component: {
              select: {
                id: true,
                name: true,
                sku: true,
                standardCosts: {
                  where: {
                    organizationId,
                    status: 'FROZEN',
                    effectiveFrom: { lte: new Date() },
                    OR: [
                      { effectiveTo: { gte: new Date() } },
                      { effectiveTo: null },
                    ],
                  },
                  orderBy: { effectiveFrom: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });

    if (!bom) {
      throw new Error('No active BOM found for this product');
    }

    // Calculate costs for each component
    const rollupDetails: BomCostComponent[] = [];
    let totalMaterialCost = 0;
    let totalLaborCost = 0;
    let totalOverheadCost = 0;

    for (const line of bom.lines) {
      const component = line.component;
      const quantityPer = Number(line.quantityPer);
      
      let unitCost = 0;
      let source: BomCostComponent['source'] = 'DEFAULT';

      // Try to get standard cost first
      if (component.standardCosts.length > 0) {
        unitCost = Number(component.standardCosts[0].totalStandardCost);
        source = 'STANDARD_COST';
      } else {
        // Fall back to last purchase price
        const lastPurchase = await this.getLastPurchasePrice(organizationId, component.id);
        if (lastPurchase) {
          unitCost = lastPurchase;
          source = 'LAST_PURCHASE';
        }
      }

      const extendedCost = unitCost * quantityPer;
      totalMaterialCost += extendedCost;

      rollupDetails.push({
        componentId: component.id,
        componentName: component.name,
        componentSku: component.sku,
        quantityPer,
        unitCost,
        extendedCost,
        level: 1, // TODO: Implement nested BOM levels
        source,
      });
    }

    // Get routing costs if available
    const routing = await prisma.routing.findFirst({
      where: {
        organizationId,
        productId,
        status: 'ACTIVE',
        isDefault: true,
      },
      include: {
        steps: {
          include: {
            workCenter: {
              select: {
                id: true,
                name: true,
                laborRatePerHour: true,
                overheadRatePerHour: true,
              },
            },
          },
        },
      },
    });

    if (routing) {
      for (const step of routing.steps) {
        const laborMinutes = step.laborTimeMinsPerUnit;
        const setupMinutes = step.setupTimeMins;
        
        if (step.workCenter) {
          const laborRate = Number(step.workCenter.laborRatePerHour) || 0;
          const overheadRate = Number(step.workCenter.overheadRatePerHour) || 0;
          
          // Calculate labor and overhead per unit
          const laborHours = (laborMinutes + setupMinutes) / 60;
          totalLaborCost += laborHours * laborRate;
          totalOverheadCost += laborHours * overheadRate;
        }
      }
    }

    const totalCost = totalMaterialCost + totalLaborCost + totalOverheadCost;

    // Apply localization adjustments
    const localizedCosts = await costingLocalizationManager.applyLocalizationAdjustments(
      organizationId,
      {
        materialCost: totalMaterialCost,
        laborCost: totalLaborCost,
        overheadCost: totalOverheadCost,
      }
    );

    // Perform variance analysis against current standard cost
    const currentStandardCost = await this.getCurrentStandardCost(organizationId, productId);
    let varianceAnalysis;

    if (currentStandardCost) {
      const currentCost = Number(currentStandardCost.totalStandardCost);
      const variance = totalCost - currentCost;
      const variancePercent = (variance / currentCost) * 100;
      
      varianceAnalysis = {
        currentStandardCost: currentCost,
        calculatedCost: totalCost,
        variance,
        variancePercent,
        recommendation: Math.abs(variancePercent) > 10 
          ? 'Significant variance detected. Consider updating standard cost.'
          : 'Cost is within acceptable variance range.',
      };
    }

    return {
      productId,
      productName: bom.product.name,
      calculatedCosts: {
        materialCost: totalMaterialCost,
        laborCost: totalLaborCost,
        overheadCost: totalOverheadCost,
        totalCost,
      },
      localizedCosts: {
        materialCost: localizedCosts.localizedMaterialCost,
        laborCost: localizedCosts.localizedLaborCost,
        overheadCost: localizedCosts.localizedOverheadCost,
        totalCost: localizedCosts.totalLocalizedCost,
      },
      rollupDetails,
      varianceAnalysis,
    };
  }

  /**
   * Analyze variances across multiple products
   */
  async analyzeVariances(
    organizationId: string,
    threshold: number = 10
  ): Promise<VarianceAnalysis[]> {
    
    const standardCosts = await prisma.standardCost.findMany({
      where: {
        organizationId,
        status: 'FROZEN',
        isActive: true,
        effectiveFrom: { lte: new Date() },
        OR: [
          { effectiveTo: { gte: new Date() } },
          { effectiveTo: null },
        ],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });

    const variances: VarianceAnalysis[] = [];

    for (const standardCost of standardCosts) {
      const currentStandardCost = Number(standardCost.totalStandardCost);
      const lastPurchasePrice = await this.getLastPurchasePrice(organizationId, standardCost.productId);

      if (lastPurchasePrice) {
        const variance = lastPurchasePrice - currentStandardCost;
        const variancePercent = (variance / currentStandardCost) * 100;
        const flagged = Math.abs(variancePercent) > threshold;

        let recommendation = '';
        if (Math.abs(variancePercent) > 20) {
          recommendation = 'Critical variance - immediate review required';
        } else if (Math.abs(variancePercent) > threshold) {
          recommendation = 'Standard cost update recommended';
        } else {
          recommendation = 'Within acceptable variance range';
        }

        variances.push({
          productId: standardCost.productId,
          standardCost: currentStandardCost,
          lastPurchasePrice,
          variance,
          variancePercent,
          threshold,
          flagged,
          recommendation,
        });
      }
    }

    return variances.sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent));
  }

  /**
   * Perform mass update of standard costs
   */
  async performMassUpdate(
    organizationId: string,
    request: MassUpdateRequest
  ): Promise<{ updated: number; errors: string[] }> {
    
    let whereClause: any = { organizationId };

    // Apply filters
    if (request.filter.productIds?.length) {
      whereClause.productId = { in: request.filter.productIds };
    }

    if (request.filter.costingMethod) {
      whereClause.costingMethod = request.filter.costingMethod;
    }

    if (request.filter.effectiveDateRange) {
      whereClause.effectiveFrom = {
        gte: request.filter.effectiveDateRange.from,
        lte: request.filter.effectiveDateRange.to,
      };
    }

    const standardCosts = await prisma.standardCost.findMany({
      where: whereClause,
      include: {
        product: true,
      },
    });

    let updated = 0;
    const errors: string[] = [];

    for (const standardCost of standardCosts) {
      try {
        let newMaterialCost = Number(standardCost.materialCost);
        let newLaborCost = Number(standardCost.laborCost);
        let newOverheadCost = Number(standardCost.overheadCost);

        // Apply adjustments
        if (request.adjustment.materialAdjustment !== undefined) {
          if (request.adjustment.type === 'PERCENTAGE') {
            newMaterialCost *= (1 + request.adjustment.materialAdjustment / 100);
          } else {
            newMaterialCost += request.adjustment.materialAdjustment;
          }
        }

        if (request.adjustment.laborAdjustment !== undefined) {
          if (request.adjustment.type === 'PERCENTAGE') {
            newLaborCost *= (1 + request.adjustment.laborAdjustment / 100);
          } else {
            newLaborCost += request.adjustment.laborAdjustment;
          }
        }

        if (request.adjustment.overheadAdjustment !== undefined) {
          if (request.adjustment.type === 'PERCENTAGE') {
            newOverheadCost *= (1 + request.adjustment.overheadAdjustment / 100);
          } else {
            newOverheadCost += request.adjustment.overheadAdjustment;
          }
        }

        const newTotalCost = newMaterialCost + newLaborCost + newOverheadCost;

        await prisma.standardCost.update({
          where: { id: standardCost.id },
          data: {
            materialCost: new Decimal(newMaterialCost),
            laborCost: new Decimal(newLaborCost),
            overheadCost: new Decimal(newOverheadCost),
            totalStandardCost: new Decimal(newTotalCost),
            notes: `${standardCost.notes || ''}\n[Mass Update ${new Date().toISOString()}]: ${request.adjustment.reason}`.trim(),
          },
        });

        updated++;
      } catch (error: any) {
        errors.push(`Error updating ${standardCost.product.name}: ${error.message}`);
      }
    }

    return { updated, errors };
  }

  /**
   * Helper method to get current active standard cost
   */
  private async getCurrentStandardCost(organizationId: string, productId: string) {
    return await prisma.standardCost.findFirst({
      where: {
        organizationId,
        productId,
        status: 'FROZEN',
        isActive: true,
        effectiveFrom: { lte: new Date() },
        OR: [
          { effectiveTo: { gte: new Date() } },
          { effectiveTo: null },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  /**
   * Helper method to get last purchase price
   */
  private async getLastPurchasePrice(organizationId: string, productId: string): Promise<number | null> {
    // This would query from purchase order lines or invoice lines
    // For now, return a mock value
    return Math.random() * 100 + 50;
  }

  /**
   * Generate next version number for a product
   */
  private async generateNextVersion(organizationId: string, productId: string): Promise<string> {
    const lastVersion = await prisma.standardCost.findFirst({
      where: { organizationId, productId },
      orderBy: { costingVersion: 'desc' },
      select: { costingVersion: true },
    });

    if (!lastVersion) {
      return '1.0';
    }

    const [major, minor] = lastVersion.costingVersion.split('.').map(Number);
    return `${major}.${minor + 1}`;
  }
}

// Export singleton instance
export const standardCostService = new StandardCostService();