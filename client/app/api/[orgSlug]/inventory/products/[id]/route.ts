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
      include: { 
        inventoryItems: true,
        unitOfMeasure: true,
      },
    });

    if (!product) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const inventory = product.inventoryItems?.[0];

    return NextResponse.json({
      success: true,
      data: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        productType: product.productType,
        category: product.category || '',
        unitOfMeasureId: product.unitOfMeasureId || '',
        unitOfMeasure: product.unitOfMeasure,
        purchasePrice: Number(product.purchasePrice),
        sellingPrice: Number(product.sellingPrice),
        trackInventory: product.trackInventory,
        reorderLevel: product.reorderLevel ? Number(product.reorderLevel) : null,
        reorderQuantity: product.reorderQuantity ? Number(product.reorderQuantity) : null,
        taxable: product.taxable,
        defaultTaxRate: Number(product.defaultTaxRate),
        exciseDutyCode: product.exciseDutyCode || '',
        goodsCategoryId: product.goodsCategoryId || '',
        efrisProductCode: product.efrisProductCode,
        efrisRegisteredAt: product.efrisRegisteredAt,
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
    
    const json = await req.json();
    const parsed = productSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    // Check if product exists and belongs to org
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: params.id,
        organizationId: org.id,
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Update product
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
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
        ...(input.goodsCategoryId !== undefined && { goodsCategoryId: input.goodsCategoryId ?? null }),
      },
    });

    return NextResponse.json({ success: true, data: { id: product.id } });
  } catch (error: any) {
    console.error('Error updating product:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error meta:', error.meta);
    
    if (error.code === 'P2002') {
      // P2002 = Unique constraint violation
      // Note: SKU can be duplicated (it's a commodity category code shared by multiple products)
      // Only specific fields like item codes should be unique
      const target = error.meta?.target;
      return NextResponse.json(
        { success: false, error: `Duplicate value for ${target || 'unique field'}. Please check your input.` },
        { status: 409 }
      );
    }
    
    // P2025 = Record not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Check if it's a Prisma validation error
    if (error.code && error.code.startsWith('P')) {
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: false, error: error.message || 'Failed to update product' }, { status: 500 });
  }
}
