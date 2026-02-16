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

    // Determine which tax system to use based on organization settings
    const isUganda = organization.homeCountry === 'UG';
    
    // Check if EFRIS is enabled for this organization
    let efrisEnabled = false;
    if (isUganda) {
      const efrisConfig = await prisma.eInvoiceConfig.findUnique({
        where: { organizationId: organization.id },
        select: { 
          isActive: true, 
          provider: true 
        },
      });
      efrisEnabled = efrisConfig?.isActive && efrisConfig?.provider === 'EFRIS';
    }

    // Use EFRIS tax system (TaxRate) ONLY if organization is in Uganda AND has EFRIS enabled
    // Otherwise use legacy multi-country tax system (TaxAgencyRate)
    const useEfrisTaxSystem = isUganda && efrisEnabled;

    if (useEfrisTaxSystem) {
      // Uganda with EFRIS enabled - Use TaxRate table with EFRIS fields
      const where: any = {
        organizationId: organization.id,
      };
      if (activeOnly) {
        where.isActive = true;
      }

      const rates = await prisma.taxRate.findMany({
        where,
        orderBy: [{ name: 'asc' }],
      });

      const result = rates.map((rate) => ({
        id: rate.id,
        name: rate.name,
        displayName: `${rate.name} (${new Decimal(rate.rate).toNumber()}%)`,
        rate: new Decimal(rate.rate).toNumber(),
        calculationType: 'PERCENTAGE' as const,
        isInclusiveDefault: false,
        isActive: rate.isActive,
        taxType: rate.taxType,
        efrisTaxCategoryCode: rate.efrisTaxCategoryCode,
        efrisGoodsCategoryId: rate.efrisGoodsCategoryId,
      }));

      return NextResponse.json(result);
    } else {
      // All other countries OR Uganda without EFRIS - Use legacy TaxAgencyRate
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
        },
        orderBy: [
          { taxAgency: { name: 'asc' } },
          { rate: 'desc' },
        ],
      });

      const result = rates.map((rate) => ({
        id: rate.id,
        name: rate.name,
        displayName: rate.displayName || `${rate.name} (${new Decimal(rate.rate).toNumber()}%) - ${rate.taxAgency.name}`,
        rate: new Decimal(rate.rate).toNumber(),
        calculationType: rate.calculationType,
        fixedAmount: rate.fixedAmount ? new Decimal(rate.fixedAmount).toNumber() : null,
        isInclusiveDefault: rate.isInclusiveDefault,
        isActive: rate.isActive,
        taxAgency: rate.taxAgency,
      }));

      return NextResponse.json(result);
    }
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

    // Determine which tax system to use
    const isUganda = organization.homeCountry === 'UG';
    let efrisEnabled = false;
    
    if (isUganda) {
      const efrisConfig = await prisma.eInvoiceConfig.findUnique({
        where: { organizationId: organization.id },
        select: { isActive: true, provider: true },
      });
      efrisEnabled = efrisConfig?.isActive && efrisConfig?.provider === 'EFRIS';
    }

    const useEfrisTaxSystem = isUganda && efrisEnabled;

    if (useEfrisTaxSystem) {
      // Uganda with EFRIS - Create TaxRate record
      const rate = await prisma.taxRate.create({
        data: {
          organizationId: organization.id,
          name: body.name,
          description: body.description,
          taxType: body.taxType || 'VAT',
          country: organization.homeCountry,
          rate: new Decimal(body.rate || 0),
          calculationType: body.isInclusiveDefault ? 'INCLUSIVE' : 'EXCLUSIVE',
          isInclusiveByDefault: body.isInclusiveDefault ?? false,
          recoveryType: body.isRecoverable ? 'RECOVERABLE' : 'NON_RECOVERABLE',
          // GL Account Mapping (REQUIRED for proper accounting)
          salesTaxAccountId: body.salesTaxAccountId,
          purchaseTaxAccountId: body.purchaseTaxAccountId,
          // EFRIS-specific fields
          efrisTaxCategoryCode: body.efrisTaxCategoryCode || null,
          efrisGoodsCategoryId: body.efrisGoodsCategoryId || null,
          requiresEFRIS: true,
          isActive: body.isActive ?? true,
          effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : new Date(),
          effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return NextResponse.json(rate);
    } else {
      // All other cases - Create TaxAgencyRate record
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

      return NextResponse.json(rate);
    }
  } catch (error) {
    console.error('Error creating tax rate:', error);
    return NextResponse.json(
      { error: 'Failed to create tax rate' },
      { status: 500 }
    );
  }
}
