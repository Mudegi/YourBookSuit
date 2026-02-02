/**
 * API: Organization Package Management
 * PUT /api/[orgSlug]/organization/package - Update organization package
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';

const VALID_PACKAGES = ['STARTER', 'PROFESSIONAL', 'ADVANCED', 'ENTERPRISE'];

export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - only admins can change packages
    if (!hasPermission(payload.role, Permission.MANAGE_ORGANIZATION)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true, name: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { package: newPackage } = await request.json();

    if (!newPackage || !VALID_PACKAGES.includes(newPackage)) {
      return NextResponse.json(
        { error: 'Invalid package. Must be one of: ' + VALID_PACKAGES.join(', ') },
        { status: 400 }
      );
    }

    const updatedOrg = await prisma.organization.update({
      where: { id: organization.id },
      data: { package: newPackage },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        package: updatedOrg.package,
        slug: updatedOrg.slug,
      },
    });

  } catch (error: any) {
    console.error('Error updating organization package:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update package',
        details: error.message,
      },
      { status: 500 }
    );
  }
}