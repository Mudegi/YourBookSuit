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

const updateSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  value: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  stage: z.enum(['QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.coerce.date().nullable().optional(),
  closedDate: z.coerce.date().nullable().optional(),
  source: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  reasonLost: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  branchId: z.string().nullable().optional(),
});

/* ─── GET /api/[orgSlug]/crm/opportunities/[id] ─── */
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const opportunity = await prisma.opportunity.findFirst({
      where: { id: params.id, organizationId: org.id },
      include: {
        company: { select: { id: true, name: true, type: true, lifecycleStage: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, whatsapp: true } },
        assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    // Get related activities (from the company, linked to this deal timeframe)
    const activities = await prisma.activity.findMany({
      where: { organizationId: org.id, companyId: opportunity.companyId },
      include: { createdByUser: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Weighted value calculation
    const weightedValue = Number(opportunity.value || 0) * (Number(opportunity.probability) / 100);

    return NextResponse.json({
      success: true,
      data: { ...opportunity, weightedValue },
      activities,
    });
  } catch (error) {
    console.error('GET opportunity error:', error);
    return NextResponse.json({ error: 'Failed to fetch opportunity' }, { status: 500 });
  }
}

/* ─── PUT /api/[orgSlug]/crm/opportunities/[id] ─── */
export async function PUT(
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
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const opp = await prisma.opportunity.findFirst({
      where: { id: params.id, organizationId: org.id },
    });
    if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const d = parsed.data;

    // Stage transition logic
    const newStage = d.stage || opp.stage;
    const stageChanged = d.stage && d.stage !== opp.stage;
    const now = new Date();

    // If moving to LOST, reasonLost is required
    if (newStage === 'LOST' && !d.reasonLost && !opp.reasonLost) {
      return NextResponse.json(
        { error: 'reasonLost is required when marking a deal as Lost' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (d.name !== undefined) updateData.name = d.name;
    if (d.description !== undefined) updateData.description = d.description;
    if (d.value !== undefined) updateData.value = d.value;
    if (d.currency !== undefined) updateData.currency = d.currency;
    if (d.expectedCloseDate !== undefined) updateData.expectedCloseDate = d.expectedCloseDate;
    if (d.closedDate !== undefined) updateData.closedDate = d.closedDate;
    if (d.source !== undefined) updateData.source = d.source;
    if (d.reason !== undefined) updateData.reason = d.reason;
    if (d.reasonLost !== undefined) updateData.reasonLost = d.reasonLost;
    if (d.contactId !== undefined) updateData.contactId = d.contactId;
    if (d.assignedTo !== undefined) updateData.assignedTo = d.assignedTo;
    if (d.branchId !== undefined) updateData.branchId = d.branchId;

    // Stage transition
    if (stageChanged) {
      updateData.stage = newStage;
      // Auto-set probability to stage default unless explicitly provided
      if (d.probability === undefined) {
        updateData.probability = STAGE_PROBABILITY[newStage] ?? opp.probability;
      }
      // Auto-set dates
      if (newStage === 'WON') {
        updateData.wonDate = now;
        updateData.closedDate = now;
      } else if (newStage === 'LOST') {
        updateData.lostDate = now;
        updateData.closedDate = now;
      } else {
        // Re-opening a deal
        if (opp.stage === 'WON' || opp.stage === 'LOST') {
          updateData.wonDate = null;
          updateData.lostDate = null;
          updateData.closedDate = null;
        }
      }
    }

    if (d.probability !== undefined) {
      updateData.probability = Math.min(100, Math.max(0, d.probability));
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

    // Log stage change as activity on the company
    if (stageChanged) {
      await prisma.activity.create({
        data: {
          organizationId: org.id,
          companyId: opp.companyId,
          type: 'SYSTEM',
          subject: `Opportunity "${opp.name}" moved to ${newStage}`,
          description: newStage === 'LOST' ? `Reason: ${d.reasonLost || opp.reasonLost}` : null,
          createdBy: user.id,
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'UPDATE',
        entityType: 'OPPORTUNITY',
        entityId: params.id,
        changes: updateData,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('PUT opportunity error:', error);
    return NextResponse.json({ error: 'Failed to update opportunity' }, { status: 500 });
  }
}

/* ─── DELETE /api/[orgSlug]/crm/opportunities/[id] ─── */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const membership = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'manage:crm');
    const { org } = membership;

    const opp = await prisma.opportunity.findFirst({
      where: { id: params.id, organizationId: org.id },
    });
    if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.opportunity.delete({ where: { id: params.id } });

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'DELETE',
        entityType: 'OPPORTUNITY',
        entityId: params.id,
        changes: { name: opp.name },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE opportunity error:', error);
    return NextResponse.json({ error: 'Failed to delete opportunity' }, { status: 500 });
  }
}
