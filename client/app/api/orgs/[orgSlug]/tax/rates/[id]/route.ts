import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';

/**
 * GET /api/orgs/[orgSlug]/tax/rates/[id]
 * Fetch a single tax rate
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgSlug, id } = params;

    // Get organization and verify membership
    const { org: organization } = await requireOrgMembership(user.id, orgSlug);

    // Fetch rate
    const rate = await prisma.taxAgencyRate.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
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
    });

    if (!rate) {
      return NextResponse.json({ error: 'Tax rate not found' }, { status: 404 });
    }

    // Transform for UI
    const result = {
      id: rate.id,
      name: rate.name,
      displayName: rate.displayName,
      description: rate.description,
      rate: new Decimal(rate.rate).toNumber(),
      calculationType: rate.calculationType,
      isCompoundTax: rate.isCompoundTax,
      fixedAmount: rate.fixedAmount ? new Decimal(rate.fixedAmount).toNumber() : null,
      isInclusiveDefault: rate.isInclusiveDefault,
      isActive: rate.isActive,
      effectiveFrom: rate.effectiveFrom.toISOString(),
      effectiveTo: rate.effectiveTo?.toISOString(),
      taxAgencyId: rate.taxAgencyId,
      taxAgency: rate.taxAgency,
      salesTaxAccountId: rate.salesTaxAccountId,
      salesTaxAccount: rate.salesTaxAccount,
      purchaseTaxAccountId: rate.purchaseTaxAccountId,
      purchaseTaxAccount: rate.purchaseTaxAccount,
      isRecoverable: rate.isRecoverable,
      recoveryPercentage: rate.recoveryPercentage ? new Decimal(rate.recoveryPercentage).toNumber() : 100,
      applicableContext: rate.applicableContext,
      externalTaxCode: rate.externalTaxCode,
      reportingCategory: rate.reportingCategory,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching tax rate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax rate' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orgs/[orgSlug]/tax/rates/[id]
 * Update an existing tax rate
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgSlug, id } = params;
    const body = await request.json();

    // Get organization and verify membership
    const { org: organization } = await requireOrgMembership(user.id, orgSlug);

    // Verify rate exists and belongs to this org
    const existingRate = await prisma.taxAgencyRate.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingRate) {
      return NextResponse.json({ error: 'Tax rate not found' }, { status: 404 });
    }

    // Update tax rate
    const rate = await prisma.taxAgencyRate.update({
      where: { id },
      data: {
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
        updatedBy: user.id,
        updatedAt: new Date(),
      },
      include: {
        taxAgency: true,
        salesTaxAccount: true,
        purchaseTaxAccount: true,
      },
    });

    return NextResponse.json(rate);
  } catch (error) {
    console.error('Error updating tax rate:', error);
    return NextResponse.json(
      { error: 'Failed to update tax rate' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orgs/[orgSlug]/tax/rates/[id]
 * Delete a tax rate
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgSlug, id } = params;

    // Get organization and verify membership
    const { org: organization } = await requireOrgMembership(user.id, orgSlug);

    // Verify rate exists and belongs to this org
    const existingRate = await prisma.taxAgencyRate.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingRate) {
      return NextResponse.json({ error: 'Tax rate not found' }, { status: 404 });
    }

    // Delete tax rate
    await prisma.taxAgencyRate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tax rate:', error);
    return NextResponse.json(
      { error: 'Failed to delete tax rate' },
      { status: 500 }
    );
  }
}
