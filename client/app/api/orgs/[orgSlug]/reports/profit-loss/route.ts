import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import FinancialReportsService from '@/services/reports/financial-reports.service';

/**
 * GET /api/orgs/[orgSlug]/reports/profit-loss
 * Generate Profit & Loss Statement with dynamic aggregation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await requireAuth(params.orgSlug);

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const basis = (searchParams.get('basis') || 'ACCRUAL') as 'ACCRUAL' | 'CASH';
    const includeComparison = searchParams.get('includeComparison') === 'true';
    const branchId = searchParams.get('branchId') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;
    const projectId = searchParams.get('projectId') || undefined;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const report = await FinancialReportsService.generateProfitLoss(
      {
        organizationId: user.organizationId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        basis,
        branchId,
        departmentId,
        projectId,
      },
      includeComparison
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
    console.error('Error generating P&L report:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
