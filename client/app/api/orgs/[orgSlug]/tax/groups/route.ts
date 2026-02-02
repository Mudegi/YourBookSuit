import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';

/**
 * GET /api/orgs/[orgSlug]/tax/groups
 * Fetch all tax groups for organization
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
      organizationId: organization.id,
    };

    if (activeOnly) {
      where.isActive = true;
    }

    // Fetch groups
    const groups = await prisma.taxGroup.findMany({
      where,
      include: {
        taxGroupRates: {
          include: {
            taxAgencyRate: {
              select: {
                id: true,
                name: true,
                rate: true,
              },
            },
          },
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });

    // Transform for UI
    const result = groups.map((group) => ({
      id: group.id,
      name: group.name,
      code: group.code,
      description: group.description,
      isActive: group.isActive,
      isDefault: group.isDefault,
      taxGroupRates: group.taxGroupRates.map((gr) => ({
        id: gr.id,
        sequence: gr.sequence,
        isCompound: gr.isCompound,
        taxAgencyRate: {
          id: gr.taxAgencyRate.id,
          name: gr.taxAgencyRate.name,
          rate: new Decimal(gr.taxAgencyRate.rate).toNumber(),
        },
      })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching tax groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax groups' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[orgSlug]/tax/groups
 * Create a new tax group
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

    // If setting as default, unset other defaults
    if (body.isDefault) {
      await prisma.taxGroup.updateMany({
        where: {
          organizationId: organization.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Create tax group with rates
    const group = await prisma.taxGroup.create({
      data: {
        organizationId: organization.id,
        name: body.name,
        code: body.code,
        description: body.description,
        isActive: body.isActive ?? true,
        isDefault: body.isDefault ?? false,
        taxGroupRates: {
          create: body.rates?.map((rate: any, index: number) => ({
            taxAgencyRateId: rate.taxAgencyRateId,
            sequence: rate.sequence ?? index + 1,
            isCompound: rate.isCompound ?? false,
          })) || [],
        },
        createdBy: user.id,
        updatedBy: user.id,
      },
      include: {
        taxGroupRates: {
          include: {
            taxAgencyRate: true,
          },
        },
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Error creating tax group:', error);
    return NextResponse.json(
      { error: 'Failed to create tax group' },
      { status: 500 }
    );
  }
}
