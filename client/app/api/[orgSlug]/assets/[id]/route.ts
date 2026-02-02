/**
 * API: Single Asset Operations
 * GET /api/[orgSlug]/assets/[id] - Get asset details
 * PATCH /api/[orgSlug]/assets/[id] - Update asset
 * DELETE /api/[orgSlug]/assets/[id] - Delete asset
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
      include: {
        category: {
          include: {
            assetAccount: true,
            depreciationAccount: true,
            expenseAccount: true,
          },
        },
        branch: true,
        depreciationSchedule: {
          orderBy: {
            periodEndDate: 'asc',
          },
        },
        maintenanceRecords: {
          orderBy: {
            maintenanceDate: 'desc',
          },
        },
        disposalRecord: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Calculate summary stats
    const totalMaintenance = asset.maintenanceRecords.reduce(
      (sum, record) => sum + Number(record.cost),
      0
    );

    const postedDepreciation = asset.depreciationSchedule.filter((d) => d.posted).length;
    const unpostedDepreciation = asset.depreciationSchedule.filter((d) => !d.posted).length;

    return NextResponse.json({
      success: true,
      data: {
        asset,
        summary: {
          totalMaintenance,
          maintenanceCount: asset.maintenanceRecords.length,
          postedDepreciation,
          unpostedDepreciation,
          totalScheduledDepreciation: asset.depreciationSchedule.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching asset:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
      name,
      description,
      location,
      serialNumber,
      model,
      manufacturer,
      status,
      insurancePolicy,
      insuranceExpiry,
      warrantyExpiry,
      tags,
      notes,
    } = body;

    const asset = await prisma.asset.findFirst({
      where: {
        id: params.id,
        organizationId: organization.id,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Cannot modify disposed assets
    if (asset.status === 'DISPOSED' && status !== 'DISPOSED') {
      return NextResponse.json(
        { error: 'Cannot modify disposed asset' },
        { status: 400 }
      );
    }

    const updatedAsset = await prisma.asset.update({
      where: { id: params.id },
      data: {
        name,
        description,
        location,
        serialNumber,
        model,
        manufacturer,
        status,
        insurancePolicy,
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : undefined,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : undefined,
        tags,
        notes,
      },
      include: {
        category: true,
        branch: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedAsset,
    });
  } catch (error: any) {
    console.error('Error updating asset:', error);
    return NextResponse.json(
      { error: 'Failed to update asset', details: error.message },
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
      include: {
        depreciationSchedule: true,
        maintenanceRecords: true,
        disposalRecord: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Check if any depreciation has been posted
    const hasPostedDepreciation = asset.depreciationSchedule.some((d) => d.posted);
    if (hasPostedDepreciation) {
      return NextResponse.json(
        {
          error:
            'Cannot delete asset with posted depreciation. Consider disposing instead.',
        },
        { status: 400 }
      );
    }

    // Delete related records first
    await prisma.assetDepreciation.deleteMany({
      where: { assetId: params.id },
    });

    await prisma.assetMaintenance.deleteMany({
      where: { assetId: params.id },
    });

    if (asset.disposalRecord) {
      await prisma.assetDisposal.delete({
        where: { id: asset.disposalRecord.id },
      });
    }

    // Delete asset
    await prisma.asset.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting asset:', error);
    return NextResponse.json(
      { error: 'Failed to delete asset', details: error.message },
      { status: 500 }
    );
  }
}
