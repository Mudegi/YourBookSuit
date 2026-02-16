# EFRIS T109 Tax Classification Mapping Guide

## Overview
This document maps YourBookSuit invoice data to EFRIS T109 tax requirements for Uganda Revenue Authority compliance.

## Buyer Type Classification

### Customer Level (Default)
```typescript
Customer.buyerType:
  "0" = B2B (Business to Business) - TIN required
  "1" = B2C (Business to Consumer) - Default
  "2" = Foreigner - For non-residents
  "3" = B2G (Business to Government) - TIN required
```

### Invoice Level (Override)
```typescript
Invoice.buyerType: Optional - overrides Customer.buyerType for this transaction
```

## Payment Methods

```typescript
Invoice.paymentMethod:
  "101" = Credit (Invoice with payment terms)
  "102" = Cash
  "103" = Cheque
  "104" = Demand draft
  "105" = Mobile money (MTN, Airtel, etc.)
  "106" = Visa/Master card
  "107" = EFT (Electronic Funds Transfer)
  "108" = POS (Point of Sale)
  "109" = RTGS
  "110" = Swift transfer
```

## Invoice Item Tax Classifications

### 1. Discount Flag
```typescript
InvoiceItem.discountFlag:
  "0" = This is a discount line (negative amount)
  "1" = Discounted item (has discount applied)
  "2" = No discount (default)
```

**Business Rules:**
- First line cannot be "0" (cannot start with discount line)
- Last line cannot be "1" (discounted item must have discount line after)
- Discount line must follow discounted item

### 2. Deemed Flag
```typescript
InvoiceItem.deemedFlag:
  "1" = Deemed supply (special tax treatment, rate shown as '-')
  "2" = Not deemed (default)
```

**When deemed (flag = "1"):**
- Must provide `vatProjectId` and `vatProjectName`
- Tax rate displayed as '-' or blank
- Special VAT treatment applies

### 3. Excise Flag
```typescript
InvoiceItem.exciseFlag:
  "1" = Subject to excise duty
  "2" = Not subject to excise (default)
```

**When excise flag = "1", REQUIRED:**
- `exciseDutyCode` - From T125 API (e.g., "LED010100")
- `categoryId` - Same as exciseDutyCode
- `categoryName` - Excise duty name
- `exciseRate` - Rate (% if rule=1, amount if rule=2)
- `exciseRule` - "1" (by percentage) or "2" (by quantity)
- `exciseTax` - Total excise tax amount for line
- If rule = "2":
  - `pack` - Package value (from T130 packageScaledValue)
  - `stick` - Piece value (from T130 pieceScaledValue)
  - `exciseUnit` - Unit code (101=per stick, 102=per litre, etc.)
  - `exciseCurrency` - Usually same as invoice currency

### 4. VAT Category
```typescript
InvoiceItem.goodsCategoryId:
  Required for all items
  From T124 Commodity Category API
  Examples:
    "100000000" = Standard (18%)
    "10111301"  = Specific category
```

## Tax Category Codes (for taxDetails summary)

```typescript
taxCategoryCode:
  "01" = Standard (18% VAT)
  "02" = Zero-rated (0%)
  "03" = Exempt (-)
  "04" = Deemed (18%)
  "05" = Excise Duty
  "06" = Over the Top Service (OTT)
  "07" = Stamp Duty
  "08" = Local Hotel Service Tax
  "09" = UCC Levy
  "10" = Others
  "11" = VAT Out of Scope
```

## Tax Rate Display

### Standard/Zero-rated
```typescript
taxRate: 0.18 → Display: "18%"
taxRate: 0.00 → Display: "0%"
```

### Exempt/Deemed
```typescript
taxRate: "-" or " " → Display: "EXEMPT" or "-"
deemedFlag: "1" → Display: "DEEMED"
```

### Excise Rate Name Format

**By Percentage (exciseRule = "1"):**
```typescript
exciseRate: 0.18
exciseRateName: "18%"
```

**By Quantity (exciseRule = "2"):**
```typescript
exciseRate: 650
exciseUnit: "102" (per litre)
exciseCurrency: "UGX"
exciseRateName: "UGX650 per litre"
```

## Unit of Measure Codes

From T115 Dictionary:
```typescript
"101" = Box
"102" = Pieces (default)
"103" = Kilogram
"104" = Litre
"105" = Meter
"106" = Thousand
"107" = Ton
```

## Excise Unit Codes

```typescript
"101" = per stick
"102" = per litre
"103" = per kg
"104" = per user per day of access
"105" = per minute
"106" = per 1,000 sticks
"107" = per 50kgs
"109" = per 1 g
```

## T109 Payload Structure Example

```json
{
  "buyerDetails": {
    "buyerType": "0",
    "buyerTin": "1234567890",
    "buyerLegalName": "ABC Company Ltd"
  },
  "goodsDetails": [{
    "item": "Beer 500ml",
    "itemCode": "BEER-001",
    "qty": "24",
    "unitOfMeasure": "102",
    "unitPrice": "3000",
    "total": "72000",
    "taxRate": "0.18",
    "tax": "11016.95",
    "discountFlag": "2",
    "deemedFlag": "2",
    "exciseFlag": "1",
    "goodsCategoryId": "10111301",
    "categoryId": "LED010100",
    "categoryName": "Beer",
    "exciseRate": "0.20",
    "exciseRule": "1",
    "exciseTax": "12000",
    "exciseRateName": "20%"
  }],
  "taxDetails": [
    {
      "taxCategoryCode": "01",
      "netAmount": "60983.05",
      "taxRate": "0.18",
      "taxAmount": "11016.95",
      "grossAmount": "72000.00"
    },
    {
      "taxCategoryCode": "05",
      "netAmount": "60000.00",
      "taxRate": "0.20",
      "taxAmount": "12000.00",
      "grossAmount": "72000.00"
    }
  ],
  "payWay": [{
    "paymentMode": "102",
    "paymentAmount": "72000.00",
    "orderNumber": "a"
  }]
}
```

## Implementation Checklist

### Customer Management
- [x] Add `buyerType` field to Customer model (default "1" = B2C)
- [ ] Add buyer type dropdown to customer creation/edit forms

### Invoice Creation
- [x] Add `buyerType` field to Invoice model (override customer default)
- [x] Add `paymentMethod` field to Invoice model
- [ ] Add buyer type dropdown to invoice form (with customer default)
- [ ] Add payment method dropdown to invoice form

### Invoice Line Items
- [x] Add tax classification fields to InvoiceItem model
- [ ] Add excise duty code lookup/dropdown
- [ ] Add VAT category dropdown (from T124)
- [ ] Add deemed flag checkbox with project fields
- [ ] Auto-detect discount lines (discountFlag logic)
- [ ] Display proper tax rate labels (18%, EXEMPT, DEEMED, etc.)

### Tax Calculation Engine
- [ ] Calculate excise tax when exciseFlag = "1"
- [ ] Handle excise by percentage vs quantity
- [ ] Generate taxDetails summary (group by tax category)
- [ ] Support multiple tax rates on same invoice
- [ ] Handle tax-inclusive vs tax-exclusive pricing

### EFRIS Submission
- [ ] Map invoice data to T109 goodsDetails format
- [ ] Build taxDetails array (summary by category)
- [ ] Include payWay array
- [ ] Send buyerType and buyer details
- [ ] Format all amounts and rates correctly

## API Endpoints Needed

### Fetch Excise Codes
```
GET /api/orgs/{orgSlug}/efris/excise-codes
Response: List of excise duty codes from T125
```

### Fetch VAT Categories
```
GET /api/orgs/{orgSlug}/efris/commodity-categories
Response: List of VAT commodity categories from T124
```

### Calculate Excise Tax
```
POST /api/orgs/{orgSlug}/invoices/calculate-excise
Body: { exciseDutyCode, quantity, unitPrice, exciseRule }
Response: { exciseTax, exciseRate, exciseRateName }
```
