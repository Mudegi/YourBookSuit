import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { productSchema } from '@/lib/validation';

// GET /api/[orgSlug]/inventory/products
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const products = await prisma.product.findMany({
      where: { organizationId: org.id },
      include: {
        inventoryItems: true,
        unitOfMeasure: true,
        _count: { select: { stockMovements: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = products.map((p) => {
      const inventory = p.inventoryItems?.[0];
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        productType: p.productType,
        category: p.category,
        unitOfMeasure: p.unitOfMeasure ? `${p.unitOfMeasure.name} (${p.unitOfMeasure.abbreviation})` : 'N/A',
        purchasePrice: Number(p.purchasePrice),
        sellingPrice: Number(p.sellingPrice),
        trackInventory: p.trackInventory,
        reorderLevel: p.reorderLevel ? Number(p.reorderLevel) : null,
        reorderQuantity: p.reorderQuantity ? Number(p.reorderQuantity) : null,
        taxable: p.taxable,
        defaultTaxRate: Number(p.defaultTaxRate),
        exciseDutyCode: p.exciseDutyCode || null,
        goodsCategoryId: p.goodsCategoryId || null,
        isActive: p.isActive,
        quantityOnHand: inventory ? Number(inventory.quantityOnHand) : 0,
        quantityAvailable: inventory ? Number(inventory.quantityAvailable) : 0,
        averageCost: inventory ? Number(inventory.averageCost) : 0,
        stockMovements: p._count.stockMovements,
        createdAt: p.createdAt,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error listing products:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/inventory/products
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { org } = await requireOrgMembership(user.id, params.orgSlug);
    const json = await request.json();
    const parsed = productSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    const product = await prisma.product.create({
      data: {
        organizationId: org.id,
        sku: input.sku,
        name: input.name,
        description: input.description,
        productType: input.productType,
        category: input.category,
        unitOfMeasureId: input.unitOfMeasureId,
        purchasePrice: input.purchasePrice,
        sellingPrice: input.sellingPrice,
        trackInventory: input.trackInventory,
        reorderLevel: input.reorderLevel ?? null,
        reorderQuantity: input.reorderQuantity ?? null,
        taxable: input.taxable,
        defaultTaxRate: input.defaultTaxRate,
        exciseDutyCode: input.exciseDutyCode ?? null,
        // Only include goodsCategoryId if defined (field may not exist in DB yet)
        ...(input.goodsCategoryId !== undefined && { goodsCategoryId: input.goodsCategoryId ?? null }),
      },
    });

    // Initialize inventory record when tracking inventory
    if (input.trackInventory) {
      await prisma.inventoryItem.create({
        data: {
          productId: product.id,
          warehouseLocation: 'Main',
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityAvailable: 0,
          averageCost: input.purchasePrice ?? 0,
          totalValue: 0,
        },
      });
    }

    return NextResponse.json({ success: true, data: { id: product.id } }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      // P2002 = Unique constraint violation
      // Note: SKU can be duplicated (it's a commodity category code)
      // Only specific fields like item codes should be unique
      const target = error.meta?.target;
      return NextResponse.json(
        { success: false, error: `Duplicate value for ${target || 'unique field'}. Please check your input.` },
        { status: 409 }
      );
    }

    console.error('Error creating product:', error);
    return NextResponse.json({ success: false, error: 'Failed to create product' }, { status: 500 });
  }
}
