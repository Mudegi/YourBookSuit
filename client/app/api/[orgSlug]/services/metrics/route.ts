/**
 * API: Service Metrics and Analytics
 * GET /api/[orgSlug]/services/metrics - Get service performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';
import { ServiceManagementService } from '@/services/service-management.service';

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
    if (!hasPermission(payload.role, Permission.VIEW_SERVICES)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Parse date filters
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('dateFrom') 
      ? new Date(searchParams.get('dateFrom')!) 
      : undefined;
    const dateTo = searchParams.get('dateTo') 
      ? new Date(searchParams.get('dateTo')!) 
      : undefined;

    const serviceManager = new ServiceManagementService(prisma);
    const metrics = await serviceManager.getServiceMetrics(organization.id, dateFrom, dateTo);

    return NextResponse.json({
      success: true,
      data: metrics,
    });

  } catch (error: any) {
    console.error('Error fetching service metrics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch service metrics',
        details: error.message,
      },
      { status: 500 }
    );
  }
}