import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/orgs/[orgSlug]/inventory/stock-decrease
 * Create stock decrease adjustment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);
    const body = await request.json();

    const { adjustType, remarks, items } = body;

    // Validate required fields
    if (!adjustType) {
      return NextResponse.json(
        { error: 'Adjust type is required' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }

    // adjustType "104" (Others) requires remarks
    if (adjustType === '104' && !remarks) {
      return NextResponse.json(
        { error: 'Remarks are required for adjustType "104" (Others)' },
        { status: 400 }
      );
    }

    // Create stock adjustment records in database for each item
    // This updates inventory and creates audit trail
    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: {
          organizationId,
          OR: [
            { sku: item.goodsCode || item.sku },
            { id: item.productId },
          ],
        },
      });

      if (product) {
        // Create stock movement record
        await prisma.stockMovement.create({
          data: {
            productId: product.id,
            movementType: 'ADJUSTMENT',
            quantity: -Math.abs(parseFloat(item.quantity)), // Negative for decrease
            referenceType: 'STOCK_DECREASE',
            referenceId: new Date().toISOString(),
            notes: `Stock Decrease - Type: ${getAdjustTypeLabel(adjustType)} - ${remarks || item.remarks || ''}`,
            movementDate: new Date(),
          },
        });

        // Update inventory item if tracking inventory
        if (product.trackInventory) {
          const inventoryItem = await prisma.inventoryItem.findFirst({
            where: { productId: product.id },
          });

          if (inventoryItem) {
            const newQuantity = parseFloat(inventoryItem.quantityOnHand.toString()) - Math.abs(parseFloat(item.quantity));
            await prisma.inventoryItem.update({
              where: { id: inventoryItem.id },
              data: {
                quantityOnHand: Math.max(0, newQuantity),
                quantityAvailable: Math.max(0, newQuantity - parseFloat(inventoryItem.quantityReserved.toString())),
              },
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Stock decrease created successfully',
    });
  } catch (error: any) {
    console.error('Error submitting stock decrease:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit stock decrease' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get human-readable label for adjust type
 */
function getAdjustTypeLabel(adjustType: string): string {
  const labels: Record<string, string> = {
    '101': 'Expired',
    '102': 'Damaged',
    '103': 'Personal Use',
    '104': 'Others',
    '105': 'Raw Materials',
  };
  return labels[adjustType] || adjustType;
}
