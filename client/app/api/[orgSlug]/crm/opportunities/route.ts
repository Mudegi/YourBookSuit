import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership, ensurePermission } from '@/lib/access';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgMembership = await requireOrgMembership(user.id, params.orgSlug);

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get('stage');
    const companyId = searchParams.get('companyId');

    // Build filter
    const where: any = { organizationId: org.id };
    if (stage) where.stage = stage;
    if (companyId) where.companyId = companyId;

    const opportunities = await prisma.opportunity.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
      },
      orderBy: [
        { stage: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Group by stage for pipeline view
    const pipeline = opportunities.reduce(
      (acc, opp) => {
        const stageGroup = acc[opp.stage] || [];
        stageGroup.push(opp);
        acc[opp.stage] = stageGroup;
        return acc;
      },
      {} as Record<string, typeof opportunities>
    );

    // Calculate pipeline metrics
    const metrics = {
      totalOpportunities: opportunities.length,
      totalValue: opportunities.reduce((sum, opp) => sum + Number(opp.value || 0), 0),
      weightedValue: opportunities.reduce(
        (sum, opp) => sum + Number(opp.value || 0) * (opp.probability / 100),
        0
      ),
      byStage: Object.entries(pipeline).map(([stage, opps]) => ({
        stage,
        count: opps.length,
        value: opps.reduce((sum, opp) => sum + Number(opp.value || 0), 0),
      })),
    };

    return NextResponse.json({ opportunities, pipeline, metrics });
  } catch (error) {
    console.error('Get opportunities error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgMembership = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(orgMembership.role, 'manage:crm');

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      companyId,
      value,
      currency = 'USD',
      stage = 'PROSPECT',
      probability = 50,
    } = body;

    if (!name || !companyId) {
      return NextResponse.json(
        { error: 'name and companyId are required' },
        { status: 400 }
      );
    }

    // Verify company exists and belongs to org
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company || company.organizationId !== org.id) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        organizationId: org.id,
        companyId,
        name,
        value: value ? parseFloat(value) : null,
        currency,
        stage,
        probability: Math.min(100, Math.max(0, probability)),
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
        changes: { name, companyId, stage, value },
      },
    });

    return NextResponse.json(
      { ok: true, opportunity },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create opportunity error:', error);
    return NextResponse.json(
      { error: 'Failed to create opportunity' },
      { status: 500 }
    );
  }
}
