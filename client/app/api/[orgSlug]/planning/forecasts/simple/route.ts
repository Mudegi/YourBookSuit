/**
 * Simple Forecasting API for Testing
 * Basic GET/POST without complex service dependencies
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromHeaders } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    console.log('🔍 Simple forecast API - GET request for:', params.orgSlug);
    
    // Get session using the existing auth method
    const session = await getSessionFromHeaders(request.headers);
    if (!session) {
      console.log('❌ No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', session.userId);

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true, name: true },
    });

    if (!organization) {
      console.log('❌ Organization not found:', params.orgSlug);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    console.log('✅ Organization found:', organization.name);

    // Simple forecast query without complex filtering
    const demandForecasts = await prisma.demandForecast.findMany({
      where: {
        organizationId: organization.id,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        periodStart: 'desc',
      },
      take: 50, // Limit to avoid large responses
    });

    console.log('✅ Forecasts found:', demandForecasts.length);

    // Simple summary calculation
    const forecastsWithAccuracy = demandForecasts.filter(f => f.accuracy !== null);
    const avgAccuracy = forecastsWithAccuracy.length > 0
      ? forecastsWithAccuracy.reduce((sum, f) => sum + (f.accuracy || 0), 0) / forecastsWithAccuracy.length
      : null;

    const response = {
      success: true,
      data: demandForecasts,
      summary: {
        totalForecasts: demandForecasts.length,
        averageAccuracy: avgAccuracy,
        organization: organization.name,
        enhancedFeatures: {
          basicMode: true,
          strategyPattern: false,
          historicalAnalysis: false,
          supplyChainIntegration: false,
        },
      },
    };

    console.log('✅ Returning response with', demandForecasts.length, 'forecasts');
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Error in simple forecast API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch forecasts',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  return NextResponse.json(
    { 
      error: 'Advanced forecasting features not available in simple mode',
      suggestion: 'Use basic forecast creation through the UI'
    },
    { status: 501 }
  );
}