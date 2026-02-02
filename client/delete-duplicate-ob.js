const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Decimal = require('decimal.js');

async function deleteDuplicateOpeningBalance() {
  try {
    console.log('=== DELETING DUPLICATE OPENING BALANCE ===\n');
    
    // Find the duplicate transaction
    const transaction = await prisma.transaction.findFirst({
      where: {
        transactionNumber: 'OB-20260004',
      },
      include: {
        ledgerEntries: {
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
                balance: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      console.log('Transaction OB-20260004 not found');
      return;
    }

    console.log(`Found transaction: ${transaction.transactionNumber}`);
    console.log(`Date: ${transaction.transactionDate.toISOString().split('T')[0]}`);
    console.log(`Status: ${transaction.status}\n`);

    // Reverse the ledger entries from account balances
    console.log('Reversing ledger entries from account balances...');
    for (const entry of transaction.ledgerEntries) {
      const account = entry.account;
      const amount = new Decimal(entry.amount.toString());
      let newBalance;

      if (entry.entryType === 'DEBIT') {
        // Debit was added to balance, so subtract it
        if (account.code.startsWith('1') || account.code.startsWith('5')) { // Asset or Expense
          newBalance = new Decimal(account.balance.toString()).minus(amount);
        } else {
          newBalance = new Decimal(account.balance.toString()).plus(amount);
        }
      } else {
        // Credit was added to balance, so subtract it
        if (account.code.startsWith('1') || account.code.startsWith('5')) { // Asset or Expense
          newBalance = new Decimal(account.balance.toString()).plus(amount);
        } else {
          newBalance = new Decimal(account.balance.toString()).minus(amount);
        }
      }

      console.log(`  ${account.code} - ${account.name}`);
      console.log(`    Old Balance: $${account.balance}`);
      console.log(`    Reversing ${entry.entryType}: $${amount}`);
      console.log(`    New Balance: $${newBalance}\n`);

      await prisma.chartOfAccount.update({
        where: { id: account.id },
        data: { balance: newBalance.toString() },
      });
    }

    // Delete ledger entries
    console.log('Deleting ledger entries...');
    const deletedEntries = await prisma.ledgerEntry.deleteMany({
      where: {
        transactionId: transaction.id,
      },
    });
    console.log(`Deleted ${deletedEntries.count} ledger entries\n`);

    // Delete transaction
    console.log('Deleting transaction...');
    await prisma.transaction.delete({
      where: { id: transaction.id },
    });
    console.log(`Deleted transaction ${transaction.transactionNumber}\n`);

    console.log('✅ SUCCESSFULLY DELETED DUPLICATE OPENING BALANCE');
    
    // Show updated balances
    console.log('\n=== UPDATED ACCOUNT BALANCES ===');
    const cashAccount = await prisma.chartOfAccount.findFirst({
      where: { code: '1000' },
    });
    const capitalAccount = await prisma.chartOfAccount.findFirst({
      where: { code: '3000' },
    });

    console.log(`Cash on Hand (1000): $${cashAccount?.balance || 0}`);
    console.log(`Owner's Capital (3000): $${capitalAccount?.balance || 0}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteDuplicateOpeningBalance();
