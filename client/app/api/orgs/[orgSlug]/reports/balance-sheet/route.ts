import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import FinancialReportsService from '@/services/reports/financial-reports.service';

/**
 * GET /api/orgs/[orgSlug]/reports/balance-sheet
 * Generate Balance Sheet (Statement of Financial Position)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await requireAuth(params.orgSlug);

    const searchParams = request.nextUrl.searchParams;
    const asOfDate = searchParams.get('asOfDate');
    const basis = (searchParams.get('basis') || 'ACCRUAL') as 'ACCRUAL' | 'CASH';
    const fiscalYearStart = searchParams.get('fiscalYearStart');

    if (!asOfDate) {
      return NextResponse.json(
        { success: false, error: 'As-of date is required' },
        { status: 400 }
      );
    }

    const report = await FinancialReportsService.generateBalanceSheet(
      user.organizationId,
      new Date(asOfDate),
      basis,
      fiscalYearStart ? new Date(fiscalYearStart) : undefined
    );

    // Convert Decimal to string for JSON serialization
    const serializedReport = JSON.parse(
      JSON.stringify(report, (key, value) => {
        if (value && typeof value === 'object' && value.constructor.name === 'Decimal') {
          return value.toString();
        }
        return value;
      })
    );

    return NextResponse.json({
      success: true,
      report: serializedReport,
    });
  } catch (error: any) {
    console.error('Error generating Balance Sheet:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
