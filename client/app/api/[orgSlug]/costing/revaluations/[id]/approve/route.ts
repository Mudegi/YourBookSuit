/**
 * API: Approve Cost Revaluation
 * PATCH /api/[orgSlug]/costing/revaluations/[id]/approve - Approve revaluation
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
    if (!hasPermission(payload.role, Permission.APPROVE_COST_REVALUATIONS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Find the revaluation
    const revaluation = await prisma.costRevaluation.findUnique({
      where: { id: params.id },
      include: {
        product: true,
      },
    });

    if (!revaluation) {
      return NextResponse.json({ error: 'Revaluation not found' }, { status: 404 });
    }

    if (revaluation.organizationId !== organization.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (revaluation.status !== 'PENDING') {
      return NextResponse.json({ error: 'Revaluation is not pending approval' }, { status: 400 });
    }

    // Update revaluation status
    const updatedRevaluation = await prisma.costRevaluation.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        approvedById: payload.userId,
        approvedAt: new Date(),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedRevaluation,
    });
  } catch (error: any) {
    console.error('Error approving cost revaluation:', error);
    return NextResponse.json(
      { error: 'Failed to approve cost revaluation', details: error.message },
      { status: 500 }
    );
  }
}
