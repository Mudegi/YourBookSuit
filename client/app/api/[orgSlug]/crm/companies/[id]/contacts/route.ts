import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';

// GET /api/[orgSlug]/crm/companies/[id]/contacts
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const contacts = await prisma.contact.findMany({
      where: { companyId: params.id, organizationId: org.id },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, data: contacts });
  } catch (error) {
    console.error('Get company contacts error:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/crm/companies/[id]/contacts
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
    const {
      firstName, lastName, email, phone, title, department, isPrimary, notes,
      whatsapp, extension, linkedIn, contactRole, isDecisionMaker, branchId,
      optOutMarketing, sendInvoicesWhatsApp,
    } = body;

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First and last name are required' }, { status: 400 });
    }

    // Validate branch belongs to the same org if provided
    if (branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: branchId, organizationId: org.id },
      });
      if (!branch) {
        return NextResponse.json({ error: 'Branch not found' }, { status: 400 });
      }
    }

    // If setting as primary, unset other primaries
    if (isPrimary) {
      await prisma.contact.updateMany({
        where: { companyId: params.id, organizationId: org.id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.contact.create({
      data: {
        organizationId: org.id,
        companyId: params.id,
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        extension: extension || null,
        linkedIn: linkedIn || null,
        title: title || null,
        department: department || null,
        contactRole: contactRole || 'GENERAL',
        isPrimary: isPrimary || false,
        isDecisionMaker: isDecisionMaker || false,
        branchId: branchId || null,
        optOutMarketing: optOutMarketing || false,
        sendInvoicesWhatsApp: sendInvoicesWhatsApp || false,
        notes: notes || null,
      },
    });

    // Log contact creation
    await prisma.activity.create({
      data: {
        organizationId: org.id,
        companyId: params.id,
        type: 'SYSTEM',
        subject: `Contact added: ${firstName} ${lastName}`,
        description: title ? `${title}${department ? ` — ${department}` : ''}` : null,
        contactId: contact.id,
        createdBy: user.id,
      },
    });

    return NextResponse.json({ success: true, data: contact }, { status: 201 });
  } catch (error) {
    console.error('Create company contact error:', error);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
