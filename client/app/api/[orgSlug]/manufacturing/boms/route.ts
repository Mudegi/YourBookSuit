import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { Permission } from '@/lib/permissions';
import { bomSchema } from '@/lib/validation';
import { BOMService } from '@/services/manufacturing/bom.service';

// GET /api/[orgSlug]/manufacturing/boms
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'read');

    const data = await BOMService.listBOMs(org.id);
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
    ensurePermission(membership.role, 'create');
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

    // Circular reference check
    const cycle = await BOMService.detectCircularReference(input.productId, componentIds, org.id);
    if (cycle) {
      return NextResponse.json(
        { success: false, error: `Circular reference detected: ${cycle.join(' → ')}` },
        { status: 400 }
      );
    }

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
