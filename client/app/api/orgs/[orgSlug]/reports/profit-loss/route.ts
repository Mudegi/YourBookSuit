import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ReportingService } from '@/services/reports/reporting.service';

const prisma = new PrismaClient();
const reportingService = new ReportingService();

/**
 * GET /api/orgs/[orgSlug]/reports/profit-loss
 * Generate Profit & Loss Statement
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const orgSlug = params.orgSlug;
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Default to current month if no dates provided
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    // Generate profit & loss statement
    const profitLoss = await reportingService.generateProfitLoss(
      organization.id,
      startDate,
      endDate
    );

    return NextResponse.json(profitLoss);
  } catch (error: any) {
    console.error('Error generating profit & loss:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate profit & loss statement' },
      { status: 500 }
    );
  }
}
