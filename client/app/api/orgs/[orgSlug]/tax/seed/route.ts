import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { TaxSeedingService } from '@/services/tax/tax-seeding.service';

/**
 * POST /api/orgs/[orgSlug]/tax/seed
 * Seed tax configuration from country template
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
    const { countryCode } = body;

    if (!countryCode) {
      return NextResponse.json(
        { error: 'Country code is required' },
        { status: 400 }
      );
    }

    // Get organization and verify membership
    const { org: organization } = await requireOrgMembership(user.id, orgSlug);

    // Check if already seeded
    const existingAgencies = await prisma.taxAgency.count({
      where: {
        organizationId: organization.id,
        country: countryCode,
      },
    });

    if (existingAgencies > 0) {
      return NextResponse.json(
        { error: `Tax agencies for ${countryCode} already exist. Delete them first to re-seed.` },
        { status: 400 }
      );
    }

    // Seed taxes
    const seedingService = new TaxSeedingService(prisma);
    const result = await seedingService.seedTaxesForOrganization(
      organization.id,
      countryCode,
      user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error seeding taxes:', error);
    return NextResponse.json(
      { error: 'Failed to seed taxes' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orgs/[orgSlug]/tax/seed
 * Get seeding status for organization
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

    // Get organization and verify membership
    const { org: organization } = await requireOrgMembership(user.id, orgSlug);

    // Get seeding status
    const seedingService = new TaxSeedingService(prisma);
    const status = await seedingService.getSeedingStatus(organization.id);

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting seeding status:', error);
    return NextResponse.json(
      { error: 'Failed to get seeding status' },
      { status: 500 }
    );
  }
}
