import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { EfrisApiService } from '@/lib/services/efris/efris-api.service';

/**
 * GET /api/orgs/[orgSlug]/efris/excise-codes
 * Fetch excise duty codes from EFRIS
 * Query params: excise_code, excise_name (for filtering)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    console.log('[EFRIS] Fetching excise codes for:', params.orgSlug);
    
    const { organizationId } = await requireAuth(params.orgSlug);
    console.log('[EFRIS] Organization ID:', organizationId);

    // Get EFRIS configuration
    const efrisConfig = await prisma.eInvoiceConfig.findUnique({
      where: { organizationId },
    });

    console.log('[EFRIS] Config found:', efrisConfig ? 'YES' : 'NO');
    console.log('[EFRIS] Config details:', {
      exists: !!efrisConfig,
      isActive: efrisConfig?.isActive,
      provider: efrisConfig?.provider,
      apiEndpoint: efrisConfig?.apiEndpoint,
      hasCredentials: !!efrisConfig?.credentials,
    });

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
    console.log('[EFRIS] Credentials structure:', {
      hasEfrisApiKey: !!credentials?.efrisApiKey,
      hasApiKey: !!credentials?.apiKey,
      credentialKeys: credentials ? Object.keys(credentials) : [],
    });
    
    const efrisApiKey = credentials?.efrisApiKey || credentials?.apiKey;

    if (!efrisApiKey || !efrisConfig.apiEndpoint) {
      return NextResponse.json(
        { error: 'EFRIS API credentials not configured' },
        { status: 400 }
      );
    }

    console.log('[EFRIS] Using API endpoint:', efrisConfig.apiEndpoint);

    // Get test mode from credentials
    const testMode = credentials?.efrisTestMode ?? true; // Default to test mode
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
    const excise_code = searchParams.get('excise_code') || undefined;
    const excise_name = searchParams.get('excise_name') || undefined;

    // Fetch excise codes from EFRIS
    const exciseCodes = await efrisService.getExciseCodes({
      excise_code,
      excise_name,
    });

    console.log('[EFRIS] Excise codes response:', JSON.stringify(exciseCodes, null, 2));

    // Check if response has expected structure
    if (!exciseCodes) {
      return NextResponse.json(
        { error: 'No response from EFRIS API' },
        { status: 500 }
      );
    }

    // Handle actual EFRIS API response structure (different from documentation)
    let exciseCodesList: any[] = [];
    
    // Unit code mapping
    const unitMapping: Record<string, string> = {
      '101': '%', // Percentage
      '102': 'per Litre',
      '103': 'per Kg',
      '104': 'per Piece',
      '105': 'per Pack',
      '106': 'per 1,000 sticks',
      '107': 'per 50kgs',
      'TNE': 'per Metric ton (1000 kg)',
    };
    
    if (exciseCodes.excise_codes && Array.isArray(exciseCodes.excise_codes)) {
      // New API structure: { success, excise_codes: [...], total }
      exciseCodesList = exciseCodes.excise_codes.map((code: any) => {
        // Build detailed rate text
        let rateText = '';
        if (code.rate && code.unit) {
          const unitDisplay = unitMapping[code.unit] || code.unit;
          if (code.unit === '101' || code.unit === '%') {
            // Percentage rate
            rateText = `${code.rate}%`;
          } else {
            // Fixed amount rate
            const currency = code.currency || 'UGX';
            rateText = `${currency}${code.rate} ${unitDisplay}`;
          }
          
          // If excise_rule is "2", there might be dual rates (percentage + fixed)
          // This would need more complex handling based on actual data
        } else if (code.rate) {
          rateText = code.rate;
        }
        
        return {
          exciseDutyCode: code.code,
          goodService: code.name || '',
          rateText: rateText,
          effectiveDate: '',
          parentCode: '',
          isLeafNode: '1',
          rate: code.rate,
          unit: code.unit,
          unitDisplay: unitMapping[code.unit] || code.unit,
          currency: code.currency,
          excise_rule: code.excise_rule,
        };
      });
    } else if (exciseCodes.data && exciseCodes.data.exciseDutyList) {
      // Original documented structure: { data: { exciseDutyList: [...] } }
      exciseCodesList = exciseCodes.data.exciseDutyList;
    } else {
      console.error('[EFRIS] Invalid response structure:', exciseCodes);
      return NextResponse.json(
        { error: 'Invalid response structure from EFRIS API', details: exciseCodes },
        { status: 500 }
      );
    }

    // Optionally cache the codes in the database for offline access
    // (You might want to create an EFRISExcisableList table and store them)
    if (exciseCodes.success && exciseCodesList.length > 0) {
      // TODO: Implement caching if needed
      // await prisma.eFRISExcisableList.createMany({
      //   data: exciseCodesList.map(code => ({
      //     organizationId,
      //     exciseDutyCode: code.exciseDutyCode,
      //     goodService: code.goodService,
      //     ...
      //   })),
      //   skipDuplicates: true,
      // });
    }

    return NextResponse.json({
      success: true,
      data: exciseCodesList,
      total: exciseCodesList.length,
    });
  } catch (error: any) {
    console.error('[EFRIS] Error fetching excise codes:', error);
    console.error('[EFRIS] Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch excise codes',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
