/**
 * API: Tax Exemptions Health Check
 * GET /api/[orgSlug]/tax/exemptions/health - Get exemption health status
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';
import { TaxExemptionService } from '@/lib/tax/tax-exemption-service';

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
    if (!hasPermission(payload.role, Permission.VIEW_TAX_EXEMPTIONS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Perform health check
    const healthCheck = await TaxExemptionService.performHealthCheck(organization.id);

    return NextResponse.json({
      success: true,
      data: healthCheck,
    });
  } catch (error: any) {
    console.error('Error performing exemption health check:', error);
    return NextResponse.json(
      { error: 'Failed to perform health check', details: error.message },
      { status: 500 }
    );
  }
}