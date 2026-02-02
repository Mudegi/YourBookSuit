import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { LocalizationManager } from '@/services/tax/localization-manager.service';

/**
 * GET /api/orgs/[orgSlug]/tax/external-categories
 * Get external tax categories for statutory mapping (EFRIS, eTIMS, MTD)
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

    // Get full organization details for homeCountry
    const orgDetails = await prisma.organization.findUnique({
      where: { id: organization.id },
      select: {
        id: true,
        homeCountry: true,
      },
    });

    if (!orgDetails) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get external tax categories from LocalizationManager
    const localizationManager = new LocalizationManager();
    const categories = localizationManager.getExternalTaxCategories(orgDetails.homeCountry);

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching external tax categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch external tax categories' },
      { status: 500 }
    );
  }
}
