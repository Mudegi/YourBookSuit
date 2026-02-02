/**
 * API: Safety Stock Management
 * POST /api/[orgSlug]/planning/safety-stock - Create safety stock rule
 * GET /api/[orgSlug]/planning/safety-stock - List safety stock rules
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(payload.role, Permission.MANAGE_SAFETY_STOCK)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      productId,
      warehouseId,
      calculationMethod,
      safetyStockQuantity,
      averageDemand,
      demandVariability,
      leadTimeDays,
      serviceLevel,
      notes,
    } = body;

    // Validation
    if (!productId || !calculationMethod || safetyStockQuantity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, calculationMethod, safetyStockQuantity' },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Create safety stock
    const safetyStock = await prisma.safetyStock.create({
      data: {
        organizationId: organization.id,
        productId,
        warehouseId,
        calculationMethod,
        safetyStockQuantity,
        averageDemand,
        demandVariability,
        leadTimeDays,
        serviceLevel,
        notes,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: safetyStock,
    });
  } catch (error: any) {
    console.error('Error creating safety stock:', error);
    return NextResponse.json(
      { error: 'Failed to create safety stock', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(payload.role, Permission.VIEW_SAFETY_STOCK)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const warehouseId = searchParams.get('warehouseId');
    const calculationMethod = searchParams.get('calculationMethod');

    // Build filter
    const where: any = {
      organizationId: organization.id,
    };

    if (productId) {
      where.productId = productId;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (calculationMethod) {
      where.calculationMethod = calculationMethod;
    }

    const safetyStocks = await prisma.safetyStock.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: safetyStocks,
    });
  } catch (error: any) {
    console.error('Error fetching safety stock:', error);
    return NextResponse.json(
      { error: 'Failed to fetch safety stock', details: error.message },
      { status: 500 }
    );
  }
}
