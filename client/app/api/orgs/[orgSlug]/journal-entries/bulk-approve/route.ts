import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { journalListService } from '@/services/accounting/journal-list.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    // Permission: APPROVE General Ledger (or EDIT if no APPROVE permission exists)
    const res = await requirePermission(
      request, 
      { orgSlug: params.orgSlug }, 
      PermissionSections.GENERAL_LEDGER, 
      PermissionActions.EDIT
    );
    if (!res.ok) return res.response;
    
    const organizationId = res.organizationId;
    const userId = res.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { entryIds } = body;

    if (!Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No entry IDs provided' },
        { status: 400 }
      );
    }

    if (entryIds.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Cannot approve more than 100 entries at once' },
        { status: 400 }
      );
    }

    // Bulk approve entries
    const result = await journalListService.bulkApproveEntries(
      organizationId,
      entryIds,
      userId
    );

    return NextResponse.json({
      success: true,
      successful: result.successful,
      failed: result.failed,
      message: `Successfully approved ${result.successful.length} entries. ${result.failed.length} failed.`,
    });

  } catch (error) {
    console.error('Error bulk approving journal entries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve journal entries' },
      { status: 500 }
    );
  }
}