import { NextRequest, NextResponse } from 'next/server';
import { InvoiceAnalyticsService } from '@/lib/services/invoice/InvoiceAnalyticsService';
import { requirePermission } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await requirePermission(params.orgSlug, 'INVOICES.EDIT');

    const body = await request.json();
    const { invoiceIds } = body;

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid invoice IDs' },
        { status: 400 }
      );
    }

    const result = await InvoiceAnalyticsService.sendBulkReminders(
      user.organizationId,
      invoiceIds
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error sending bulk reminders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send reminders' },
      { status: 500 }
    );
  }
}
