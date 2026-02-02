import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { Permission } from '@/lib/permissions';
import Decimal from 'decimal.js';

// POST /api/[orgSlug]/warehouse/transfer-orders/[transferOrderId]/receive
export async function POST(
  _request: NextRequest,
  { params }: { params: { orgSlug: string; transferOrderId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.MANAGE_WAREHOUSE);

    const order = await prisma.transferOrder.findFirst({
      where: { id: params.transferOrderId, organizationId: org.id },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        lines: {
          include: {
            product: true,
            lot: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Transfer order not found' }, { status: 404 });
    }

    if (order.status !== 'IN_TRANSIT') {
      return NextResponse.json(
        { success: false, error: `Cannot receive transfer order with status ${order.status}` },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const line of order.lines) {
        const qty = new Decimal(line.quantity);
        const productId = line.productId;

        // Find or create inventory item for the destination warehouse
        let inventoryItem = await tx.inventoryItem.findFirst({
          where: {
            productId,
            warehouseLocation: order.toWarehouse.name,
          },
        });

        if (!inventoryItem) {
          // Create inventory item if it doesn't exist
          inventoryItem = await tx.inventoryItem.create({
            data: {
              productId,
              warehouseLocation: order.toWarehouse.name,
              quantityOnHand: 0,
              quantityAvailable: 0,
              averageCost: 0,
              totalValue: 0,
            },
          });
        }

        const onHandBefore = new Decimal(inventoryItem.quantityOnHand);
        const availableBefore = new Decimal(inventoryItem.quantityAvailable);

        // For receiving, we need to recalculate average cost
        // Get average cost from source warehouse
        const sourceInventoryItem = await tx.inventoryItem.findFirst({
          where: {
            productId,
            warehouseLocation: order.fromWarehouse.name,
          },
        });

        const incomingCost = sourceInventoryItem
          ? new Decimal(sourceInventoryItem.averageCost)
          : new Decimal(line.product.purchasePrice);

        // Calculate new average cost (weighted average)
        const currentValue = new Decimal(inventoryItem.totalValue);
        const incomingValue = qty.times(incomingCost);
        const newOnHand = onHandBefore.plus(qty);
        const newValue = currentValue.plus(incomingValue);
        const newAvgCost = newOnHand.isZero() ? incomingCost : newValue.dividedBy(newOnHand);

        await tx.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: {
            quantityOnHand: newOnHand.toNumber(),
            quantityAvailable: availableBefore.plus(qty).toNumber(),
            averageCost: newAvgCost.toNumber(),
            totalValue: newValue.toNumber(),
          },
        });

        // Record stock movement
        await tx.stockMovement.create({
          data: {
            organizationId: org.id,
            productId,
            movementType: 'TRANSFER_IN',
            quantity: qty.toNumber(),
            unitOfMeasure: line.unitOfMeasure,
            reference: `Transfer Order ${order.id}`,
            notes: `Received at ${order.toWarehouse.code} from ${order.fromWarehouse.code}`,
            fromWarehouse: order.fromWarehouse.name,
            toWarehouse: order.toWarehouse.name,
            unitCost: incomingCost.toNumber(),
            totalCost: incomingValue.toNumber(),
          },
        });

        // If lot tracked, create or increment lot quantity at destination
        if (line.lotId) {
          const lot = await tx.inventoryLot.findFirst({
            where: { id: line.lotId, productId },
          });

          if (lot) {
            const lotQtyBefore = new Decimal(lot.quantity || 0);
            const lotAvailableBefore = new Decimal(lot.availableQuantity || 0);

            await tx.inventoryLot.update({
              where: { id: line.lotId },
              data: {
                quantity: lotQtyBefore.plus(qty).toNumber(),
                availableQuantity: lotAvailableBefore.plus(qty).toNumber(),
                warehouseId: order.toWarehouseId, // Move lot to new warehouse
              },
            });
          }
        }

        // No GL posting for transfers within the same org (inter-warehouse moves are balance-sheet neutral)
        // If you require GL postings for inter-branch or inter-company transfers, extend here
      }

      // Update transfer order status
      await tx.transferOrder.update({
        where: { id: order.id },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Transfer order received successfully' });
  } catch (error) {
    console.error('Error receiving transfer order:', error);
    const message = error instanceof Error ? error.message : 'Failed to receive transfer order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
