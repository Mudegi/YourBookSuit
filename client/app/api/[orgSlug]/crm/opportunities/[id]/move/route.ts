import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership, ensurePermission } from '@/lib/access';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/* ───── Stage → Default Probability ───── */
const STAGE_PROBABILITY: Record<string, number> = {
  QUALIFICATION: 10,
  PROPOSAL: 50,
  NEGOTIATION: 70,
  WON: 100,
  LOST: 0,
};

const moveSchema = z.object({
  stage: z.enum(['QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']),
  reasonLost: z.string().optional(),
});

/**
 * POST /api/[orgSlug]/crm/opportunities/[id]/move
 * Drag-and-drop stage transition — automatically adjusts probability
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const membership = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'manage:crm');
    const { org } = membership;

    const body = await req.json();
    const parsed = moveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { stage, reasonLost } = parsed.data;

    const opp = await prisma.opportunity.findFirst({
      where: { id: params.id, organizationId: org.id },
    });
    if (!opp) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

    if (opp.stage === stage) {
      return NextResponse.json({ success: true, message: 'No change' });
    }

    // Require reasonLost when moving to LOST
    if (stage === 'LOST' && !reasonLost) {
      return NextResponse.json(
        { error: 'reasonLost is required when marking a deal as Lost', requiresReason: true },
        { status: 400 }
      );
    }

    const now = new Date();
    const updateData: any = {
      stage,
      probability: STAGE_PROBABILITY[stage] ?? 50,
    };

    if (stage === 'WON') {
      updateData.wonDate = now;
      updateData.closedDate = now;
    } else if (stage === 'LOST') {
      updateData.lostDate = now;
      updateData.closedDate = now;
      updateData.reasonLost = reasonLost;
    } else {
      // Re-opening from closed
      if (opp.stage === 'WON' || opp.stage === 'LOST') {
        updateData.wonDate = null;
        updateData.lostDate = null;
        updateData.closedDate = null;
      }
    }

    const updated = await prisma.opportunity.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    // Log the stage change on the company
    await prisma.activity.create({
      data: {
        organizationId: org.id,
        companyId: opp.companyId,
        type: 'SYSTEM',
        subject: `Deal "${opp.name}" moved: ${opp.stage} → ${stage}`,
        description: stage === 'LOST' ? `Reason: ${reasonLost}` : null,
        createdBy: user.id,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Move opportunity error:', error);
    return NextResponse.json({ error: 'Failed to move opportunity' }, { status: 500 });
  }
}
