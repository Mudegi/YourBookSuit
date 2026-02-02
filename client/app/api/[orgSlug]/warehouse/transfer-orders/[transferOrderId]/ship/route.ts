import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { Permission } from '@/lib/permissions';
import Decimal from 'decimal.js';
import { TransactionType } from '@prisma/client';
import { DoubleEntryService } from '@/services/accounting/double-entry.service';

// POST /api/[orgSlug]/warehouse/transfer-orders/[transferOrderId]/ship
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
            product: {
              include: {
                inventoryItems: {
                  where: { warehouseLocation: { not: null } },
                },
              },
            },
            lot: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Transfer order not found' }, { status: 404 });
    }

    if (order.status !== 'DRAFT' && order.status !== 'REQUESTED') {
      return NextResponse.json(
        { success: false, error: `Cannot ship transfer order with status ${order.status}` },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const line of order.lines) {
        const qty = new Decimal(line.quantity);
        const productId = line.productId;

        // Find or create inventory item for the source warehouse
        let inventoryItem = await tx.inventoryItem.findFirst({
          where: {
            productId,
            warehouseLocation: order.fromWarehouse.name,
          },
        });

        if (!inventoryItem) {
          // Create a zero-balance inventory item if it doesn't exist
          inventoryItem = await tx.inventoryItem.create({
            data: {
              productId,
              warehouseLocation: order.fromWarehouse.name,
              quantityOnHand: 0,
              quantityAvailable: 0,
              averageCost: 0,
              totalValue: 0,
            },
          });
        }

        const onHandBefore = new Decimal(inventoryItem.quantityOnHand);
        const availableBefore = new Decimal(inventoryItem.quantityAvailable);

        if (availableBefore.lessThan(qty)) {
          throw new Error(
            `Insufficient inventory for product ${line.product.sku || line.product.name} in warehouse ${order.fromWarehouse.code}. Available: ${availableBefore}, Required: ${qty}`
          );
        }

        // Deduct from source warehouse
        const newOnHand = onHandBefore.minus(qty);
        const newAvailable = availableBefore.minus(qty);
        const avgCost = new Decimal(inventoryItem.averageCost);
        const newTotalValue = newOnHand.times(avgCost);

        await tx.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: {
            quantityOnHand: newOnHand.toNumber(),
            quantityAvailable: newAvailable.toNumber(),
            totalValue: newTotalValue.toNumber(),
          },
        });

        // Record stock movement
        await tx.stockMovement.create({
          data: {
            organizationId: org.id,
            productId,
            movementType: 'TRANSFER_OUT',
            quantity: qty.neg().toNumber(),
            unitOfMeasure: line.unitOfMeasure,
            reference: `Transfer Order ${order.id}`,
            notes: `Shipped from ${order.fromWarehouse.code} to ${order.toWarehouse.code}`,
            fromWarehouse: order.fromWarehouse.name,
            toWarehouse: order.toWarehouse.name,
            unitCost: avgCost.toNumber(),
            totalCost: qty.times(avgCost).toNumber(),
          },
        });

        // If lot tracked, decrement lot quantity
        if (line.lotId) {
          const lot = await tx.inventoryLot.findFirst({
            where: { id: line.lotId, productId },
          });

          if (lot) {
            const lotQtyBefore = new Decimal(lot.quantity || 0);
            const lotAvailableBefore = new Decimal(lot.availableQuantity || 0);

            if (lotAvailableBefore.lessThan(qty)) {
              throw new Error(`Insufficient lot quantity for lot ${lot.lotNumber}`);
            }

            await tx.inventoryLot.update({
              where: { id: line.lotId },
              data: {
                quantity: lotQtyBefore.minus(qty).toNumber(),
                availableQuantity: lotAvailableBefore.minus(qty).toNumber(),
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
          status: 'IN_TRANSIT',
          shippedAt: new Date(),
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Transfer order shipped successfully' });
  } catch (error) {
    console.error('Error shipping transfer order:', error);
    const message = error instanceof Error ? error.message : 'Failed to ship transfer order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
