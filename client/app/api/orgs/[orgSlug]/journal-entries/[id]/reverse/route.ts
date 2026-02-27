import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { journalListService } from '@/services/accounting/journal-list.service';

/**
 * POST /api/orgs/[orgSlug]/journal-entries/[id]/reverse
 * Create a reversing entry for a posted journal entry
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId, userId } = await requireAuth(params.orgSlug);

    const body = await request.json();
    const { reason } = body;

    const reverseEntryId = await journalListService.createReverseEntry(
      organizationId,
      params.id,
      userId,
      reason
    );

    return NextResponse.json({
      success: true,
      reverseEntryId,
      message: 'Reversing entry created successfully',
    });
  } catch (error) {
    console.error('Error reversing journal entry:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ success: false, error: 'Journal entry not found' }, { status: 404 });
      }
      if (error.message.includes('voided')) {
        return NextResponse.json({ success: false, error: 'Cannot reverse a voided transaction' }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: 'Failed to reverse journal entry' }, { status: 500 });
  }
}
