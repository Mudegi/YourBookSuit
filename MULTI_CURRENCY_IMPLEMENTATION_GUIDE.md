# Multi-Currency Implementation Guide

## Overview
This document provides a complete implementation guide for the Multi-Currency feature in YourBooks ERP.

## 1. Schema Updates ✓

### New Models Added:
- **Currency**: Stores enabled currencies for the organization
- **ExchangeRate**: Historical exchange rate tracking
- **ForeignExchangeGainLoss**: Tracks realized and unrealized FX gains/losses

### Organization Model Updates:
```prisma
- fxGainAccountId: GL account for realized gains
- fxLossAccountId: GL account for realized losses  
- unrealizedFxGainAccountId: GL account for unrealized gains
- unrealizedFxLossAccountId: GL account for unrealized losses
- defaultExchangeRateProvider: API provider (MANUAL, ECB, FIXER, etc.)
- enableAutoFetchRates: Boolean flag
- exchangeRateBufferPercent: Buffer percentage for purchases
```

### Updated Models:
- **Payment**: Added fxGainLossAmount, fxGainLossAccountId, baseCurrencyAmount
- **Invoice**: Already has currency, exchangeRate, baseCurrencyTotal ✓
- **Bill**: Already has currency, exchangeRate ✓
- **LedgerEntry**: Already has currency, exchangeRate, amountInBase ✓

## 2. Services Created ✓

### ExchangeRateService
**Location**: `/services/currency/exchange-rate.service.ts`

**Key Methods**:
- `getRate()`: Get exchange rate for specific date
- `convertAmount()`: Convert amount between currencies
- `saveRate()`: Save or update exchange rate
- `fetchLatestRates()`: Fetch from external APIs (ECB, Fixer)
- `getRateHistory()`: Get historical rates

### ForeignExchangeGainLossService
**Location**: `/services/currency/fx-gain-loss.service.ts`

**Key Methods**:
- `calculateRealizedFX()`: Calculate FX gain/loss on payment
- `recordRealizedFX()`: Record to GL
- `calculateUnrealizedFX()`: Month-end revaluation
- `recordUnrealizedFX()`: Record unrealized gains/losses
- `getFXGainLossReport()`: Generate FX report

## 3. Required API Routes

### Currency Management
```
GET    /api/[orgSlug]/currencies               - List currencies
POST   /api/[orgSlug]/currencies               - Add currency
PUT    /api/[orgSlug]/currencies/[id]          - Update currency
DELETE /api/[orgSlug]/currencies/[id]          - Deactivate currency
```

### Exchange Rates
```
GET    /api/[orgSlug]/exchange-rates           - List rates (with date filter)
POST   /api/[orgSlug]/exchange-rates           - Add/update rate
GET    /api/[orgSlug]/exchange-rates/history   - Get rate history
POST   /api/[orgSlug]/exchange-rates/fetch     - Fetch from external API
```

### FX Gain/Loss
```
GET    /api/[orgSlug]/fx-gain-loss             - FX gain/loss report
POST   /api/[orgSlug]/fx-gain-loss/revalue     - Run month-end revaluation
```

### Settings
```
GET    /api/[orgSlug]/settings/currency        - Get currency settings
PUT    /api/[orgSlug]/settings/currency        - Update currency settings
```

## 4. UI Components Created

### Currency Settings Page ✓
**Location**: `/app/(dashboard)/[orgSlug]/settings/currencies/page.tsx`

**Features**:
- Base currency display
- Active currencies grid
- Exchange rates table with date filter
- Auto-fetch rates button
- Settings configuration

### Still Needed:
- Currency selector component (reusable)
- FX Gain/Loss report page
- Rate entry modal/form
- Currency configuration form

## 5. Integration Points

### Invoice Service
**Update Required**: When creating invoice, use ExchangeRateService if foreign currency

```typescript
// In InvoiceService.createInvoice()
if (input.currency !== organization.baseCurrency) {
  const exchangeRate = await ExchangeRateService.getRate(
    organizationId,
    input.currency,
    organization.baseCurrency,
    input.invoiceDate
  );
  
  const baseCurrencyTotal = await ExchangeRateService.convertAmount(
    organizationId,
    input.total,
    input.currency,
    organization.baseCurrency,
    input.invoiceDate
  );
  
  // Store both foreign and base amounts
}
```

### Payment Service ✓ (NEEDS UPDATE)
**Critical Update**: Calculate and record FX gains/losses

```typescript
// In PaymentService.recordCustomerPayment()
if (invoice.currency !== org.baseCurrency) {
  const fxCalculation = await ForeignExchangeGainLossService.calculateRealizedFX(
    organizationId,
    invoice.id,
    'invoice',
    paymentAmount,
    paymentDate,
    invoice.currency,
    currentRate
  );
  
  if (!fxCalculation.gainLossAmount.isZero()) {
    await ForeignExchangeGainLossService.recordRealizedFX(
      organizationId,
      payment.id,
      fxCalculation,
      invoice.id,
      undefined,
      userId
    );
  }
}
```

### Double Entry Service
**Already compatible** - entries already support currency, exchangeRate, amountInBase

## 6. Onboarding Integration

During onboarding, need to:
1. **Set up default currencies** based on organization's homeCountry
2. **Create FX GL accounts** if not exists:
   - Realized FX Gain (Other Income)
   - Realized FX Loss (Other Expense)
   - Unrealized FX Gain (Other Income)
   - Unrealized FX Loss (Other Expense)
3. **Link accounts to organization**

```typescript
// In onboarding-coa.ts
const fxAccounts = {
  fxGain: await createAccount('Foreign Exchange Gain', 'OTHER_INCOME'),
  fxLoss: await createAccount('Foreign Exchange Loss', 'OTHER_EXPENSE'),
  unrealizedFxGain: await createAccount('Unrealized FX Gain', 'OTHER_INCOME'),
  unrealizedFxLoss: await createAccount('Unrealized FX Loss', 'OTHER_EXPENSE'),
};

await prisma.organization.update({
  where: { id: organizationId },
  data: {
    fxGainAccountId: fxAccounts.fxGain.id,
    fxLossAccountId: fxAccounts.fxLoss.id,
    unrealizedFxGainAccountId: fxAccounts.unrealizedFxGain.id,
    unrealizedFxLossAccountId: fxAccounts.unrealizedFxLoss.id,
  },
});
```

## 7. Transaction Forms Update

### Invoice Form
Add currency selector that:
- Shows all active currencies
- Defaults to base currency
- On currency change, fetches current rate
- Allows manual rate override
- Shows "Equivalent in [Base Currency]" below total

### Bill Form  
Same as invoice form

### Payment Form
- Show currency of related invoice/bill
- Fetch current rate
- Display FX gain/loss preview before saving

## 8. Reports

### FX Gain/Loss Report
**Location**: `/app/(dashboard)/[orgSlug]/reports/fx-gain-loss/page.tsx`

**Features**:
- Date range filter
- Separate sections for Realized and Unrealized
- Summary totals
- Drill-down to transaction details
- Export to Excel/PDF

### Enhanced Financial Statements
- Balance Sheet: Show foreign currency accounts with both foreign and base amounts
- P&L: Include FX Gain/Loss section under Other Income/Expense

## 9. Month-End Process

New scheduled task or manual process:
1. Run unrealized FX revaluation
2. Generate FX Gain/Loss report
3. Post unrealized FX entries
4. Review and approve

## 10. Migration Script

For existing data:
```sql
-- Add base currency to Currency table
INSERT INTO "Currency" (id, "organizationId", code, name, symbol, "decimalPlaces", "isActive", "isBase")
SELECT gen_random_uuid(), id, "baseCurrency", 
  CASE "baseCurrency"
    WHEN 'USD' THEN 'US Dollar'
    WHEN 'UGX' THEN 'Ugandan Shilling'
    -- Add more mappings
  END,
  CASE "baseCurrency"
    WHEN 'USD' THEN '$'
    WHEN 'UGX' THEN 'UGX'
  END,
  CASE "baseCurrency"
    WHEN 'USD' THEN 2
    WHEN 'UGX' THEN 0
  END,
  true, true
FROM "Organization";

-- Create FX accounts for all organizations
-- (Run COA update script)
```

## 11. Testing Checklist

- [ ] Create invoice in USD when base is UGX
- [ ] Make payment with different exchange rate
- [ ] Verify FX gain/loss recorded correctly
- [ ] Run month-end revaluation
- [ ] Check Balance Sheet shows correct amounts
- [ ] Test auto-fetch rates from API
- [ ] Test manual rate entry
- [ ] Verify rate history
- [ ] Test with multiple currencies
- [ ] Test with same-currency transactions (should skip FX)

## 12. Performance Considerations

- Exchange rate caching (1 hour default)
- Batch rate fetching for multiple currencies
- Index on effectiveDate for rate queries
- Consider materialized view for FX report

## 13. Security & Permissions

- Only Finance Manager can:
  - Add/edit exchange rates
  - Run FX revaluation
  - Configure FX settings
- Audit all FX rate changes
- Log all FX gain/loss calculations

## 14. Documentation for Users

- How to set up currencies
- How to enter exchange rates
- Understanding FX gains and losses
- Month-end procedures
- Troubleshooting common issues

## Next Steps

1. ✅ Schema updates
2. ✅ Create ExchangeRateService
3. ✅ Create FXGainLossService
4. ✅ Currency settings UI
5. ⏳ Create API routes
6. ⏳ Update PaymentService
7. ⏳ Update InvoiceService
8. ⏳ Add currency selector component
9. ⏳ Create FX report UI
10. ⏳ Update onboarding to create FX accounts
11. ⏳ Migration script
12. ⏳ Testing
