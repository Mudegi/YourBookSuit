import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { Permission } from '@/lib/permissions';

const lotSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  lotNumber: z.string().min(1, 'Lot number is required'),
  warehouseId: z.string().optional(),
  binId: z.string().optional(),
  quantityOnHand: z.number().min(0).default(0),
  quantityReserved: z.number().min(0).default(0),
  status: z.enum(['ACTIVE', 'QUARANTINE', 'EXPIRED', 'CONSUMED', 'SCRAPPED']).default('ACTIVE'),
  expiryDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

// GET /api/[orgSlug]/warehouse/lots?productId=...&warehouseId=...
export async function GET(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.VIEW_WAREHOUSE);
    const productId = req.nextUrl.searchParams.get('productId') || undefined;
    const warehouseId = req.nextUrl.searchParams.get('warehouseId') || undefined;
    const status = req.nextUrl.searchParams.get('status') || undefined;

    const lots = await prisma.inventoryLot.findMany({
      where: {
        organizationId: org.id,
        productId: productId || undefined,
        warehouseId: warehouseId || undefined,
        status: status as any,
      },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        bin: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const data = lots.map((lot) => ({
      id: lot.id,
      lotNumber: lot.lotNumber,
      productId: lot.productId,
      productSku: lot.product?.sku,
      productName: lot.product?.name,
      warehouseId: lot.warehouseId,
      warehouseCode: lot.warehouse?.code,
      binId: lot.binId,
      binCode: lot.bin?.code,
      status: lot.status,
      quantityOnHand: Number(lot.quantityOnHand),
      quantityReserved: Number(lot.quantityReserved),
      quantityAvailable: Number(lot.quantityAvailable),
      receivedDate: lot.receivedDate,
      expiryDate: lot.expiryDate,
      notes: lot.notes,
      createdAt: lot.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error listing lots:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch lots' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/warehouse/lots
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.MANAGE_WAREHOUSE);
    const body = await request.json();
    const parsed = lotSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    const product = await prisma.product.findFirst({
      where: { id: input.productId, organizationId: org.id },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    let warehouseId: string | null = null;
    if (input.warehouseId) {
      const warehouse = await prisma.inventoryWarehouse.findFirst({
        where: { id: input.warehouseId, organizationId: org.id },
        select: { id: true },
      });
      if (!warehouse) {
        return NextResponse.json({ success: false, error: 'Warehouse not found' }, { status: 404 });
      }
      warehouseId = warehouse.id;
    }

    if (input.binId) {
      const bin = await prisma.inventoryBin.findUnique({
        where: { id: input.binId },
        include: { warehouse: true },
      });

      if (!bin || bin.warehouse.organizationId !== org.id) {
        return NextResponse.json({ success: false, error: 'Bin not found' }, { status: 404 });
      }

      warehouseId = bin.warehouseId;
    }

    const quantityAvailable = input.quantityOnHand - input.quantityReserved;

    const created = await prisma.inventoryLot.create({
      data: {
        organizationId: org.id,
        productId: input.productId,
        warehouseId: warehouseId || undefined,
        binId: input.binId,
        lotNumber: input.lotNumber,
        status: input.status,
        quantityOnHand: input.quantityOnHand,
        quantityReserved: input.quantityReserved,
        quantityAvailable,
        expiryDate: input.expiryDate,
        notes: input.notes,
      },
    });

    return NextResponse.json({ success: true, data: { id: created.id } }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating lot:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Lot number already exists for this product' },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: false, error: 'Failed to create lot' }, { status: 500 });
  }
}
