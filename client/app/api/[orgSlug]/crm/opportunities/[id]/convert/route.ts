import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership, ensurePermission } from '@/lib/access';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const convertSchema = z.object({
  type: z.enum(['ESTIMATE', 'INVOICE']),
});

/**
 * POST /api/[orgSlug]/crm/opportunities/[id]/convert
 * Convert a WON opportunity to an Estimate or redirect info for Invoice creation.
 * Returns the data needed to pre-fill the Estimate/Invoice form.
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
    const parsed = convertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const opp = await prisma.opportunity.findFirst({
      where: { id: params.id, organizationId: org.id },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!opp) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    if (opp.stage !== 'WON') {
      return NextResponse.json(
        { error: 'Only WON opportunities can be converted' },
        { status: 400 }
      );
    }

    // Return pre-fill data for the estimate/invoice form
    // The actual creation happens on the Estimate/Invoice page
    const prefill = {
      type: parsed.data.type,
      opportunityId: opp.id,
      opportunityName: opp.name,
      companyId: opp.companyId,
      companyName: opp.company?.name,
      contactName: opp.contact ? `${opp.contact.firstName} ${opp.contact.lastName}` : null,
      contactEmail: opp.contact?.email,
      currency: opp.currency,
      value: Number(opp.value || 0),
      description: opp.description,
    };

    // Mark the conversion on the opportunity
    if (parsed.data.type === 'ESTIMATE') {
      await prisma.opportunity.update({
        where: { id: params.id },
        data: { convertedEstimateId: 'pending' },
      });
    } else {
      await prisma.opportunity.update({
        where: { id: params.id },
        data: { convertedInvoiceId: 'pending' },
      });
    }

    // Log the conversion
    await prisma.activity.create({
      data: {
        organizationId: org.id,
        companyId: opp.companyId,
        type: 'SYSTEM',
        subject: `Deal "${opp.name}" conversion to ${parsed.data.type} initiated`,
        createdBy: user.id,
      },
    });

    return NextResponse.json({ success: true, prefill });
  } catch (error) {
    console.error('Convert opportunity error:', error);
    return NextResponse.json({ error: 'Failed to convert opportunity' }, { status: 500 });
  }
}
