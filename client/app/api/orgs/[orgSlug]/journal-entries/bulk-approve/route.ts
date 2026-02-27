import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { journalListService } from '@/services/accounting/journal-list.service';

/**
 * POST /api/orgs/[orgSlug]/journal-entries/bulk-approve
 * Approve multiple draft journal entries at once
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requireAuth(params.orgSlug);

    const body = await request.json();
    const { entryIds } = body;

    if (!Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json({ success: false, error: 'No entry IDs provided' }, { status: 400 });
    }

    if (entryIds.length > 100) {
      return NextResponse.json({ success: false, error: 'Cannot approve more than 100 entries at once' }, { status: 400 });
    }

    const result = await journalListService.bulkApproveEntries(
      organizationId,
      entryIds,
      userId
    );

    return NextResponse.json({
      success: true,
      successful: result.successful,
      failed: result.failed,
      message: `Approved ${result.successful.length} entries. ${result.failed.length} failed.`,
    });
  } catch (error) {
    console.error('Error bulk approving journal entries:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to approve entries' },
      { status: 500 }
    );
  }
}
