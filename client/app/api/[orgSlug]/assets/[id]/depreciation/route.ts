/**
 * API: Asset Depreciation Management
 * POST /api/[orgSlug]/assets/[id]/depreciation/calculate - Calculate and generate schedule
 * POST /api/[orgSlug]/assets/[id]/depreciation/post - Post depreciation to GL
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  generateDepreciationSchedule,
  postDepreciationToGL,
} from '@/lib/depreciation-service';

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
    const { action, periodIds } = body;

    if (action === 'calculate') {
      // Generate depreciation schedule
      const asset = await prisma.asset.findFirst({
        where: {
          id: params.id,
          organizationId: organization.id,
        },
      });

      if (!asset) {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
      }

      if (asset.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: 'Can only calculate depreciation for active assets' },
          { status: 400 }
        );
      }

      const schedule = await generateDepreciationSchedule(params.id);

      return NextResponse.json({
        success: true,
        data: {
          schedule,
          summary: {
            totalPeriods: schedule.length,
            totalDepreciation: schedule.reduce(
              (sum, period) => sum + Number(period.depreciationAmount),
              0
            ),
          },
        },
      });
    } else if (action === 'post') {
      // Post depreciation to GL
      if (!periodIds || !Array.isArray(periodIds) || periodIds.length === 0) {
        return NextResponse.json(
          { error: 'periodIds array is required' },
          { status: 400 }
        );
      }

      const results = [];
      const errors = [];

      for (const periodId of periodIds) {
        try {
          const result = await postDepreciationToGL(periodId, payload.userId);
          results.push(result);
        } catch (error: any) {
          errors.push({
            periodId,
            error: error.message,
          });
        }
      }

      return NextResponse.json({
        success: errors.length === 0,
        data: {
          posted: results,
          errors,
          summary: {
            totalPosted: results.length,
            totalFailed: errors.length,
            totalAmount: results.reduce(
              (sum, r) => sum + Number(r.depreciation.depreciationAmount),
              0
            ),
          },
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "calculate" or "post"' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error processing depreciation:', error);
    return NextResponse.json(
      { error: 'Failed to process depreciation', details: error.message },
      { status: 500 }
    );
  }
}
