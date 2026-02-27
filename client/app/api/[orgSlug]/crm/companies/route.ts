import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
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

    await requireOrgMembership(user.id, params.orgSlug);

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const lifecycleStage = searchParams.get('lifecycleStage');
    const accountManagerId = searchParams.get('accountManagerId');
    const branchId = searchParams.get('branchId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build filter
    const where: any = { organizationId: org.id };
    if (type) where.type = type;
    if (status) where.status = status;
    if (lifecycleStage) where.lifecycleStage = lifecycleStage;
    if (accountManagerId) where.accountManagerId = accountManagerId;
    if (branchId) where.branchId = branchId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: {
          accountManager: { select: { id: true, firstName: true, lastName: true } },
          branch: { select: { id: true, name: true, code: true } },
          _count: {
            select: { contacts: true, opportunities: true, activities: true, crmTasks: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.company.count({ where }),
    ]);

    return NextResponse.json({ companies, total, page, limit });
  } catch (error) {
    console.error('Get companies error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
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

    await requireOrgMembership(user.id, params.orgSlug);

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      type = 'PROSPECT',
      lifecycleStage = 'LEAD',
      industry,
      website,
      email,
      phone,
      address,
      city,
      country,
      taxId,
      accountManagerId,
      branchId,
      defaultCurrency,
      defaultPaymentTerms,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    const company = await prisma.company.create({
      data: {
        organizationId: org.id,
        name,
        type,
        lifecycleStage,
        industry,
        website,
        email,
        phone,
        address,
        city,
        country,
        taxId,
        accountManagerId: accountManagerId || null,
        branchId: branchId || null,
        defaultCurrency: defaultCurrency || org.baseCurrency,
        defaultPaymentTerms: defaultPaymentTerms ? parseInt(defaultPaymentTerms) : null,
        notes,
        status: 'ACTIVE',
      },
      include: {
        accountManager: { select: { id: true, firstName: true, lastName: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    // Log the creation activity
    await prisma.activity.create({
      data: {
        organizationId: org.id,
        companyId: company.id,
        type: 'SYSTEM',
        subject: 'Company created',
        description: `${user.firstName} ${user.lastName} created this company.`,
        createdBy: user.id,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'CREATE',
        entityType: 'COMPANY',
        entityId: company.id,
        changes: { name, type, lifecycleStage },
      },
    });

    return NextResponse.json(
      { ok: true, company },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create company error:', error);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}
