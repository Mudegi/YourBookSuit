import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { TaxReturnService } from '@/services/tax/tax-return.service';

/**
 * GET /api/orgs/[orgSlug]/tax/vat-return/details
 * Get drill-down details for a tax category
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgSlug: string }> | { orgSlug: string } }
) {
  try {
    const resolvedParams = context.params instanceof Promise ? await context.params : context.params;
    const orgSlug = resolvedParams.orgSlug;
    const { userId, organizationId } = await requireAuth(orgSlug);

    const { searchParams } = new URL(request.url);
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');
    const category = searchParams.get('category') as 'OUTPUT_VAT' | 'INPUT_VAT' | 'ZERO_RATED';
    const taxRuleId = searchParams.get('taxRuleId') || undefined;

    if (!periodStart || !periodEnd || !category) {
      return NextResponse.json(
        { error: 'periodStart, periodEnd, and category are required' },
        { status: 400 }
      );
    }

    // Get drill-down details
    const details = await TaxReturnService.getDrillDownDetails(
      organizationId,
      new Date(periodStart),
      new Date(periodEnd),
      category,
      taxRuleId
    );

    // Transform to serializable format
    const response = details.map(detail => ({
      ...detail,
      baseAmount: detail.baseAmount.toNumber(),
      taxAmount: detail.taxAmount.toNumber(),
    }));

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching tax details:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tax details' },
      { status: 500 }
    );
  }
}
