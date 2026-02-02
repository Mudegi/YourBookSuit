/**
 * API: Service Catalog Management
 * GET /api/[orgSlug]/services/catalog - Get service catalog with filtering
 * POST /api/[orgSlug]/services/catalog - Create new service
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      serviceType: searchParams.get('serviceType') as any,
      category: searchParams.get('category') || undefined,
      department: searchParams.get('department') || undefined,
      isActive: searchParams.get('isActive') === 'true' ? true : undefined,
      isBillable: searchParams.get('isBillable') === 'true' ? true : undefined,
      search: searchParams.get('search') || undefined,
    };

    const serviceManager = new ServiceManagementService(prisma);
    const services = await serviceManager.getServiceCatalog(organization.id, filters);

    return NextResponse.json({
      success: true,
      data: services,
    });

  } catch (error: any) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch services',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

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
    if (!hasPermission(payload.role, Permission.CREATE_SERVICES)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const input = await request.json();

    // Validate required fields
    if (!input.serviceCode || !input.name || !input.serviceType) {
      return NextResponse.json(
        { error: 'Missing required fields: serviceCode, name, serviceType' },
        { status: 400 }
      );
    }

    const serviceManager = new ServiceManagementService(prisma);
    const service = await serviceManager.createService(organization.id, input);

    return NextResponse.json({
      success: true,
      data: service,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create service',
        details: error.message,
      },
      { status: 500 }
    );
  }
}