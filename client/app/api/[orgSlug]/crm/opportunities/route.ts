import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership, ensurePermission } from '@/lib/access';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/* ───── Stage → Default Probability mapping ───── */
const STAGE_PROBABILITY: Record<string, number> = {
  QUALIFICATION: 10,
  PROPOSAL: 50,
  NEGOTIATION: 70,
  WON: 100,
  LOST: 0,
};

const ACTIVE_STAGES = ['QUALIFICATION', 'PROPOSAL', 'NEGOTIATION'];
const ALL_STAGES = ['QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

/* ───── GET: Pipeline view (grouped by stage) ───── */
export async function GET(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const assignedTo = searchParams.get('assignedTo');
    const companyId = searchParams.get('companyId');
    const source = searchParams.get('source');
    const search = searchParams.get('search');
    const includeClosedDeals = searchParams.get('includeClosed') === 'true';

    // Build filter
    const where: any = { organizationId: org.id };
    if (branchId) where.branchId = branchId;
    if (assignedTo) where.assignedTo = assignedTo;
    if (companyId) where.companyId = companyId;
    if (source) where.source = source;
    if (!includeClosedDeals) {
      where.stage = { in: ACTIVE_STAGES };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const opportunities = await prisma.opportunity.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, type: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    // Group by stage
    const pipeline: Record<string, typeof opportunities> = {};
    for (const stage of ALL_STAGES) {
      pipeline[stage] = [];
    }
    for (const opp of opportunities) {
      if (!pipeline[opp.stage]) pipeline[opp.stage] = [];
      pipeline[opp.stage].push(opp);
    }

    // Compute metrics
    const activeOpps = opportunities.filter((o) => ACTIVE_STAGES.includes(o.stage));
    const totalValue = activeOpps.reduce((s, o) => s + Number(o.value || 0), 0);
    const weightedValue = activeOpps.reduce(
      (s, o) => s + Number(o.value || 0) * (Number(o.probability) / 100),
      0
    );
    const wonOpps = opportunities.filter((o) => o.stage === 'WON');
    const lostOpps = opportunities.filter((o) => o.stage === 'LOST');

    // Overdue: active deals past expectedCloseDate
    const now = new Date();
    const overdueCount = activeOpps.filter(
      (o) => o.expectedCloseDate && new Date(o.expectedCloseDate) < now
    ).length;

    const metrics = {
      totalActive: activeOpps.length,
      totalValue,
      weightedValue,
      wonCount: wonOpps.length,
      wonValue: wonOpps.reduce((s, o) => s + Number(o.value || 0), 0),
      lostCount: lostOpps.length,
      overdueCount,
      byStage: ALL_STAGES.map((stage) => {
        const stageOpps = pipeline[stage] || [];
        return {
          stage,
          count: stageOpps.length,
          value: stageOpps.reduce((s, o) => s + Number(o.value || 0), 0),
          weighted: stageOpps.reduce(
            (s, o) => s + Number(o.value || 0) * (Number(o.probability) / 100),
            0
          ),
        };
      }),
    };

    return NextResponse.json({ success: true, pipeline, metrics, opportunities });
  } catch (error) {
    console.error('GET opportunities error:', error);
    return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 });
  }
}

/* ───── Validation ───── */
const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  companyId: z.string().min(1, 'Company is required'),
  contactId: z.string().optional(),
  assignedTo: z.string().optional(),
  branchId: z.string().optional(),
  description: z.string().optional(),
  value: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  stage: z.enum(['QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.coerce.date().optional(),
  source: z.string().optional(),
});

/* ───── POST: Create opportunity ───── */
export async function POST(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const membership = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'manage:crm');
    const { org } = membership;

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;

    // Verify company belongs to org
    const company = await prisma.company.findFirst({
      where: { id: d.companyId, organizationId: org.id },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Verify branch if provided
    if (d.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: d.branchId, organizationId: org.id },
      });
      if (!branch) {
        return NextResponse.json({ error: 'Branch not found' }, { status: 400 });
      }
    }

    const stage = d.stage || 'QUALIFICATION';
    const probability = d.probability ?? STAGE_PROBABILITY[stage] ?? 10;

    const opportunity = await prisma.opportunity.create({
      data: {
        organizationId: org.id,
        companyId: d.companyId,
        contactId: d.contactId || null,
        assignedTo: d.assignedTo || user.id,
        branchId: d.branchId || null,
        name: d.name,
        description: d.description || null,
        value: d.value != null ? d.value : null,
        currency: d.currency || org.baseCurrency || 'USD',
        stage,
        probability: Math.min(100, Math.max(0, probability)),
        expectedCloseDate: d.expectedCloseDate || null,
        source: d.source || null,
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'CREATE',
        entityType: 'OPPORTUNITY',
        entityId: opportunity.id,
        changes: { name: d.name, companyId: d.companyId, stage, value: d.value },
      },
    });

    return NextResponse.json({ ok: true, opportunity }, { status: 201 });
  } catch (error) {
    console.error('POST opportunity error:', error);
    return NextResponse.json({ error: 'Failed to create opportunity' }, { status: 500 });
  }
}
