import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/api-auth';
import { SafetyStockMethod } from '@prisma/client';
import { CurrencyService } from '@/services/currency.service';

export async function GET(request: NextRequest) {
  try {
    const { valid, userId, organizationId, role, error } = await verifyAuth(request);
    const { searchParams } = new URL(request.url);
    
    const orgId = searchParams.get('orgId');
    const warehouseId = searchParams.get('warehouseId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const method = searchParams.get('method') as SafetyStockMethod;
    const status = searchParams.get('status'); // 'active', 'inactive', 'expired'
    const riskLevel = searchParams.get('riskLevel'); // 'low', 'medium', 'high'

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Get organization ID - handle both direct ID and slug
    let organization;
    try {
      organization = await prisma.organization.findFirst({
        where: {
          OR: [
            { id: orgId },
            { slug: orgId }
          ]
        },
        select: { id: true, homeCountry: true, baseCurrency: true }
      });
    } catch (error) {
      console.error('Error finding organization:', error);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const actualOrgId = organization.id;

    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      organizationId: actualOrgId,
    };

    if (warehouseId && warehouseId !== 'all') {
      whereClause.warehouseId = warehouseId;
    }

    if (method) {
      whereClause.calculationMethod = method;
    }

    if (status === 'active') {
      whereClause.isActive = true;
      whereClause.OR = [
        { effectiveTo: null },
        { effectiveTo: { gte: new Date() } }
      ];
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    } else if (status === 'expired') {
      whereClause.effectiveTo = { lt: new Date() };
    }

    if (search) {
      whereClause.product = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ]
      };
    }

    // Get safety stock records with current inventory levels
    const safetyStocks = await prisma.safetyStock.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            purchasePrice: true,
            category: true,
            inventoryItems: {
              where: warehouseId && warehouseId !== 'all' ? { warehouseLocation: warehouseId } : {},
              select: {
                quantityOnHand: true,
                quantityReserved: true,
                warehouseLocation: true,
              }
            }
          }
        },
        warehouse: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    // Get total count
    const totalCount = await prisma.safetyStock.count({
      where: whereClause,
    });

    // Calculate stock health and add risk assessment
    const enhancedSafetyStocks = await Promise.all(safetyStocks.map(async stock => {
      const totalInventory = stock.product.inventoryItems.reduce((sum, item) => {
        return sum + Number(item.quantityOnHand) - Number(item.quantityReserved || 0);
      }, 0);

      const safetyStockQty = Number(stock.safetyStockQty);
      const currentStockLevel = totalInventory;
      const stockCoverage = safetyStockQty > 0 ? (currentStockLevel / safetyStockQty) : 0;
      
      // Risk assessment
      let riskLevel: 'low' | 'medium' | 'high';
      let riskMessage: string;
      
      if (stockCoverage >= 1.0) {
        riskLevel = 'low';
        riskMessage = 'Stock levels are adequate';
      } else if (stockCoverage >= 0.5) {
        riskLevel = 'medium';
        riskMessage = 'Stock levels below safety threshold';
      } else {
        riskLevel = 'high';
        riskMessage = 'Critical stock shortage';
      }

      // Financial impact
      const financialValue = Number(stock.product.purchasePrice || 0) * safetyStockQty;
      const financialValueFormatted = await CurrencyService.formatCurrency(
        financialValue, 
        actualOrgId, 
        { showSymbol: true }
      );

      return {
        ...stock,
        stockHealth: {
          currentLevel: currentStockLevel,
          safetyLevel: safetyStockQty,
          coverage: stockCoverage,
          riskLevel,
          riskMessage,
          financialValue,
          financialValueFormatted,
          shortfall: Math.max(0, safetyStockQty - currentStockLevel),
        }
      };
    }));

    // Filter by risk level if specified
    const filteredStocks = riskLevel 
      ? enhancedSafetyStocks.filter(stock => stock.stockHealth.riskLevel === riskLevel)
      : enhancedSafetyStocks;

    // Calculate summary statistics
    const totalFinancialValue = filteredStocks.reduce((sum, s) => sum + s.stockHealth.financialValue, 0);
    const totalFinancialValueFormatted = await CurrencyService.formatCurrency(
      totalFinancialValue, 
      actualOrgId, 
      { showSymbol: true }
    );

    const summary = {
      totalProducts: totalCount,
      activeProducts: filteredStocks.filter(s => s.isActive).length,
      highRiskProducts: filteredStocks.filter(s => s.stockHealth.riskLevel === 'high').length,
      totalFinancialValue,
      totalFinancialValueFormatted,
      totalShortfall: filteredStocks.reduce((sum, s) => sum + s.stockHealth.shortfall, 0),
      currency: organization.baseCurrency,
    };

    return NextResponse.json({
      safetyStocks: filteredStocks,
      summary,
      pagination: {
        page,
        limit,
        totalCount: riskLevel ? filteredStocks.length : totalCount,
        totalPages: Math.ceil((riskLevel ? filteredStocks.length : totalCount) / limit),
      }
    });

  } catch (error) {
    console.error('Error fetching safety stock overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch safety stock data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { valid, userId, organizationId, role, error } = await verifyAuth(request);
    const body = await request.json();
    
    const { action, productIds, updates } = body;

    if (!action || !productIds || !Array.isArray(productIds)) {
      return NextResponse.json(
        { error: 'Action and product IDs array are required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'bulk_update':
        if (!updates) {
          return NextResponse.json(
            { error: 'Updates object is required for bulk update' },
            { status: 400 }
          );
        }

        result = await prisma.safetyStock.updateMany({
          where: {
            productId: { in: productIds },
            isActive: true,
          },
          data: {
            ...updates,
            updatedAt: new Date(),
          },
        });
        break;

      case 'bulk_deactivate':
        result = await prisma.safetyStock.updateMany({
          where: {
            productId: { in: productIds },
            isActive: true,
          },
          data: {
            isActive: false,
            updatedAt: new Date(),
          },
        });
        break;

      case 'bulk_recalculate':
        // This would trigger recalculation for selected products
        // Implementation depends on your background job system
        return NextResponse.json({ 
          message: `Recalculation queued for ${productIds.length} products`,
          queuedProducts: productIds.length 
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ 
      message: `${action} completed successfully`,
      affectedRows: result.count 
    });

  } catch (error) {
    console.error('Error in bulk safety stock operation:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}