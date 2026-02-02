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

    await requireOrgMembership(user.id, params.orgSlug);
    
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Fetch all active tax rates for this organization
    const taxRates = await prisma.taxRate.findMany({
      where: {
        organizationId: org.id,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        rate: true,
        taxType: true,
        isActive: true,
        description: true,
      },
    });

    return NextResponse.json({ taxRates });
  } catch (error) {
    console.error('Get tax rates error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax rates' },
      { status: 500 }
    );
  }
}
