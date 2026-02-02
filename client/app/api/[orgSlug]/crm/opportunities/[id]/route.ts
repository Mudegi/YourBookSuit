import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership, ensurePermission } from '@/lib/access';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().optional(),
  value: z.number().optional(),
  currency: z.string().length(3).optional(),
  stage: z.enum(['PROSPECT', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
  probability: z.number().min(0).max(100).optional(),
  closedDate: z.coerce.date().optional(),
  reason: z.string().optional(),
});

// GET /api/[orgSlug]/crm/opportunities/[id]
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const opportunity = await prisma.opportunity.findFirst({
      where: { id: params.id, organizationId: org.id },
      include: { company: { select: { id: true, name: true } } },
    });

    if (!opportunity) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: opportunity });
  } catch (error) {
    console.error('Get opportunity error:', error);
    return NextResponse.json({ error: 'Failed to fetch opportunity' }, { status: 500 });
  }
}

// PUT /api/[orgSlug]/crm/opportunities/[id]
export async function PUT(req: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
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

    const opp = await prisma.opportunity.findFirst({ where: { id: params.id, organizationId: org.id } });
    if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.opportunity.update({
      where: { id: params.id },
      data: {
        name: parsed.data.name ?? opp.name,
        value: parsed.data.value ?? opp.value,
        currency: parsed.data.currency ?? opp.currency,
        stage: parsed.data.stage ?? opp.stage,
        probability: parsed.data.probability ?? opp.probability,
        closedDate: parsed.data.closedDate ?? opp.closedDate,
        reason: parsed.data.reason ?? opp.reason,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update opportunity error:', error);
    return NextResponse.json({ error: 'Failed to update opportunity' }, { status: 500 });
  }
}
