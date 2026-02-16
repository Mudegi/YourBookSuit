/**
 * Individual Product API Route
 * Handles GET /api/[orgSlug]/products/[productId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; productId: string } }
) {
  try {
    const { orgSlug, productId } = params;

    console.log('GET Individual Product:', { orgSlug, productId });

    // Find organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      console.log('Organization not found:', orgSlug);
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    console.log('Found organization:', organization.id);

    // Find product
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
        organizationId: organization.id,
      },
      include: {
        reorderPolicies: true,
      }
    });

    if (!product) {
      console.log('Product not found:', productId);
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    console.log('Found product:', product.name);

    return NextResponse.json({
      success: true,
      data: product,
    });

  } catch (error) {
    console.error('Error in GET /api/[orgSlug]/products/[productId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; productId: string } }
) {
  try {
    const { orgSlug, productId } = params;
    const body = await request.json();

    console.log('PUT Individual Product:', { orgSlug, productId, body });

    // Find organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      console.log('Organization not found:', orgSlug);
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Update product
    const product = await prisma.product.update({
      where: {
        id: productId,
        organizationId: organization.id,
      },
      data: {
        name: body.name,
        sku: body.sku,
        category: body.category,
        purchasePrice: body.purchasePrice,
        productType: body.productType,
        description: body.description,
      },
      include: {
        reorderPolicies: true,
      }
    });

    console.log('Updated product:', product.name);

    return NextResponse.json({
      success: true,
      data: product,
    });

  } catch (error) {
    console.error('Error in PUT /api/[orgSlug]/products/[productId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}