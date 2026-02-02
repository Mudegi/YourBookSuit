const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function viewOpeningBalances() {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { transactionNumber: 'JE-2026-0001' },
          { transactionNumber: 'OB-20260004' },
        ],
      },
      include: {
        ledgerEntries: {
          include: {
            account: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log('=== OPENING BALANCE TRANSACTIONS ===\n');
    for (const txn of transactions) {
      console.log(`Transaction: ${txn.transactionNumber}`);
      console.log(`  Date: ${txn.transactionDate.toISOString().split('T')[0]}`);
      console.log(`  Created: ${txn.createdAt.toISOString()}`);
      console.log(`  Type: ${txn.type}`);
      console.log(`  Description: ${txn.description || 'N/A'}`);
      console.log(`  Status: ${txn.status}`);
      console.log(`  Entries:`);
      for (const entry of txn.ledgerEntries) {
        console.log(`    ${entry.entryType}: ${entry.account.code} - ${entry.account.name}: $${entry.amount}`);
      }
      console.log();
    }

    console.log('\nDECISION:');
    if (transactions.length === 2) {
      console.log(`Keep: ${transactions[0].transactionNumber} (created first)`);
      console.log(`Delete: ${transactions[1].transactionNumber} (duplicate)`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

viewOpeningBalances();
