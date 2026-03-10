import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/orgs/[orgSlug]/warehouses
 * List warehouses for an organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const branchIdParam = url.searchParams.get('branchId');
    const isDefaultParam = url.searchParams.get('isDefault');

    // Fetch warehouses for the organization
    const whereClause: any = {
      organizationId: org.id,
      isActive: true,
    };
    if (branchIdParam) whereClause.branchId = branchIdParam;
    if (isDefaultParam === 'true') whereClause.isDefault = true;

    const warehouses = await prisma.inventoryWarehouse.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        isActive: true,
        isDefault: true,
        branchId: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      data: warehouses,
      warehouses,
    });
  } catch (error: any) {
    console.error('❌ Warehouses error:', error.message);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch warehouses' },
      { status: 500 }
    );
  }
}
