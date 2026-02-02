/**
 * API: Organization Information
 * GET /api/[orgSlug]/organization - Get organization details
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        legalName: true,
        baseCurrency: true,
        homeCountry: true,
        industry: true,
        isActive: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: organization,
    });

  } catch (error: any) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch organization',
        details: error.message,
      },
      { status: 500 }
    );
  }
}