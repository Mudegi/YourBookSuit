import { prisma } from '@/lib/prisma';

export async function getOrgKpis(orgId: string) {
  const [invoiceAgg, billAgg, paymentAgg, customerCount, vendorCount, cashAccounts] = await Promise.all([
    prisma.invoice.aggregate({
      where: { organizationId: orgId },
      _sum: { total: true },
      _count: true,
    }),
    prisma.bill.aggregate({
      where: { organizationId: orgId },
      _sum: { total: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { organizationId: orgId },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.customer.count({ where: { organizationId: orgId } }),
    prisma.vendor.count({ where: { organizationId: orgId } }),
    prisma.bankAccount.findMany({ where: { organizationId: orgId }, select: { currentBalance: true } }),
  ]);

  const cashBalance = cashAccounts.reduce((sum, a) => sum + Number(a.currentBalance || 0), 0);

  return {
    revenue: Number(invoiceAgg._sum.total || 0),
    payables: Number(billAgg._sum.total || 0),
    payments: Number(paymentAgg._sum.amount || 0),
    invoices: invoiceAgg._count,
    bills: billAgg._count,
    paymentsCount: paymentAgg._count,
    customers: customerCount,
    vendors: vendorCount,
    cashBalance,
  };
}
