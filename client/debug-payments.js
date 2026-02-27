const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ log: ['error'] });

async function main() {
  try {
    const org = await p.organization.findUnique({ where: { slug: 'demo-company' } });
    if (!org) { console.log('No org found'); return; }

    const payments = await p.payment.findMany({
      where: { organizationId: org.id },
      orderBy: { paymentDate: 'desc' },
      skip: 0,
      take: 25,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        vendor: { select: { id: true, companyName: true, contactName: true } },
        bankAccount: { select: { id: true, accountName: true, accountNumber: true, bankName: true, glAccountId: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        allocations: {
          include: {
            invoice: { select: { id: true, invoiceNumber: true, total: true } },
            bill: { select: { id: true, billNumber: true, total: true } },
          },
        },
      },
    });

    console.log('SUCCESS! Found', payments.length, 'payments');
    if (payments.length > 0) {
      const p0 = payments[0];
      console.log('Payment #:', p0.paymentNumber, '| Status:', p0.status, '| Amount:', p0.amount.toString());
    }
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

main().finally(() => p.$disconnect());
