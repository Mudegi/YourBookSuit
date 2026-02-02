import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { customerService } from '@/services/ar/customer.service';

/**
 * GET /api/orgs/[orgSlug]/customers/[id]/financials
 * Get comprehensive financial summary for a customer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
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
    const customerId = params.id;

    // Get comprehensive customer data with financials
    const customer = await customerService.getCustomerWithFinancials(
      customerId,
      organizationId
    );

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('Error fetching customer financials:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch customer financials',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
