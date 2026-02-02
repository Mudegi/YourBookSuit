/**
 * API: CAPA (Corrective and Preventive Actions) Management
 * POST /api/[orgSlug]/quality/capa - Create CAPA
 * GET /api/[orgSlug]/quality/capa - List CAPAs
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';
import { capaService } from '@/services/capa.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
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

    // Create CAPA using service
    const capa = await capaService.createCAPA({
      organizationId: organization.id,
      title,
      description,
      source,
      riskLevel,
      investigationMethod,
      productId,
      lotNumber,
      vendorId,
      customerId,
      quantity,
      ncrId,
      createdById: payload.userId,
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
    console.error('Error creating CAPA:', error);
    return NextResponse.json(
      { error: 'Failed to create CAPA', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;
    const riskLevel = searchParams.get('riskLevel') as any;
    const source = searchParams.get('source') as any;
    const assignedToId = searchParams.get('assignedToId');
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;

    // Get CAPAs using service
    const capas = await capaService.getCAPAs(organization.id, {
      status,
      riskLevel,
      source,
      assignedToId,
      dateFrom,
      dateTo,
    });

    return NextResponse.json({
      success: true,
      data: capas,
    });
  } catch (error: any) {
    console.error('Error fetching CAPAs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CAPAs', details: error.message },
      { status: 500 }
    );
  }
}
