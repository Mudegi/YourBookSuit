import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { CreditNoteApplicationService } from '@/services/accounting/credit-note-application.service';

/**
 * GET /api/orgs/[orgSlug]/customers/[id]/outstanding-invoices
 * Get customer's outstanding invoices for credit note application
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const invoices = await CreditNoteApplicationService.getOutstandingInvoices(
      params.id, // This is the customerId
      user.organizationId
    );

    return NextResponse.json({ success: true, invoices });
  } catch (error: any) {
    console.error('Error fetching outstanding invoices:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
