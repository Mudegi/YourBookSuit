/**
 * API: CAPA Configuration and Statistics
 * GET /api/[orgSlug]/quality/capa/config - Get CAPA form configuration
 * GET /api/[orgSlug]/quality/capa/config?stats=true - Get CAPA statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';
import { capaService } from '@/services/capa.service';

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
    const includeStats = searchParams.get('stats') === 'true';

    // Get form configuration
    const config = await capaService.getCAPAFormConfig(organization.id);

    let response: any = {
      success: true,
      data: config,
    };

    // Include statistics if requested
    if (includeStats) {
      const stats = await capaService.getCAPAStatistics(organization.id);
      response.data.statistics = stats;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching CAPA configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CAPA configuration', details: error.message },
      { status: 500 }
    );
  }
}