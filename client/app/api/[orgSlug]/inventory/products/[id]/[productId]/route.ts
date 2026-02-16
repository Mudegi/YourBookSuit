import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { productSchema } from '@/lib/validation';

// GET /api/[orgSlug]/inventory/products/[productId]
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; productId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const product = await prisma.product.findFirst({
      where: {
        id: params.productId,
        organizationId: org.id,
      },
      include: {
        unitOfMeasure: true,
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const data = {
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
      efrisProductCode: product.efrisProductCode,
      efrisRegisteredAt: product.efrisRegisteredAt,
      isActive: product.isActive,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PUT /api/[orgSlug]/inventory/products/[productId]
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; productId: string } }
) {
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

    // Check if product exists and belongs to org
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: params.productId,
        organizationId: org.id,
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Update product
    const product = await prisma.product.update({
      where: { id: params.productId },
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
      },
    });

    return NextResponse.json({ success: true, data: { id: product.id } });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json({ success: false, error: 'Failed to update product' }, { status: 500 });
  }
}
