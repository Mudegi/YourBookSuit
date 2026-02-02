/**
 * API: Asset Reports
 * GET /api/[orgSlug]/reports/asset-register - Asset register report
 * GET /api/[orgSlug]/reports/depreciation-schedule - Depreciation schedule report
 * GET /api/[orgSlug]/reports/asset-summary - Asset summary by category
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true, name: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'asset-register';
    const categoryId = searchParams.get('categoryId');
    const branchId = searchParams.get('branchId');
    const status = searchParams.get('status') || 'ACTIVE';
    const asOfDate = searchParams.get('asOfDate')
      ? new Date(searchParams.get('asOfDate')!)
      : new Date();

    if (reportType === 'asset-register') {
      // Asset Register Report
      const where: any = {
        organizationId: organization.id,
      };

      if (categoryId) {
        where.categoryId = categoryId;
      }

      if (branchId) {
        where.branchId = branchId;
      }

      if (status) {
        where.status = status;
      }

      const assets = await prisma.asset.findMany({
        where,
        include: {
          category: {
            include: {
              assetAccount: true,
              depreciationAccount: true,
            },
          },
          branch: true,
          depreciationSchedule: {
            where: {
              periodEndDate: {
                lte: asOfDate,
              },
              posted: true,
            },
            orderBy: {
              periodEndDate: 'desc',
            },
            take: 1,
          },
        },
        orderBy: [
          {
            category: {
              code: 'asc',
            },
          },
          {
            assetNumber: 'asc',
          },
        ],
      });

      // Group by category
      const assetsByCategory: any = {};
      assets.forEach((asset) => {
        const categoryName = asset.category.name;
        if (!assetsByCategory[categoryName]) {
          assetsByCategory[categoryName] = {
            category: asset.category,
            assets: [],
            totalCost: 0,
            totalDepreciation: 0,
            totalBookValue: 0,
          };
        }

        assetsByCategory[categoryName].assets.push(asset);
        assetsByCategory[categoryName].totalCost += Number(asset.purchasePrice);
        assetsByCategory[categoryName].totalDepreciation += Number(
          asset.accumulatedDepreciation
        );
        assetsByCategory[categoryName].totalBookValue += Number(asset.currentBookValue);
      });

      // Calculate grand totals
      const grandTotal = {
        totalAssets: assets.length,
        totalCost: assets.reduce((sum, a) => sum + Number(a.purchasePrice), 0),
        totalDepreciation: assets.reduce(
          (sum, a) => sum + Number(a.accumulatedDepreciation),
          0
        ),
        totalBookValue: assets.reduce((sum, a) => sum + Number(a.currentBookValue), 0),
      };

      return NextResponse.json({
        success: true,
        data: {
          reportType: 'Asset Register',
          organization: organization.name,
          asOfDate,
          filters: {
            categoryId,
            branchId,
            status,
          },
          assetsByCategory,
          grandTotal,
        },
      });
    } else if (reportType === 'depreciation-schedule') {
      // Depreciation Schedule Report
      const startDate = searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : new Date(new Date().getFullYear(), 0, 1);
      const endDate = searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : new Date(new Date().getFullYear(), 11, 31);

      const where: any = {
        organizationId: organization.id,
        status: status || 'ACTIVE',
      };

      if (categoryId) {
        where.categoryId = categoryId;
      }

      const assets = await prisma.asset.findMany({
        where,
        include: {
          category: true,
          branch: true,
          depreciationSchedule: {
            where: {
              periodStartDate: {
                gte: startDate,
              },
              periodEndDate: {
                lte: endDate,
              },
            },
            orderBy: {
              periodStartDate: 'asc',
            },
          },
        },
        orderBy: {
          assetNumber: 'asc',
        },
      });

      // Calculate totals by period
      const periodTotals: any = {};
      assets.forEach((asset) => {
        asset.depreciationSchedule.forEach((schedule) => {
          if (!periodTotals[schedule.period]) {
            periodTotals[schedule.period] = {
              period: schedule.period,
              totalDepreciation: 0,
              totalTaxDepreciation: 0,
              assetsCount: 0,
            };
          }

          periodTotals[schedule.period].totalDepreciation += Number(
            schedule.depreciationAmount
          );
          periodTotals[schedule.period].totalTaxDepreciation += Number(
            schedule.taxDepreciationAmount || 0
          );
          periodTotals[schedule.period].assetsCount += 1;
        });
      });

      return NextResponse.json({
        success: true,
        data: {
          reportType: 'Depreciation Schedule',
          organization: organization.name,
          period: {
            startDate,
            endDate,
          },
          filters: {
            categoryId,
            status,
          },
          assets,
          periodTotals: Object.values(periodTotals),
          summary: {
            totalAssets: assets.length,
            totalDepreciation: Object.values(periodTotals).reduce(
              (sum: number, period: any) => sum + period.totalDepreciation,
              0
            ),
            totalTaxDepreciation: Object.values(periodTotals).reduce(
              (sum: number, period: any) => sum + period.totalTaxDepreciation,
              0
            ),
          },
        },
      });
    } else if (reportType === 'asset-summary') {
      // Asset Summary by Category
      const categories = await prisma.assetCategory.findMany({
        where: {
          organizationId: organization.id,
        },
        include: {
          assets: {
            where: {
              status: status || undefined,
            },
          },
          assetAccount: true,
          depreciationAccount: true,
          expenseAccount: true,
        },
        orderBy: {
          code: 'asc',
        },
      });

      const summary = categories.map((category) => {
        const totalCost = category.assets.reduce(
          (sum, asset) => sum + Number(asset.purchasePrice),
          0
        );
        const totalDepreciation = category.assets.reduce(
          (sum, asset) => sum + Number(asset.accumulatedDepreciation),
          0
        );
        const totalBookValue = category.assets.reduce(
          (sum, asset) => sum + Number(asset.currentBookValue),
          0
        );

        return {
          category: {
            id: category.id,
            name: category.name,
            code: category.code,
            ugandaTaxRate: category.ugandaTaxRate,
          },
          assetCount: category.assets.length,
          totalCost,
          totalDepreciation,
          totalBookValue,
          depreciationPercent: totalCost > 0 ? (totalDepreciation / totalCost) * 100 : 0,
        };
      });

      const grandTotal = {
        totalAssets: summary.reduce((sum, cat) => sum + cat.assetCount, 0),
        totalCost: summary.reduce((sum, cat) => sum + cat.totalCost, 0),
        totalDepreciation: summary.reduce((sum, cat) => sum + cat.totalDepreciation, 0),
        totalBookValue: summary.reduce((sum, cat) => sum + cat.totalBookValue, 0),
      };

      return NextResponse.json({
        success: true,
        data: {
          reportType: 'Asset Summary by Category',
          organization: organization.name,
          asOfDate,
          filters: {
            status,
          },
          summary,
          grandTotal,
        },
      });
    } else {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error generating asset report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error.message },
      { status: 500 }
    );
  }
}
