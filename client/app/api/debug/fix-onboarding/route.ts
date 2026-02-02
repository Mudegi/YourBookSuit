/**
 * Quick fix for onboarding issues
 * POST /api/debug/fix-onboarding
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const session = await verifyToken(token);
    if (!session?.organizationId) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 404 }
      );
    }

    // Get current org state
    const org = await prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: {
        id: true,
        name: true,
        legalName: true,
        homeCountry: true,
        baseCurrency: true,
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Fix missing fields
    const updates: any = {};
    
    if (!org.legalName) {
      updates.legalName = org.name; // Use organization name as legal name
    }
    
    if (!org.homeCountry) {
      updates.homeCountry = 'US'; // Default to US
    }
    
    if (!org.baseCurrency) {
      updates.baseCurrency = 'USD'; // Default to USD
    }

    if (Object.keys(updates).length > 0) {
      await prisma.organization.update({
        where: { id: org.id },
        data: updates,
      });

      return NextResponse.json({
        success: true,
        message: 'Organization profile fixed!',
        updates,
        nextStep: 'Refresh the page and try accessing the dashboard',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Organization profile is already complete',
      nextStep: 'You should be able to access the dashboard now',
    });
  } catch (error) {
    console.error('Fix error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
