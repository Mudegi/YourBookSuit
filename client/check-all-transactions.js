const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllTransactions() {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        organizationId: 'cmkr0wbeq0001vl95dodsfurp',
        status: 'POSTED',
      },
      include: {
        ledgerEntries: {
          include: {
            account: {
              select: {
                code: true,
                name: true,
                accountType: true,
              },
            },
          },
        },
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });

    console.log('=== ALL POSTED TRANSACTIONS ===\n');
    for (const txn of transactions) {
      console.log(`${txn.transactionNumber} - ${txn.transactionDate.toISOString().split('T')[0]}`);
      console.log(`  Description: ${txn.description || 'N/A'}`);
      console.log(`  Entries:`);
      let debitTotal = 0;
      let creditTotal = 0;
      for (const entry of txn.ledgerEntries) {
        console.log(`    ${entry.entryType}: ${entry.account.code} - ${entry.account.name} (${entry.account.accountType}): $${entry.amount}`);
        if (entry.entryType === 'DEBIT') {
          debitTotal += parseFloat(entry.amount);
        } else {
          creditTotal += parseFloat(entry.amount);
        }
      }
      console.log(`  Debits: $${debitTotal}, Credits: $${creditTotal}, Balanced: ${debitTotal === creditTotal ? '✅' : '❌'}\n`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllTransactions();
