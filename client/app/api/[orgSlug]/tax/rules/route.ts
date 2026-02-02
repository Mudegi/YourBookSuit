/**
 * API: Tax Rules Management
 * POST /api/[orgSlug]/tax/rules - Create tax rule
 * GET /api/[orgSlug]/tax/rules - List tax rules
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
    if (!hasPermission(payload.role, Permission.MANAGE_TAX_RULES)) {
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
      jurisdictionId,
      name,
      taxType,
      ruleType,
      rate,
      applicableOn = 'BOTH',
      productCategory,
      customerType,
      effectiveFrom,
      effectiveTo,
      minAmount,
      maxAmount,
      calculationFormula,
      isCompound = false,
      compoundSequence,
      parentRuleId,
      priority = 1,
      isActive = true,
      notes,
    } = body;

    // Validation
    if (!jurisdictionId || !name || !taxType || !ruleType || rate === undefined || !effectiveFrom) {
      return NextResponse.json(
        { error: 'Missing required fields: jurisdictionId, name, taxType, ruleType, rate, effectiveFrom' },
        { status: 400 }
      );
    }

    // Verify jurisdiction exists
    const jurisdiction = await prisma.taxJurisdiction.findUnique({
      where: { id: jurisdictionId },
    });

    if (!jurisdiction) {
      return NextResponse.json({ error: 'Tax jurisdiction not found' }, { status: 404 });
    }

    // Create tax rule
    const taxRule = await prisma.taxRule.create({
      data: {
        organizationId: organization.id,
        jurisdictionId,
        name,
        taxType,
        ruleType,
        rate,
        applicableOn,
        productCategory,
        customerType,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        minimumAmount: minAmount,
        maximumAmount: maxAmount,
        calculationFormula,
        isCompound,
        compoundSequence,
        parentRuleId,
        priority,
        isActive,
        notes,
      },
      include: {
        jurisdiction: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: taxRule,
    });
  } catch (error: any) {
    console.error('Error creating tax rule:', error);
    return NextResponse.json(
      { error: 'Failed to create tax rule', details: error.message },
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
    if (!hasPermission(payload.role, Permission.VIEW_TAX_RULES)) {
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
    const jurisdictionId = searchParams.get('jurisdictionId');
    const taxType = searchParams.get('taxType');
    const isActive = searchParams.get('isActive');
    const effectiveDate = searchParams.get('effectiveDate');

    // Build filter
    const where: any = {
      organizationId: organization.id,
    };

    if (jurisdictionId) {
      where.jurisdictionId = jurisdictionId;
    }

    if (taxType) {
      where.taxType = taxType;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    if (effectiveDate) {
      const date = new Date(effectiveDate);
      where.effectiveFrom = { lte: date };
      where.OR = [
        { effectiveTo: { gte: date } },
        { effectiveTo: null },
      ];
    }

    const taxRules = await prisma.taxRule.findMany({
      where,
      include: {
        jurisdiction: {
          select: {
            id: true,
            name: true,
            code: true,
            jurisdictionType: true,
          },
        },
      },
      orderBy: {
        effectiveFrom: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: taxRules,
    });
  } catch (error: any) {
    console.error('Error fetching tax rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax rules', details: error.message },
      { status: 500 }
    );
  }
}
