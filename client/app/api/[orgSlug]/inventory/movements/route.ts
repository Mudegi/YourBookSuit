import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';

const movementSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  movementType: z.enum(['PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'WRITE_OFF']),
  quantity: z.number().refine((q) => q !== 0, 'Quantity cannot be zero'),
  unitCost: z.number().min(0).default(0),
  warehouseLocation: z.string().default('Main'),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
  movementDate: z.coerce.date().optional(),
});

// GET /api/[orgSlug]/inventory/movements
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const movements = await prisma.stockMovement.findMany({
      where: { product: { organizationId: org.id } },
      include: {
        product: { select: { id: true, sku: true, name: true, unitOfMeasure: true } },
      },
      orderBy: { movementDate: 'desc' },
      take: 200,
    });

    const data = movements.map((m) => ({
      id: m.id,
      productId: m.productId,
      productName: m.product?.name,
      sku: m.product?.sku,
      movementType: m.movementType,
      quantity: Number(m.quantity),
      unitCost: Number(m.unitCost),
      totalCost: Number(m.totalCost),
      warehouseLocation: m.warehouseLocation,
      referenceType: m.referenceType,
      referenceId: m.referenceId,
      notes: m.notes,
      movementDate: m.movementDate,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error listing stock movements:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stock movements' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/inventory/movements
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);
    const body = await request.json();
    const parsed = movementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    const product = await prisma.product.findFirst({
      where: { id: input.productId, organizationId: org.id },
      include: { inventoryItems: true },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Ensure inventory record exists
    let inventory = product.inventoryItems[0];
    if (!inventory) {
      inventory = await prisma.inventoryItem.create({
        data: {
          productId: product.id,
          warehouseLocation: input.warehouseLocation || 'Main',
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityAvailable: 0,
          averageCost: product.purchasePrice,
          totalValue: 0,
        },
      });
    }

    // Determine quantity delta and cost impact
    const movementDate = input.movementDate || new Date();
    const sign = input.movementType === 'SALE' || input.movementType === 'WRITE_OFF' ? -1 : 1;
    const qtyDelta = input.movementType === 'ADJUSTMENT' ? input.quantity : sign * Math.abs(input.quantity);

    const newQuantityOnHand = Number(inventory.quantityOnHand) + qtyDelta;
    const totalCostDelta = input.unitCost * Math.abs(input.quantity);
    const newTotalValue = Math.max(0, Number(inventory.totalValue) + (qtyDelta >= 0 ? totalCostDelta : -totalCostDelta));
    const newAverageCost = newQuantityOnHand !== 0 ? newTotalValue / newQuantityOnHand : 0;

    if (newQuantityOnHand < 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient inventory for this movement' },
        { status: 400 }
      );
    }

    const movement = await prisma.$transaction(async (tx) => {
      const created = await tx.stockMovement.create({
        data: {
          productId: product.id,
          movementType: input.movementType,
          quantity: input.quantity,
          unitCost: input.unitCost,
          totalCost: totalCostDelta,
          warehouseLocation: input.warehouseLocation || 'Main',
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          notes: input.notes,
          movementDate,
        },
      });

      await tx.inventoryItem.update({
        where: { id: inventory!.id },
        data: {
          quantityOnHand: newQuantityOnHand,
          quantityAvailable: newQuantityOnHand - Number(inventory.quantityReserved),
          averageCost: newAverageCost,
          totalValue: newTotalValue,
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, data: { id: movement.id } }, { status: 201 });
  } catch (error) {
    console.error('Error creating stock movement:', error);
    return NextResponse.json({ success: false, error: 'Failed to create stock movement' }, { status: 500 });
  }
}
