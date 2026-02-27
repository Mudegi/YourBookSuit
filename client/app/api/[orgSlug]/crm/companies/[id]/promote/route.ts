import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';

const VALID_STAGES = ['LEAD', 'PROSPECT', 'CUSTOMER', 'DORMANT'];

// POST /api/[orgSlug]/crm/companies/[id]/promote — promote lifecycle stage
export async function POST(
  req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const company = await prisma.company.findFirst({
      where: { id: params.id, organizationId: org.id },
    });
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const body = await req.json();
    const { stage } = body;

    if (!stage || !VALID_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` },
        { status: 400 }
      );
    }

    const oldStage = company.lifecycleStage;

    const updated = await prisma.company.update({
      where: { id: params.id },
      data: {
        lifecycleStage: stage,
        // When promoting to CUSTOMER, also set type
        ...(stage === 'CUSTOMER' ? { type: 'CLIENT' } : {}),
      },
    });

    // Log the promotion activity
    await prisma.activity.create({
      data: {
        organizationId: org.id,
        companyId: params.id,
        type: 'SYSTEM',
        subject: `Lifecycle stage changed: ${oldStage} → ${stage}`,
        description: `${user.firstName} ${user.lastName} promoted this company from ${oldStage} to ${stage}.`,
        createdBy: user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'UPDATE',
        entityType: 'COMPANY',
        entityId: params.id,
        changes: { lifecycleStage: { from: oldStage, to: stage } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Promote company error:', error);
    return NextResponse.json({ error: 'Failed to promote company' }, { status: 500 });
  }
}
