/**
 * Quick verification script to check critical accounts exist
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAccounts() {
  try {
    console.log('🔍 Verifying critical accounts...\n');
    
    const criticalAccounts = [
      { code: '1300', name: 'Inventory', type: 'ASSET' },
      { code: '1400', name: 'Input VAT / VAT Receivable', type: 'ASSET' },
      { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
      { code: '2100', name: 'Withholding Tax Payable', type: 'LIABILITY' },
      { code: '2110', name: 'Output VAT / VAT Payable', type: 'LIABILITY' },
      { code: '3900', name: 'Opening Balance Equity', type: 'EQUITY' },
    ];

    const org = await prisma.organization.findFirst({
      select: { id: true, name: true },
    });

    if (!org) {
      console.log('❌ No organization found!');
      return;
    }

    console.log(`📊 Organization: ${org.name}\n`);
    console.log('Critical Accounts Check:');
    console.log('─'.repeat(70));

    let allFound = true;

    for (const expected of criticalAccounts) {
      const account = await prisma.chartOfAccount.findFirst({
        where: {
          organizationId: org.id,
          code: expected.code,
        },
      });

      if (account) {
        console.log(`✅ ${expected.code} - ${account.name} (${account.accountType})`);
      } else {
        console.log(`❌ ${expected.code} - ${expected.name} (MISSING!)`);
        allFound = false;
      }
    }

    console.log('─'.repeat(70));

    if (allFound) {
      console.log('\n✨ All critical accounts found! System is ready.\n');
    } else {
      console.log('\n⚠️  Some accounts are missing. Run migrate-add-missing-accounts.js\n');
    }

    // Show total accounts
    const total = await prisma.chartOfAccount.count({
      where: { organizationId: org.id },
    });

    console.log(`\n📈 Total accounts in system: ${total}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAccounts();
