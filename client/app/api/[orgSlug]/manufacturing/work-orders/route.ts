import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { workOrderSchema } from '@/lib/validation';
import { WorkOrderService } from '@/services/manufacturing/work-order.service';

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

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const data = await WorkOrderService.listWorkOrders(org.id);

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
    ensurePermission(membership.role, 'create');
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
