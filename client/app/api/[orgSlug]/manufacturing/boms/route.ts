import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { Permission } from '@/lib/permissions';
import { bomSchema } from '@/lib/validation';

// GET /api/[orgSlug]/manufacturing/boms
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.VIEW_MANUFACTURING);

    const boms = await prisma.billOfMaterial.findMany({
      where: { organizationId: org.id },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        lines: {
          include: {
            component: { select: { id: true, sku: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const data = boms.map((bom) => ({
      id: bom.id,
      productId: bom.productId,
      productSku: bom.product?.sku,
      productName: bom.product?.name,
      name: bom.name,
      version: bom.version,
      status: bom.status,
      isDefault: bom.isDefault,
      yieldPercent: Number(bom.yieldPercent),
      scrapPercent: Number(bom.scrapPercent),
      effectiveFrom: bom.effectiveFrom,
      effectiveTo: bom.effectiveTo,
      lines: bom.lines.map((line) => ({
        id: line.id,
        componentId: line.componentId,
        componentSku: line.component?.sku,
        componentName: line.component?.name,
        quantityPer: Number(line.quantityPer),
        scrapPercent: Number(line.scrapPercent),
        backflush: line.backflush,
        operationSeq: line.operationSeq,
      })),
      createdAt: bom.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error listing BOMs:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch BOMs' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/manufacturing/boms
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.MANAGE_MANUFACTURING);
    const body = await request.json();
    const parsed = bomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    const finishedGood = await prisma.product.findFirst({
      where: { id: input.productId, organizationId: org.id },
      select: { id: true },
    });

    if (!finishedGood) {
      return NextResponse.json({ success: false, error: 'Finished good not found' }, { status: 404 });
    }

    const componentIds = Array.from(new Set(input.lines.map((l) => l.componentId)));
    const components = await prisma.product.findMany({
      where: { id: { in: componentIds }, organizationId: org.id },
      select: { id: true },
    });

    if (components.length !== componentIds.length) {
      return NextResponse.json({ success: false, error: 'One or more components are invalid' }, { status: 400 });
    }

    const created = await prisma.billOfMaterial.create({
      data: {
        organizationId: org.id,
        productId: input.productId,
        name: input.name,
        version: input.version,
        status: input.status,
        isDefault: input.isDefault,
        yieldPercent: input.yieldPercent,
        scrapPercent: input.scrapPercent,
        lines: {
          create: input.lines.map((line) => ({
            componentId: line.componentId,
            quantityPer: line.quantityPer,
            scrapPercent: line.scrapPercent,
            backflush: line.backflush,
            operationSeq: line.operationSeq,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, data: { id: created.id } }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating BOM:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'BOM version already exists for this product' },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: false, error: 'Failed to create BOM' }, { status: 500 });
  }
}
