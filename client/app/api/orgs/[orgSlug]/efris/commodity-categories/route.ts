import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { EfrisApiService } from '@/lib/services/efris/efris-api.service';

/**
 * GET /api/orgs/[orgSlug]/efris/commodity-categories
 * Fetch VAT commodity categories from EFRIS T124
 * Query params: pageNo, pageSize
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    console.log('[EFRIS] Fetching commodity categories for:', params.orgSlug);
    
    const { organizationId } = await requireAuth(params.orgSlug);
    console.log('[EFRIS] Organization ID:', organizationId);

    // Get EFRIS configuration
    const efrisConfig = await prisma.eInvoiceConfig.findUnique({
      where: { organizationId },
    });

    console.log('[EFRIS] Config found:', efrisConfig ? 'YES' : 'NO');

    if (!efrisConfig || !efrisConfig.isActive) {
      return NextResponse.json(
        { error: 'EFRIS integration is not configured or not active' },
        { status: 400 }
      );
    }

    if (efrisConfig.provider !== 'EFRIS') {
      return NextResponse.json(
        { error: 'E-invoice provider is not EFRIS' },
        { status: 400 }
      );
    }

    // Extract EFRIS credentials
    const credentials = efrisConfig.credentials as any;
    const efrisApiKey = credentials?.efrisApiKey || credentials?.apiKey;

    if (!efrisApiKey || !efrisConfig.apiEndpoint) {
      return NextResponse.json(
        { error: 'EFRIS API credentials not configured' },
        { status: 400 }
      );
    }

    console.log('[EFRIS] Using API endpoint:', efrisConfig.apiEndpoint);

    // Get test mode from credentials
    const testMode = credentials?.efrisTestMode ?? true;
    console.log('[EFRIS] Test mode:', testMode);

    // Initialize EFRIS service
    const efrisService = new EfrisApiService({
      apiBaseUrl: efrisConfig.apiEndpoint,
      apiKey: efrisApiKey,
      enabled: efrisConfig.isActive,
      testMode: testMode,
    });

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const pageNo = parseInt(searchParams.get('pageNo') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '100', 10);

    // Fetch commodity categories from EFRIS
    const commodityCategories = await efrisService.getCommodityCategories({
      pageNo,
      pageSize,
    });

    console.log('[EFRIS] Commodity categories response:', 
      commodityCategories.data?.records?.length || 0, 'records');

    // Check if response has expected structure
    if (!commodityCategories || !commodityCategories.data) {
      return NextResponse.json(
        { error: 'No response from EFRIS API' },
        { status: 500 }
      );
    }

    // Return the data
    return NextResponse.json({
      success: true,
      data: commodityCategories.data,
    });

  } catch (error: any) {
    console.error('[EFRIS] Error fetching commodity categories:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch commodity categories',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}
