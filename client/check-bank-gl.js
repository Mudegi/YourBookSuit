const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const banks = await p.bankAccount.findMany({
    select: { id: true, accountName: true, bankName: true, glAccountId: true, accountType: true }
  });
  console.log('=== Bank Accounts ===');
  banks.forEach(b => console.log(JSON.stringify(b)));

  const gl = await p.chartOfAccount.findMany({
    where: { accountType: 'ASSET', code: { startsWith: '1' } },
    select: { id: true, code: true, name: true },
    orderBy: { code: 'asc' }
  });
  console.log('\n=== Asset GL Accounts (1xxx) ===');
  gl.forEach(a => console.log(JSON.stringify(a)));

  await p.$disconnect();
}
main();
