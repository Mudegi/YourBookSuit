/**
 * API: NCR to CAPA Conversion
 * POST /api/[orgSlug]/quality/capa/convert - Convert NCR to CAPA
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
    const { ncrId, riskLevel = 'MEDIUM' } = body;

    // Validate required fields
    if (!ncrId) {
      return NextResponse.json(
        { error: 'Missing required field: ncrId' },
        { status: 400 }
      );
    }

    // Convert NCR to CAPA using service
    const capa = await capaService.convertNCRToCAPA(ncrId, organization.id, riskLevel);

    return NextResponse.json({
      success: true,
      data: capa,
      message: 'NCR successfully converted to CAPA',
    });
  } catch (error: any) {
    console.error('Error converting NCR to CAPA:', error);
    return NextResponse.json(
      { error: 'Failed to convert NCR to CAPA', details: error.message },
      { status: 500 }
    );
  }
}