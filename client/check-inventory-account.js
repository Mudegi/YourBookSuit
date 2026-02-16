const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInventory() {
  const accounts = await prisma.chartOfAccount.findMany({
    where: {
      code: { startsWith: '13' }
    },
    select: { code: true, name: true, accountType: true }
  });
  
  console.log('1300-series accounts:', JSON.stringify(accounts, null, 2));
  await prisma.$disconnect();
}

checkInventory();
