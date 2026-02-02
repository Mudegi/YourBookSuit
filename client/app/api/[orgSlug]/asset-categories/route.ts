/**
 * API: Asset Categories
 * POST /api/[orgSlug]/asset-categories - Create category
 * GET /api/[orgSlug]/asset-categories - List categories
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
      name,
      code,
      description,
      assetAccountId,
      depreciationAccountId,
      expenseAccountId,
      defaultMethod = 'STRAIGHT_LINE',
      defaultLifeYears = 5,
      defaultSalvagePercent = 10,
      ugandaTaxRate,
    } = body;

    // Validation
    if (
      !name ||
      !code ||
      !assetAccountId ||
      !depreciationAccountId ||
      !expenseAccountId
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: name, code, assetAccountId, depreciationAccountId, expenseAccountId',
        },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await prisma.assetCategory.findFirst({
      where: {
        organizationId: organization.id,
        code,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Asset category with this code already exists' },
        { status: 400 }
      );
    }

    // Verify accounts exist
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        id: {
          in: [assetAccountId, depreciationAccountId, expenseAccountId],
        },
        organizationId: organization.id,
      },
    });

    if (accounts.length !== 3) {
      return NextResponse.json(
        { error: 'One or more GL accounts not found' },
        { status: 404 }
      );
    }

    const category = await prisma.assetCategory.create({
      data: {
        organizationId: organization.id,
        name,
        code,
        description,
        assetAccountId,
        depreciationAccountId,
        expenseAccountId,
        defaultMethod,
        defaultLifeYears,
        defaultSalvagePercent,
        ugandaTaxRate,
        createdBy: payload.userId,
      },
      include: {
        assetAccount: true,
        depreciationAccount: true,
        expenseAccount: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error: any) {
    console.error('Error creating asset category:', error);
    return NextResponse.json(
      { error: 'Failed to create asset category', details: error.message },
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

    const categories = await prisma.assetCategory.findMany({
      where: {
        organizationId: organization.id,
      },
      include: {
        assetAccount: true,
        depreciationAccount: true,
        expenseAccount: true,
        _count: {
          select: {
            assets: true,
          },
        },
      },
      orderBy: {
        code: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error('Error fetching asset categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset categories', details: error.message },
      { status: 500 }
    );
  }
}
