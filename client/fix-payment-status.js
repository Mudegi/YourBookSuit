const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const result = await p.payment.updateMany({
    where: { status: 'DRAFT' },
    data: { status: 'POSTED' },
  });
  console.log('Updated', result.count, 'payments to POSTED');
}

main().catch(console.error).finally(() => p.$disconnect());
