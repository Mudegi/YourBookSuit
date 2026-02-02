const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createOpeningBalance() {
  try {
    const organizationId = 'cmkr0wbeq0001vl95dodsfurp';
    const userId = 'cml3g49xm0000fn4ometawdku';
    
    console.log('Creating Opening Balance Entry...\n');

    // Find Owner's Capital account (3000)
    const ownerCapital = await prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        code: '3000',
        accountType: 'EQUITY'
      }
    });

    if (!ownerCapital) {
      throw new Error('Owner\'s Capital account (3000) not found!');
    }
    console.log('✓ Found Owner\'s Capital:', ownerCapital.name);

    // Find or create Cash account (1000)
    let cashAccount = await prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        code: '1000',
        accountType: 'ASSET'
      }
    });

    if (!cashAccount) {
      console.log('Cash account not found, creating it...');
      cashAccount = await prisma.chartOfAccount.create({
        data: {
          organizationId,
          code: '1000',
          name: 'Cash',
          accountType: 'ASSET',
          accountSubType: 'CURRENT_ASSET',
          currency: 'USD',
          isActive: true,
          isSystem: true,
          allowManualJournal: true,
          balance: 0,
          level: 0,
          hasChildren: false
        }
      });
      console.log('✓ Created Cash account:', cashAccount.name);
    } else {
      console.log('✓ Found Cash account:', cashAccount.name);
    }

    // Check if opening balance already exists
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        organizationId,
        transactionType: 'OPENING_BALANCE',
        description: { contains: 'Initial Capital' }
      }
    });

    if (existingTransaction) {
      console.log('\n⚠ Opening balance already exists. Skipping...');
      return;
    }

    // Get next transaction number
    const lastTransaction = await prisma.transaction.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    });
    
    const nextNumber = lastTransaction 
      ? parseInt(lastTransaction.transactionNumber.replace(/\D/g, '')) + 1
      : 1;
    const transactionNumber = `OB-${String(nextNumber).padStart(6, '0')}`;

    console.log('\nCreating transaction:', transactionNumber);

    // Create opening balance transaction
    const transaction = await prisma.transaction.create({
      data: {
        organizationId,
        transactionNumber,
        transactionDate: new Date('2025-01-01'), // Start of fiscal year
        transactionType: 'OPENING_BALANCE',
        referenceType: 'OPENING_BALANCE',
        description: 'Initial Capital Contribution - Opening Balance',
        status: 'POSTED',
        createdById: userId,
        ledgerEntries: {
          create: [
            // Debit: Cash (Asset increases)
            {
              accountId: cashAccount.id,
              entryType: 'DEBIT',
              amount: 1000000.00,
              amountInBase: 1000000.00,
              description: 'Initial capital contribution'
            },
            // Credit: Owner's Capital (Equity increases)
            {
              accountId: ownerCapital.id,
              entryType: 'CREDIT',
              amount: 1000000.00,
              amountInBase: 1000000.00,
              description: 'Initial capital contribution'
            }
          ]
        }
      },
      include: {
        ledgerEntries: {
          include: {
            account: true
          }
        }
      }
    });

    console.log('✓ Transaction created:', transaction.transactionNumber);

    // Update account balances
    await prisma.chartOfAccount.update({
      where: { id: cashAccount.id },
      data: { balance: 1000000.00 }
    });

    await prisma.chartOfAccount.update({
      where: { id: ownerCapital.id },
      data: { balance: 1000000.00 }
    });

    console.log('\n✓ Account balances updated:');
    console.log(`  ${cashAccount.code} - ${cashAccount.name}: $1,000,000.00 (Debit)`);
    console.log(`  ${ownerCapital.code} - ${ownerCapital.name}: $1,000,000.00 (Credit)`);

    console.log('\n✅ Opening Balance Entry created successfully!');
    console.log('\nAccounting Entry:');
    console.log('  Debit:  1000 - Cash                 $1,000,000.00');
    console.log('  Credit: 3000 - Owner\'s Capital      $1,000,000.00');
    console.log('\nThis follows the accounting equation: Assets = Equity');
    console.log('Balance Sheet will now show: Assets $1M = Equity $1M ✓');

  } catch (error) {
    console.error('Error creating opening balance:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createOpeningBalance();
