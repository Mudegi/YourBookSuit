import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { ReconciliationService } from '@/services/banking/reconciliation.service';

/**
 * POST /api/orgs/[orgSlug]/banking/reconciliation/[id]/adjustment
 * Create a bank adjustment entry (fees, interest, etc.)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId, userId } = await requireAuth(params.orgSlug);
    const body = await request.json();

    if (
      !body.transactionDate ||
      body.amount === undefined ||
      !body.description ||
      !body.accountId ||
      !body.adjustmentType ||
      !body.bankAccountId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: transactionDate, amount, description, accountId, adjustmentType, bankAccountId',
        },
        { status: 400 }
      );
    }

    const result = await ReconciliationService.createAdjustmentEntry(
      organizationId,
      userId,
      body.bankAccountId,
      params.id,
      {
        transactionDate: new Date(body.transactionDate),
        amount: parseFloat(body.amount),
        description: body.description,
        accountId: body.accountId,
        adjustmentType: body.adjustmentType,
      }
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Adjustment entry created successfully',
    });
  } catch (error) {
    console.error('Error creating adjustment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create adjustment',
      },
      { status: 500 }
    );
  }
}
