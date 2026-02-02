/**
 * API: Individual NCR Management
 * GET /api/[orgSlug]/quality/ncr/[id] - Get NCR details
 * PATCH /api/[orgSlug]/quality/ncr/[id] - Update NCR
 * DELETE /api/[orgSlug]/quality/ncr/[id] - Delete NCR
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(payload.role, Permission.VIEW_NCR)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Find the NCR
    const ncr = await prisma.nonConformanceReport.findUnique({
      where: { id: params.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
        detectedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        closedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!ncr) {
      return NextResponse.json({ error: 'NCR not found' }, { status: 404 });
    }

    if (ncr.organizationId !== organization.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: ncr.id,
        number: ncr.ncrNumber,
        title: ncr.title,
        source: ncr.source,
        severity: ncr.severity,
        status: ncr.status,
        issueDescription: ncr.description,
        rootCause: ncr.rootCause,
        correctiveAction: ncr.containmentAction,
        quantity: ncr.quantity ? Number(ncr.quantity) : undefined,
        lotNumber: ncr.lotNumber,
        reportedBy: {
          name: ncr.detectedBy.name,
          email: ncr.detectedBy.email,
        },
        assignedTo: ncr.assignedTo ? {
          name: ncr.assignedTo.name,
          email: ncr.assignedTo.email,
        } : undefined,
        createdAt: ncr.detectedDate.toISOString(),
        updatedAt: ncr.updatedAt.toISOString(),
        closedAt: ncr.closedAt?.toISOString(),
        notes: ncr.notes,
        product: ncr.product,
        vendor: ncr.vendor,
        customer: ncr.customer,
      },
    });
  } catch (error: any) {
    console.error('Error fetching NCR:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NCR', details: error.message },
      { status: 500 }
    );
  }
}

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
    if (!hasPermission(payload.role, Permission.MANAGE_NCR)) {
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
    const {
      status,
      rootCause,
      correctiveAction,
      preventiveAction,
      assignedToId,
      notes,
    } = body;

    // Find the NCR
    const existingNcr = await prisma.nonConformanceReport.findUnique({
      where: { id: params.id },
    });

    if (!existingNcr) {
      return NextResponse.json({ error: 'NCR not found' }, { status: 404 });
    }

    if (existingNcr.organizationId !== organization.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update the NCR
    const updatedNcr = await prisma.nonConformanceReport.update({
      where: { id: params.id },
      data: {
        status: status || existingNcr.status,
        rootCause: rootCause !== undefined ? rootCause : existingNcr.rootCause,
        containmentAction: correctiveAction !== undefined ? correctiveAction : existingNcr.containmentAction,
        assignedToId: assignedToId !== undefined ? assignedToId : existingNcr.assignedToId,
        notes: notes !== undefined ? notes : existingNcr.notes,
        closedAt: status === 'CLOSED' && !existingNcr.closedAt ? new Date() : existingNcr.closedAt,
        closedById: status === 'CLOSED' && !existingNcr.closedById ? payload.userId : existingNcr.closedById,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
        detectedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        closedBy: {
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
      data: {
        id: updatedNcr.id,
        number: updatedNcr.ncrNumber,
        title: updatedNcr.title,
        source: updatedNcr.source,
        severity: updatedNcr.severity,
        status: updatedNcr.status,
        issueDescription: updatedNcr.description,
        rootCause: updatedNcr.rootCause,
        correctiveAction: updatedNcr.containmentAction,
        quantity: updatedNcr.quantity ? Number(updatedNcr.quantity) : undefined,
        lotNumber: updatedNcr.lotNumber,
        reportedBy: {
          name: updatedNcr.detectedBy.name,
          email: updatedNcr.detectedBy.email,
        },
        assignedTo: updatedNcr.assignedTo ? {
          name: updatedNcr.assignedTo.name,
          email: updatedNcr.assignedTo.email,
        } : undefined,
        createdAt: updatedNcr.detectedDate.toISOString(),
        updatedAt: updatedNcr.updatedAt.toISOString(),
        closedAt: updatedNcr.closedAt?.toISOString(),
        notes: updatedNcr.notes,
        product: updatedNcr.product,
        vendor: updatedNcr.vendor,
        customer: updatedNcr.customer,
      },
    });
  } catch (error: any) {
    console.error('Error updating NCR:', error);
    return NextResponse.json(
      { error: 'Failed to update NCR', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(payload.role, Permission.MANAGE_NCR)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Find the NCR
    const ncr = await prisma.nonConformanceReport.findUnique({
      where: { id: params.id },
    });

    if (!ncr) {
      return NextResponse.json({ error: 'NCR not found' }, { status: 404 });
    }

    if (ncr.organizationId !== organization.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the NCR
    await prisma.nonConformanceReport.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'NCR deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting NCR:', error);
    return NextResponse.json(
      { error: 'Failed to delete NCR', details: error.message },
      { status: 500 }
    );
  }
}