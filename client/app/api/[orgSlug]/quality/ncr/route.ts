/**
 * API: Non-Conformance Reports (NCR) Management
 * POST /api/[orgSlug]/quality/ncr - Create NCR
 * GET /api/[orgSlug]/quality/ncr - List NCRs
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
      title,
      description,
      source,
      severity,
      productId,
      vendorId,
      customerId,
      quantity,
      lotNumber,
      detectedDate,
      assignedToId,
      notes,
      localComplianceData,
    } = body;

    // Validation
    if (!title || !description || !source || !severity || !detectedDate) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, source, severity, detectedDate' },
        { status: 400 }
      );
    }

    // Verify product exists if provided
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
    }

    // Verify assigned user exists if provided
    if (assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedToId },
      });

      if (!assignedUser) {
        return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 });
      }
    }

    // Generate NCR number
    const year = new Date().getFullYear();
    const lastNCR = await prisma.nonConformanceReport.findFirst({
      where: {
        organizationId: organization.id,
        ncrNumber: {
          startsWith: `NCR-${year}`,
        },
      },
      orderBy: {
        ncrNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastNCR) {
      const match = lastNCR.ncrNumber.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const ncrNumber = `NCR-${year}-${String(nextNumber).padStart(4, '0')}`;

    // Create NCR
    const ncr = await prisma.nonConformanceReport.create({
      data: {
        organizationId: organization.id,
        title,
        description,
        source,
        severity,
        productId,
        vendorId,
        customerId,
        quantity: quantity ? parseFloat(quantity) : null,
        lotNumber,
        detectedDate: new Date(detectedDate),
        detectedById: payload.userId,
        assignedToId,
        notes,
        localComplianceData,
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
          },
        },
        detectedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      ncr,
    });
  } catch (error: any) {
    console.error('Error creating NCR:', error);
    return NextResponse.json(
      { error: 'Failed to create NCR', details: error.message },
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

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const source = searchParams.get('source');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');

    // Build filter
    const where: any = {
      organizationId: organization.id,
    };

    if (productId) {
      where.productId = productId;
    }

    if (source) {
      where.source = source;
    }

    if (severity) {
      where.severity = severity;
    }

    if (status) {
      where.status = status;
    }

    const ncrs = await prisma.nonConformanceReport.findMany({
      where,
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
          },
        },
        detectedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        detectedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: ncrs,
    });
  } catch (error: any) {
    console.error('Error fetching NCRs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NCRs', details: error.message },
      { status: 500 }
    );
  }
}
