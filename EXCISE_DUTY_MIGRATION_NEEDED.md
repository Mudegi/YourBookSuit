# Excise Duty Database Migration Required

## Overview
Excise duty functionality has been added to product forms for Uganda + EFRIS enabled organizations. A database migration is required to add the `exciseDutyCode` field to the Product model.

## Database Migration

Add the following field to the `Product` model in both schemas:

**File**: `client/prisma/schema.prisma` and `server/prisma/schema.prisma`

```prisma
model Product {
  id                     String                     @id @default(cuid())
  organizationId         String
  sku                    String
  name                   String
  description            String?
  productType            ProductType
  category               String?
  unitOfMeasureId        String?
  purchasePrice          Decimal                    @default(0) @db.Decimal(19, 4)
  sellingPrice           Decimal                    @default(0) @db.Decimal(19, 4)
  trackInventory         Boolean                    @default(true)
  reorderLevel           Decimal?                   @db.Decimal(12, 4)
  reorderQuantity        Decimal?                   @db.Decimal(12, 4)
  taxable                Boolean                    @default(true)
  defaultTaxRate         Decimal                    @default(0) @db.Decimal(5, 2)
  exciseDutyCode         String?                    // ← ADD THIS FIELD
  taxGroupId             String?
  incomeAccountId        String?
  expenseAccountId       String?
  assetAccountId         String?
  isActive               Boolean                    @default(true)
  createdAt              DateTime                   @default(now())
  updatedAt              DateTime                   @updatedAt
  // ... rest of fields
}
```

## Migration Steps

1. **Add field to schema**:
   ```bash
   # In both client and server directories
   # Add: exciseDutyCode String?
   ```

2. **Generate migration**:
   ```bash
   cd client
   npx prisma migrate dev --name add_excise_duty_code_to_products
   
   cd ../server
   npx prisma migrate dev --name add_excise_duty_code_to_products
   ```

3. **Push to database**:
   ```bash
   npx prisma db push
   ```

## Implementation Completed

### UI Changes ✅
- **ExciseDutySelector component** exists at `client/components/efris/ExciseDutySelector.tsx`
- **Added to product creation form** at `client/app/(dashboard)/[orgSlug]/inventory/products/new/page.tsx`
- **Conditional rendering** - Only shows for Uganda + EFRIS enabled organizations
- **Form state** includes `exciseDutyCode` and `exciseDutyLabel`

### API Changes ✅
- **Validation schema updated** in `client/lib/validation.ts` - added `exciseDutyCode: z.string().optional()`
- **Product creation API** updated in `client/app/api/[orgSlug]/inventory/products/route.ts`
- **GET endpoint** returns exciseDutyCode when fetching products
- **POST endpoint** accepts and saves exciseDutyCode

### API Endpoints ✅
- **Fetch excise codes**: `GET /api/orgs/[orgSlug]/efris/excise-codes`
- **Search by code or name**: Supports `filterCode` and `filterName` query params

## How It Works

1. **Uganda organizations with EFRIS enabled** see an "Excise Duty (EFRIS)" section in product forms
2. **ExciseDutySelector component** fetches excise duty codes from EFRIS API
3. **Users can search** by code or product name (alcohol, tobacco, fuel, etc.)
4. **Selected code is saved** to the product record
5. **This information will be used** when creating invoices - URA requires excise duty information for applicable products

## Usage Example

```typescript
// In product form
<ExciseDutySelector
  orgSlug={orgSlug}
  value={form.exciseDutyCode}
  onChange={(code: string, label: string) => {
    setForm((prev) => ({
      ...prev,
      exciseDutyCode: code,
      exciseDutyLabel: label,
    }));
  }}
/>
```

## Testing After Migration

1. Navigate to product creation form in Uganda organization
2. Verify "Excise Duty (EFRIS)" section appears
3. Search for excise codes (e.g., "alcohol", "tobacco")
4. Select a code and create product
5. Verify code is saved and displayed when editing product

## Notes

- `@ts-ignore` comments added to API routes to suppress TypeScript errors until migration runs
- Field is optional - not all products require excise duty codes
- Only relevant for Uganda and EFRIS-enabled organizations
- Excise duty information will be used during invoice creation for URA compliance
