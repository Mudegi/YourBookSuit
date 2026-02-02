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

    // Cost Center model doesn't exist yet in the schema
    // Return empty array for now
    const costCenters: any[] = [];

    return NextResponse.json({ costCenters });
  } catch (error) {
    console.error('Get cost centers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost centers' },
      { status: 500 }
    );
  }
}
