import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import prisma from '@/lib/prisma';

// GET /api/orgs/[orgSlug]/inventory/products
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const products = await prisma.product.findMany({
      where: { organizationId },
      include: {
        inventoryItems: true,
        unitOfMeasure: true,
        _count: { select: { stockMovements: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = products.map((p) => {
      const inventory = p.inventoryItems?.[0];
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        productType: p.productType,
        category: p.category,
        unitOfMeasure: p.unitOfMeasure
          ? `${p.unitOfMeasure.name} (${p.unitOfMeasure.abbreviation})`
          : 'N/A',
        purchasePrice: Number(p.purchasePrice),
        sellingPrice: Number(p.sellingPrice),
        trackInventory: p.trackInventory,
        reorderLevel: p.reorderLevel ? Number(p.reorderLevel) : null,
        reorderQuantity: p.reorderQuantity ? Number(p.reorderQuantity) : null,
        taxable: p.taxable,
        defaultTaxRate: Number(p.defaultTaxRate),
        exciseDutyCode: p.exciseDutyCode || null,
        goodsCategoryId: p.goodsCategoryId || null,
        efrisProductCode: p.efrisProductCode || null,
        efrisRegisteredAt: p.efrisRegisteredAt || null,
        isActive: p.isActive,
        quantityOnHand: inventory ? Number(inventory.quantityOnHand) : 0,
        quantityAvailable: inventory ? Number(inventory.quantityAvailable) : 0,
        averageCost: inventory ? Number(inventory.averageCost) : 0,
        stockMovements: p._count.stockMovements,
        createdAt: p.createdAt,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch products' },
      { status: error.status || 500 }
    );
  }
}
