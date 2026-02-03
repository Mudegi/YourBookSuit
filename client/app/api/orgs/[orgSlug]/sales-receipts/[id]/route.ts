import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import { SalesReceiptService } from '@/services/sales-receipt.service';

/**
 * GET /api/orgs/[orgSlug]/sales-receipts/[id]
 * Get sales receipt details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const salesReceipt = await SalesReceiptService.getSalesReceipt(
      params.id,
      org.id
    );

    if (!salesReceipt) {
      return NextResponse.json(
        { success: false, error: 'Sales receipt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: salesReceipt,
    });
  } catch (error: any) {
    console.error('Error fetching sales receipt:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch sales receipt' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[orgSlug]/sales-receipts/[id]/void
 * Void a sales receipt
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

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const result = await SalesReceiptService.voidSalesReceipt(
      params.id,
      org.id,
      user.id
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error voiding sales receipt:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to void sales receipt' },
      { status: 500 }
    );
  }
}
