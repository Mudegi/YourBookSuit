import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import { SalesReceiptService } from '@/services/sales-receipt.service';

/**
 * POST /api/orgs/[orgSlug]/sales-receipts/[id]/void
 * Void a sales receipt (reverses accounting and inventory)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await requireOrgMembership(user.id, params.orgSlug);
    const body = await request.json();

    if (!body.voidReason) {
      return NextResponse.json(
        { success: false, error: 'Void reason is required' },
        { status: 400 }
      );
    }

    const salesReceipt = await SalesReceiptService.voidSalesReceipt(
      params.id,
      org.id,
      user.id,
      body.voidReason
    );

    return NextResponse.json({
      success: true,
      salesReceipt,
      message: 'Sales receipt voided successfully',
    });
  } catch (error: any) {
    console.error('Error voiding sales receipt:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to void sales receipt' },
      { status: 500 }
    );
  }
}
