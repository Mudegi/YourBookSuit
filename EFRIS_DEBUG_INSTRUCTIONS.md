# EFRIS Integration Debug Instructions

## **Issue Summary**
- **Problem**: Invoice fiscalization failing with EFRIS error `2124: "goodsDetails-->itemCode:Does not match the 'goodsCategoryId'!"`
- **Status**: Product IS correctly registered in EFRIS portal with matching codes
- **Root Cause**: Unknown - likely in T109 payload transformation

## **What We Know**
✅ **YourBookSuit client** sends correct payload:
```json
{
  "item_code": "HP Pavilion",
  "goods_category_id": "44102906"
}
```

✅ **EFRIS portal** shows product registered with:
- Commodity Category: `(44102906) Computer or office equipment`
- My Product Code: `HP Pavilion`

❌ **EFRIS API** rejects with error 2124 (itemCode/goodsCategoryId mismatch)

## **Debug Steps for Development Team**

### **Step 1: Add T109 Debug Logging**
In your backend API (likely the invoice submission endpoint), add logging **RIGHT BEFORE** sending to EFRIS:

```python
# Add this before the EFRIS API call
print(f"[T109 DEBUG] ===== INVOICE PAYLOAD TO EFRIS =====")
print(f"[T109 DEBUG] Invoice Number: {payload.get('basicInformation', {}).get('invoiceNo', 'N/A')}")
print(f"[T109 DEBUG] goodsDetails count: {len(payload.get('goodsDetails', []))}")

if payload.get('goodsDetails'):
    for i, item in enumerate(payload['goodsDetails']):
        print(f"[T109 DEBUG] Item {i}:")
        print(f"[T109 DEBUG]   - item: {item.get('item', 'N/A')}")
        print(f"[T109 DEBUG]   - itemCode: '{item.get('itemCode', 'N/A')}'")
        print(f"[T109 DEBUG]   - goodsCategoryId: '{item.get('goodsCategoryId', 'N/A')}'")

print(f"[T109 DEBUG] Full goodsDetails JSON:")
print(json.dumps(payload.get('goodsDetails', []), indent=2, ensure_ascii=False))
print(f"[T109 DEBUG] =====================================")
```

### **Step 2: Test Invoice Submission**
1. Submit the same failing invoice (HP Pavilion)
2. Check logs for the `[T109 DEBUG]` entries
3. **Compare the logged values with expected values:**

**Expected from YourBookSuit:**
- `itemCode: "HP Pavilion"`
- `goodsCategoryId: "44102906"`

### **Step 3: Check for Transformation Issues**
Look for these common problems in the T109 payload:

**❌ Potential Issue #1: Field Name Mismatch**
```json
// Wrong field names
{"itemCode": "HP Pavilion", "goods_category_id": "44102906"}  // Mixed case/format
```

**❌ Potential Issue #2: Value Corruption**
```json
// Values getting changed during transformation
{"itemCode": "hp pavilion", "goodsCategoryId": "44102906"}    // Case changed
{"itemCode": "HP Pavilion", "goodsCategoryId": "102906"}      // Leading digits dropped
```

**❌ Potential Issue #3: Data Type Issues**
```json
// Numbers vs strings
{"itemCode": "HP Pavilion", "goodsCategoryId": 44102906}      // Number instead of string
```

### **Step 4: Verify T109 Structure**
Ensure your T109 payload matches the EFRIS specification:
```json
{
  "goodsDetails": [
    {
      "item": "HP Pavilion",              // ✓ Product display name
      "itemCode": "HP Pavilion",          // ✓ Must match EFRIS registration
      "goodsCategoryId": "44102906",      // ✓ Must match EFRIS registration  
      "qty": "2",
      "unitOfMeasure": "101",
      // ... other fields
    }
  ]
}
```

## **What to Fix**

### **If Debug Shows Correct Values**
If the T109 payload shows the correct `itemCode` and `goodsCategoryId`, the issue might be:
1. **Character encoding** (non-ASCII characters)
2. **Hidden whitespace** (leading/trailing spaces)
3. **EFRIS cache issue** (try with a different product)

### **If Debug Shows Wrong Values**
Fix the transformation logic where:
1. **Simple API payload** → **T109 payload** conversion happens
2. Check field mapping: `goods_category_id` → `goodsCategoryId`
3. Check value preservation during transformation

### **Quick Test**
Try submitting an invoice with a different product that's registered in EFRIS to see if the issue is:
- **Product-specific** (HP Pavilion registration issue)
- **System-wide** (T109 transformation issue)

## **Expected Resolution**
Once debug logging is added, you'll immediately see:
1. What values are actually being sent to EFRIS
2. Whether the transformation is working correctly
3. The exact point where the mismatch occurs

**Priority**: High - this blocks all invoice fiscalization

## **Contact**
Report findings back with the debug log output for further analysis.