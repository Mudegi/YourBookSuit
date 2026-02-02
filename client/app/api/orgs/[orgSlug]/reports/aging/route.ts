import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { customerService } from '@/services/ar/customer.service';

/**
 * GET /api/orgs/[orgSlug]/reports/aging
 * Generate AR Aging Report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    // Permission: VIEW Customers
    const res = await requirePermission(
      request,
      { orgSlug: params.orgSlug },
      PermissionSections.CUSTOMERS,
      PermissionActions.VIEW
    );
    if (!res.ok) return res.response;

    const organizationId = res.organizationId;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const asOfDateStr = searchParams.get('asOfDate');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const branchId = searchParams.get('branchId') || undefined;

    const options = {
      asOfDate: asOfDateStr ? new Date(asOfDateStr) : undefined,
      includeInactive,
      branchId,
    };

    // Generate aging report
    const report = await customerService.generateAgingReport(
      organizationId,
      options
    );

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating aging report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate aging report',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
