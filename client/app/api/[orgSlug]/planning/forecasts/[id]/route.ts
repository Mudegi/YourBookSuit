/**
 * Individual Forecast Detail API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromHeaders } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    console.log('🔍 Fetching forecast detail for ID:', params.id);
    
    const session = await getSessionFromHeaders(request.headers);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true, name: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const forecast = await prisma.demandForecast.findFirst({
      where: {
        id: params.id,
        organizationId: organization.id,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!forecast) {
      console.log('❌ Forecast not found:', params.id);
      return NextResponse.json({ error: 'Forecast not found' }, { status: 404 });
    }

    console.log('✅ Forecast found:', forecast.product.sku);

    return NextResponse.json({
      success: true,
      data: forecast,
    });

  } catch (error: any) {
    console.error('❌ Error fetching forecast detail:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch forecast detail',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const session = await getSessionFromHeaders(request.headers);
    if (!session) {
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
    const { forecastedDemand, confidenceLevel, notes, actualDemand } = body;

    const updatedForecast = await prisma.demandForecast.update({
      where: {
        id: params.id,
        organizationId: organization.id,
      },
      data: {
        ...(forecastedDemand !== undefined && { forecastedDemand }),
        ...(confidenceLevel !== undefined && { confidenceLevel }),
        ...(notes !== undefined && { notes }),
        ...(actualDemand !== undefined && { actualDemand }),
        updatedAt: new Date(),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedForecast,
      message: 'Forecast updated successfully',
    });

  } catch (error: any) {
    console.error('❌ Error updating forecast:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update forecast',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const session = await getSessionFromHeaders(request.headers);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    await prisma.demandForecast.delete({
      where: {
        id: params.id,
        organizationId: organization.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Forecast deleted successfully',
    });

  } catch (error: any) {
    console.error('❌ Error deleting forecast:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete forecast',
        details: error.message,
      },
      { status: 500 }
    );
  }
}