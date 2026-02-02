import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get current user from token
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    const body = await request.json();
    const { name, legalName, homeCountry, baseCurrency, fiscalYearStart } = body;

    // Validation
    if (!name || !baseCurrency || !fiscalYearStart) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (fiscalYearStart < 1 || fiscalYearStart > 12) {
      return NextResponse.json(
        { error: 'Invalid fiscal year start month' },
        { status: 400 }
      );
    }

    // Get user's organization
    const userOrg = await prisma.organizationUser.findFirst({
      where: { userId },
      include: { organization: true },
    });

    if (!userOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Update organization
    const updatedOrg = await prisma.organization.update({
      where: { id: userOrg.organizationId },
      data: {
        name,
        legalName: legalName || name, // Use company name if legal name not provided
        homeCountry: homeCountry || 'US',
        baseCurrency,
        fiscalYearStart,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedOrg,
    });
  } catch (error: any) {
    console.error('Company details update error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
