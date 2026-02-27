import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';

const VALID_ROLES = ['BILLING', 'SALES', 'TECHNICAL', 'EXECUTIVE', 'GENERAL'] as const;

const contactUpdateSchema = z.object({
  companyId: z.string().optional().nullable(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  extension: z.string().optional().nullable(),
  linkedIn: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  contactRole: z.enum(VALID_ROLES).optional(),
  isPrimary: z.boolean().optional(),
  isDecisionMaker: z.boolean().optional(),
  branchId: z.string().optional().nullable(),
  optOutMarketing: z.boolean().optional(),
  sendInvoicesWhatsApp: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

// GET /api/[orgSlug]/crm/contacts/[id] — Full contact profile
export async function GET(req: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            type: true,
            lifecycleStage: true,
            email: true,
            phone: true,
            industry: true,
            city: true,
            country: true,
            outstandingBalance: true,
          },
        },
        branch: { select: { id: true, name: true, code: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            createdByUser: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        _count: { select: { activities: true } },
      },
    });

    if (!contact || contact.organizationId !== org.id) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: contact });
  } catch (error) {
    console.error('Get contact error:', error);
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 });
  }
}

// PUT /api/[orgSlug]/crm/contacts/[id] — Update contact
export async function PUT(req: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const existing = await prisma.contact.findUnique({ where: { id: params.id } });
    if (!existing || existing.organizationId !== org.id) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = contactUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Validate company if changing
    if (data.companyId !== undefined && data.companyId) {
      const company = await prisma.company.findUnique({ where: { id: data.companyId } });
      if (!company || company.organizationId !== org.id) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
    }

    const updated = await prisma.contact.update({
      where: { id: params.id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.companyId !== undefined && { companyId: data.companyId || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.whatsapp !== undefined && { whatsapp: data.whatsapp || null }),
        ...(data.extension !== undefined && { extension: data.extension || null }),
        ...(data.linkedIn !== undefined && { linkedIn: data.linkedIn || null }),
        ...(data.title !== undefined && { title: data.title || null }),
        ...(data.department !== undefined && { department: data.department || null }),
        ...(data.contactRole !== undefined && { contactRole: data.contactRole }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
        ...(data.isDecisionMaker !== undefined && { isDecisionMaker: data.isDecisionMaker }),
        ...(data.branchId !== undefined && { branchId: data.branchId || null }),
        ...(data.optOutMarketing !== undefined && { optOutMarketing: data.optOutMarketing }),
        ...(data.sendInvoicesWhatsApp !== undefined && { sendInvoicesWhatsApp: data.sendInvoicesWhatsApp }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
      include: {
        company: { select: { id: true, name: true, type: true, lifecycleStage: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update contact error:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}

// DELETE /api/[orgSlug]/crm/contacts/[id]
export async function DELETE(req: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const existing = await prisma.contact.findUnique({ where: { id: params.id } });
    if (!existing || existing.organizationId !== org.id) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    await prisma.contact.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete contact error:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
