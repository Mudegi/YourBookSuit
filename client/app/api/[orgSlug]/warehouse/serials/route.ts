import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { Permission } from '@/lib/permissions';

const serialSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  lotId: z.string().optional(),
  warehouseId: z.string().optional(),
  binId: z.string().optional(),
  status: z.enum(['AVAILABLE', 'ALLOCATED', 'IN_PROGRESS', 'CONSUMED', 'SCRAPPED']).default('AVAILABLE'),
  notes: z.string().optional(),
});

// GET /api/[orgSlug]/warehouse/serials?productId=...&status=...
export async function GET(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.VIEW_WAREHOUSE);
    const productId = req.nextUrl.searchParams.get('productId') || undefined;
    const status = req.nextUrl.searchParams.get('status') || undefined;

    const serials = await prisma.inventorySerial.findMany({
      where: {
        organizationId: org.id,
        productId: productId || undefined,
        status: status as any,
      },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        lot: { select: { id: true, lotNumber: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        bin: { select: { id: true, code: true, name: true } },
        workOrder: { select: { id: true, workOrderNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const data = serials.map((s) => ({
      id: s.id,
      serialNumber: s.serialNumber,
      productId: s.productId,
      productSku: s.product?.sku,
      productName: s.product?.name,
      lotId: s.lotId,
      lotNumber: s.lot?.lotNumber,
      warehouseId: s.warehouseId,
      warehouseCode: s.warehouse?.code,
      binId: s.binId,
      binCode: s.bin?.code,
      status: s.status,
      workOrderId: s.workOrderId,
      workOrderNumber: s.workOrder?.workOrderNumber,
      receivedAt: s.receivedAt,
      assignedAt: s.assignedAt,
      consumedAt: s.consumedAt,
      notes: s.notes,
      createdAt: s.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error listing serials:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch serials' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/warehouse/serials
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.MANAGE_WAREHOUSE);
    const body = await request.json();
    const parsed = serialSchema.safeParse(body);

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

    if (input.lotId) {
      const lot = await prisma.inventoryLot.findUnique({
        where: { id: input.lotId },
        select: { id: true, organizationId: true, warehouseId: true },
      });
      if (!lot || lot.organizationId !== org.id) {
        return NextResponse.json({ success: false, error: 'Lot not found' }, { status: 404 });
      }
      warehouseId = lot.warehouseId;
    }

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

    const created = await prisma.inventorySerial.create({
      data: {
        organizationId: org.id,
        productId: input.productId,
        lotId: input.lotId,
        warehouseId: warehouseId || undefined,
        binId: input.binId,
        serialNumber: input.serialNumber,
        status: input.status,
        notes: input.notes,
      },
    });

    return NextResponse.json({ success: true, data: { id: created.id } }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating serial:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Serial number already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: false, error: 'Failed to create serial' }, { status: 500 });
  }
}
