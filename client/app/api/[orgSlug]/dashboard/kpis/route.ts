import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { subDays, subMonths, startOfMonth, format } from 'date-fns';

export async function GET(req: Request, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);
    const orgId = org.id;

    const url = new URL(req.url);
    const range = url.searchParams.get('range') || '30d';
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const now = new Date();
    const periodStart = subDays(now, days);
    const prevPeriodStart = subDays(periodStart, days);

    // ── Parallel queries ────────────────────────────────────────────────
    const [
      invoiceAggCurrent,
      invoiceAggPrev,
      billAgg,
      customerCount,
      vendorCount,
      bankAccounts,
      invoicesByStatus,
      recentInvoices,
      topCustomers,
      overdueInvoices,
      billsDueSoon,
      monthlyRevenue,
      paymentsReceived,
    ] = await Promise.all([
      // Current period invoices
      prisma.invoice.aggregate({
        where: { organizationId: orgId, invoiceDate: { gte: periodStart, lte: now }, status: { notIn: ['DRAFT', 'VOIDED', 'CANCELLED'] } },
        _sum: { total: true, amountDue: true, amountPaid: true },
        _count: true,
      }).catch(() => ({ _sum: { total: null, amountDue: null, amountPaid: null }, _count: 0 })),

      // Previous period invoices (for % change)
      prisma.invoice.aggregate({
        where: { organizationId: orgId, invoiceDate: { gte: prevPeriodStart, lt: periodStart }, status: { notIn: ['DRAFT', 'VOIDED', 'CANCELLED'] } },
        _sum: { total: true },
        _count: true,
      }).catch(() => ({ _sum: { total: null }, _count: 0 })),

      // Bills (payables)
      prisma.bill.aggregate({
        where: { organizationId: orgId, status: { notIn: ['DRAFT', 'VOIDED', 'CANCELLED'] } },
        _sum: { total: true, amountDue: true },
        _count: true,
      }).catch(() => ({ _sum: { total: null, amountDue: null }, _count: 0 })),

      prisma.customer.count({ where: { organizationId: orgId, isActive: true } }).catch(() => 0),
      prisma.vendor.count({ where: { organizationId: orgId } }).catch(() => 0),

      // Bank accounts for cash balance
      prisma.bankAccount.findMany({
        where: { organizationId: orgId, isActive: true },
        select: { currentBalance: true },
      }).catch(() => []),

      // Invoice status breakdown
      prisma.invoice.groupBy({
        by: ['status'],
        where: { organizationId: orgId, status: { notIn: ['DRAFT', 'VOIDED', 'CANCELLED'] } },
        _count: true,
        _sum: { total: true },
      }).catch(() => []),

      // Recent invoices (last 10)
      prisma.invoice.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, invoiceNumber: true, total: true, amountDue: true, status: true, invoiceDate: true,
          customer: { select: { companyName: true, firstName: true, lastName: true } },
        },
      }).catch(() => []),

      // Top customers by invoiced revenue in period
      prisma.invoice.groupBy({
        by: ['customerId'],
        where: { organizationId: orgId, invoiceDate: { gte: periodStart, lte: now }, status: { notIn: ['DRAFT', 'VOIDED', 'CANCELLED'] } },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }).catch(() => []),

      // Overdue invoices
      prisma.invoice.aggregate({
        where: { organizationId: orgId, status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID', 'VIEWED'] }, dueDate: { lt: now } },
        _sum: { amountDue: true },
        _count: true,
      }).catch(() => ({ _sum: { amountDue: null }, _count: 0 })),

      // Bills due within 7 days
      prisma.bill.aggregate({
        where: { organizationId: orgId, status: { in: ['SUBMITTED', 'APPROVED', 'PARTIALLY_PAID'] }, dueDate: { gte: now, lte: subDays(now, -7) } },
        _sum: { amountDue: true },
        _count: true,
      }).catch(() => ({ _sum: { amountDue: null }, _count: 0 })),

      // Monthly revenue for chart (last 6 months)
      (async () => {
        const months: { month: string; revenue: number; expenses: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const mStart = startOfMonth(subMonths(now, i));
          const mEnd = i === 0 ? now : startOfMonth(subMonths(now, i - 1));
          const label = format(mStart, 'MMM');

          const [rev, exp] = await Promise.all([
            prisma.invoice.aggregate({
              where: { organizationId: orgId, invoiceDate: { gte: mStart, lt: mEnd }, status: { notIn: ['DRAFT', 'VOIDED', 'CANCELLED'] } },
              _sum: { total: true },
            }).catch(() => ({ _sum: { total: null } })),
            prisma.bill.aggregate({
              where: { organizationId: orgId, billDate: { gte: mStart, lt: mEnd }, status: { notIn: ['DRAFT', 'VOIDED', 'CANCELLED'] } },
              _sum: { total: true },
            }).catch(() => ({ _sum: { total: null } })),
          ]);

          months.push({
            month: label,
            revenue: Number(rev._sum.total || 0),
            expenses: Number(exp._sum.total || 0),
          });
        }
        return months;
      })(),

      // Payments received in period
      prisma.payment.aggregate({
        where: { organizationId: orgId, paymentType: 'RECEIPT', paymentDate: { gte: periodStart, lte: now } },
        _sum: { amount: true },
        _count: true,
      }).catch(() => ({ _sum: { amount: null }, _count: 0 })),
    ]);

    // ── Resolve top customer names ──────────────────────────────────────
    let topCustomersList: { name: string; revenue: number }[] = [];
    if (topCustomers.length > 0) {
      const customerIds = topCustomers.map((c: any) => c.customerId);
      const customers = await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, companyName: true, firstName: true, lastName: true },
      });
      const custMap = new Map(customers.map(c => [c.id, c.companyName || `${c.firstName} ${c.lastName}`]));
      topCustomersList = topCustomers.map((c: any) => ({
        name: custMap.get(c.customerId) || 'Unknown',
        revenue: Number(c._sum.total || 0),
      }));
    }

    // ── Compute values ──────────────────────────────────────────────────
    const currentRevenue = Number(invoiceAggCurrent._sum.total || 0);
    const previousRevenue = Number(invoiceAggPrev._sum.total || 0);
    const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    const totalReceivable = Number(invoiceAggCurrent._sum.amountDue || 0);
    // Also get all-time receivable (outstanding)
    const allReceivableAgg = await prisma.invoice.aggregate({
      where: { organizationId: orgId, status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID', 'VIEWED'] } },
      _sum: { amountDue: true },
      _count: true,
    }).catch(() => ({ _sum: { amountDue: null }, _count: 0 }));

    const totalPayable = Number(billAgg._sum.amountDue || 0);
    const cashBalance = bankAccounts.reduce((sum: number, b: any) => sum + Number(b.currentBalance || 0), 0);

    // Invoice status pie data
    const statusMap: Record<string, { count: number; total: number }> = {};
    (invoicesByStatus as any[]).forEach((s: any) => {
      statusMap[s.status] = { count: s._count, total: Number(s._sum.total || 0) };
    });
    const totalInvoiceCount = Object.values(statusMap).reduce((s, v) => s + v.count, 0);

    const paidCount = (statusMap['PAID']?.count || 0);
    const pendingCount = (statusMap['SENT']?.count || 0) + (statusMap['VIEWED']?.count || 0) + (statusMap['PARTIALLY_PAID']?.count || 0);
    const overdueCount = statusMap['OVERDUE']?.count || 0;

    const invoiceStatusData = totalInvoiceCount > 0 ? [
      { name: 'Paid', value: Math.round((paidCount / totalInvoiceCount) * 100), color: '#10b981' },
      { name: 'Pending', value: Math.round((pendingCount / totalInvoiceCount) * 100), color: '#f59e0b' },
      { name: 'Overdue', value: Math.round((overdueCount / totalInvoiceCount) * 100), color: '#ef4444' },
    ] : [
      { name: 'Paid', value: 0, color: '#10b981' },
      { name: 'Pending', value: 0, color: '#f59e0b' },
      { name: 'Overdue', value: 0, color: '#ef4444' },
    ];

    // Format recent invoices
    const formattedRecentInvoices = (recentInvoices as any[]).slice(0, 5).map((inv: any) => ({
      id: inv.invoiceNumber,
      customer: inv.customer?.companyName || `${inv.customer?.firstName || ''} ${inv.customer?.lastName || ''}`.trim() || 'Unknown',
      amount: Number(inv.total || 0),
      status: inv.status === 'PAID' ? 'Paid'
        : (inv.status === 'OVERDUE' || (inv.status !== 'PAID' && inv.status !== 'DRAFT' && new Date(inv.dueDate) < now)) ? 'Overdue'
        : 'Pending',
    }));

    // Cash flow by day of week (last 7 days from payments)
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const cashFlowByDay: { day: string; inflow: number; outflow: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(now, i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      const [inflow, outflow] = await Promise.all([
        prisma.payment.aggregate({
          where: { organizationId: orgId, paymentType: 'RECEIPT', paymentDate: { gte: dayStart, lt: dayEnd } },
          _sum: { amount: true },
        }).catch(() => ({ _sum: { amount: null } })),
        prisma.payment.aggregate({
          where: { organizationId: orgId, paymentType: 'PAYMENT', paymentDate: { gte: dayStart, lt: dayEnd } },
          _sum: { amount: true },
        }).catch(() => ({ _sum: { amount: null } })),
      ]);
      cashFlowByDay.push({
        day: weekDays[dayStart.getDay()],
        inflow: Number(inflow._sum.amount || 0),
        outflow: Number(outflow._sum.amount || 0),
      });
    }

    // ── Alerts ───────────────────────────────────────────────────────────
    const alerts = [];
    const overdueInvCount = overdueInvoices._count || 0;
    const overdueInvAmount = Number(overdueInvoices._sum.amountDue || 0);
    if (overdueInvCount > 0) {
      alerts.push({ type: 'danger', title: `${overdueInvCount} Overdue Invoice${overdueInvCount > 1 ? 's' : ''}`, detail: overdueInvAmount });
    }
    const billsDueCount = billsDueSoon._count || 0;
    if (billsDueCount > 0) {
      alerts.push({ type: 'warning', title: `${billsDueCount} Bill${billsDueCount > 1 ? 's' : ''} Due Soon`, detail: Number(billsDueSoon._sum.amountDue || 0) });
    }
    // Revenue goal (compare to simple target = previous period revenue)
    if (previousRevenue > 0) {
      const pct = Math.round((currentRevenue / previousRevenue) * 100);
      alerts.push({ type: 'info', title: 'Revenue vs Last Period', detail: pct });
    }

    return NextResponse.json({
      kpis: {
        revenue: Number(currentRevenue.toFixed(2)),
        revenueChange: Number(revenueChange.toFixed(1)),
        receivable: Number((allReceivableAgg._sum.amountDue ? Number(allReceivableAgg._sum.amountDue) : 0).toFixed(2)),
        receivableCount: allReceivableAgg._count || 0,
        payables: Number(totalPayable.toFixed(2)),
        payablesCount: billAgg._count || 0,
        cashBalance: Number(cashBalance.toFixed(2)),
        customers: customerCount,
        vendors: vendorCount,
        paymentsReceived: Number(paymentsReceived._sum.amount || 0),
        paymentsCount: paymentsReceived._count || 0,
      },
      invoiceStatusData,
      revenueData: monthlyRevenue,
      cashFlowData: cashFlowByDay,
      topCustomers: topCustomersList,
      recentInvoices: formattedRecentInvoices,
      alerts,
    });
  } catch (err: any) {
    console.error('KPI fetch error:', err);
    const status = err?.statusCode || 500;
    return NextResponse.json({ error: err?.message || 'Server error' }, { status });
  }
}
