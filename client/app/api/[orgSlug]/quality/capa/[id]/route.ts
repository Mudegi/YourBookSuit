/**
 * API: Individual CAPA Management
 * GET /api/[orgSlug]/quality/capa/[id] - Get CAPA details
 * PUT /api/[orgSlug]/quality/capa/[id] - Update CAPA
 * DELETE /api/[orgSlug]/quality/capa/[id] - Delete CAPA
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';
import { capaService } from '@/services/capa.service';

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
    if (!hasPermission(payload.role, Permission.VIEW_CAPA)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get CAPA using service
    const capa = await capaService.getCAPA(params.id, organization.id);

    return NextResponse.json({
      success: true,
      data: capa,
    });
  } catch (error: any) {
    console.error('Error fetching CAPA:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CAPA', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(payload.role, Permission.MANAGE_CAPA)) {
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
      title,
      description,
      source,
      riskLevel,
      investigationMethod,
      status,
      productId,
      lotNumber,
      vendorId,
      customerId,
      quantity,
      ncrId,
      assignedToId,
      targetCompletionDate,
      rootCauseAnalysis,
      correctiveAction,
      preventiveAction,
      effectivenessVerification,
      verificationDate,
      verifiedById,
      notes,
      localData,
    } = body;

    // Update CAPA using service
    const capa = await capaService.updateCAPA(params.id, organization.id, {
      title,
      description,
      source,
      riskLevel,
      investigationMethod,
      status,
      productId,
      lotNumber,
      vendorId,
      customerId,
      quantity,
      ncrId,
      assignedToId,
      targetCompletionDate: targetCompletionDate ? new Date(targetCompletionDate) : undefined,
      rootCauseAnalysis,
      correctiveAction,
      preventiveAction,
      effectivenessVerification,
      verificationDate: verificationDate ? new Date(verificationDate) : undefined,
      verifiedById,
      notes,
      localData,
    });

    return NextResponse.json({
      success: true,
      data: capa,
    });
  } catch (error: any) {
    console.error('Error updating CAPA:', error);
    return NextResponse.json(
      { error: 'Failed to update CAPA', details: error.message },
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
    if (!hasPermission(payload.role, Permission.MANAGE_CAPA)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Delete CAPA (soft delete by setting status to CANCELLED)
    await prisma.cAPA.update({
      where: { id: params.id, organizationId: organization.id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({
      success: true,
      message: 'CAPA cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error deleting CAPA:', error);
    return NextResponse.json(
      { error: 'Failed to delete CAPA', details: error.message },
      { status: 500 }
    );
  }
}