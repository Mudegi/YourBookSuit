/**
 * Migration Script: Add Missing Critical Accounts
 * 
 * Adds essential accounts that were missing from earlier chart of accounts:
 * - 1400: Input VAT / VAT Receivable
 * - 2100: Withholding Tax Payable  
 * - 2110: Output VAT / VAT Payable
 * - 2120: PAYE Payable
 * - 2130: NSSF Payable
 * - 2150: Excise Duty Payable
 * - 3900: Opening Balance Equity
 * - 4400: Foreign Exchange Gain
 * - 7100: Foreign Exchange Loss
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CRITICAL_ACCOUNTS = [
  // Inventory Account (CRITICAL!)
  {
    code: '1300',
    name: 'Inventory',
    accountType: 'ASSET',
    accountSubType: 'Current Assets',
    description: 'Products available for sale',
    isSystem: true,
  },
  
  // Tax & VAT Accounts
  {
    code: '1400',
    name: 'Input VAT / VAT Receivable',
    accountType: 'ASSET',
    accountSubType: 'Current Assets',
    description: 'VAT paid on purchases - recoverable from tax authority',
    isSystem: true,
  },
  {
    code: '2100',
    name: 'Withholding Tax Payable',
    accountType: 'LIABILITY',
    accountSubType: 'Current Liabilities',
    description: 'WHT withheld from supplier payments - payable to URA',
    isSystem: true,
  },
  {
    code: '2110',
    name: 'Output VAT / VAT Payable',
    accountType: 'LIABILITY',
    accountSubType: 'Current Liabilities',
    description: 'VAT collected on sales - payable to tax authority',
    isSystem: true,
  },
  {
    code: '2120',
    name: 'PAYE Payable',
    accountType: 'LIABILITY',
    accountSubType: 'Current Liabilities',
    description: 'Employee income tax withheld - payable to URA',
    isSystem: true,
  },
  {
    code: '2130',
    name: 'NSSF Payable',
    accountType: 'LIABILITY',
    accountSubType: 'Current Liabilities',
    description: 'Social security contributions payable',
    isSystem: true,
  },
  {
    code: '2150',
    name: 'Excise Duty Payable',
    accountType: 'LIABILITY',
    accountSubType: 'Current Liabilities',
    description: 'Excise duty collected - payable to URA',
    isSystem: true,
  },
  
  // Opening Balance Equity
  {
    code: '3900',
    name: 'Opening Balance Equity',
    accountType: 'EQUITY',
    accountSubType: 'Equity',
    description: 'Balancing account for opening balances and inventory',
    isSystem: true,
  },
  
  // Foreign Exchange Accounts
  {
    code: '4400',
    name: 'Foreign Exchange Gain',
    accountType: 'REVENUE',
    accountSubType: 'Other Revenue',
    description: 'Gains from currency conversion',
    isSystem: true,
  },
  {
    code: '7100',
    name: 'Foreign Exchange Loss',
    accountType: 'EXPENSE',
    accountSubType: 'Financial Expenses',
    description: 'Losses from currency conversion',
    isSystem: true,
  },
];

async function addMissingAccounts() {
  try {
    console.log('🔍 Finding all organizations...\n');
    
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true, slug: true },
    });

    if (organizations.length === 0) {
      console.log('⚠️  No organizations found.');
      return;
    }

    console.log(`Found ${organizations.length} organization(s)\n`);

    for (const org of organizations) {
      console.log(`\n📊 Processing: ${org.name} (${org.slug})`);
      console.log('─'.repeat(60));

      let addedCount = 0;
      let skippedCount = 0;

      for (const accountTemplate of CRITICAL_ACCOUNTS) {
        // Check if account already exists
        const existing = await prisma.chartOfAccount.findFirst({
          where: {
            organizationId: org.id,
            code: accountTemplate.code,
          },
        });

        if (existing) {
          console.log(`  ⏭️  ${accountTemplate.code} - ${accountTemplate.name} (already exists)`);
          skippedCount++;
          continue;
        }

        // Create the account
        await prisma.chartOfAccount.create({
          data: {
            organizationId: org.id,
            code: accountTemplate.code,
            name: accountTemplate.name,
            accountType: accountTemplate.accountType,
            accountSubType: accountTemplate.accountSubType,
            description: accountTemplate.description,
            isActive: true,
            isSystem: accountTemplate.isSystem || false,
          },
        });

        console.log(`  ✅ ${accountTemplate.code} - ${accountTemplate.name} (added)`);
        addedCount++;
      }

      console.log(`\n  Summary: ${addedCount} added, ${skippedCount} skipped`);
    }

    console.log('\n\n✨ Migration completed successfully!\n');
    console.log('📋 Accounts added to all organizations:');
    console.log('   • 1300 - Inventory');
    console.log('   • 1400 - Input VAT / VAT Receivable');
    console.log('   • 2100 - Withholding Tax Payable');
    console.log('   • 2110 - Output VAT / VAT Payable');
    console.log('   • 2120 - PAYE Payable');
    console.log('   • 2130 - NSSF Payable');
    console.log('   • 2150 - Excise Duty Payable');
    console.log('   • 3900 - Opening Balance Equity');
    console.log('   • 4400 - Foreign Exchange Gain');
    console.log('   • 7100 - Foreign Exchange Loss\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
addMissingAccounts()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
