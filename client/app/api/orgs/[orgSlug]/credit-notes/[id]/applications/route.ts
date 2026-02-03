import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import { CreditNoteApplicationService } from '@/services/accounting/credit-note-application.service';

// GET /api/orgs/[orgSlug]/credit-notes/[id]/applications
export async function GET(
  _request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await requireOrgMembership(user.id, params.orgSlug);

    const applications = await CreditNoteApplicationService.getApplicationHistory(params.id);

    return NextResponse.json({ success: true, applications });
  } catch (error: any) {
    console.error('Error fetching credit note applications:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch applications' },
      { status: 400 }
    );
  }
}

// POST /api/orgs/[orgSlug]/credit-notes/[id]/applications
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await requireOrgMembership(user.id, params.orgSlug);

    const body = await request.json();
    const { applications, notes, restockInventory } = body;

    if (!applications || applications.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one application is required' },
        { status: 400 }
      );
    }

    const result = await CreditNoteApplicationService.applyCreditNote({
      creditNoteId: params.id,
      applications,
      appliedBy: user.id,
      notes,
      restockInventory: restockInventory || false,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        creditNote: result.creditNote,
        applications: result.applications,
        glTransactionId: result.glTransactionId,
        inventoryRestocked: result.inventoryRestocked,
      },
    });
  } catch (error: any) {
    console.error('Error applying credit note:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to apply credit note' },
      { status: 400 }
    );
  }
}
