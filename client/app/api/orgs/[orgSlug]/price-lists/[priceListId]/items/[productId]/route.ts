import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; priceListId: string; productId: string } }
) {
  try {
    const user = await requirePermission(params.orgSlug, 'PRICE_LISTS.VIEW');

    const { searchParams } = new URL(request.url);
    const quantity = parseFloat(searchParams.get('quantity') || '1');

    // Find the best price for the given quantity
    const priceListItem = await prisma.priceListItem.findFirst({
      where: {
        priceListId: params.priceListId,
        productId: params.productId,
        OR: [
          { minQuantity: null },
          { minQuantity: { lte: quantity } },
        ],
      },
      orderBy: {
        minQuantity: 'desc',
      },
    });

    if (!priceListItem) {
      // Fallback to product price
      const product = await prisma.product.findUnique({
        where: { id: params.productId },
        select: { unitPrice: true },
      });

      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        price: Number(product.unitPrice),
        source: 'product',
      });
    }

    return NextResponse.json({
      price: Number(priceListItem.price),
      minQuantity: priceListItem.minQuantity ? Number(priceListItem.minQuantity) : null,
      maxQuantity: priceListItem.maxQuantity ? Number(priceListItem.maxQuantity) : null,
      source: 'pricelist',
    });
  } catch (error: any) {
    console.error('Error fetching price list item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch price' },
      { status: 500 }
    );
  }
}
