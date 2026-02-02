import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import FinancialReportsService from '@/services/reports/financial-reports.service';

/**
 * GET /api/orgs/[orgSlug]/reports/drill-down
 * Get transactions for drill-down from a report line item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await requireAuth(params.orgSlug);

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!accountId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Account ID, start date, and end date are required' },
        { status: 400 }
      );
    }

    const transactionIds = await FinancialReportsService.getDrillDownTransactions(
      accountId,
      new Date(startDate),
      new Date(endDate),
      user.organizationId
    );

    return NextResponse.json({
      success: true,
      transactionIds,
      redirectUrl: `/${params.orgSlug}/general-ledger?accountId=${accountId}&startDate=${startDate}&endDate=${endDate}`,
    });
  } catch (error: any) {
    console.error('Error fetching drill-down data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
