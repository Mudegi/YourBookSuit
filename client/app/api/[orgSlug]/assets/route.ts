/**
 * API: Fixed Assets Management
 * POST /api/[orgSlug]/assets - Create asset
 * GET /api/[orgSlug]/assets - List assets
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateDepreciationSchedule } from '@/lib/depreciation-service';

export async function POST(
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
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      categoryId,
      branchId,
      name,
      description,
      purchaseDate,
      purchasePrice,
      vendor,
      invoiceNumber,
      depreciationMethod,
      usefulLifeYears,
      salvageValue = 0,
      depreciationStartDate,
      location,
      serialNumber,
      model,
      manufacturer,
      tags = [],
      notes,
    } = body;

    // Validation
    if (!categoryId || !name || !purchaseDate || !purchasePrice || !depreciationMethod || !usefulLifeYears) {
      return NextResponse.json(
        { error: 'Missing required fields: categoryId, name, purchaseDate, purchasePrice, depreciationMethod, usefulLifeYears' },
        { status: 400 }
      );
    }

    // Verify category exists
    const category = await prisma.assetCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json({ error: 'Asset category not found' }, { status: 404 });
    }

    // Generate asset number
    const year = new Date().getFullYear();
    const lastAsset = await prisma.asset.findFirst({
      where: {
        organizationId: organization.id,
        assetNumber: {
          startsWith: `ASSET-${year}`,
        },
      },
      orderBy: {
        assetNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastAsset) {
      const match = lastAsset.assetNumber.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const assetNumber = `ASSET-${year}-${String(nextNumber).padStart(4, '0')}`;

    // Create asset
    const asset = await prisma.asset.create({
      data: {
        organizationId: organization.id,
        branchId,
        categoryId,
        assetNumber,
        name,
        description,
        purchaseDate: new Date(purchaseDate),
        purchasePrice,
        vendor,
        invoiceNumber,
        depreciationMethod,
        usefulLifeYears,
        salvageValue,
        depreciationStartDate: depreciationStartDate
          ? new Date(depreciationStartDate)
          : new Date(purchaseDate),
        currentBookValue: purchasePrice,
        accumulatedDepreciation: 0,
        location,
        serialNumber,
        model,
        manufacturer,
        tags,
        notes,
        status: 'ACTIVE',
      },
      include: {
        category: true,
        branch: true,
      },
    });

    // Generate initial depreciation schedule
    const schedule = await generateDepreciationSchedule(asset.id);

    return NextResponse.json({
      success: true,
      data: {
        asset,
        schedule: schedule.slice(0, 12), // First year
      },
    });
  } catch (error: any) {
    console.error('Error creating asset:', error);
    return NextResponse.json(
      { error: 'Failed to create asset', details: error.message },
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

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');
    const branchId = searchParams.get('branchId');

    const where: any = {
      organizationId: organization.id,
    };

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        category: true,
        branch: true,
        depreciationSchedule: {
          orderBy: {
            periodEndDate: 'desc',
          },
          take: 1, // Latest depreciation
        },
      },
      orderBy: {
        assetNumber: 'desc',
      },
    });

    // Calculate totals
    const totalCost = assets.reduce((sum, asset) => sum + Number(asset.purchasePrice), 0);
    const totalBookValue = assets.reduce((sum, asset) => sum + Number(asset.currentBookValue), 0);
    const totalDepreciation = assets.reduce(
      (sum, asset) => sum + Number(asset.accumulatedDepreciation),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        assets,
        summary: {
          totalAssets: assets.length,
          totalCost,
          totalBookValue,
          totalDepreciation,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets', details: error.message },
      { status: 500 }
    );
  }
}
