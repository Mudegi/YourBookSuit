import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';

export async function GET(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgSlug } = params;
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // Default to true

    // Get organization and verify membership
    const { org: organization } = await requireOrgMembership(user.id, orgSlug);

    // Build where clause for TaxAgencyRate
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

    // Fetch tax agency rates (these are the configured tax rates)
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

    // Transform for dropdown - format: "Name (Rate%) - Agency"
    const data = rates.map((rate) => ({
      id: rate.id,
      name: rate.name,
      displayName: `${rate.name} (${Number(rate.rate)}%) - ${rate.taxAgency.name}`,
      rate: Number(rate.rate),
      taxType: rate.taxType,
      taxAgencyId: rate.taxAgencyId,
      taxAgencyName: rate.taxAgency.name,
      taxAgencyCode: rate.taxAgency.code,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Get tax rules error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax rules' },
      { status: 500 }
    );
  }
}
