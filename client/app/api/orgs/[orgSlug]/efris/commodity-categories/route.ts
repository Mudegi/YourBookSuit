import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { EfrisApiService } from '@/lib/services/efris/efris-api.service';

/**
 * Sync commodity categories from EFRIS API into local DB cache.
 */
async function syncCommodityCategoriesFromEfris(
  organizationId: string,
  efrisConfig: any,
  efrisApiKey: string,
  pageNo = 1,
  pageSize = 100
) {
  const credentials = efrisConfig.credentials as any;
  const efrisService = new EfrisApiService({
    apiBaseUrl: efrisConfig.apiEndpoint,
    apiKey: efrisApiKey,
    enabled: efrisConfig.isActive,
    testMode: credentials?.efrisTestMode ?? true,
  });

  const response = await efrisService.getCommodityCategories({ pageNo, pageSize });

  if (!response?.data?.records || response.data.records.length === 0) {
    return [];
  }

  const now = new Date();
  const records = response.data.records;

  // Upsert each category into cache
  const upsertPromises = records.map((cat: any) =>
    prisma.eFRISCommodityCategory.upsert({
      where: {
        organizationId_commodityCategoryCode: {
          organizationId,
          commodityCategoryCode: cat.commodityCategoryCode,
        },
      },
      update: {
        commodityCategoryName: cat.commodityCategoryName || '',
        parentCode: cat.parentCode || null,
        commodityCategoryLevel: cat.commodityCategoryLevel || null,
        rate: cat.rate || null,
        isLeafNode: cat.isLeafNode || null,
        serviceMark: cat.serviceMark || null,
        isZeroRate: cat.isZeroRate || null,
        isExempt: cat.isExempt || null,
        excisable: cat.excisable || null,
        lastSyncedAt: now,
        isActive: true,
      },
      create: {
        organizationId,
        commodityCategoryCode: cat.commodityCategoryCode,
        commodityCategoryName: cat.commodityCategoryName || '',
        parentCode: cat.parentCode || null,
        commodityCategoryLevel: cat.commodityCategoryLevel || null,
        rate: cat.rate || null,
        isLeafNode: cat.isLeafNode || null,
        serviceMark: cat.serviceMark || null,
        isZeroRate: cat.isZeroRate || null,
        isExempt: cat.isExempt || null,
        excisable: cat.excisable || null,
        lastSyncedAt: now,
        isActive: true,
      },
    })
  );

  await Promise.all(upsertPromises);

  return {
    synced: records.length,
    page: response.data.page,
  };
}

/**
 * GET /api/orgs/[orgSlug]/efris/commodity-categories
 * 
 * Serves commodity categories from local DB cache.
 * Add ?refresh=true to force sync from EFRIS API.
 * Add ?search=... to filter by name or code.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';
    const search = searchParams.get('search') || undefined;
    const pageNo = parseInt(searchParams.get('pageNo') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '100', 10);

    // If refresh requested, sync from EFRIS
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

      await syncCommodityCategoriesFromEfris(organizationId, efrisConfig, efrisApiKey, pageNo, pageSize);
    }

    // Serve from DB cache
    const whereClause: any = {
      organizationId,
      isActive: true,
    };

    if (search) {
      whereClause.OR = [
        { commodityCategoryName: { contains: search, mode: 'insensitive' } },
        { commodityCategoryCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const cachedCategories = await prisma.eFRISCommodityCategory.findMany({
      where: whereClause,
      orderBy: { commodityCategoryCode: 'asc' },
      take: pageSize,
      skip: (pageNo - 1) * pageSize,
    });

    const totalCount = await prisma.eFRISCommodityCategory.count({ where: whereClause });

    // If cache is empty and not a refresh, auto-sync once
    if (cachedCategories.length === 0 && !refresh) {
      const efrisConfig = await prisma.eInvoiceConfig.findUnique({
        where: { organizationId },
      });

      if (efrisConfig?.isActive && efrisConfig.provider === 'EFRIS') {
        const credentials = efrisConfig.credentials as any;
        const efrisApiKey = credentials?.efrisApiKey || credentials?.apiKey;

        if (efrisApiKey && efrisConfig.apiEndpoint) {
          try {
            await syncCommodityCategoriesFromEfris(organizationId, efrisConfig, efrisApiKey, pageNo, pageSize);
            const freshCategories = await prisma.eFRISCommodityCategory.findMany({
              where: whereClause,
              orderBy: { commodityCategoryCode: 'asc' },
              take: pageSize,
            });
            const freshCount = await prisma.eFRISCommodityCategory.count({ where: whereClause });

            return NextResponse.json({
              success: true,
              data: {
                records: freshCategories,
                page: { pageNo: pageNo.toString(), pageSize: pageSize.toString(), totalSize: freshCount.toString() },
              },
              source: 'efris_initial_sync',
            });
          } catch (syncErr) {
            console.error('[EFRIS] Auto-sync commodity categories failed:', syncErr);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        records: cachedCategories,
        page: {
          pageNo: pageNo.toString(),
          pageSize: pageSize.toString(),
          totalSize: totalCount.toString(),
        },
      },
      source: refresh ? 'efris_refreshed' : 'cache',
    });
  } catch (error: any) {
    console.error('[EFRIS] Error fetching commodity categories:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch commodity categories' },
      { status: 500 }
    );
  }
}
