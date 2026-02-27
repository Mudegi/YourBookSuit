import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payments/payment.service';
import { requireAuth } from '@/lib/api-auth';

/**
 * POST /api/orgs/[orgSlug]/payments/[id]/void
 * Void a payment — reverses GL entries, removes allocations, updates invoice/bill statuses
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId, userId } = await requireAuth(params.orgSlug);
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'Voided by user';

    const payment = await PaymentService.voidPayment(
      params.id,
      organizationId,
      userId,
      reason,
    );

    return NextResponse.json({ success: true, payment });
  } catch (error) {
    console.error('Error voiding payment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to void payment' },
      { status: 500 },
    );
  }
}
