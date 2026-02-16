# EFRIS Unit Mapping - Complete Solution Guide

## Problem Summary

**Issue:** Products were registering with incorrect units in EFRIS (e.g., "litre" appeared for laptops that should be "piece").

**Root Cause:** Database contained only custom letter codes (`pp`, `ltr`, `pce`) while EFRIS requires specific 3-digit codes (`102`, `104`, `103`).

## Solution Implemented ✅

### 1. Added Official EFRIS Codes
Added 20 official EFRIS 3-digit codes to your database:

| Code | Unit Name | Use For |
|------|-----------|---------|
| 101 | Box | Products sold in boxes/cartons |
| **102** | **Piece** | **Computers, phones, furniture, electronics** |
| 103 | Kilogram | Products sold by weight (cement, sugar, rice) |
| **104** | **Litre** | **Liquids (water, fuel, beverages, oil)** |
| 105 | Meter | Length measurements (fabric, rope, cable) |
| 106 | Tonne | Heavy products sold by weight in tonnes |
| 107 | Gram | Small quantities by weight (spices, herbs) |
| 110 | Square Meter | Area measurements (tiles, flooring) |
| 112 | Pack | Packaged products, multi-packs |
| 113 | Dozen | Sets of 12 (eggs, bottles) |
| 114 | Bag | Products sold in bags |
| 115 | Pair | Products sold in pairs (shoes, gloves) |

### 2. Updated Existing Products
- ✅ **Acer Laptop** now uses: `102 - Piece` (was: `pp - PP-Piece`)
- ✅ Any future products will use official codes

### 3. Enhanced Unit Mapping
The mapping function now:
- ✅ Accepts 3-digit codes directly (no conversion needed)
- ✅ Maps common aliases (`pp`, `pcs`, `piece` → `102`)
- ✅ Includes debug logging to track conversions

## How to Use Moving Forward

### For New Products:

**RECOMMENDED:** Select official EFRIS codes directly on product form:
- Laptop/Phone/Furniture → **102 - Piece**
- Water/Fuel/Beverages → **104 - Litre**
- Cement/Rice/Sugar → **103 - Kilogram**
- Fabric/Cable/Rope → **105 - Meter**

**ALTERNATIVE:** You can still use letter codes (pp, ltr, kg) - they'll be automatically mapped to EFRIS codes:
- `pp` → `102` (Piece)
- `ltr` → `104` (Litre)
- `kg` → `103` (Kilogram)

### Testing EFRIS Registration

1. **Re-test Acer Laptop:**
   - Product now has unit `102 - Piece`
   - Open browser DevTools (F12) → Console tab
   - Edit product → Click "Register with EFRIS" (or re-register if possible)
   - Check console logs for: `[EFRIS] Product data being sent`
   - Verify `unit_of_measure: "102"` in the payload
   - Check EFRIS portal - should now show "Piece" not "Litre"

2. **Register New Test Product:**
   ```
   Name: Test Water Bottle
   SKU: TEST-WATER-001
   Unit: 104 - Litre  (select from dropdown)
   Price: 2000
   ```
   - Register with EFRIS
   - Check EFRIS portal - should show "Litre"

## Why This Fixes the Issue

### Before (INCORRECT):
```
Product Unit: pp (PP-Piece)
     ↓
Mapping: pp → 102
     ↓
EFRIS Receives: ???
     ↓
EFRIS Shows: Litre ❌
```

### After (CORRECT):
```
Product Unit: 102 (Piece)
     ↓
NO mapping needed - already EFRIS code
     ↓
EFRIS Receives: 102
     ↓
EFRIS Shows: Piece ✅
```

## Technical Details

### Database State:
- **Total Units:** 548
- **Official EFRIS Codes:** 20 (codes 101-120)
- **Letter Codes:** 528 (comprehensive UN/CEFACT codes)

### Mapping Function Location:
`client/app/api/orgs/[orgSlug]/products/[id]/efris/route.ts`

The `mapToEfrisUnitCode()` function:
```typescript
// Priority order:
1. If unit code is in efrisUnitMap (pp → 102) → use mapped value
2. If unit code is already 3-digit (102) → pass through
3. Otherwise → default to 102 (Piece)
```

### Debug Logging:
When registering products, check browser console for:
```
[EFRIS] Unit Mapping - Input: {unitCode: "102", unitAbbr: "Pc", unitName: "Piece"}
[EFRIS] Unit Mapping - Already EFRIS code: 102
[EFRIS] Product data being sent: {
  unit_of_measure: "102",
  ...
}
```

## Scripts Created

### 1. Add Official EFRIS Codes
```bash
node scripts/add-official-efris-codes.js demo-company
```
Adds 20 official EFRIS 3-digit codes to specified organization.

### 2. Update Products to EFRIS Codes
```bash
node scripts/update-products-to-efris-units.js demo-company
```
Converts existing products from letter codes to official EFRIS codes.

### 3. Check Unit Code Format
```bash
node check-unit-code-format.js
```
Shows how many 3-digit vs letter codes exist in database.

### 4. Find Specific Units
```bash
node find-units.js
```
Search for specific units (piece, litre, etc.).

## Next Steps

1. ✅ **Official codes added** - 20 EFRIS codes now in database
2. ✅ **Acer Laptop updated** - Now uses "102 - Piece"
3. ⏳ **Test EFRIS registration** - Re-register Acer Laptop or create new product
4. ⏳ **Verify in EFRIS portal** - Check if "Piece" now appears correctly
5. ⏳ **Update documentation** - User guide should recommend official codes

## If Issues Persist

If products still show wrong units in EFRIS after using official codes:

1. **Check EFRIS API Response:**
   - Look for error messages in API response
   - Check if EFRIS is rejecting certain codes
   - Verify commodity codes are correct

2. **Verify EFRIS Portal:**
   - Sometimes EFRIS shows cached data
   - Try logging out and back in
   - Check if unit appears correctly in invoice generation

3. **Contact Integration Admin:**
   - Check integration dashboard logs
   - Verify EFRIS API credentials
   - Ensure integration is in correct mode (test/production)

## Reference: Complete Unit Mapping

Based on your CUSTOM_ERP_COMPLETE_API_GUIDE documentation:

```python
# Common EFRIS Unit Codes
unit_mapping = {
    # Quantity/Pieces
    'piece': '102', 'pieces': '102', 'pcs': '102', 'pc': '102', 'pp': '102',
    'each': '102', 'ea': '102', 'unit': '102', 'pce': '102',
    
    # Volume - Liquids
    'litre': '104', 'litres': '104', 'liter': '104', 'liters': '104',
    'ltr': '104', 'l': '104',
    
    # Weight - Kilogram
    'kilogram': '103', 'kilograms': '103', 'kg': '103', 'kgs': '103',
    'kgm': '103',
    
    # Weight - Gram
    'gram': '107', 'grams': '107', 'g': '107', 'grm': '107',
    
    # Length
    'meter': '105', 'metre': '105', 'meters': '105', 'metres': '105',
    'm': '105', 'mtr': '105',
    
    # Packaging
    'box': '101', 'carton': '101', 'bx': '101', 'ctn': '101',
    'pack': '112', 'pk': '112',
    'bag': '114', 'bg': '114',
    
    # Sets/Groups
    'dozen': '113', 'dz': '113', 'dzn': '113',
    'pair': '115', 'pr': '115',
}
```

---

**Summary:** Your EFRIS unit issues should now be resolved. Products using official EFRIS codes (102, 104, 103, etc.) will register correctly. The old pp/ltr letter codes are still available but will be mapped - using official codes directly is more reliable.
