import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payments/payment.service';
import { requireAuth } from '@/lib/api-auth';

/**
 * POST /api/orgs/[orgSlug]/payments/[id]/auto-allocate
 * Auto-allocate an unapplied/partially-applied payment using FIFO
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId, userId } = await requireAuth(params.orgSlug);

    const result = await PaymentService.autoAllocate(
      params.id,
      organizationId,
      userId,
    );

    return NextResponse.json({
      success: true,
      allocated: result.allocated,
      allocations: result.newAllocations,
    });
  } catch (error) {
    console.error('Error auto-allocating payment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to auto-allocate payment' },
      { status: 500 },
    );
  }
}
