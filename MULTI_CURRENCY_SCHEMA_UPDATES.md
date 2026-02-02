# Multi-Currency Schema Updates

## New Models to Add

### 1. Currency Model
- Track supported currencies
- Store display information

### 2. ExchangeRate Model  
- Historical exchange rates
- Daily rate tracking
- Support for manual overrides

### 3. ForeignExchangeGainLoss Model
- Track realized and unrealized gains/losses
- Link to transactions and payments

## Updates to Existing Models

### Organization
- Add: fxGainAccountId (GL account for FX gains)
- Add: fxLossAccountId (GL account for FX losses)
- Add: defaultExchangeRateProvider (API provider)
- Add: enableAutoFetchRates (boolean flag)

### Transaction
- Already has: nothing needed (entries store currency)

### LedgerEntry
- Already has: currency, exchangeRate, amountInBase ✓

### Invoice
- Already has: currency, exchangeRate, baseCurrencyTotal ✓

### Payment
- Already has: currency, exchangeRate ✓
- Add: fxGainLossAmount
- Add: fxGainLossAccountId

### BankAccount
- Keep: currency field (for foreign currency accounts)

## Implementation Notes
- Every transaction stores BOTH foreign amount AND base amount
- Exchange rate is captured at transaction date
- Payment service calculates realized FX gain/loss
- Month-end revaluation for unrealized gains/losses
