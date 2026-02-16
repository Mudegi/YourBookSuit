# EFRIS API Endpoint Testing Checklist

Use this checklist to systematically test all 6 EFRIS endpoints and document any errors encountered.

---

## Testing Environment

| Item | Value |
|------|-------|
| **API Base URL** | https://efrisintegration.nafacademy.com/api/external/efris |
| **Organization** | Demo Company Inc. |
| **Organization ID** | cmkr0wbeq0001vl95dodsfurp |
| **Country** | UG (Uganda) |
| **Test Mode** | Enabled (true) |
| **API Key** | [Stored in credentials] |
| **Testing Date** | February 8, 2026 |

---

## Endpoint 1: Submit Invoice

### Basic Information
- **Endpoint:** `POST /submit-invoice`
- **Purpose:** Fiscalize invoices and receive FDN, verification code, and QR code
- **Documentation:** DEVELOPER_PACKAGE/EXTERNAL_API_DOCUMENTATION.md

### Test Cases

#### Test 1.1: Simple B2B Invoice
- [ ] **Status:** Not tested
- [ ] **Request:** Invoice with VAT-registered customer
- [ ] **Expected:** FDN returned with QR code
- [ ] **Actual Result:** _[Fill after testing]_
- [ ] **Error:** _[None / ERROR-XXX]_

#### Test 1.2: B2C Invoice (Individual Customer)
- [ ] **Status:** Not tested
- [ ] **Request:** Invoice for individual without TIN
- [ ] **Expected:** FDN returned
- [ ] **Actual Result:** _[Fill after testing]_
- [ ] **Error:** _[None / ERROR-XXX]_

#### Test 1.3: Invoice with Excise Duty Items
- [ ] **Status:** Not tested
- [ ] **Request:** Invoice including beer/alcohol with excise duty
- [ ] **Expected:** FDN with excise calculated
- [ ] **Actual Result:** _[Fill after testing]_
- [ ] **Error:** _[None / ERROR-XXX]_

### Overall Status
- [ ] ✅ All tests passed
- [ ] ⚠️ Some tests passed with warnings
- [ ] ❌ Failed - Error documented as: _[ERROR-XXX]_

---

## Endpoint 2: Register Product

### Basic Information
- **Endpoint:** `POST /register-product`
- **Purpose:** Register products/services in EFRIS
- **Documentation:** DEVELOPER_PACKAGE/EXTERNAL_API_DOCUMENTATION.md

### Test Cases

#### Test 2.1: Standard Taxable Product
- [ ] **Status:** Not tested
- [ ] **Request:** Product with 18% VAT
- [ ] **Expected:** Product ID returned
- [ ] **Actual Result:** _[Fill after testing]_
- [ ] **Error:** _[None / ERROR-XXX]_

#### Test 2.2: Zero-Rated Product
- [ ] **Status:** Not tested
- [ ] **Request:** Export product with 0% tax
- [ ] **Expected:** Product ID returned
- [ ] **Actual Result:** _[Fill after testing]_
- [ ] **Error:** _[None / ERROR-XXX]_

#### Test 2.3: Excisable Product
- [ ] **Status:** Not tested
- [ ] **Request:** Beer product with excise duty code
- [ ] **Expected:** Product ID returned
- [ ] **Actual Result:** _[Fill after testing]_
- [ ] **Error:** _[None / ERROR-XXX]_

### Overall Status
- [ ] ✅ All tests passed
- [ ] ⚠️ Some tests passed with warnings
- [ ] ❌ Failed - Error documented as: _[ERROR-XXX]_

---

## Endpoint 3: Submit Purchase Order

### Basic Information
- **Endpoint:** `POST /submit-purchase-order`
- **Purpose:** Add stock to EFRIS inventory (T110)
- **Documentation:** DEVELOPER_PACKAGE/EXTERNAL_API_DOCUMENTATION.md

### Test Cases

#### Test 3.1: Simple Purchase Order
- [ ] **Status:** Not tested
- [ ] **Request:** PO with registered supplier
- [ ] **Expected:** PO reference number
- [ ] **Actual Result:** _[Fill after testing]_
- [ ] **Error:** _[None / ERROR-XXX]_

#### Test 3.2: Purchase Order with Multiple Items
- [ ] **Status:** Not tested
- [ ] **Request:** PO with 5+ line items
- [ ] **Expected:** PO reference number
- [ ] **Actual Result:** _[Fill after testing]_
- [ ] **Error:** _[None / ERROR-XXX]_

### Overall Status
- [ ] ✅ All tests passed
- [ ] ⚠️ Some tests passed with warnings
- [ ] ❌ Failed - Error documented as: _[ERROR-XXX]_

---

## Endpoint 4: Submit Credit Note

### Basic Information
- **Endpoint:** `POST /submit-credit-note`
- **Purpose:** Issue credit memos for returns/corrections
- **Documentation:** DEVELOPER_PACKAGE/EXTERNAL_API_DOCUMENTATION.md

### Test Cases

#### Test 4.1: Full Credit Note
- [ ] **Status:** Not tested
- [ ] **Request:** Credit note for entire invoice
- [ ] **Expected:** Credit note FDN
- [ ] **Actual Result:** _[Fill after testing]_
- [ ] **Error:** _[None / ERROR-XXX]_

#### Test 4.2: Partial Credit Note
- [ ] **Status:** Not tested
- [ ] **Request:** Credit note for some items only
- [ ] **Expected:** Credit note FDN
- [ ] **Actual Result:** _[Fill after testing]_
- [ ] **Error:** _[None / ERROR-XXX]_

### Overall Status
- [ ] ✅ All tests passed
- [ ] ⚠️ Some tests passed with warnings
- [ ] ❌ Failed - Error documented as: _[ERROR-XXX]_

---

## Endpoint 5: Get Excise Duty Codes ❌ **CURRENTLY FAILING**

### Basic Information
- **Endpoint:** `GET /excise-duty`
- **Purpose:** Fetch list of excise duty codes (T125)
- **Documentation:** DEVELOPER_PACKAGE/EXCISE_DUTY_AND_STOCK_GUIDE.md

### Test Cases

#### Test 5.1: Fetch All Codes
- [x] **Status:** ❌ **FAILED**
- [x] **Request:** `GET /excise-duty?token=test_token`
- [x] **Expected:** List of all excise codes
- [x] **Actual Result:** HTTP 500 Error
- [x] **Error:** **ERROR-001** - `'Company' object has no attribute 'is_test_mode'`
- [x] **Documented:** Yes - See ERROR-001-excise-duty-attribute-error.md

#### Test 5.2: Filter by Code
- [ ] **Status:** Cannot test (blocked by 5.1)
- [ ] **Request:** `GET /excise-duty?token=test_token&excise_code=LED190100`
- [ ] **Expected:** Single code matching filter
- [ ] **Actual Result:** _[Blocked]_
- [ ] **Error:** Same as 5.1

#### Test 5.3: Filter by Name
- [ ] **Status:** Cannot test (blocked by 5.1)
- [ ] **Request:** `GET /excise-duty?token=test_token&excise_name=beer`
- [ ] **Expected:** Codes matching "beer"
- [ ] **Actual Result:** _[Blocked]_
- [ ] **Error:** Same as 5.1

### Overall Status
- [ ] ✅ All tests passed
- [ ] ⚠️ Some tests passed with warnings
- [x] ❌ **Failed - Error documented as: ERROR-001**

### Workaround
✅ Mock data implemented in client application (30+ sample codes)

---

## Endpoint 6: Stock Decrease

### Basic Information
- **Endpoint:** `POST /stock-decrease`
- **Purpose:** Reduce stock levels in EFRIS (T132)
- **Documentation:** DEVELOPER_PACKAGE/EXCISE_DUTY_AND_STOCK_GUIDE.md

### Test Cases

#### Test 6.1: Damaged Goods
- [ ] **Status:** Not tested
- [ ] **Request:** Decrease stock - adjustType: "101" (damaged)
- [ ] **Expected:** Confirmation with return code
- [ ] **Actual Result:** _[Fill after testing]_
- [ ] **Error:** _[None / ERROR-XXX]_

#### Test 6.2: Expired Goods
- [ ] **Status:** Not tested
- [ ] **Request:** Decrease stock - adjustType: "102" (expired)
- [ ] **Expected:** Confirmation with return code
- [ ] **Actual Result:** _[Fill after testing]_
- [ ] **Error:** _[None / ERROR-XXX]_

#### Test 6.3: Gift/Donation
- [ ] **Status:** Not tested
- [ ] **Request:** Decrease stock - adjustType: "104" (gift)
- [ ] **Expected:** Confirmation with return code
- [ ] **Actual Result:** _[Fill after testing]_
- [ ] **Error:** _[None / ERROR-XXX]_

### Overall Status
- [ ] ✅ All tests passed
- [ ] ⚠️ Some tests passed with warnings
- [ ] ❌ Failed - Error documented as: _[ERROR-XXX]_

---

## Overall Testing Summary

### Completion Status
- **Total Endpoints:** 6
- **Fully Tested:** 0
- **Partially Tested:** 1 (excise-duty)
- **Not Tested:** 5
- **Passing:** 0
- **Failing:** 1 ❌

### Errors Found
1. **ERROR-001:** GET /excise-duty - AttributeError on is_test_mode

### Next Steps
1. ⏳ Wait for ERROR-001 fix from EFRIS team
2. 🔄 Test remaining endpoints systematically
3. 📝 Document any new errors found
4. ✅ Update this checklist as tests complete

### Testing Notes
_[Add any general observations, patterns, or concerns here]_

- Testing started: February 7, 2026
- Mock data workaround implemented for excise-duty endpoint
- All other endpoints awaiting systematic testing

---

## Test Data Sets

### Sample Invoice Data
```json
{
  "invoice_number": "TEST-INV-001",
  "invoice_date": "2026-02-08",
  "customer_name": "Test Customer Ltd",
  "customer_tin": "1000000000",
  "items": [
    {
      "item_name": "Test Product",
      "quantity": 1,
      "unit_price": 10000,
      "total": 10000,
      "tax_rate": 0.18,
      "tax_amount": 1800
    }
  ],
  "total_amount": 10000,
  "total_tax": 1800,
  "currency": "UGX"
}
```

### Sample Product Data
```json
{
  "product_name": "Test Product 001",
  "product_code": "TEST-PROD-001",
  "unit_of_measure": "PC",
  "unit_price": 10000,
  "category": "General"
}
```

---

**Last Updated:** February 8, 2026  
**Updated By:** YourBookSuit Development Team
