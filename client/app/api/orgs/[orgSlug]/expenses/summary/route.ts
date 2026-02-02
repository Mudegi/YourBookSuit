import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { ExpenseService } from '@/services/expenses/expense.service';

/**
 * GET /api/orgs/[orgSlug]/expenses/summary
 * Get expense summary report grouped by category/project/cost center
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);
    const searchParams = request.nextUrl.searchParams;

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') as 'CATEGORY' | 'PROJECT' | 'COST_CENTER' || 'CATEGORY';

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const summary = await ExpenseService.getExpenseSummary(
      organizationId,
      new Date(startDate),
      new Date(endDate),
      groupBy
    );

    return NextResponse.json({ success: true, summary, groupBy });
  } catch (error: any) {
    console.error('Error generating expense summary:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
