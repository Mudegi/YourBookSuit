import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { journalListService } from '@/services/accounting/journal-list.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    // Permission: EDIT General Ledger
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
    const { reason } = body;

    // Create reverse entry
    const reverseEntryId = await journalListService.createReverseEntry(
      organizationId,
      params.id,
      userId,
      reason
    );

    return NextResponse.json({
      success: true,
      reverseEntryId,
      message: 'Entry reversed successfully',
    });

  } catch (error) {
    console.error('Error reversing journal entry:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: 'Journal entry not found' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('voided')) {
        return NextResponse.json(
          { success: false, error: 'Cannot reverse a voided transaction' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to reverse journal entry' },
      { status: 500 }
    );
  }
}