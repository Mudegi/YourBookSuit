import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; productId: string } }
) {
  try {
    const user = await requirePermission(params.orgSlug, 'PRODUCTS.VIEW');

    const product = await prisma.product.findUnique({
      where: { id: params.productId },
      include: {
        inventoryTracking: {
          select: {
            quantityOnHand: true,
            quantityAllocated: true,
            quantityAvailable: true,
            warehouseId: true,
            warehouse: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Calculate total available across all warehouses
    const totalOnHand = product.inventoryTracking.reduce(
      (sum, tracking) => sum + Number(tracking.quantityOnHand || 0),
      0
    );
    const totalAllocated = product.inventoryTracking.reduce(
      (sum, tracking) => sum + Number(tracking.quantityAllocated || 0),
      0
    );
    const totalAvailable = totalOnHand - totalAllocated;

    return NextResponse.json({
      productId: product.id,
      quantityOnHand: totalOnHand,
      quantityAllocated: totalAllocated,
      quantityAvailable: totalAvailable,
      byWarehouse: product.inventoryTracking.map((tracking) => ({
        warehouseId: tracking.warehouseId,
        warehouseName: tracking.warehouse?.name,
        quantityOnHand: Number(tracking.quantityOnHand || 0),
        quantityAllocated: Number(tracking.quantityAllocated || 0),
        quantityAvailable: Number(tracking.quantityAvailable || 0),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching product stock:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock' },
      { status: 500 }
    );
  }
}
