import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { Permission } from '@/lib/permissions';

const transferLineSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitOfMeasure: z.string().default('unit'),
  lotId: z.string().optional(),
  notes: z.string().optional(),
});

const transferSchema = z.object({
  fromWarehouseId: z.string().min(1, 'From warehouse is required'),
  toWarehouseId: z.string().min(1, 'To warehouse is required'),
  expectedShipDate: z.coerce.date().optional(),
  expectedReceiveDate: z.coerce.date().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(transferLineSchema).min(1, 'At least one line is required'),
});

// GET /api/[orgSlug]/warehouse/transfer-orders
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.VIEW_WAREHOUSE);

    const orders = await prisma.transferOrder.findMany({
      where: { organizationId: org.id },
      include: {
        fromWarehouse: { select: { id: true, code: true, name: true } },
        toWarehouse: { select: { id: true, code: true, name: true } },
        lines: {
          include: {
            product: { select: { id: true, sku: true, name: true } },
            lot: { select: { id: true, lotNumber: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const data = orders.map((o) => ({
      id: o.id,
      status: o.status,
      fromWarehouseId: o.fromWarehouseId,
      fromWarehouseCode: o.fromWarehouse?.code,
      toWarehouseId: o.toWarehouseId,
      toWarehouseCode: o.toWarehouse?.code,
      expectedShipDate: o.expectedShipDate,
      expectedReceiveDate: o.expectedReceiveDate,
      shippedAt: o.shippedAt,
      receivedAt: o.receivedAt,
      reference: o.reference,
      notes: o.notes,
      lines: o.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        productSku: l.product?.sku,
        productName: l.product?.name,
        quantity: Number(l.quantity),
        unitOfMeasure: l.unitOfMeasure,
        lotId: l.lotId,
        lotNumber: l.lot?.lotNumber,
        notes: l.notes,
      })),
      createdAt: o.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error listing transfer orders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch transfer orders' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/warehouse/transfer-orders
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.MANAGE_WAREHOUSE);
    const body = await request.json();
    const parsed = transferSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    if (input.fromWarehouseId === input.toWarehouseId) {
      return NextResponse.json(
        { success: false, error: 'From and To warehouse cannot be the same' },
        { status: 400 }
      );
    }

    const [fromWarehouse, toWarehouse] = await Promise.all([
      prisma.inventoryWarehouse.findFirst({ where: { id: input.fromWarehouseId, organizationId: org.id }, select: { id: true } }),
      prisma.inventoryWarehouse.findFirst({ where: { id: input.toWarehouseId, organizationId: org.id }, select: { id: true } }),
    ]);

    if (!fromWarehouse || !toWarehouse) {
      return NextResponse.json({ success: false, error: 'Warehouse not found' }, { status: 404 });
    }

    const productIds = Array.from(new Set(input.lines.map((l) => l.productId)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, organizationId: org.id },
      select: { id: true },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json({ success: false, error: 'One or more products are invalid' }, { status: 400 });
    }

    const lotIds = input.lines.map((l) => l.lotId).filter(Boolean) as string[];
    if (lotIds.length) {
      const lots = await prisma.inventoryLot.findMany({
        where: { id: { in: lotIds }, organizationId: org.id },
        select: { id: true },
      });
      if (lots.length !== lotIds.length) {
        return NextResponse.json({ success: false, error: 'One or more lots are invalid' }, { status: 400 });
      }
    }

    const created = await prisma.transferOrder.create({
      data: {
        organizationId: org.id,
        fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
        expectedShipDate: input.expectedShipDate,
        expectedReceiveDate: input.expectedReceiveDate,
        reference: input.reference,
        notes: input.notes,
        lines: {
          create: input.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitOfMeasure: line.unitOfMeasure,
            lotId: line.lotId,
            notes: line.notes,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, data: { id: created.id } }, { status: 201 });
  } catch (error) {
    console.error('Error creating transfer order:', error);
    return NextResponse.json({ success: false, error: 'Failed to create transfer order' }, { status: 500 });
  }
}
