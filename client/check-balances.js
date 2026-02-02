const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBalances() {
  try {
    console.log('=== ASSET ACCOUNTS ===');
    const assets = await prisma.chartOfAccount.findMany({
      where: {
        organizationId: 'cmkr0wbeq0001vl95dodsfurp',
        accountType: 'ASSET'
      }
    });
    assets.forEach(a => {
      console.log(`${a.code} - ${a.name}: $${a.balance.toString()}`);
    });

    console.log('\n=== EQUITY ACCOUNTS ===');
    const equity = await prisma.chartOfAccount.findMany({
      where: {
        organizationId: 'cmkr0wbeq0001vl95dodsfurp',
        accountType: 'EQUITY'
      }
    });
    equity.forEach(e => {
      console.log(`${e.code} - ${e.name}: $${e.balance.toString()}`);
    });

    console.log('\n=== OPENING BALANCE TRANSACTIONS ===');
    const trans = await prisma.transaction.findMany({
      where: {
        organizationId: 'cmkr0wbeq0001vl95dodsfurp',
        transactionType: 'OPENING_BALANCE'
      },
      include: {
        ledgerEntries: {
          include: {
            account: true
          }
        }
      }
    });

    trans.forEach(t => {
      console.log(`\nTransaction: ${t.transactionNumber} - ${t.description}`);
      console.log(`Date: ${t.transactionDate.toISOString().split('T')[0]}`);
      console.log('Entries:');
      t.ledgerEntries.forEach(e => {
        console.log(`  ${e.entryType}: ${e.account.code} - ${e.account.name}: $${e.amount.toString()}`);
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBalances();
