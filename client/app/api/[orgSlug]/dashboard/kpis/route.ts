import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);
    
    // Fetch KPI data safely with field validation
    const [invoiceAgg, billAgg, customerCount, vendorCount] = await Promise.all([
      prisma.invoice.aggregate({
        where: { organizationId: org.id },
        _sum: { total: true },
        _count: true,
      }).catch(() => ({ _sum: { total: 0 }, _count: 0 })),
      prisma.bill.aggregate({
        where: { organizationId: org.id },
        _sum: { total: true },
        _count: true,
      }).catch(() => ({ _sum: { total: 0 }, _count: 0 })),
      prisma.customer.count({ where: { organizationId: org.id } }).catch(() => 0),
      prisma.vendor.count({ where: { organizationId: org.id } }).catch(() => 0),
    ]);

    const revenue = Number(invoiceAgg._sum.total || 0);
    const payables = Number(billAgg._sum.total || 0);

    return NextResponse.json({
      kpis: {
        revenue: Number(revenue.toFixed(2)),
        payables: Number(payables.toFixed(2)),
        invoices: invoiceAgg._count,
        bills: billAgg._count,
        customers: customerCount,
        vendors: vendorCount,
        netIncome: Number((revenue - payables).toFixed(2)),
      },
    });
  } catch (err: any) {
    console.error('KPI fetch error:', err);
    const status = err?.statusCode || 500;
    return NextResponse.json({ error: err?.message || 'Server error' }, { status });
  }
}
