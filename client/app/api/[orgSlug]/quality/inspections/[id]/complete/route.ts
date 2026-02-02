/**
 * API: Complete Quality Inspection
 * PATCH /api/[orgSlug]/quality/inspections/[id]/complete - Complete inspection
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(payload.role, Permission.MANAGE_QUALITY_INSPECTIONS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const { result, defectsFound, notes } = body;

    // Validation
    if (!result) {
      return NextResponse.json(
        { error: 'Missing required field: result (PASS or FAIL)' },
        { status: 400 }
      );
    }

    // Find the inspection
    const inspection = await prisma.qualityInspection.findUnique({
      where: { id: params.id },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    if (inspection.organizationId !== organization.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (inspection.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Inspection already completed' }, { status: 400 });
    }

    // Update inspection
    const updatedInspection = await prisma.qualityInspection.update({
      where: { id: params.id },
      data: {
        status: 'COMPLETED',
        actualDate: new Date(),
        result,
        defectsFound,
        notes: notes || inspection.notes,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        inspector: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        measurements: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedInspection,
    });
  } catch (error: any) {
    console.error('Error completing quality inspection:', error);
    return NextResponse.json(
      { error: 'Failed to complete quality inspection', details: error.message },
      { status: 500 }
    );
  }
}
