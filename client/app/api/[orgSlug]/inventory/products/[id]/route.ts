import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { productSchema } from '@/lib/validation';

// GET /api/[orgSlug]/inventory/products/[id]
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const product = await prisma.product.findFirst({
      where: { id: params.id, organizationId: org.id },
      include: { inventoryItems: true },
    });

    if (!product) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const inventory = product.inventoryItems?.[0];

    return NextResponse.json({
      success: true,
      data: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        productType: product.productType,
        category: product.category,
        unitOfMeasure: product.unitOfMeasure,
        purchasePrice: Number(product.purchasePrice),
        sellingPrice: Number(product.sellingPrice),
        trackInventory: product.trackInventory,
        reorderLevel: product.reorderLevel ? Number(product.reorderLevel) : null,
        reorderQuantity: product.reorderQuantity ? Number(product.reorderQuantity) : null,
        taxable: product.taxable,
        defaultTaxRate: Number(product.defaultTaxRate),
        isActive: product.isActive,
        quantityOnHand: inventory ? Number(inventory.quantityOnHand) : 0,
        quantityAvailable: inventory ? Number(inventory.quantityAvailable) : 0,
        averageCost: inventory ? Number(inventory.averageCost) : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching product', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PUT /api/[orgSlug]/inventory/products/[id]
export async function PUT(req: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const body = await req.json();
    const parsed = productSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const existing = await prisma.product.findFirst({
      where: { id: params.id, organizationId: org.id },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    await prisma.product.update({
      where: { id: params.id },
      data: {
        sku: data.sku ?? existing.sku,
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        productType: (data as any).productType ?? existing.productType,
        category: data.category ?? existing.category,
        unitOfMeasure: data.unitOfMeasure ?? existing.unitOfMeasure,
        purchasePrice: data.purchasePrice ?? existing.purchasePrice,
        sellingPrice: data.sellingPrice ?? existing.sellingPrice,
        trackInventory: data.trackInventory ?? existing.trackInventory,
        reorderLevel: data.reorderLevel ?? existing.reorderLevel,
        reorderQuantity: data.reorderQuantity ?? existing.reorderQuantity,
        taxable: data.taxable ?? existing.taxable,
        defaultTaxRate: data.defaultTaxRate ?? existing.defaultTaxRate,
        isActive: (data as any).isActive ?? existing.isActive,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'SKU already exists for this organization' },
        { status: 409 }
      );
    }
    console.error('Error updating product', error);
    return NextResponse.json({ success: false, error: 'Failed to update product' }, { status: 500 });
  }
}
