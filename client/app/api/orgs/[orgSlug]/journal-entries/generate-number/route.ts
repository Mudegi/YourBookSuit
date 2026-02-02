import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { JournalEntryService } from '@/services/accounting/journal-entry.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);
    
    const number = await JournalEntryService.generateReferenceNumber(organizationId);

    return NextResponse.json({
      success: true,
      data: { number },
    });
  } catch (error) {
    console.error('Error generating journal entry number:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate reference number' },
      { status: 500 }
    );
  }
}
