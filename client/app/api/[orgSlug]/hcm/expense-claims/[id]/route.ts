import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import { ExpenseClaimService } from '@/services/hcm/expense-claim.service';
import { z } from 'zod';

// GET /api/[orgSlug]/hcm/expense-claims/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'read');

    const claim = await ExpenseClaimService.getClaimDetail(org.id, params.id);
    if (!claim) {
      return NextResponse.json({ success: false, error: 'Claim not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: claim });
  } catch (error: any) {
    console.error('Error fetching expense claim:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch claim' }, { status: 500 });
  }
}

const actionSchema = z.object({
  action: z.enum(['submit', 'approve', 'reject', 'query', 'mark_paid']),
  reason: z.string().optional(),
  queryNotes: z.string().optional(),
  paidViaPayroll: z.boolean().optional(),
});

// PUT /api/[orgSlug]/hcm/expense-claims/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'update');

    const body = await request.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const { action, reason, queryNotes, paidViaPayroll } = parsed.data;

    switch (action) {
      case 'submit': {
        const result = await ExpenseClaimService.submitClaim(org.id, params.id, user.id);
        return NextResponse.json({ success: true, data: result });
      }

      case 'approve': {
        const result = await ExpenseClaimService.approveClaim({
          organizationId: org.id,
          claimId: params.id,
          userId: user.id,
        });
        return NextResponse.json({
          success: true,
          data: result.claim,
          journalEntry: { transactionId: result.transactionId, transactionNumber: result.transactionNumber },
        });
      }

      case 'reject': {
        if (!reason) {
          return NextResponse.json({ success: false, error: 'Rejection reason is required' }, { status: 400 });
        }
        const result = await ExpenseClaimService.rejectClaim({
          organizationId: org.id,
          claimId: params.id,
          userId: user.id,
          reason,
        });
        return NextResponse.json({ success: true, data: result });
      }

      case 'query': {
        if (!queryNotes) {
          return NextResponse.json({ success: false, error: 'Query notes are required' }, { status: 400 });
        }
        const result = await ExpenseClaimService.queryClaim(org.id, params.id, user.id, queryNotes);
        return NextResponse.json({ success: true, data: result });
      }

      case 'mark_paid': {
        const result = await ExpenseClaimService.markPaid(org.id, params.id, user.id, paidViaPayroll);
        return NextResponse.json({ success: true, data: result });
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error updating expense claim:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update claim' },
      { status: error.message?.includes('not found') ? 404 : 500 }
    );
  }
}
