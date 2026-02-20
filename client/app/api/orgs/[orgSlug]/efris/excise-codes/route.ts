import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { EfrisApiService } from '@/lib/services/efris/efris-api.service';

// Unit code mapping for display
const unitMapping: Record<string, string> = {
  '101': '%',
  '102': 'per Litre',
  '103': 'per Kg',
  '104': 'per Piece',
  '105': 'per Pack',
  '106': 'per 1,000 sticks',
  '107': 'per 50kgs',
  'TNE': 'per Metric ton (1000 kg)',
};

/**
 * Build a human-readable rate text from rate + unit
 */
function buildRateText(rate?: string, unit?: string, currency?: string): string {
  if (!rate || !unit) return rate || '';
  const unitDisplay = unitMapping[unit] || unit;
  if (unit === '101' || unit === '%') {
    return `${rate}%`;
  }
  return `${currency || 'UGX'}${rate} ${unitDisplay}`;
}

/**
 * Sync excise duty codes from EFRIS API into local DB cache.
 * Returns the synced records.
 */
async function syncExciseCodesFromEfris(
  organizationId: string,
  efrisConfig: any,
  efrisApiKey: string,
  filter?: { excise_code?: string; excise_name?: string }
) {
  const efrisService = new EfrisApiService({
    apiBaseUrl: efrisConfig.apiEndpoint,
    apiKey: efrisApiKey,
    enabled: efrisConfig.isActive,
    testMode: (efrisConfig.credentials as any)?.efrisTestMode ?? true,
  });

  const exciseCodes = await efrisService.getExciseCodes({
    excise_code: filter?.excise_code,
    excise_name: filter?.excise_name,
  });

  if (!exciseCodes) {
    throw new Error('No response from EFRIS API');
  }

  // Normalize the response (middleware can return different shapes)
  let rawCodes: any[] = [];
  const responseAny = exciseCodes as any;
  if (responseAny.excise_codes && Array.isArray(responseAny.excise_codes)) {
    rawCodes = responseAny.excise_codes;
  } else if (exciseCodes.data?.exciseDutyList) {
    rawCodes = exciseCodes.data.exciseDutyList.map((c: any) => ({
      code: c.exciseDutyCode,
      name: c.goodService,
      rate: c.exciseDutyDetailsList?.[0]?.rate,
      unit: c.exciseDutyDetailsList?.[0]?.type,
      currency: 'UGX',
      excise_rule: c.exciseDutyDetailsList?.[0]?.type === '101' ? '1' : '2',
    }));
  }

  if (rawCodes.length === 0) return [];

  const now = new Date();

  // Upsert each code into the cache
  const upsertPromises = rawCodes.map((code: any) => {
    const rateText = buildRateText(code.rate, code.unit, code.currency);
    return prisma.eFRISExcisableList.upsert({
      where: {
        organizationId_categoryCode: {
          organizationId,
          categoryCode: code.code,
        },
      },
      update: {
        categoryName: code.name || '',
        exciseRate: code.rate ? parseFloat(code.rate) : 0,
        exciseUnit: code.unit || null,
        exciseRule: code.excise_rule || null,
        currency: code.currency || 'UGX',
        rateText,
        lastSyncedAt: now,
        isActive: true,
      },
      create: {
        organizationId,
        categoryCode: code.code,
        categoryName: code.name || '',
        exciseRate: code.rate ? parseFloat(code.rate) : 0,
        exciseUnit: code.unit || null,
        exciseRule: code.excise_rule || null,
        currency: code.currency || 'UGX',
        rateText,
        lastSyncedAt: now,
        isActive: true,
        effectiveFrom: now,
      },
    });
  });

  return Promise.all(upsertPromises);
}

/**
 * GET /api/orgs/[orgSlug]/efris/excise-codes
 * 
 * Serves excise duty codes from local DB cache.
 * Add ?refresh=true to force a sync from EFRIS API and update the cache.
 * Add ?excise_name=... to filter by name (searches cache).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';
    const excise_code = searchParams.get('excise_code') || undefined;
    const excise_name = searchParams.get('excise_name') || undefined;

    // If refresh requested, fetch from EFRIS and populate cache first
    if (refresh) {
      const efrisConfig = await prisma.eInvoiceConfig.findUnique({
        where: { organizationId },
      });

      if (!efrisConfig?.isActive || efrisConfig.provider !== 'EFRIS') {
        return NextResponse.json(
          { error: 'EFRIS integration is not configured or not active' },
          { status: 400 }
        );
      }

      const credentials = efrisConfig.credentials as any;
      const efrisApiKey = credentials?.efrisApiKey || credentials?.apiKey;

      if (!efrisApiKey || !efrisConfig.apiEndpoint) {
        return NextResponse.json(
          { error: 'EFRIS API credentials not configured' },
          { status: 400 }
        );
      }

      await syncExciseCodesFromEfris(organizationId, efrisConfig, efrisApiKey);
    }

    // Serve from DB cache
    const whereClause: any = {
      organizationId,
      isActive: true,
    };

    if (excise_name) {
      whereClause.categoryName = {
        contains: excise_name,
        mode: 'insensitive',
      };
    }
    if (excise_code) {
      whereClause.categoryCode = {
        contains: excise_code,
        mode: 'insensitive',
      };
    }

    const cachedCodes = await prisma.eFRISExcisableList.findMany({
      where: whereClause,
      orderBy: { categoryCode: 'asc' },
    });

    // If cache is empty and not a refresh request, auto-sync once
    if (cachedCodes.length === 0 && !refresh) {
      const efrisConfig = await prisma.eInvoiceConfig.findUnique({
        where: { organizationId },
      });

      if (efrisConfig?.isActive && efrisConfig.provider === 'EFRIS') {
        const credentials = efrisConfig.credentials as any;
        const efrisApiKey = credentials?.efrisApiKey || credentials?.apiKey;

        if (efrisApiKey && efrisConfig.apiEndpoint) {
          try {
            await syncExciseCodesFromEfris(organizationId, efrisConfig, efrisApiKey);
            // Re-query after sync
            const freshCodes = await prisma.eFRISExcisableList.findMany({
              where: whereClause,
              orderBy: { categoryCode: 'asc' },
            });
            return NextResponse.json({
              success: true,
              data: freshCodes.map(mapCacheToResponse),
              total: freshCodes.length,
              source: 'efris_initial_sync',
            });
          } catch (syncErr) {
            console.error('[EFRIS] Auto-sync failed:', syncErr);
            // Fall through to return empty
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: cachedCodes.map(mapCacheToResponse),
      total: cachedCodes.length,
      source: refresh ? 'efris_refreshed' : 'cache',
    });
  } catch (error: any) {
    console.error('[EFRIS] Error fetching excise codes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch excise codes' },
      { status: 500 }
    );
  }
}

/**
 * Map a cached DB record to the response shape the UI expects
 */
function mapCacheToResponse(record: any) {
  return {
    exciseDutyCode: record.categoryCode,
    goodService: record.categoryName,
    rateText: record.rateText || '',
    effectiveDate: record.effectiveFrom?.toISOString?.() || '',
    parentCode: '',
    isLeafNode: '1',
    rate: record.exciseRate?.toString() || '',
    unit: record.exciseUnit || '',
    unitDisplay: unitMapping[record.exciseUnit] || record.exciseUnit || '',
    currency: record.currency || 'UGX',
    excise_rule: record.exciseRule || '',
  };
}
