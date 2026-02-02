const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAccountIds() {
  try {
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        organizationId: 'cmkr0wbeq0001vl95dodsfurp'
      },
      select: {
        id: true,
        code: true,
        name: true
      },
      orderBy: {
        code: 'asc'
      }
    });
    
    console.log('Chart of Accounts:');
    accounts.forEach(a => {
      console.log(JSON.stringify(a));
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAccountIds();
