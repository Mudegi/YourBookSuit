import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/orgs/[orgSlug]/tax/agencies
 * Fetch all tax agencies for organization
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

    // Fetch agencies with rate counts
    const agencies = await prisma.taxAgency.findMany({
      where: { organizationId: organization.id },
      include: {
        _count: {
          select: { taxRates: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Transform for UI
    const result = agencies.map((agency) => ({
      id: agency.id,
      name: agency.name,
      code: agency.code,
      country: agency.country,
      taxType: agency.taxType,
      registrationNumber: agency.registrationNumber,
      isActive: agency.isActive,
      ratesCount: agency._count.taxRates,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching tax agencies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax agencies' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[orgSlug]/tax/agencies
 * Create a new tax agency
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

    // Create tax agency
    const agency = await prisma.taxAgency.create({
      data: {
        organizationId: organization.id,
        name: body.name,
        code: body.code,
        country: body.country,
        taxType: body.taxType || 'VAT', // Default to VAT if not provided
        registrationNumber: body.registrationNumber || null,
        isActive: body.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(agency, { status: 201 });
  } catch (error) {
    console.error('Error creating tax agency:', error);
    return NextResponse.json(
      { error: 'Failed to create tax agency' },
      { status: 500 }
    );
  }
}
