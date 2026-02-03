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

    // Fetch warehouses for the organization
    const warehouses = await prisma.inventoryWarehouse.findMany({
      where: {
        organizationId: org.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        isActive: true,
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
