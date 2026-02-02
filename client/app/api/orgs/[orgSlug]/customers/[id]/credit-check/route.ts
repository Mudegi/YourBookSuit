import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { customerService } from '@/services/ar/customer.service';

/**
 * POST /api/orgs/[orgSlug]/customers/[id]/credit-check
 * Perform credit check for proposed order amount
 */
export async function POST(
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

    const body = await request.json();
    const { proposedAmount } = body;

    if (!proposedAmount || proposedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid proposed amount required' },
        { status: 400 }
      );
    }

    // Perform credit check
    const creditCheck = await customerService.performCreditCheck(
      customerId,
      organizationId,
      proposedAmount
    );

    return NextResponse.json({
      success: true,
      data: creditCheck,
    });
  } catch (error) {
    console.error('Error performing credit check:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform credit check',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
