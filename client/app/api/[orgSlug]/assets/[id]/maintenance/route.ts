/**
 * API: Asset Maintenance Records
 * POST /api/[orgSlug]/assets/[id]/maintenance - Create maintenance record
 * GET /api/[orgSlug]/assets/[id]/maintenance - List maintenance records
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      maintenanceType,
      maintenanceDate,
      description,
      vendor,
      cost = 0,
      isScheduled = false,
      nextMaintenanceDate,
      nextMaintenanceMiles,
      status = 'SCHEDULED',
      startDate,
      completionDate,
      meterReading,
      performedBy,
      billId,
      attachments = [],
      notes,
    } = body;

    // Validation
    if (!maintenanceType || !maintenanceDate || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: maintenanceType, maintenanceDate, description' },
        { status: 400 }
      );
    }

    const asset = await prisma.asset.findFirst({
      where: {
        id: params.id,
        organizationId: organization.id,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Create maintenance record
    const maintenance = await prisma.assetMaintenance.create({
      data: {
        assetId: asset.id,
        organizationId: organization.id,
        maintenanceType,
        maintenanceDate: new Date(maintenanceDate),
        description,
        vendor,
        cost,
        isScheduled,
        nextMaintenanceDate: nextMaintenanceDate
          ? new Date(nextMaintenanceDate)
          : undefined,
        nextMaintenanceMiles,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        completionDate: completionDate ? new Date(completionDate) : undefined,
        meterReading,
        performedBy,
        billId,
        attachments,
        notes,
        createdBy: payload.userId,
      },
    });

    // Update asset status if under maintenance
    if (status === 'IN_PROGRESS') {
      await prisma.asset.update({
        where: { id: asset.id },
        data: {
          status: 'UNDER_MAINTENANCE',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: maintenance,
    });
  } catch (error: any) {
    console.error('Error creating maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to create maintenance record', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const asset = await prisma.asset.findFirst({
      where: {
        id: params.id,
        organizationId: organization.id,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const maintenanceType = searchParams.get('maintenanceType');

    const where: any = {
      assetId: params.id,
      organizationId: organization.id,
    };

    if (status) {
      where.status = status;
    }

    if (maintenanceType) {
      where.maintenanceType = maintenanceType;
    }

    const maintenanceRecords = await prisma.assetMaintenance.findMany({
      where,
      orderBy: {
        maintenanceDate: 'desc',
      },
    });

    // Calculate summary
    const totalCost = maintenanceRecords.reduce((sum, record) => sum + Number(record.cost), 0);
    const completedCount = maintenanceRecords.filter((r) => r.status === 'COMPLETED').length;
    const scheduledCount = maintenanceRecords.filter((r) => r.status === 'SCHEDULED').length;
    const overdueCount = maintenanceRecords.filter((r) => r.status === 'OVERDUE').length;

    return NextResponse.json({
      success: true,
      data: {
        maintenanceRecords,
        summary: {
          totalRecords: maintenanceRecords.length,
          totalCost,
          completedCount,
          scheduledCount,
          overdueCount,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching maintenance records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance records', details: error.message },
      { status: 500 }
    );
  }
}
