import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';

const VALID_ROLES = ['BILLING', 'SALES', 'TECHNICAL', 'EXECUTIVE', 'GENERAL'] as const;

const contactCreateSchema = z.object({
  companyId: z.string().optional().or(z.literal('')),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  whatsapp: z.string().optional().or(z.literal('')),
  extension: z.string().optional().or(z.literal('')),
  linkedIn: z.string().optional().or(z.literal('')),
  title: z.string().optional().or(z.literal('')),
  department: z.string().optional().or(z.literal('')),
  contactRole: z.enum(VALID_ROLES).optional(),
  isPrimary: z.boolean().optional(),
  isDecisionMaker: z.boolean().optional(),
  branchId: z.string().optional().or(z.literal('')),
  optOutMarketing: z.boolean().optional(),
  sendInvoicesWhatsApp: z.boolean().optional(),
  notes: z.string().optional().or(z.literal('')),
});

// GET /api/[orgSlug]/crm/contacts
export async function GET(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const role = searchParams.get('role');
    const branchId = searchParams.get('branchId');
    const search = searchParams.get('search');
    const isPrimary = searchParams.get('isPrimary');
    const independent = searchParams.get('independent');

    const where: any = { organizationId: org.id };

    if (companyId) where.companyId = companyId;
    if (independent === 'true') where.companyId = null;
    if (role && VALID_ROLES.includes(role as any)) where.contactRole = role;
    if (branchId) where.branchId = branchId;
    if (isPrimary === 'true') where.isPrimary = true;

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, type: true, lifecycleStage: true } },
        branch: { select: { id: true, name: true, code: true } },
        _count: { select: { activities: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });

    return NextResponse.json({ success: true, data: contacts });
  } catch (error) {
    console.error('Get contacts error:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/crm/contacts
export async function POST(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const body = await req.json();
    const parsed = contactCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    if (data.companyId) {
      const company = await prisma.company.findUnique({ where: { id: data.companyId } });
      if (!company || company.organizationId !== org.id) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
    }

    if (data.branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
      if (!branch || branch.organizationId !== org.id) {
        return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
      }
    }

    const contact = await prisma.contact.create({
      data: {
        organizationId: org.id,
        companyId: data.companyId || null,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        extension: data.extension || null,
        linkedIn: data.linkedIn || null,
        title: data.title || null,
        department: data.department || null,
        contactRole: data.contactRole || 'GENERAL',
        isPrimary: data.isPrimary || false,
        isDecisionMaker: data.isDecisionMaker || false,
        branchId: data.branchId || null,
        optOutMarketing: data.optOutMarketing || false,
        sendInvoicesWhatsApp: data.sendInvoicesWhatsApp || false,
        notes: data.notes || null,
      },
      include: {
        company: { select: { id: true, name: true, type: true, lifecycleStage: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ success: true, data: contact }, { status: 201 });
  } catch (error) {
    console.error('Create contact error:', error);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
