import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ReportingService } from '@/services/reports/reporting.service';

const prisma = new PrismaClient();
const reportingService = new ReportingService();

/**
 * GET /api/orgs/[orgSlug]/reports/cash-flow
 * Generate Cash Flow Statement
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

    // Generate cash flow statement
    const cashFlow = await reportingService.generateCashFlow(
      organization.id,
      startDate,
      endDate
    );

    return NextResponse.json(cashFlow);
  } catch (error: any) {
    console.error('Error generating cash flow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate cash flow statement' },
      { status: 500 }
    );
  }
}
