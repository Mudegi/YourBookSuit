/**
 * API: Monthly Depreciation Batch Processing
 * POST /api/[orgSlug]/depreciation/run-monthly - Run monthly depreciation for all assets
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { runMonthlyDepreciation } from '@/lib/depreciation-service';

export async function POST(
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
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const { year, month, autoPost = false } = body;

    // Validation
    if (!year || !month) {
      return NextResponse.json(
        { error: 'Missing required fields: year, month' },
        { status: 400 }
      );
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Invalid month. Must be between 1 and 12' },
        { status: 400 }
      );
    }

    // Run monthly depreciation
    const result = await runMonthlyDepreciation(
      organization.id,
      year,
      month,
      autoPost ? payload.userId : undefined
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error running monthly depreciation:', error);
    return NextResponse.json(
      { error: 'Failed to run monthly depreciation', details: error.message },
      { status: 500 }
    );
  }
}
