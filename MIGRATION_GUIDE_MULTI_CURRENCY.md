# Multi-Currency Database Migration Guide

## Step 1: Run Prisma Migration

### Client Side
```bash
cd D:\YourBookSuit\client
npx prisma migrate dev --name add_multi_currency_support
npx prisma generate
```

### Server Side
```bash
cd D:\YourBookSuit\server
npx prisma migrate dev --name add_multi_currency_support
npx prisma generate
```

## Step 2: Seed Initial Currencies

This script creates base currency records for all existing organizations:

```sql
-- Insert base currencies for all organizations
INSERT INTO "Currency" (
  id, 
  "organizationId", 
  code, 
  name, 
  symbol, 
  "decimalPlaces", 
  "isActive", 
  "isBase", 
  "displayOrder",
  "createdAt",
  "updatedAt"
)
SELECT 
  gen_random_uuid(),
  o.id,
  o."baseCurrency",
  CASE o."baseCurrency"
    WHEN 'USD' THEN 'US Dollar'
    WHEN 'UGX' THEN 'Ugandan Shilling'
    WHEN 'EUR' THEN 'Euro'
    WHEN 'GBP' THEN 'British Pound'
    WHEN 'KES' THEN 'Kenyan Shilling'
    WHEN 'TZS' THEN 'Tanzanian Shilling'
    WHEN 'ZAR' THEN 'South African Rand'
    ELSE o."baseCurrency"
  END,
  CASE o."baseCurrency"
    WHEN 'USD' THEN '$'
    WHEN 'UGX' THEN 'UGX'
    WHEN 'EUR' THEN '€'
    WHEN 'GBP' THEN '£'
    WHEN 'KES' THEN 'KES'
    WHEN 'TZS' THEN 'TZS'
    WHEN 'ZAR' THEN 'R'
    ELSE o."baseCurrency"
  END,
  CASE o."baseCurrency"
    WHEN 'USD' THEN 2
    WHEN 'UGX' THEN 0
    WHEN 'EUR' THEN 2
    WHEN 'GBP' THEN 2
    WHEN 'KES' THEN 2
    WHEN 'TZS' THEN 0
    WHEN 'ZAR' THEN 2
    ELSE 2
  END,
  true,  -- isActive
  true,  -- isBase
  0,     -- displayOrder
  NOW(),
  NOW()
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "Currency" c 
  WHERE c."organizationId" = o.id 
  AND c.code = o."baseCurrency"
);
```

## Step 3: Create FX GL Accounts

This needs to be done for each organization. You can either:

### Option A: Add to Onboarding Process

Update `lib/onboarding-coa.ts` or `lib/coa-generator.ts`:

```typescript
// Add these accounts to the COA generation
const fxAccounts = [
  {
    code: '8500',
    name: 'Foreign Exchange Gain - Realized',
    accountType: 'REVENUE',
    accountSubType: 'OTHER_INCOME',
    isSystem: true,
  },
  {
    code: '9500',
    name: 'Foreign Exchange Loss - Realized',
    accountType: 'EXPENSE',
    accountSubType: 'OTHER_EXPENSE',
    isSystem: true,
  },
  {
    code: '8510',
    name: 'Foreign Exchange Gain - Unrealized',
    accountType: 'REVENUE',
    accountSubType: 'OTHER_INCOME',
    isSystem: true,
  },
  {
    code: '9510',
    name: 'Foreign Exchange Loss - Unrealized',
    accountType: 'EXPENSE',
    accountSubType: 'OTHER_EXPENSE',
    isSystem: true,
  },
];

// After creating accounts, link to organization
const fxGainAccount = accounts.find(a => a.code === '8500');
const fxLossAccount = accounts.find(a => a.code === '9500');
const unrealizedFxGainAccount = accounts.find(a => a.code === '8510');
const unrealizedFxLossAccount = accounts.find(a => a.code === '9510');

await prisma.organization.update({
  where: { id: organizationId },
  data: {
    fxGainAccountId: fxGainAccount?.id,
    fxLossAccountId: fxLossAccount?.id,
    unrealizedFxGainAccountId: unrealizedFxGainAccount?.id,
    unrealizedFxLossAccountId: unrealizedFxLossAccount?.id,
  },
});
```

### Option B: Migration Script for Existing Organizations

Create a script `scripts/create-fx-accounts.ts`:

```typescript
import prisma from '@/lib/prisma';

async function createFXAccountsForOrganization(organizationId: string) {
  console.log(`Creating FX accounts for organization ${organizationId}...`);
  
  // Create accounts
  const fxGainAccount = await prisma.chartOfAccount.create({
    data: {
      organizationId,
      code: '8500',
      name: 'Foreign Exchange Gain - Realized',
      accountType: 'REVENUE',
      accountSubType: 'OTHER_INCOME',
      isSystem: true,
      isActive: true,
      allowManualJournal: false,
      balance: 0,
      level: 0,
    },
  });

  const fxLossAccount = await prisma.chartOfAccount.create({
    data: {
      organizationId,
      code: '9500',
      name: 'Foreign Exchange Loss - Realized',
      accountType: 'EXPENSE',
      accountSubType: 'OTHER_EXPENSE',
      isSystem: true,
      isActive: true,
      allowManualJournal: false,
      balance: 0,
      level: 0,
    },
  });

  const unrealizedFxGainAccount = await prisma.chartOfAccount.create({
    data: {
      organizationId,
      code: '8510',
      name: 'Foreign Exchange Gain - Unrealized',
      accountType: 'REVENUE',
      accountSubType: 'OTHER_INCOME',
      isSystem: true,
      isActive: true,
      allowManualJournal: false,
      balance: 0,
      level: 0,
    },
  });

  const unrealizedFxLossAccount = await prisma.chartOfAccount.create({
    data: {
      organizationId,
      code: '9510',
      name: 'Foreign Exchange Loss - Unrealized',
      accountType: 'EXPENSE',
      accountSubType: 'OTHER_EXPENSE',
      isSystem: true,
      isActive: true,
      allowManualJournal: false,
      balance: 0,
      level: 0,
    },
  });

  // Link to organization
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      fxGainAccountId: fxGainAccount.id,
      fxLossAccountId: fxLossAccount.id,
      unrealizedFxGainAccountId: unrealizedFxGainAccount.id,
      unrealizedFxLossAccountId: unrealizedFxLossAccount.id,
    },
  });

  console.log(`✓ FX accounts created and linked`);
}

async function main() {
  const organizations = await prisma.organization.findMany({
    where: {
      onboardingCompleted: true,
      fxGainAccountId: null, // Only process organizations without FX accounts
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  console.log(`Found ${organizations.length} organizations needing FX accounts`);

  for (const org of organizations) {
    try {
      console.log(`\n${org.name} (${org.slug})...`);
      await createFXAccountsForOrganization(org.id);
    } catch (error) {
      console.error(`✗ Failed for ${org.name}:`, error);
    }
  }

  console.log('\n✓ All done!');
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run with:
```bash
npx ts-node scripts/create-fx-accounts.ts
```

## Step 4: Backfill Exchange Rates (Optional)

If you have historical transactions in foreign currencies, you may want to backfill exchange rates:

```typescript
import prisma from '@/lib/prisma';
import { ExchangeRateService } from '@/services/currency/exchange-rate.service';

async function backfillExchangeRates() {
  // Get all unique currency + date combinations from existing invoices
  const invoices = await prisma.invoice.groupBy({
    by: ['organizationId', 'currency', 'invoiceDate'],
    where: {
      // Only non-base currency invoices
      NOT: {
        organization: {
          baseCurrency: {
            equals: prisma.raw('currency')
          }
        }
      }
    },
  });

  for (const invoice of invoices) {
    // Check if rate exists
    const org = await prisma.organization.findUnique({
      where: { id: invoice.organizationId },
      select: { baseCurrency: true },
    });

    if (!org) continue;

    try {
      await ExchangeRateService.getRate(
        invoice.organizationId,
        invoice.currency,
        org.baseCurrency,
        invoice.invoiceDate
      );
      console.log(`✓ Rate exists for ${invoice.currency} on ${invoice.invoiceDate}`);
    } catch (error) {
      // Rate doesn't exist, need to create
      console.log(`✗ Missing rate for ${invoice.currency} on ${invoice.invoiceDate}`);
      
      // You would need to manually add historical rates or fetch from an API
      // For now, we'll skip
    }
  }
}
```

## Step 5: Update Navigation

Add currency settings to the navigation menu in:
`app/(dashboard)/[orgSlug]/layout.tsx`

```typescript
const settingsLinks = [
  { name: 'General', href: `/${orgSlug}/settings` },
  { name: 'Currencies', href: `/${orgSlug}/settings/currencies` }, // ADD THIS
  { name: 'Payment Terms', href: `/${orgSlug}/settings/payment-terms` },
  // ... other links
];
```

## Step 6: Verify Migration

Run these queries to verify:

```sql
-- Check currencies were created
SELECT o.name, c.code, c.name, c."isBase"
FROM "Organization" o
JOIN "Currency" c ON c."organizationId" = o.id
ORDER BY o.name, c.code;

-- Check FX accounts were created and linked
SELECT 
  o.name,
  fg.code as fx_gain,
  fl.code as fx_loss,
  ufg.code as unrealized_gain,
  ufl.code as unrealized_loss
FROM "Organization" o
LEFT JOIN "ChartOfAccount" fg ON fg.id = o."fxGainAccountId"
LEFT JOIN "ChartOfAccount" fl ON fl.id = o."fxLossAccountId"
LEFT JOIN "ChartOfAccount" ufg ON ufg.id = o."unrealizedFxGainAccountId"
LEFT JOIN "ChartOfAccount" ufl ON ufl.id = o."unrealizedFxLossAccountId"
ORDER BY o.name;

-- Check for any missing accounts
SELECT name, slug
FROM "Organization"
WHERE "fxGainAccountId" IS NULL 
   OR "fxLossAccountId" IS NULL
   OR "unrealizedFxGainAccountId" IS NULL
   OR "unrealizedFxLossAccountId" IS NULL;
```

## Rollback Plan

If something goes wrong:

```sql
-- Remove FX account links from organizations
UPDATE "Organization" SET
  "fxGainAccountId" = NULL,
  "fxLossAccountId" = NULL,
  "unrealizedFxGainAccountId" = NULL,
  "unrealizedFxLossAccountId" = NULL,
  "defaultExchangeRateProvider" = NULL,
  "enableAutoFetchRates" = false,
  "exchangeRateBufferPercent" = NULL;

-- Delete FX accounts
DELETE FROM "ChartOfAccount" 
WHERE code IN ('8500', '9500', '8510', '9510');

-- Delete exchange rates
DELETE FROM "ExchangeRate";

-- Delete FX gain/loss records
DELETE FROM "ForeignExchangeGainLoss";

-- Delete currencies
DELETE FROM "Currency";

-- Revert schema migration
cd client
npx prisma migrate resolve --rolled-back <migration_name>

cd ../server
npx prisma migrate resolve --rolled-back <migration_name>
```

## Testing After Migration

1. Navigate to `/[orgSlug]/settings/currencies`
2. Verify base currency is displayed
3. Try adding a new currency
4. Try entering an exchange rate manually
5. Create a test invoice in foreign currency
6. Verify currency selector works
7. Check exchange rate is fetched automatically

## Common Issues

### Issue: Migration fails with foreign key error
**Solution**: Ensure you're running migration on both client and server schemas

### Issue: No currencies appear after migration
**Solution**: Run the currency seed script from Step 2

### Issue: Exchange rate not found
**Solution**: Manually add rates or configure API provider in settings

### Issue: FX accounts not linked
**Solution**: Run the create-fx-accounts script from Step 3

## Support

If you encounter issues, check:
1. Database logs for constraint violations
2. Application logs for service errors
3. Network tab for API failures
4. Browser console for UI errors
