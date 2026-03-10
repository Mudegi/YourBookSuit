import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

/**
 * GET /api/orgs/[orgSlug]/warehouses/[warehouseId]/stock?productId=xxx
 * Returns stock availability for a product in a specific warehouse
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; warehouseId: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    // Verify warehouse belongs to this org
    const warehouse = await prisma.inventoryWarehouse.findFirst({
      where: { id: params.warehouseId, organizationId },
      select: { id: true, name: true },
    });

    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    const stockLevel = await prisma.warehouseStockLevel.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: params.warehouseId,
          productId,
        },
      },
      select: {
        quantityAvailable: true,
        quantityOnHand: true,
        averageCost: true,
        reorderPoint: true,
      },
    });

    return NextResponse.json({
      success: true,
      quantityAvailable: stockLevel ? Number(stockLevel.quantityAvailable) : 0,
      quantityOnHand: stockLevel ? Number(stockLevel.quantityOnHand) : 0,
      averageCost: stockLevel ? Number(stockLevel.averageCost) : 0,
      reorderPoint: stockLevel ? Number(stockLevel.reorderPoint) : 0,
    });
  } catch (error) {
    console.error('Error fetching warehouse stock:', error);
    return NextResponse.json(
      { error: 'Failed to fetch warehouse stock' },
      { status: 500 }
    );
  }
}
