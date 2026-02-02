import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import DoubleEntryService from '@/services/accounting/double-entry.service';
import { EntryType, TransactionType } from '@prisma/client';
import { Permission } from '@/lib/permissions';

const issueSchema = z.object({
  lines: z
    .array(
      z.object({
        componentId: z.string().min(1, 'Component is required'),
        quantity: z.number().positive('Quantity must be positive'),
        lotId: z.string().optional(),
        binId: z.string().optional(),
        serialIds: z.array(z.string()).optional(),
        unitCost: z.number().min(0).optional(),
      })
    )
    .min(1, 'At least one line is required'),
  notes: z.string().optional(),
});

// POST /api/[orgSlug]/manufacturing/work-orders/[workOrderId]/issue
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string; workOrderId: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.MANAGE_MANUFACTURING);
    const body = await request.json();
    const parsed = issueSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const workOrder = await prisma.workOrder.findFirst({
      where: { id: params.workOrderId, organizationId: org.id },
      include: { materials: true, product: true },
    });

    if (!workOrder) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    const materialMap = new Map(
      workOrder.materials.map((m) => [m.componentId, m])
    );

    const now = new Date();

    // Track GL credits per component and total for debit
    const glCredits: { accountId: string; amount: number; description?: string }[] = [];
    let glDebitAmount = 0;

    await prisma.$transaction(async (tx) => {
      for (const line of parsed.data.lines) {
        const material = materialMap.get(line.componentId);
        if (!material) {
          throw new Error('Component not on work order');
        }

        const remaining = Number(material.requiredQuantity) - Number(material.issuedQuantity);
        if (line.quantity > remaining + 1e-6) {
          throw new Error('Issue quantity exceeds requirement');
        }

        // Resolve lot/bin if provided
        let lot = null;
        if (line.lotId) {
          lot = await tx.inventoryLot.findFirst({
            where: {
              id: line.lotId,
              organizationId: org.id,
              productId: line.componentId,
            },
          });
          if (!lot) {
            throw new Error('Lot not found for component');
          }
          if (Number(lot.quantityAvailable) < line.quantity) {
            throw new Error('Insufficient lot quantity');
          }
        }

        if (line.binId) {
          const bin = await tx.inventoryBin.findUnique({
            where: { id: line.binId },
            include: { warehouse: true },
          });
          if (!bin || bin.warehouse.organizationId !== org.id) {
            throw new Error('Bin not found');
          }
        }

        // Inventory item (aggregate)
        let inventory = await tx.inventoryItem.findFirst({
          where: { productId: line.componentId },
        });
        if (!inventory) {
          inventory = await tx.inventoryItem.create({
            data: {
              productId: line.componentId,
              warehouseLocation: 'Main',
              quantityOnHand: 0,
              quantityReserved: 0,
              quantityAvailable: 0,
              averageCost: 0,
              totalValue: 0,
            },
          });
        }

        const newQtyOnHand = Number(inventory.quantityOnHand) - line.quantity;
        if (newQtyOnHand < 0) {
          throw new Error('Insufficient inventory');
        }

        const unitCost = line.unitCost ?? Number(inventory.averageCost ?? 0);
        const totalCost = Math.abs(line.quantity) * unitCost;

        // Update lot if present
        if (lot) {
          await tx.inventoryLot.update({
            where: { id: lot.id },
            data: {
              quantityOnHand: Number(lot.quantityOnHand) - line.quantity,
              quantityAvailable: Number(lot.quantityAvailable) - line.quantity,
            },
          });
        }

        // Serial handling
        if (line.serialIds && line.serialIds.length) {
          const serials = await tx.inventorySerial.findMany({
            where: {
              id: { in: line.serialIds },
              organizationId: org.id,
              productId: line.componentId,
              status: { in: ['AVAILABLE', 'ALLOCATED'] },
            },
          });
          if (serials.length !== line.serialIds.length) {
            throw new Error('Serials not valid for issue');
          }

          await tx.inventorySerial.updateMany({
            where: { id: { in: line.serialIds } },
            data: { status: 'CONSUMED', consumedAt: now, workOrderId: workOrder.id },
          });
        }

        await tx.inventoryItem.update({
          where: { id: inventory.id },
          data: {
            quantityOnHand: newQtyOnHand,
            quantityAvailable: newQtyOnHand - Number(inventory.quantityReserved),
            totalValue: Math.max(0, Number(inventory.totalValue) - totalCost),
            averageCost: newQtyOnHand > 0 ? Math.max(0, (Number(inventory.totalValue) - totalCost) / newQtyOnHand) : 0,
          },
        });

        await tx.workOrderMaterial.update({
          where: { id: material.id },
          data: { issuedQuantity: Number(material.issuedQuantity) + line.quantity },
        });

        await tx.stockMovement.create({
          data: {
            productId: line.componentId,
            movementType: 'ADJUSTMENT',
            quantity: -line.quantity,
            unitCost,
            totalCost,
            warehouseLocation: 'Main',
            referenceType: 'WORK_ORDER_ISSUE',
            referenceId: workOrder.id,
            notes: parsed.data.notes,
            movementDate: now,
          },
        });

        // Prepare GL: credit component inventory asset, accumulate debit to manufacturing expense (COGS)
        const componentProduct = await tx.product.findUnique({ where: { id: line.componentId } });
        if (componentProduct?.assetAccountId) {
          glCredits.push({
            accountId: componentProduct.assetAccountId,
            amount: totalCost,
            description: `Issue to WO ${workOrder.workOrderNumber}`,
          });
          glDebitAmount += totalCost;
        }
      }

      // Move WO to IN_PROGRESS if still planned/released
      if (['PLANNED', 'RELEASED'].includes(workOrder.status)) {
        await tx.workOrder.update({
          where: { id: workOrder.id },
          data: { status: 'IN_PROGRESS' },
        });
      }
    });

    // Create GL transaction if we have accounts for credit and a debit account available
    try {
      // Resolve debit account: prefer finished good expenseAccountId, else any org COST_OF_SALES account
      const finishedGood = await prisma.product.findUnique({ where: { id: workOrder.productId } });
      let debitAccountId: string | null = finishedGood?.expenseAccountId || null;
      if (!debitAccountId) {
        const fallback = await prisma.chartOfAccount.findFirst({
          where: { organizationId: org.id, accountType: 'COST_OF_SALES' },
        });
        debitAccountId = fallback?.id || null;
      }

      if (debitAccountId && glCredits.length && glDebitAmount > 0) {
        await DoubleEntryService.createTransaction({
          organizationId: org.id,
          transactionDate: new Date(),
          transactionType: TransactionType.INVENTORY_ADJUSTMENT,
          description: `Issue materials to WO ${workOrder.workOrderNumber}`,
          referenceType: 'WorkOrder',
          referenceId: workOrder.id,
          createdById: user.id,
          entries: [
            { accountId: debitAccountId, entryType: EntryType.DEBIT, amount: glDebitAmount, description: 'Manufacturing materials issued' },
            ...glCredits.map((c) => ({ accountId: c.accountId, entryType: EntryType.CREDIT, amount: c.amount, description: c.description })),
          ],
        });
      }
    } catch (glErr) {
      console.warn('GL posting (issue) skipped:', glErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error issuing materials:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Failed to issue materials';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
