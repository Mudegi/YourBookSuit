import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';

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

    // Fetch rates from TaxAgencyRate
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

    // Transform for UI - return in the format the form expects
    const taxRates = rates.map((rate) => ({
      id: rate.id,
      name: `${rate.taxAgency.name} - ${rate.name} (${rate.rate}%)`,
      rate: Number(rate.rate),
    }));

    return NextResponse.json({ taxRates });
  } catch (error) {
    console.error('Get tax rates error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax rates' },
      { status: 500 }
    );
  }
}
