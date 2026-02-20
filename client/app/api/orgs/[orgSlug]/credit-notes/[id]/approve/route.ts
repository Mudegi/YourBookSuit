import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/orgs/[orgSlug]/credit-notes/[id]/approve
 * Approve a credit note
 */
export async function POST(req: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { approvalNotes, autoPost } = body;

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true }
    });

    if (!org) return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });

    const creditNote = await prisma.creditNote.findFirst({
      where: { id: params.id, organizationId: org.id }
    });

    if (!creditNote) {
      return NextResponse.json({ success: false, error: 'Credit note not found' }, { status: 404 });
    }

    if (creditNote.status !== 'DRAFT' && creditNote.status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ success: false, error: 'Credit note cannot be approved' }, { status: 400 });
    }

    const updated = await prisma.creditNote.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        approvedBy: user.id,
        approvedAt: new Date(),
        approvalNotes: approvalNotes || null
      },
      include: {
        customer: true,
        invoice: true,
        lineItems: true
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error approving credit note:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
