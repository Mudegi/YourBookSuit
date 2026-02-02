import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import DoubleEntryService from '@/services/accounting/double-entry.service';
import { EntryType, TransactionType } from '@prisma/client';
import { Permission } from '@/lib/permissions';

const receiveSchema = z.object({
  quantity: z.number().positive('Quantity must be positive'),
  lotId: z.string().optional(),
  lotNumber: z.string().optional(),
  warehouseId: z.string().optional(),
  binId: z.string().optional(),
  unitCost: z.number().min(0).optional(),
  serialNumbers: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

function defaultLotNumber(workOrderNumber: string) {
  const now = new Date();
  return `${workOrderNumber}-LOT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

// POST /api/[orgSlug]/manufacturing/work-orders/[workOrderId]/receive
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string; workOrderId: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.MANAGE_MANUFACTURING);
    const body = await request.json();
    const parsed = receiveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const workOrder = await prisma.workOrder.findFirst({
      where: { id: params.workOrderId, organizationId: org.id },
      include: { product: true },
    });

    if (!workOrder) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    const now = new Date();
    const input = parsed.data;

    let totalCostDelta = 0;
    await prisma.$transaction(async (tx) => {
      // Resolve inventory item for finished good
      let inventory = await tx.inventoryItem.findFirst({ where: { productId: workOrder.productId } });
      if (!inventory) {
        inventory = await tx.inventoryItem.create({
          data: {
            productId: workOrder.productId,
            warehouseLocation: 'Main',
            quantityOnHand: 0,
            quantityReserved: 0,
            quantityAvailable: 0,
            averageCost: 0,
            totalValue: 0,
          },
        });
      }

      // Resolve warehouse/bin
      let warehouseId: string | null = null;
      if (input.warehouseId) {
        const warehouse = await tx.inventoryWarehouse.findFirst({
          where: { id: input.warehouseId, organizationId: org.id },
          select: { id: true },
        });
        if (!warehouse) throw new Error('Warehouse not found');
        warehouseId = warehouse.id;
      }

      if (input.binId) {
        const bin = await tx.inventoryBin.findUnique({
          where: { id: input.binId },
          include: { warehouse: true },
        });
        if (!bin || bin.warehouse.organizationId !== org.id) {
          throw new Error('Bin not found');
        }
        warehouseId = bin.warehouseId;
      }

      // Resolve or create lot
      let lotId: string | undefined = input.lotId;
      if (input.lotId) {
        const lot = await tx.inventoryLot.findFirst({
          where: { id: input.lotId, organizationId: org.id, productId: workOrder.productId },
        });
        if (!lot) throw new Error('Lot not found');
        lotId = lot.id;
      }

      if (!lotId) {
        const lotNumber = input.lotNumber || defaultLotNumber(workOrder.workOrderNumber);
        const existingLot = await tx.inventoryLot.findFirst({
          where: { organizationId: org.id, productId: workOrder.productId, lotNumber },
        });

        if (existingLot) {
          lotId = existingLot.id;
          await tx.inventoryLot.update({
            where: { id: existingLot.id },
            data: {
              warehouseId: warehouseId || existingLot.warehouseId,
              binId: input.binId || existingLot.binId,
              quantityOnHand: Number(existingLot.quantityOnHand) + input.quantity,
              quantityAvailable: Number(existingLot.quantityAvailable) + input.quantity,
            },
          });
        } else {
          const createdLot = await tx.inventoryLot.create({
            data: {
              organizationId: org.id,
              productId: workOrder.productId,
              warehouseId: warehouseId || undefined,
              binId: input.binId,
              lotNumber,
              status: 'ACTIVE',
              quantityOnHand: input.quantity,
              quantityReserved: 0,
              quantityAvailable: input.quantity,
              receivedDate: now,
            },
          });
          lotId = createdLot.id;
        }
      } else {
        // Lot exists; increment quantities
        const lot = await tx.inventoryLot.findUnique({ where: { id: lotId } });
        if (!lot) throw new Error('Lot not found after resolution');
        await tx.inventoryLot.update({
          where: { id: lot.id },
          data: {
            warehouseId: warehouseId || lot.warehouseId,
            binId: input.binId || lot.binId,
            quantityOnHand: Number(lot.quantityOnHand) + input.quantity,
            quantityAvailable: Number(lot.quantityAvailable) + input.quantity,
          },
        });
      }

      const newQtyOnHand = Number(inventory.quantityOnHand) + input.quantity;
      const unitCost = input.unitCost ?? Number(inventory.averageCost ?? workOrder.product.purchasePrice ?? 0);
      totalCostDelta = unitCost * input.quantity;

      await tx.inventoryItem.update({
        where: { id: inventory.id },
        data: {
          quantityOnHand: newQtyOnHand,
          quantityAvailable: newQtyOnHand - Number(inventory.quantityReserved),
          totalValue: Number(inventory.totalValue) + totalCostDelta,
          averageCost: newQtyOnHand > 0 ? (Number(inventory.totalValue) + totalCostDelta) / newQtyOnHand : 0,
        },
      });

      if (input.serialNumbers && input.serialNumbers.length) {
        const serialCreates = input.serialNumbers.map((sn) => ({
          organizationId: org.id,
          productId: workOrder.productId,
          lotId,
          warehouseId: warehouseId || undefined,
          binId: input.binId,
          workOrderId: workOrder.id,
          serialNumber: sn,
          status: 'AVAILABLE',
          receivedAt: now,
        }));
        await tx.inventorySerial.createMany({ data: serialCreates, skipDuplicates: true });
      }

      await tx.stockMovement.create({
        data: {
          productId: workOrder.productId,
          movementType: 'ADJUSTMENT',
          quantity: input.quantity,
          unitCost,
          totalCost: totalCostDelta,
          warehouseLocation: 'Main',
          referenceType: 'WORK_ORDER_RECEIPT',
          referenceId: workOrder.id,
          notes: input.notes,
          movementDate: now,
        },
      });

      await tx.workOrder.update({
        where: { id: workOrder.id },
        data: {
          quantityCompleted: Number(workOrder.quantityCompleted) + input.quantity,
          status:
            Number(workOrder.quantityCompleted) + input.quantity >= Number(workOrder.quantityPlanned)
              ? 'COMPLETED'
              : workOrder.status,
        },
      });
    });

    // GL: debit finished good inventory asset, credit manufacturing expense (COGS or product expense)
    try {
      const fg = await prisma.product.findUnique({ where: { id: workOrder.productId } });
      const debitAccountId = fg?.assetAccountId || null;
      let creditAccountId: string | null = fg?.expenseAccountId || null;
      if (!creditAccountId) {
        const fallback = await prisma.chartOfAccount.findFirst({
          where: { organizationId: org.id, accountType: 'COST_OF_SALES' },
        });
        creditAccountId = fallback?.id || null;
      }

      if (debitAccountId && creditAccountId && totalCostDelta > 0) {
        await DoubleEntryService.createTransaction({
          organizationId: org.id,
          transactionDate: new Date(),
          transactionType: TransactionType.INVENTORY_ADJUSTMENT,
          description: `Receive FG from WO ${workOrder.workOrderNumber}`,
          referenceType: 'WorkOrder',
          referenceId: workOrder.id,
          createdById: user.id,
          entries: [
            { accountId: debitAccountId, entryType: EntryType.DEBIT, amount: totalCostDelta, description: 'FG received to inventory' },
            { accountId: creditAccountId, entryType: EntryType.CREDIT, amount: totalCostDelta, description: 'Manufacturing cost credited' },
          ],
        });
      }
    } catch (glErr) {
      console.warn('GL posting (receive) skipped:', glErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error receiving finished goods:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Failed to receive finished goods';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
