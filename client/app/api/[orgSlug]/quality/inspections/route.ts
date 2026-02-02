/**
 * API: Quality Inspections Management
 * POST /api/[orgSlug]/quality/inspections - Create quality inspection
 * GET /api/[orgSlug]/quality/inspections - List quality inspections
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';

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
    const {
      productId,
      inspectionType,
      referenceType,
      referenceId,
      lotNumber,
      batchNumber,
      serialNumber,
      quantity,
      scheduledDate,
      priority = 'MEDIUM',
      notes,
    } = body;

    // Validation
    if (!productId || !inspectionType || !scheduledDate) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, inspectionType, scheduledDate' },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Generate inspection number
    const year = new Date().getFullYear();
    const lastInspection = await prisma.qualityInspection.findFirst({
      where: {
        organizationId: organization.id,
        inspectionNumber: {
          startsWith: `QI-${year}`,
        },
      },
      orderBy: {
        inspectionNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastInspection) {
      const match = lastInspection.inspectionNumber.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const inspectionNumber = `QI-${year}-${String(nextNumber).padStart(4, '0')}`;

    // Create quality inspection
    const qualityInspection = await prisma.qualityInspection.create({
      data: {
        organizationId: organization.id,
        productId,
        inspectionNumber,
        inspectionType,
        referenceType,
        referenceId,
        lotNumber,
        batchNumber,
        serialNumber,
        quantity,
        scheduledDate: new Date(scheduledDate),
        status: 'SCHEDULED',
        priority,
        inspectorId: payload.userId,
        notes,
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
      },
    });

    return NextResponse.json({
      success: true,
      data: qualityInspection,
    });
  } catch (error: any) {
    console.error('Error creating quality inspection:', error);
    return NextResponse.json(
      { error: 'Failed to create quality inspection', details: error.message },
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
    if (!hasPermission(payload.role, Permission.VIEW_QUALITY_INSPECTIONS)) {
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
    const productId = searchParams.get('productId');
    const inspectionType = searchParams.get('inspectionType');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    // Build filter
    const where: any = {
      organizationId: organization.id,
    };

    if (productId) {
      where.productId = productId;
    }

    if (inspectionType) {
      where.inspectionType = inspectionType;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    const qualityInspections = await prisma.qualityInspection.findMany({
      where,
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
        measurements: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        scheduledDate: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: qualityInspections,
    });
  } catch (error: any) {
    console.error('Error fetching quality inspections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quality inspections', details: error.message },
      { status: 500 }
    );
  }
}
