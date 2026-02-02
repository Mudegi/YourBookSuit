import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { ExpenseService } from '@/services/expenses/expense.service';

/**
 * GET /api/orgs/[orgSlug]/expenses/suggestions
 * Get expense category suggestions based on vendor
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organization } = await requireAuth(request);
    const searchParams = request.nextUrl.searchParams;

    const vendorId = searchParams.get('vendorId');
    const vendorName = searchParams.get('vendorName');

    if (!vendorId && !vendorName) {
      return NextResponse.json(
        { error: 'Either vendorId or vendorName is required' },
        { status: 400 }
      );
    }

    const suggestions = await ExpenseService.getExpenseSuggestions(
      organization.id,
      vendorId || undefined,
      vendorName || undefined
    );

    return NextResponse.json({ success: true, suggestions });
  } catch (error: any) {
    console.error('Error fetching expense suggestions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}
