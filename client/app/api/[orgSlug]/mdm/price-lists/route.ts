import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';
import { Permission } from '@/lib/permissions';

const createPriceListSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  currency: z.string().default('USD'),
  isDefault: z.boolean().default(false),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        price: z.number().positive(),
        minQuantity: z.number().optional(),
        maxQuantity: z.number().optional(),
      })
    )
    .optional(),
});

// GET /api/[orgSlug]/mdm/price-lists - List all price lists
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requirePermission(
      params.orgSlug,
      Permission.VIEW_PRICE_LISTS
    );

    const priceLists = await prisma.priceList.findMany({
      where: { organizationId },
      include: {
        prices: {
          include: {
            product: {
              select: {
                sku: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: priceLists,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch price lists',
      },
      { status: error.status || 500 }
    );
  }
}

// POST /api/[orgSlug]/mdm/price-lists - Create a new price list
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requirePermission(
      params.orgSlug,
      Permission.MANAGE_PRICE_LISTS
    );

    const body = await request.json();
    const { items, ...priceListData } = createPriceListSchema.parse(body);

    // If isDefault is true, unset other default price lists
    if (priceListData.isDefault) {
      await prisma.priceList.updateMany({
        where: {
          organizationId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const priceList = await prisma.priceList.create({
      data: {
        ...priceListData,
        organizationId,
        validFrom: priceListData.validFrom
          ? new Date(priceListData.validFrom)
          : undefined,
        validTo: priceListData.validTo ? new Date(priceListData.validTo) : undefined,
        prices: items
          ? {
              create: items.map((item) => ({
                productId: item.productId,
                price: item.price,
                minQuantity: item.minQuantity,
                maxQuantity: item.maxQuantity,
              })),
            }
          : undefined,
      },
      include: {
        prices: {
          include: {
            product: {
              select: {
                sku: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: priceList,
        message: 'Price list created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create price list',
      },
      { status: error.status || 500 }
    );
  }
}
