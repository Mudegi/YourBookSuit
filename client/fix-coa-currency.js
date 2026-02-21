/**
 * Fix COA Currency Script
 * 
 * Updates all chart of accounts entries that have currency = 'USD'
 * to use the organization's actual baseCurrency instead.
 * 
 * Run: cd client && node fix-coa-currency.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get all organizations with their base currency
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true, baseCurrency: true },
  });

  console.log(`Found ${orgs.length} organization(s)\n`);

  for (const org of orgs) {
    if (!org.baseCurrency || org.baseCurrency === 'USD') {
      console.log(`⏭  ${org.name} (${org.slug}) — baseCurrency is ${org.baseCurrency || 'not set'}, skipping`);
      continue;
    }

    // Count accounts that still have USD
    const usdAccounts = await prisma.chartOfAccount.count({
      where: { organizationId: org.id, currency: 'USD' },
    });

    if (usdAccounts === 0) {
      console.log(`✅ ${org.name} (${org.slug}) — all accounts already use ${org.baseCurrency}`);
      continue;
    }

    // Update them
    const updated = await prisma.chartOfAccount.updateMany({
      where: { organizationId: org.id, currency: 'USD' },
      data: { currency: org.baseCurrency },
    });

    console.log(`✅ ${org.name} (${org.slug}) — updated ${updated.count} accounts from USD → ${org.baseCurrency}`);
  }

  console.log('\nDone!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
