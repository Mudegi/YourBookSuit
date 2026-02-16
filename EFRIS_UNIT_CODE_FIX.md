# EFRIS Unit Code Mapping Fix

## Issue Summary
**Excise product "Nivana" (beverage)** failed EFRIS registration with **Error 45: Partial failure** despite having all correct field types and excise duty information.

## Root Cause Found ✅

The unit code mapping was **INCORRECT**:

```typescript
// ❌ WRONG - Before Fix
'ltr': '104'  // Mapped Litre to "per user per day of access" (telecom unit!)
```

This sent Nivana (a beverage measured in litres) to EFRIS with unit code **104**, which EFRIS recognizes as **"per user per day of access"** - a telecom/OTT service measurement unit!

## EFRIS T115 rateUnit Codes (Official)

According to the EFRIS T130/T109 specification documentation:

| Code | Description | Use Case |
|------|-------------|----------|
| 101 | per stick | Cigarettes, countable items |
| **102** | **per litre** | **Beverages, liquids** ← Nivana should use this! |
| 103 | per kg | Weight-based products |
| 104 | per user per day of access | Telecom/OTT services (NOT beverages!) |
| 105 | per minute | Time-based services |
| 106 | per 1,000 sticks | Bulk cigarettes |
| 107 | per 50kgs | Bulk weight products |
| 108 | (undefined) | Reserved |
| 109 | per 1 g | Small weight measurements |

## The Fix ✅

**File**: `client/app/api/orgs/[orgSlug]/products/[id]/efris/route.ts`

```typescript
// ✅ CORRECT - After Fix
'ltr': '102',  // Maps Litre to "per litre" (beverage unit)
```

**All changes**:
- **Litre**: '104' → **'102'** (CRITICAL FIX)
- **Pieces/Units**: '102' → '101' (use "per stick" as closest countable unit)
- **Telecom/OTT**: Added explicit mapping to '104' (per user per day of access)
- **Default**: Changed from '102' to '101' (stick for countable items)

## Why Was This Wrong?

The previous mapping likely used sequential numbering assumptions:
- Box = 101
- Piece = 102  
- Kilogram = 103
- **Litre = 104** ← Assumed pattern, but WRONG!

But EFRIS T115 actually defines:
- Stick = 101
- **Litre = 102** ← Correct!
- Kilogram = 103
- **User/day access = 104** ← NOT for beverages!

## What This Fixes

### Before Fix:
```json
{
  "item_code": "Niva",
  "item_name": "Nivana", 
  "unit_of_measure": "104",  // ❌ "per user per day of access" (telecom!)
  "piece_measure_unit": "104",  // ❌ Same wrong unit
  "have_excise_tax": "101",
  "excise_duty_code": "LED110000"
}
```
**Result**: EFRIS error 45 - Partial failure (unit code mismatch for beverage)

### After Fix:
```json
{
  "item_code": "Niva",
  "item_name": "Nivana",
  "unit_of_measure": "102",  // ✅ "per litre" (beverage unit!)
  "piece_measure_unit": "102",  // ✅ Correct unit
  "have_excise_tax": "101",
  "excise_duty_code": "LED110000"
}
```
**Expected Result**: ✅ Successful registration

## Testing Instructions

1. **Try registering Nivana again**:
   - Product: Nivana
   - SKU: 50202310 (or similar)
   - Commodity Code: 50202310
   - Excise Code: LED110000
   - Unit: Litre (ltr)
   - Price: 500 UGX
   - Stock: 1000

2. **Check the logs** for unit mapping:
   ```
   [EFRIS] Unit Mapping - Input: { unitCode: 'ltr', ... }
   [EFRIS] Unit Mapping - Found in map: 102  ← Should show 102 now!
   ```

3. **Verify EFRIS payload**:
   ```json
   {
     "unit_of_measure": "102",  // Must be "102" not "104"
     "piece_measure_unit": "102"
   }
   ```

## Additional Changes

All unit mappings updated to match EFRIS T115 specification:

| Internal Unit | Old Code | New Code | EFRIS Meaning |
|---------------|----------|----------|---------------|
| ltr, litre | 104 ❌ | **102 ✅** | per litre |
| pcs, piece, unit | 102 | 101 | per stick (countable) |
| kg, kilogram | 103 | 103 | per kg (unchanged) |
| user, access, ott | (none) | 104 | per user/day access |
| minute, min | 105 | 105 | per minute (unchanged) |

## Files Modified

1. **client/app/api/orgs/[orgSlug]/products/[id]/efris/route.ts**
   - Lines 140-184: Complete unit mapping overhaul
   - Added documentation with EFRIS codes
   - Fixed critical litre mapping: '104' → '102'

## References

- **EFRIS T130 Specification**: Product Upload (Goods Upload)
- **EFRIS T109 Specification**: Invoice Upload  
- **EFRIS T115 Specification**: System Dictionary (rateUnit codes)
- **Documentation**: `Documentation/interface codes.py` lines 2108-2120
- **Units Reference**: `Efris units of measure.txt` provided by user

## Impact

- ✅ **Nivana** (and all beverage excise products) should now register successfully
- ✅ Correct excise duty calculations for liquid products
- ✅ Proper unit semantics for all product types
- ✅ Prevents EFRIS error 45 for unit code validation failures

## Next Steps

1. Test Nivana registration immediately
2. If successful, test other liquid excise products
3. Monitor for any other unit code mismatches
4. Consider adding unit code validation before EFRIS submission
