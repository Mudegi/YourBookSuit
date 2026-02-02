import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';

/**
 * GET /api/orgs/[orgSlug]/tax/rates
 * Fetch all tax rates for organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgSlug } = params;
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    // Get organization and verify membership
    const { org: organization } = await requireOrgMembership(user.id, orgSlug);

    // Build where clause
    const where: any = {
      taxAgency: {
        organizationId: organization.id,
      },
    };

    if (activeOnly) {
      where.isActive = true;
      where.OR = [
        { effectiveTo: null },
        { effectiveTo: { gte: new Date() } },
      ];
    }

    // Fetch rates
    const rates = await prisma.taxAgencyRate.findMany({
      where,
      include: {
        taxAgency: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        salesTaxAccount: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        purchaseTaxAccount: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [
        { taxAgency: { name: 'asc' } },
        { rate: 'desc' },
      ],
    });

    // Transform for UI
    const result = rates.map((rate) => ({
      id: rate.id,
      name: rate.name,
      code: rate.name, // Use name as code for now
      displayName: rate.displayName,
      rate: new Decimal(rate.rate).toNumber(),
      calculationType: rate.calculationType,
      isCompoundTax: rate.isCompoundTax,
      fixedAmount: rate.fixedAmount ? new Decimal(rate.fixedAmount).toNumber() : null,
      isInclusiveDefault: rate.isInclusiveDefault,
      isActive: rate.isActive,
      effectiveFrom: rate.effectiveFrom.toISOString(),
      effectiveTo: rate.effectiveTo?.toISOString(),
      taxAgency: rate.taxAgency,
      salesTaxAccount: rate.salesTaxAccount,
      purchaseTaxAccount: rate.purchaseTaxAccount,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching tax rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax rates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[orgSlug]/tax/rates
 * Create a new tax rate
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgSlug } = params;
    const body = await request.json();

    // Get organization and verify membership
    const { org: organization } = await requireOrgMembership(user.id, orgSlug);

    // Verify tax agency belongs to this org
    const agency = await prisma.taxAgency.findFirst({
      where: {
        id: body.taxAgencyId,
        organizationId: organization.id,
      },
    });

    if (!agency) {
      return NextResponse.json({ error: 'Tax agency not found' }, { status: 404 });
    }

    // Create tax rate
    const rate = await prisma.taxAgencyRate.create({
      data: {
        organizationId: organization.id,
        taxAgencyId: body.taxAgencyId,
        name: body.name,
        displayName: body.displayName,
        description: body.description,
        rate: new Decimal(body.rate || 0),
        calculationType: body.calculationType || 'PERCENTAGE',
        isCompoundTax: body.isCompoundTax ?? false,
        fixedAmount: body.fixedAmount ? new Decimal(body.fixedAmount) : null,
        isInclusiveDefault: body.isInclusiveDefault ?? false,
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : new Date(),
        effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
        salesTaxAccountId: body.salesTaxAccountId,
        purchaseTaxAccountId: body.purchaseTaxAccountId,
        isRecoverable: body.isRecoverable ?? true,
        recoveryPercentage: body.recoveryPercentage != null ? new Decimal(body.recoveryPercentage) : new Decimal(100),
        applicableContext: body.applicableContext || [],
        externalTaxCode: body.externalTaxCode,
        reportingCategory: body.reportingCategory,
        isActive: body.isActive ?? true,
        metadata: body.metadata,
        createdBy: user.id,
        updatedBy: user.id,
      },
      include: {
        taxAgency: true,
        salesTaxAccount: true,
        purchaseTaxAccount: true,
      },
    });

    return NextResponse.json(rate, { status: 201 });
  } catch (error) {
    console.error('Error creating tax rate:', error);
    return NextResponse.json(
      { error: 'Failed to create tax rate' },
      { status: 500 }
    );
  }
}
