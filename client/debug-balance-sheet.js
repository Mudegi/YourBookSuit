const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Decimal = require('decimal.js');

async function debugBalanceSheet() {
  try {
    // First, let's find the organization ID
    console.log('=== FINDING ORGANIZATION ===\n');
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
      },
    });
    console.log(`Found ${orgs.length} organizations:`);
    for (const org of orgs) {
      console.log(`  ${org.id} - ${org.name}`);
    }
    
    if (orgs.length === 0) {
      console.log('❌ No organizations found!');
      return;
    }
    
    const organizationId = orgs[0].id;
    const asOfDate = new Date('2026-02-02');

    console.log('\n=== DEBUGGING BALANCE SHEET ===\n');
    console.log(`Using Organization: ${organizationId}`);
    console.log(`As Of Date: ${asOfDate.toISOString()}\n`);

    // Simulate getCumulativeBalances for ASSET accounts
    console.log('--- FETCHING ASSET ACCOUNTS ---');
    const assetAccounts = await prisma.chartOfAccount.findMany({
      where: {
        organizationId,
        accountType: 'ASSET',
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        accountType: true,
        accountSubType: true,
        balance: true,
      },
    });

    console.log(`Found ${assetAccounts.length} asset accounts:`);
    for (const acc of assetAccounts) {
      console.log(`  ${acc.code} - ${acc.name}`);
      console.log(`    Type: ${acc.accountType}, SubType: ${acc.accountSubType || 'NULL'}`);
      console.log(`    Account Balance Field: $${acc.balance}`);
    }

    // Get asset account IDs
    const assetAccountIds = assetAccounts.map((a) => a.id);

    console.log('\n--- FETCHING LEDGER ENTRIES FOR ASSETS ---');
    const assetLedgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        transaction: {
          organizationId,
          transactionDate: {
            lte: asOfDate,
          },
          status: 'POSTED',
        },
        accountId: {
          in: assetAccountIds,
        },
      },
      include: {
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            accountType: true,
            accountSubType: true,
          },
        },
        transaction: {
          select: {
            transactionNumber: true,
            transactionDate: true,
          },
        },
      },
    });

    console.log(`Found ${assetLedgerEntries.length} ledger entries for assets:`);
    for (const entry of assetLedgerEntries) {
      console.log(`  ${entry.transaction.transactionNumber} - ${entry.transaction.transactionDate.toISOString().split('T')[0]}`);
      console.log(`    Account: ${entry.account.code} - ${entry.account.name}`);
      console.log(`    ${entry.entryType}: $${entry.amount}`);
    }

    // Simulate aggregation
    console.log('\n--- AGGREGATING ASSET BALANCES ---');
    const assetMap = new Map();
    for (const entry of assetLedgerEntries) {
      const account = entry.account;
      
      if (!assetMap.has(account.id)) {
        assetMap.set(account.id, {
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.accountType,
          accountSubType: account.accountSubType,
          debit: new Decimal(0),
          credit: new Decimal(0),
          balance: new Decimal(0),
        });
      }

      const trialEntry = assetMap.get(account.id);
      const amount = new Decimal(entry.amount.toString());

      if (entry.entryType === 'DEBIT') {
        trialEntry.debit = trialEntry.debit.plus(amount);
      } else {
        trialEntry.credit = trialEntry.credit.plus(amount);
      }
    }

    // Calculate balances (ASSET: Debit - Credit)
    const assetEntries = Array.from(assetMap.values());
    for (const entry of assetEntries) {
      entry.balance = entry.debit.minus(entry.credit);
    }

    console.log('Aggregated Asset Balances:');
    let totalAssets = new Decimal(0);
    for (const entry of assetEntries) {
      console.log(`  ${entry.accountCode} - ${entry.accountName}`);
      console.log(`    SubType: ${entry.accountSubType || 'NULL'}`);
      console.log(`    Debit: $${entry.debit.toFixed(2)}`);
      console.log(`    Credit: $${entry.credit.toFixed(2)}`);
      console.log(`    Balance: $${entry.balance.toFixed(2)}\n`);
      totalAssets = totalAssets.plus(entry.balance);
    }
    console.log(`TOTAL ASSETS: $${totalAssets.toFixed(2)}\n`);

    // Now do EQUITY accounts
    console.log('--- FETCHING EQUITY ACCOUNTS ---');
    const equityAccounts = await prisma.chartOfAccount.findMany({
      where: {
        organizationId,
        accountType: 'EQUITY',
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        accountType: true,
        accountSubType: true,
        balance: true,
      },
    });

    console.log(`Found ${equityAccounts.length} equity accounts:`);
    for (const acc of equityAccounts) {
      console.log(`  ${acc.code} - ${acc.name}`);
      console.log(`    Type: ${acc.accountType}, SubType: ${acc.accountSubType || 'NULL'}`);
      console.log(`    Account Balance Field: $${acc.balance}`);
    }

    const equityAccountIds = equityAccounts.map((a) => a.id);

    console.log('\n--- FETCHING LEDGER ENTRIES FOR EQUITY ---');
    const equityLedgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        transaction: {
          organizationId,
          transactionDate: {
            lte: asOfDate,
          },
          status: 'POSTED',
        },
        accountId: {
          in: equityAccountIds,
        },
      },
      include: {
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            accountType: true,
            accountSubType: true,
          },
        },
        transaction: {
          select: {
            transactionNumber: true,
            transactionDate: true,
          },
        },
      },
    });

    console.log(`Found ${equityLedgerEntries.length} ledger entries for equity:`);
    for (const entry of equityLedgerEntries) {
      console.log(`  ${entry.transaction.transactionNumber} - ${entry.transaction.transactionDate.toISOString().split('T')[0]}`);
      console.log(`    Account: ${entry.account.code} - ${entry.account.name}`);
      console.log(`    ${entry.entryType}: $${entry.amount}`);
    }

    // Simulate aggregation for EQUITY
    console.log('\n--- AGGREGATING EQUITY BALANCES ---');
    const equityMap = new Map();
    for (const entry of equityLedgerEntries) {
      const account = entry.account;
      
      if (!equityMap.has(account.id)) {
        equityMap.set(account.id, {
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.accountType,
          accountSubType: account.accountSubType,
          debit: new Decimal(0),
          credit: new Decimal(0),
          balance: new Decimal(0),
        });
      }

      const trialEntry = equityMap.get(account.id);
      const amount = new Decimal(entry.amount.toString());

      if (entry.entryType === 'DEBIT') {
        trialEntry.debit = trialEntry.debit.plus(amount);
      } else {
        trialEntry.credit = trialEntry.credit.plus(amount);
      }
    }

    // Calculate balances (EQUITY: Credit - Debit)
    const equityEntries = Array.from(equityMap.values());
    for (const entry of equityEntries) {
      entry.balance = entry.credit.minus(entry.debit);
    }

    console.log('Aggregated Equity Balances:');
    let totalEquity = new Decimal(0);
    for (const entry of equityEntries) {
      console.log(`  ${entry.accountCode} - ${entry.accountName}`);
      console.log(`    SubType: ${entry.accountSubType || 'NULL'}`);
      console.log(`    Debit: $${entry.debit.toFixed(2)}`);
      console.log(`    Credit: $${entry.credit.toFixed(2)}`);
      console.log(`    Balance: $${entry.balance.toFixed(2)}\n`);
      totalEquity = totalEquity.plus(entry.balance);
    }
    console.log(`TOTAL EQUITY (from ledger): $${totalEquity.toFixed(2)}\n`);

    console.log('=== ACCOUNTING EQUATION CHECK ===');
    console.log(`Assets: $${totalAssets.toFixed(2)}`);
    console.log(`Equity: $${totalEquity.toFixed(2)}`);
    const difference = totalAssets.minus(totalEquity);
    console.log(`Difference: $${difference.toFixed(2)}`);
    if (difference.isZero()) {
      console.log('✅ BALANCED!');
    } else {
      console.log(`❌ OUT OF BALANCE by $${difference.abs().toFixed(2)}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugBalanceSheet();
