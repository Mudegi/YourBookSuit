import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ReportingService } from '@/services/reports/reporting.service';

const prisma = new PrismaClient();
const reportingService = new ReportingService();

/**
 * GET /api/orgs/[orgSlug]/reports/balance-sheet
 * Generate Balance Sheet report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const orgSlug = params.orgSlug;
    const searchParams = request.nextUrl.searchParams;
    const asOfDateParam = searchParams.get('asOfDate');

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Default to today if no date provided
    const asOfDate = asOfDateParam ? new Date(asOfDateParam) : new Date();

    // Generate balance sheet
    const balanceSheet = await reportingService.generateBalanceSheet(
      organization.id,
      asOfDate
    );

    return NextResponse.json(balanceSheet);
  } catch (error: any) {
    console.error('Error generating balance sheet:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate balance sheet' },
      { status: 500 }
    );
  }
}
