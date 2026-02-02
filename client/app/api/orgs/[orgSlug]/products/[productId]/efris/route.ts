import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { EfrisApiService } from '@/lib/services/efris/efris-api.service';

/**
 * POST /api/orgs/[orgSlug]/products/[productId]/efris
 * Register a product with EFRIS
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; productId: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);
    const productId = params.productId;

    // Fetch the product
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        organizationId,
      },
      include: {
        unitOfMeasure: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get EFRIS configuration
    const config = await prisma.eInvoiceConfig.findFirst({
      where: {
        organizationId,
        isActive: true,
      },
    });

    if (!config) {
      return NextResponse.json(
        { error: 'EFRIS is not configured for this organization' },
        { status: 400 }
      );
    }

    // Extract EFRIS credentials from config
    const credentials = config.credentials as any;
    const efrisApiKey = credentials?.efrisApiKey || credentials?.apiKey;
    
    if (!efrisApiKey || !config.apiEndpoint) {
      return NextResponse.json(
        { error: 'EFRIS API credentials not configured' },
        { status: 400 }
      );
    }

    // Initialize EFRIS service
    const efrisService = new EfrisApiService({
      apiBaseUrl: config.apiEndpoint,
      apiKey: efrisApiKey,
      enabled: config.isActive,
    });

    // Register product with EFRIS
    const efrisResponse = await efrisService.registerProduct({
      product_code: product.sku,
      product_name: product.name,
      unit_of_measure: product.unitOfMeasure?.abbreviation || 'EA',
      unit_price: product.sellingPrice?.toNumber() || 0,
      tax_rate: product.defaultTaxRate?.toNumber() || 0,
      product_category: product.category || 'GENERAL',
    });

    // Update product with EFRIS registration info if needed
    // (You might want to add fields to store EFRIS product ID)

    return NextResponse.json({
      success: true,
      message: 'Product registered with EFRIS successfully',
      efrisResponse,
    });
  } catch (error: any) {
    console.error('Error registering product with EFRIS:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register product with EFRIS' },
      { status: 500 }
    );
  }
}
