import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { Permission } from '@/lib/permissions';
import { workOrderSchema } from '@/lib/validation';

function generateWorkOrderNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `WO-${yyyy}${mm}${dd}-${random}`;
}

// GET /api/[orgSlug]/manufacturing/work-orders
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.VIEW_MANUFACTURING);

    const workOrders = await prisma.workOrder.findMany({
      where: { organizationId: org.id },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        bom: { select: { id: true, version: true, name: true } },
        routing: { select: { id: true, version: true, name: true } },
        materials: {
          include: {
            component: { select: { id: true, sku: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const data = workOrders.map((wo) => ({
      id: wo.id,
      workOrderNumber: wo.workOrderNumber,
      productId: wo.productId,
      productSku: wo.product?.sku,
      productName: wo.product?.name,
      status: wo.status,
      quantityPlanned: Number(wo.quantityPlanned),
      quantityCompleted: Number(wo.quantityCompleted),
      quantityScrapped: Number(wo.quantityScrapped),
      dueDate: wo.dueDate,
      priority: wo.priority,
      bom: wo.bom ? { id: wo.bom.id, version: wo.bom.version, name: wo.bom.name } : null,
      routing: wo.routing ? { id: wo.routing.id, version: wo.routing.version, name: wo.routing.name } : null,
      materials: wo.materials.map((m) => ({
        id: m.id,
        componentId: m.componentId,
        componentSku: m.component?.sku,
        componentName: m.component?.name,
        requiredQuantity: Number(m.requiredQuantity),
        issuedQuantity: Number(m.issuedQuantity),
        scrapPercent: Number(m.scrapPercent),
        backflush: m.backflush,
      })),
      createdAt: wo.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error listing work orders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch work orders' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/manufacturing/work-orders
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.MANAGE_MANUFACTURING);
    const body = await request.json();
    const parsed = workOrderSchema.safeParse(body);

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

    let bomLines: { componentId: string; requiredQuantity: number; scrapPercent: number; backflush: boolean }[] = [];

    if (input.bomId) {
      const bom = await prisma.billOfMaterial.findFirst({
        where: { id: input.bomId, organizationId: org.id },
        include: { lines: true },
      });

      if (!bom) {
        return NextResponse.json({ success: false, error: 'BOM not found for organization' }, { status: 404 });
      }

      bomLines = bom.lines.map((line) => {
        const factor = 1 + Number(line.scrapPercent) / 100;
        const required = Number(input.quantityPlanned) * Number(line.quantityPer) * factor;
        return {
          componentId: line.componentId,
          requiredQuantity: required,
          scrapPercent: Number(line.scrapPercent),
          backflush: line.backflush,
        };
      });
    }

    const workOrderNumber = input.workOrderNumber || generateWorkOrderNumber();

    const created = await prisma.workOrder.create({
      data: {
        organizationId: org.id,
        productId: input.productId,
        branchId: input.branchId,
        bomId: input.bomId,
        routingId: input.routingId,
        workCenterId: input.workCenterId,
        workOrderNumber,
        status: input.status,
        quantityPlanned: input.quantityPlanned,
        dueDate: input.dueDate,
        priority: input.priority,
        notes: input.notes,
        materials: bomLines.length
          ? {
              create: bomLines.map((line) => ({
                componentId: line.componentId,
                requiredQuantity: line.requiredQuantity,
                scrapPercent: line.scrapPercent,
                backflush: line.backflush,
              })),
            }
          : undefined,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: created.id,
          workOrderNumber: created.workOrderNumber,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating work order:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Work order number already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: false, error: 'Failed to create work order' }, { status: 500 });
  }
}
