/**
 * Seed Initial Currency Data
 * 
 * This script:
 * 1. Creates base currency records for all organizations based on their baseCurrency field
 * 2. Creates common currencies (USD, EUR, GBP, UGX) for each organization
 * 3. Creates FX Gain/Loss GL accounts for each organization
 * 4. Links the FX accounts to the organization settings
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const commonCurrencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2 },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'UGX', decimalPlaces: 0 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KES', decimalPlaces: 2 },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TZS', decimalPlaces: 0 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimalPlaces: 2 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', decimalPlaces: 2 },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', decimalPlaces: 2 },
];

async function seedCurrencies() {
  console.log('🌍 Starting currency data seeding...\n');

  try {
    // Get all organizations
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        baseCurrency: true,
      },
    });

    console.log(`Found ${organizations.length} organization(s)\n`);

    for (const org of organizations) {
      console.log(`\n📊 Processing organization: ${org.name}`);
      console.log(`   Base Currency: ${org.baseCurrency}`);

      // 1. Create base currency if it doesn't exist
      const baseCurrencyData = commonCurrencies.find(c => c.code === org.baseCurrency) || {
        code: org.baseCurrency,
        name: org.baseCurrency,
        symbol: org.baseCurrency,
        decimalPlaces: 2,
      };

      const baseCurrency = await prisma.currency.upsert({
        where: {
          organizationId_code: {
            organizationId: org.id,
            code: baseCurrencyData.code,
          },
        },
        update: {
          isBase: true,
          isActive: true,
        },
        create: {
          organizationId: org.id,
          code: baseCurrencyData.code,
          name: baseCurrencyData.name,
          symbol: baseCurrencyData.symbol,
          decimalPlaces: baseCurrencyData.decimalPlaces,
          isBase: true,
          isActive: true,
          displayOrder: 1,
        },
      });

      console.log(`   ✓ Base currency created: ${baseCurrency.code}`);

      // 2. Create other common currencies
      let displayOrder = 2;
      for (const currency of commonCurrencies) {
        if (currency.code === org.baseCurrency) continue;

        await prisma.currency.upsert({
          where: {
            organizationId_code: {
              organizationId: org.id,
              code: currency.code,
            },
          },
          update: {
            isActive: true,
          },
          create: {
            organizationId: org.id,
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol,
            decimalPlaces: currency.decimalPlaces,
            isBase: false,
            isActive: true,
            displayOrder: displayOrder++,
          },
        });
      }

      console.log(`   ✓ ${commonCurrencies.length - 1} additional currencies created`);

      // 3. Create FX Gain/Loss GL accounts
      console.log('   📒 Creating FX Gain/Loss GL accounts...');

      // Find or create "Other Income" parent account
      let otherIncomeParent = await prisma.chartOfAccount.findFirst({
        where: {
          organizationId: org.id,
          code: '8000',
          accountType: 'REVENUE',
        },
      });

      if (!otherIncomeParent) {
        otherIncomeParent = await prisma.chartOfAccount.create({
          data: {
            organizationId: org.id,
            code: '8000',
            name: 'Other Income',
            accountType: 'REVENUE',
            isActive: true,
          },
        });
      }

      // Find or create "Other Expenses" parent account
      let otherExpensesParent = await prisma.chartOfAccount.findFirst({
        where: {
          organizationId: org.id,
          code: '9000',
          accountType: 'EXPENSE',
        },
      });

      if (!otherExpensesParent) {
        otherExpensesParent = await prisma.chartOfAccount.create({
          data: {
            organizationId: org.id,
            code: '9000',
            name: 'Other Expenses',
            accountType: 'EXPENSE',
            isActive: true,
          },
        });
      }

      // Create Realized FX Gain account
      const fxGainAccount = await prisma.chartOfAccount.upsert({
        where: {
          organizationId_code: {
            organizationId: org.id,
            code: '8500',
          },
        },
        update: {},
        create: {
          organizationId: org.id,
          code: '8500',
          name: 'Realized Foreign Exchange Gain',
          accountType: 'REVENUE',
          parentId: otherIncomeParent.id,
          isActive: true,
        },
      });

      // Create Realized FX Loss account
      const fxLossAccount = await prisma.chartOfAccount.upsert({
        where: {
          organizationId_code: {
            organizationId: org.id,
            code: '9500',
          },
        },
        update: {},
        create: {
          organizationId: org.id,
          code: '9500',
          name: 'Realized Foreign Exchange Loss',
          accountType: 'EXPENSE',
          parentId: otherExpensesParent.id,
          isActive: true,
        },
      });

      // Create Unrealized FX Gain account
      const unrealizedFxGainAccount = await prisma.chartOfAccount.upsert({
        where: {
          organizationId_code: {
            organizationId: org.id,
            code: '8510',
          },
        },
        update: {},
        create: {
          organizationId: org.id,
          code: '8510',
          name: 'Unrealized Foreign Exchange Gain',
          accountType: 'REVENUE',
          parentId: otherIncomeParent.id,
          isActive: true,
        },
      });

      // Create Unrealized FX Loss account
      const unrealizedFxLossAccount = await prisma.chartOfAccount.upsert({
        where: {
          organizationId_code: {
            organizationId: org.id,
            code: '9510',
          },
        },
        update: {},
        create: {
          organizationId: org.id,
          code: '9510',
          name: 'Unrealized Foreign Exchange Loss',
          accountType: 'EXPENSE',
          parentId: otherExpensesParent.id,
          isActive: true,
        },
      });

      console.log(`   ✓ FX Gain/Loss accounts created`);

      // 4. Link FX accounts to organization
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          fxGainAccountId: fxGainAccount.id,
          fxLossAccountId: fxLossAccount.id,
          unrealizedFxGainAccountId: unrealizedFxGainAccount.id,
          unrealizedFxLossAccountId: unrealizedFxLossAccount.id,
          defaultExchangeRateProvider: 'ECB',
          enableAutoFetchRates: true,
        },
      });

      console.log(`   ✓ FX accounts linked to organization`);
      console.log(`   ✅ Organization ${org.name} completed!\n`);
    }

    console.log('\n🎉 Currency data seeding completed successfully!');
    console.log('\nSummary:');
    console.log(`   - ${organizations.length} organization(s) processed`);
    console.log(`   - Base currencies created for each organization`);
    console.log(`   - ${commonCurrencies.length} common currencies added`);
    console.log(`   - FX Gain/Loss accounts created and linked`);
  } catch (error) {
    console.error('\n❌ Error seeding currency data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedCurrencies()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
