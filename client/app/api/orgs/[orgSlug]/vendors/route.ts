import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';

// Zod schema for vendor validation
const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  
  contactPerson: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  
  billingAddress: z.string().optional().nullable(),
  billingCity: z.string().optional().nullable(),
  billingState: z.string().optional().nullable(),
  billingPostalCode: z.string().optional().nullable(),
  billingCountry: z.string().optional().nullable(),
  
  paymentTerms: z.enum([
    'DUE_ON_RECEIPT',
    'NET_15',
    'NET_30',
    'NET_60',
    'NET_90'
  ]).default('NET_30'),
  
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

/**
 * GET /api/orgs/[orgSlug]/vendors
 * List all vendors with optional search and filters
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    // Get organization ID from header or slug
    let organizationId = request.headers.get('x-organization-id');
    if (!organizationId) {
      try {
        const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
        if (!org) {
          return NextResponse.json({ vendors: [], count: 0 });
        }
        organizationId = org.id;
      } catch {
        return NextResponse.json({ vendors: [], count: 0 });
      }
    }

    // Query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const isActiveParam = searchParams.get('isActive');
    const isActive = isActiveParam === null ? undefined : isActiveParam === 'true';
    const take = Number(searchParams.get('limit') || 50);

    // Build where
    const where: any = { organizationId };
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { companyName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    // Fetch vendors for this organization
    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: { companyName: 'asc' },
      take,
      include: {
        _count: { select: { bills: true } },
        bills: { select: { id: true, total: true, status: true } },
      },
    });

    // Helper to convert numeric payment terms to UI strings
    const toTermsString = (days: number | null | undefined): string => {
      switch (days) {
        case 0: return 'DUE_ON_RECEIPT';
        case 15: return 'NET_15';
        case 60: return 'NET_60';
        case 90: return 'NET_90';
        default: return 'NET_30';
      }
    };

    const outstandingStatuses = new Set(['SUBMITTED', 'APPROVED', 'PARTIALLY_PAID', 'OVERDUE']);

    // Normalize vendor data
    const vendorsWithTotals = vendors.map((vendor: any) => {
      const bills = vendor.bills || [];
      const totalOwed = bills
        .filter((bill: any) => outstandingStatuses.has(String(bill.status)))
        .reduce((sum: number, bill: any) => sum + Number(bill.total ?? 0), 0);

      const totalPaid = bills
        .filter((bill: any) => String(bill.status) === 'PAID')
        .reduce((sum: number, bill: any) => sum + Number(bill.total ?? 0), 0);

      return {
        id: vendor.id,
        name: vendor.companyName,
        email: vendor.email ?? null,
        phone: vendor.phone ?? null,
        website: vendor.website ?? null,
        contactPerson: vendor.contactName ?? null,
        billingAddress: null,
        billingCity: null,
        billingState: null,
        billingPostalCode: null,
        billingCountry: null,
        paymentTerms: toTermsString(vendor.paymentTerms),
        isActive: vendor.isActive,
        totalOwed,
        totalPaid,
        _count: vendor._count,
      };
    });

    return NextResponse.json({ vendors: vendorsWithTotals, count: vendors.length });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json({ vendors: [], count: 0 });
  }
}

/**
 * POST /api/orgs/[orgSlug]/vendors
 * Create a new vendor
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const body = await request.json();
    const validatedData = vendorSchema.parse(body);

    // Check if email is unique (if provided)
    if (validatedData.email) {
      const existingVendor = await prisma.vendor.findFirst({
        where: {
          organizationId: org.id,
          email: validatedData.email,
        },
      });

      if (existingVendor) {
        return NextResponse.json(
          { error: 'A vendor with this email already exists' },
          { status: 400 }
        );
      }
    }

    // Map UI fields to Prisma schema fields
    const termDays = (() => {
      switch (validatedData.paymentTerms) {
        case 'DUE_ON_RECEIPT':
          return 0;
        case 'NET_15':
          return 15;
        case 'NET_60':
          return 60;
        case 'NET_90':
          return 90;
        case 'NET_30':
        default:
          return 30;
      }
    })();

    const vendorNumber = `VEND-${Date.now()}`;

    // Convert empty strings to null for non-required fields
    const cleanEmail = validatedData.email && validatedData.email !== '' ? validatedData.email : '';
    const cleanPhone = validatedData.phone && validatedData.phone !== '' ? validatedData.phone : null;
    const cleanWebsite = validatedData.website && validatedData.website !== '' ? validatedData.website : null;
    const cleanTaxId = validatedData.taxId && validatedData.taxId !== '' ? validatedData.taxId : null;
    const cleanContactPerson = validatedData.contactPerson && validatedData.contactPerson !== '' ? validatedData.contactPerson : null;
    const cleanContactPhone = validatedData.contactPhone && validatedData.contactPhone !== '' ? validatedData.contactPhone : null;
    const cleanNotes = validatedData.notes && validatedData.notes !== '' ? validatedData.notes : null;

    const vendor = await prisma.vendor.create({
      data: {
        organizationId: org.id,
        vendorNumber,
        companyName: validatedData.name,
        contactName: cleanContactPerson,
        email: cleanEmail,
        phone: cleanPhone,
        website: cleanWebsite,
        taxIdNumber: cleanTaxId,
        paymentTerms: termDays,
        // omit billingAddress; UI captures flat fields
        notes: cleanNotes,
        isActive: validatedData.isActive,
      },
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}
