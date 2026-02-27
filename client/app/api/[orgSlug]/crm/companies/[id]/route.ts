import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';

// GET /api/[orgSlug]/crm/companies/[id] — 360-degree company profile
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const company = await prisma.company.findFirst({
      where: { id: params.id, organizationId: org.id },
      include: {
        accountManager: { select: { id: true, firstName: true, lastName: true, email: true } },
        branch: { select: { id: true, name: true, code: true } },
        contacts: { orderBy: { isPrimary: 'desc' } },
        opportunities: { orderBy: { createdAt: 'desc' } },
        activities: {
          include: {
            createdByUser: { select: { id: true, firstName: true, lastName: true } },
            contact: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        crmTasks: {
          include: {
            assignedUser: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
        },
        _count: {
          select: { contacts: true, opportunities: true, activities: true, crmTasks: true },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Fetch financial stats — find matching Customer by companyName or taxId
    let financialStats = {
      totalRevenue: 0,
      outstandingBalance: 0,
      invoiceCount: 0,
      estimateCount: 0,
      paymentCount: 0,
      lastInvoiceDate: null as string | null,
      lastPaymentDate: null as string | null,
    };

    try {
      // Find customer linked by name or tax ID
      const customerWhere: any = {
        organizationId: org.id,
        OR: [] as any[],
      };
      if (company.name) customerWhere.OR.push({ companyName: { contains: company.name, mode: 'insensitive' } });
      if (company.taxId) customerWhere.OR.push({ taxIdNumber: company.taxId });
      if (company.email) customerWhere.OR.push({ email: company.email });

      if (customerWhere.OR.length > 0) {
        const customers = await prisma.customer.findMany({
          where: customerWhere,
          select: { id: true },
        });

        if (customers.length > 0) {
          const customerIds = customers.map((c) => c.id);

          const [invoiceAgg, estimateCount, paymentCount, lastInvoice, lastPayment] =
            await Promise.all([
              prisma.invoice.aggregate({
                where: { customerId: { in: customerIds }, organizationId: org.id },
                _sum: { total: true, amountPaid: true },
                _count: true,
              }),
              prisma.estimate.count({
                where: { customerId: { in: customerIds }, organizationId: org.id },
              }),
              prisma.payment.count({
                where: { customerId: { in: customerIds }, organizationId: org.id },
              }),
              prisma.invoice.findFirst({
                where: { customerId: { in: customerIds }, organizationId: org.id },
                orderBy: { invoiceDate: 'desc' },
                select: { invoiceDate: true },
              }),
              prisma.payment.findFirst({
                where: { customerId: { in: customerIds }, organizationId: org.id },
                orderBy: { paymentDate: 'desc' },
                select: { paymentDate: true },
              }),
            ]);

          financialStats = {
            totalRevenue: Number(invoiceAgg._sum.total || 0),
            outstandingBalance:
              Number(invoiceAgg._sum.total || 0) - Number(invoiceAgg._sum.amountPaid || 0),
            invoiceCount: invoiceAgg._count,
            estimateCount,
            paymentCount,
            lastInvoiceDate: lastInvoice?.invoiceDate?.toISOString() || null,
            lastPaymentDate: lastPayment?.paymentDate?.toISOString() || null,
          };
        }
      }
    } catch (e) {
      console.error('Financial stats error:', e);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...company,
        financialStats,
      },
    });
  } catch (error) {
    console.error('Get company detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 });
  }
}

// PUT /api/[orgSlug]/crm/companies/[id] — update company
export async function PUT(
  req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const existing = await prisma.company.findFirst({
      where: { id: params.id, organizationId: org.id },
    });
    if (!existing) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const body = await req.json();
    const {
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
      status,
      accountManagerId,
      branchId,
      defaultCurrency,
      defaultPaymentTerms,
      notes,
    } = body;

    const changes: Record<string, any> = {};
    if (lifecycleStage && lifecycleStage !== existing.lifecycleStage) {
      changes.lifecycleStage = { from: existing.lifecycleStage, to: lifecycleStage };
    }

    const company = await prisma.company.update({
      where: { id: params.id },
      data: {
        name: name ?? existing.name,
        type: type ?? existing.type,
        lifecycleStage: lifecycleStage ?? existing.lifecycleStage,
        industry: industry !== undefined ? industry : existing.industry,
        website: website !== undefined ? website : existing.website,
        email: email !== undefined ? email : existing.email,
        phone: phone !== undefined ? phone : existing.phone,
        address: address !== undefined ? address : existing.address,
        city: city !== undefined ? city : existing.city,
        country: country !== undefined ? country : existing.country,
        taxId: taxId !== undefined ? taxId : existing.taxId,
        status: status ?? existing.status,
        accountManagerId: accountManagerId !== undefined ? (accountManagerId || null) : existing.accountManagerId,
        branchId: branchId !== undefined ? (branchId || null) : existing.branchId,
        defaultCurrency: defaultCurrency !== undefined ? defaultCurrency : existing.defaultCurrency,
        defaultPaymentTerms: defaultPaymentTerms !== undefined
          ? (defaultPaymentTerms ? parseInt(defaultPaymentTerms) : null)
          : existing.defaultPaymentTerms,
        notes: notes !== undefined ? notes : existing.notes,
      },
      include: {
        accountManager: { select: { id: true, firstName: true, lastName: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    // Log lifecycle changes
    if (Object.keys(changes).length > 0) {
      await prisma.activity.create({
        data: {
          organizationId: org.id,
          companyId: company.id,
          type: 'SYSTEM',
          subject: 'Company updated',
          description: `Lifecycle stage changed from ${changes.lifecycleStage?.from} to ${changes.lifecycleStage?.to}`,
          createdBy: user.id,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'UPDATE',
        entityType: 'COMPANY',
        entityId: company.id,
        changes,
      },
    });

    return NextResponse.json({ success: true, data: company });
  } catch (error) {
    console.error('Update company error:', error);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}

// DELETE /api/[orgSlug]/crm/companies/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const existing = await prisma.company.findFirst({
      where: { id: params.id, organizationId: org.id },
    });
    if (!existing) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    await prisma.company.delete({ where: { id: params.id } });

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'DELETE',
        entityType: 'COMPANY',
        entityId: params.id,
        changes: { name: existing.name },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete company error:', error);
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}
