const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSubTypes() {
  console.log('=== ASSET ACCOUNT SUB-TYPES ===');
  const assets = await prisma.chartOfAccount.findMany({
    where: {
      organizationId: 'cmkr0wbeq0001vl95dodsfurp',
      accountType: 'ASSET',
    },
    select: {
      code: true,
      name: true,
      accountSubType: true,
    },
  });
  assets.forEach(a => {
    console.log(`${a.code} - ${a.accountSubType || 'NULL'}`);
  });

  console.log('\n=== EQUITY ACCOUNT SUB-TYPES ===');
  const equity = await prisma.chartOfAccount.findMany({
    where: {
      organizationId: 'cmkr0wbeq0001vl95dodsfurp',
      accountType: 'EQUITY',
    },
    select: {
      code: true,
      name: true,
      accountSubType: true,
    },
  });
  equity.forEach(a => {
    console.log(`${a.code} - ${a.accountSubType || 'NULL'}`);
  });

  console.log('\n=== EXPENSE ACCOUNT SUB-TYPES ===');
  const expenses = await prisma.chartOfAccount.findMany({
    where: {
      organizationId: 'cmkr0wbeq0001vl95dodsfurp',
      accountType: 'EXPENSE',
    },
    select: {
      code: true,
      name: true,
      accountSubType: true,
    },
  });
  expenses.forEach(a => {
    console.log(`${a.code} - ${a.accountSubType || 'NULL'}`);
  });

  await prisma.$disconnect();
}

checkSubTypes();
