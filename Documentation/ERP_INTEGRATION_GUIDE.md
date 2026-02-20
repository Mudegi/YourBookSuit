# EFRIS API — ERP Integration Guide

**For: YourBookSuit (and any Custom ERP) Developers**
**API Base URL:** `https://efrisintegration.nafacademy.com`
**Last Updated:** February 20, 2026

---

## Authentication

Every request requires an API key in the header:

```
X-API-Key: your-company-api-key
```

---

## Golden Rule

**Send only business data. The API builds the full EFRIS payload.**

Do NOT build EFRIS-formatted payloads (`goodsDetails`, `taxDetails`, `summary`, `buyerDetails`, etc.) on the ERP side. Just send simple, clean business data — the API handles all EFRIS formatting, validation, tax calculations, negative sign enforcement, and field normalization.

---

## Endpoints

### 1. Submit Invoice (T109)

**`POST /api/external/efris/submit-invoice`**

Send your invoice items. The API builds the full EFRIS T109 payload, calculates tax details, summary, and submits to URA.

#### Request — What to Send

```json
{
  "invoice_number": "INV-2026-0028",
  "invoice_date": "2026-02-20",
  "customer_name": "Timothy Khabusi",
  "customer_tin": "",
  "buyer_type": "1",
  "payment_method": "101",
  "currency": "UGX",
  "items": [
    {
      "item_name": "HP Pavilion",
      "item_code": "HP-PAV-001",
      "quantity": 2,
      "unit_price": 1180000,
      "tax_rate": 18,
      "commodity_code": "44102906"
    },
    {
      "item_name": "Garden Tool",
      "item_code": "GT-001",
      "quantity": 10,
      "unit_price": 30000,
      "tax_rate": 0,
      "commodity_code": "27112008"
    }
  ]
}
```

#### Field Reference

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `invoice_number` | **Yes** | string | Your internal invoice number |
| `invoice_date` | **Yes** | string | `YYYY-MM-DD` |
| `customer_name` | **Yes** | string | Buyer's name |
| `customer_tin` | No | string | Required for B2B (`buyer_type: "0"`) |
| `buyer_type` | No | string | `"0"` = Business (TIN required), `"1"` = Individual (default), `"2"` = Foreigner, `"3"` = Government |
| `payment_method` | No | string | `"101"` = Credit, `"102"` = Cash, `"103"` = Cheque, `"105"` = Mobile Money. Default: `"101"` |
| `currency` | No | string | Default: `"UGX"` |
| `items` | **Yes** | array | At least one item |

**Item Fields:**

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `item_name` | **Yes** | string | Product name |
| `item_code` | **Yes** | string | Must match what was registered in EFRIS via T130 |
| `quantity` | **Yes** | number | Positive number |
| `unit_price` | **Yes** | number | **Tax-inclusive price** |
| `tax_rate` | **Yes** | number | `18` = Standard VAT, `0` = Zero-rated, `-1` = Exempt |
| `commodity_code` | No | string | UNSPSC code (e.g., `"44102906"`). Uses registered product code if omitted |

**What you do NOT need to send:**
- ~~`goodsDetails`~~ — API builds this
- ~~`taxDetails`~~ — API auto-calculates from items
- ~~`summary`~~ — API calculates `netAmount`, `taxAmount`, `grossAmount`
- ~~`payWay`~~ — API builds from `payment_method`
- ~~`buyerDetails`~~ — API builds from `customer_name`, `customer_tin`, `buyer_type`
- ~~`basicInformation`~~ — API fills in operator, invoiceKind, etc.
- ~~`sellerDetails`~~ — API fills from company registration
- ~~`unitOfMeasure`, `discountFlag`, `deemedFlag`, `exciseFlag`, `orderNumber`~~ — API sets defaults

#### Response

```json
{
  "success": true,
  "message": "Invoice fiscalized successfully",
  "seller": {
    "tin": "1014409555",
    "legal_name": "Your Company Name",
    "trade_name": "Your Company Name",
    "address": "Kampala, Uganda",
    "reference_number": "INV-2026-0028",
    "served_by": "API User"
  },
  "fiscal_data": {
    "document_type": "Original",
    "fdn": "325043107003",
    "verification_code": "234893273725405146366",
    "device_number": "1014409555_02",
    "issued_date": "20/02/2026",
    "issued_time": "10:48:41",
    "qr_code": "base64_encoded_image"
  },
  "buyer": {
    "name": "Timothy Khabusi",
    "tin": "",
    "buyer_type": "1"
  },
  "items": [ ... ],
  "tax_details": [ ... ],
  "summary": {
    "net_amount": 2300000,
    "tax_amount": 360000,
    "gross_amount": 2660000,
    "currency": "UGX",
    "number_of_items": 2,
    "mode": "Online"
  }
}
```

**Key fields to store in your ERP:**
- `fiscal_data.fdn` — Fiscal Document Number (needed for credit notes)
- `fiscal_data.verification_code` — Anti-fake code
- `fiscal_data.qr_code` — For printing on invoices

---

### 2. Submit Credit Note (T110)

**`POST /api/external/efris/submit-credit-note`**

Send your credit note details. The API builds the full EFRIS T110 payload with proper negative amounts and submits to URA.

#### Request — What to Send

```json
{
  "credit_note_number": "CN-2026-0002",
  "credit_note_date": "2026-02-20",
  "original_invoice_number": "INV-2026-0028",
  "original_fdn": "325043107003",
  "customer_name": "Timothy Khabusi",
  "customer_tin": "",
  "reason": "GOODS_RETURNED",
  "currency": "UGX",
  "items": [
    {
      "item_name": "HP Pavilion",
      "item_code": "HP-PAV-001",
      "quantity": 2,
      "unit_price": 1180000,
      "tax_rate": 18,
      "commodity_code": "44102906"
    },
    {
      "item_name": "Garden Tool",
      "item_code": "GT-001",
      "quantity": 10,
      "unit_price": 30000,
      "tax_rate": 0,
      "commodity_code": "27112008"
    }
  ]
}
```

#### Field Reference

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `credit_note_number` | **Yes** | string | Your internal CN number |
| `credit_note_date` | **Yes** | string | `YYYY-MM-DD` |
| `original_invoice_number` | **Yes** | string | The invoice being credited |
| `original_fdn` | **Yes** | string | FDN from the original invoice's `fiscal_data.fdn` |
| `customer_name` | **Yes** | string | Same customer as original invoice |
| `customer_tin` | No | string | Same as original invoice |
| `reason` | **Yes** | string | One of: `GOODS_RETURNED`, `CANCELLATION`, `WRONG_AMOUNT`, `WAIVE_OFF`, or free text |
| `reason_code` | No | string | EFRIS code: `"101"` = Return/damage, `"102"` = Cancellation, `"103"` = Wrong amount, `"104"` = Waive off, `"105"` = Other. Auto-detected from `reason` if omitted |
| `currency` | No | string | Must match original invoice. Default: `"UGX"` |
| `items` | **Yes** | array | Items being returned/credited |

**Item Fields:** Same as invoice (see above). Send **positive** quantities — the API makes them negative.

**What the API handles automatically:**
- All quantities and amounts → converted to negative
- `unitPrice` → kept positive (EFRIS requirement)
- `paymentAmount` → kept positive (EFRIS requirement)
- `taxDetails` → auto-calculated from items
- `summary` → auto-calculated with proper negatives
- `reasonCode` → auto-mapped from `reason` text
- `applicationTime` → set to current timestamp
- `source` → set to `"103"` (WebService API)
- `invoiceApplyCategoryCode` → set to `"101"` (credit note)
- All EFRIS structural fields (`buyerDetails`, `basicInformation`, `payWay`, etc.)

#### Response

```json
{
  "success": true,
  "referenceNo": "123456789",
  "credit_note_number": "CN-2026-0002",
  "submitted_at": "2026-02-20T10:48:48.000Z",
  "message": "Credit note application submitted successfully to EFRIS"
}
```

**Important:** T110 returns a `referenceNo`, NOT an FDN. The credit note goes through an approval process at URA before getting its own FDN. Store the `referenceNo` for tracking.

---

### 3. Register Product (T130)

**`POST /api/external/efris/register-product`**

Products must be registered in EFRIS before they can appear on invoices.

#### Request

```json
{
  "item_code": "HP-PAV-001",
  "item_name": "HP Pavilion Laptop",
  "unit_price": 1180000,
  "commodity_code": "44102906",
  "unit_of_measure": "102",
  "description": "HP Pavilion 15-inch laptop"
}
```

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `item_code` | **Yes** | string | Your SKU/product code |
| `item_name` | **Yes** | string | Product name |
| `unit_price` | **Yes** | number | Default selling price |
| `commodity_code` | **Yes** | string | UNSPSC commodity code |
| `unit_of_measure` | No | string | Default: `"102"` (Piece). Get codes from `/api/external/efris/units-of-measure` |
| `description` | No | string | Product description |
| `have_excise_tax` | No | string | `"101"` = Yes, `"102"` = No (default) |
| `excise_duty_code` | Conditional | string | Required only if `have_excise_tax` = `"101"`. Get codes from `/api/external/efris/excise-duty` |
| `stock_quantity` | No | number | Initial stock count |

#### Response

```json
{
  "success": true,
  "product_code": "HP-PAV-001",
  "efris_status": "Registered",
  "message": "Product registered successfully"
}
```

---

### 4. Stock Increase (T131)

**`POST /api/external/efris/stock-increase`**

```json
{
  "goodsStockIn": {
    "operationType": "101",
    "supplierTin": "1234567890",
    "supplierName": "Supplier Ltd",
    "stockInType": "102",
    "stockInDate": "2026-02-20",
    "remarks": "Stock replenishment"
  },
  "goodsStockInItem": [
    {
      "goodsCode": "HP-PAV-001",
      "quantity": "50",
      "unitPrice": "1180000",
      "measureUnit": "102",
      "remarks": "New stock"
    }
  ]
}
```

| `stockInType` | Meaning |
|---|---|
| `"101"` | Import |
| `"102"` | Local Purchase |
| `"103"` | Manufacture |
| `"104"` | Opening Stock |

---

### 5. Stock Decrease (T132)

**`POST /api/external/efris/stock-decrease`**

```json
{
  "goodsStockIn": {
    "operationType": "102",
    "adjustType": "102",
    "remarks": "Damaged goods"
  },
  "goodsStockInItem": [
    {
      "goodsCode": "HP-PAV-001",
      "quantity": 5,
      "unitPrice": 1180000,
      "remarks": "Water damage"
    }
  ]
}
```

---

### 6. Lookup Endpoints (GET)

These require no request body — just the API key header.

| Endpoint | Description |
|----------|-------------|
| `GET /api/external/efris/invoices` | List your fiscalized invoices. Params: `?limit=50&offset=0&status=success` |
| `GET /api/external/efris/invoice/{invoice_number}` | Get single invoice by your invoice number |
| `GET /api/external/efris/units-of-measure` | Get EFRIS unit codes (Piece=102, Kg=103, etc.) |
| `GET /api/external/efris/excise-duty` | Get excise duty codes. Params: `?excise_code=LED190100&excise_name=beer` |

---

## Tax Rate Values

Send `tax_rate` as a **number**. The API handles conversion.

| You Send | Meaning | EFRIS Category |
|----------|---------|----------------|
| `18` or `0.18` | Standard VAT 18% | `01` |
| `0` | Zero-rated | `02` |
| `-1` or `"-"` | Exempt | `03` |

---

## Reason Codes (Credit Notes)

You can send either `reason` (text) or `reason_code` (number). If you send text, the API maps it:

| `reason` text | Auto-mapped `reason_code` | EFRIS Meaning |
|---|---|---|
| `GOODS_RETURNED`, `RETURN`, `EXPIRED`, `DAMAGED` | `101` | Return of products due to expiry or damage |
| `CANCELLATION`, `CANCELLED`, `CANCEL` | `102` | Cancellation of the purchase |
| `WRONG_AMOUNT`, `MISCALCULATION`, `PRICE_ERROR` | `103` | Invoice amount wrongly stated |
| `WAIVE_OFF`, `PARTIAL_WAIVE` | `104` | Partial or complete waive off |
| Anything else | `105` | Others |

Or just send `"reason_code": "101"` directly and skip the text mapping.

---

## Payment Modes

| Code | Meaning |
|------|---------|
| `101` | Credit |
| `102` | Cash |
| `103` | Cheque |
| `104` | Demand draft |
| `105` | Mobile money |
| `106` | Visa/Mastercard |
| `107` | EFT |
| `108` | POS |
| `109` | RTGS |
| `110` | Swift transfer |

---

## Buyer Types

| Code | Meaning | TIN Required? |
|------|---------|---------------|
| `0` | B2B (Business) | **Yes** — `customer_tin` required |
| `1` | B2C (Individual) | No |
| `2` | Foreigner | No |
| `3` | B2G (Government) | **Yes** |

---

## Units of Measure (Common)

| Code | Unit |
|------|------|
| `101` | Carton |
| `102` | Piece |
| `103` | Kilogram |
| `104` | Litre |
| `105` | Meter |
| `112` | Pack |
| `113` | Dozen |
| `114` | Set |
| `115` | Pair |
| `119` | Bag |
| `120` | Bottle |

Full list: `GET /api/external/efris/units-of-measure`

---

## Error Handling

All errors return this structure:

```json
{
  "detail": {
    "success": false,
    "error_code": "1344",
    "message": "summary-->taxAmount:Must be equal to the sum of all taxAmount's in taxDetails!"
  }
}
```

Common EFRIS error codes:

| Code | Meaning | Fix |
|------|---------|-----|
| `1344` | taxAmount sum mismatch | API handles this — should not occur. If it does, report to API team |
| `1343` | netAmount calculation wrong | API handles this — should not occur |
| `306` | Credit note already exists for this invoice | Cancel existing credit note first |
| `99` | Unknown error | Usually means wrong EFRIS interface was used. Report to API team |

---

## Complete Workflow Example

```
1. Register products     →  POST /api/external/efris/register-product
2. Increase stock        →  POST /api/external/efris/stock-increase
3. Create invoice        →  POST /api/external/efris/submit-invoice
4. Store the FDN         →  response.fiscal_data.fdn
5. If return needed      →  POST /api/external/efris/submit-credit-note (include original_fdn)
6. Store referenceNo     →  response.referenceNo
```

---

## What NOT to Do

1. **Don't build EFRIS payloads.** No `goodsDetails`, `taxDetails`, `summary`, `buyerDetails`, `basicInformation`, or `payWay`. Just send business fields.

2. **Don't send negative quantities on credit notes.** Send positive numbers — the API negates them.

3. **Don't calculate EFRIS tax math.** The API applies the formula: `netAmount = grossAmount - taxAmount`. Just send `unit_price` (tax-inclusive) and `tax_rate` per item.

4. **Don't send `oriInvoiceNo` as the FDN.** `original_fdn` = the FDN. `original_invoice_number` = your invoice number.

5. **Don't send `taxRate` as `"0.00"`.** Use `0` for zero-rated, `"-"` or `-1` for exempt, `18` or `0.18` for standard. The API normalizes, but cleaner input = fewer edge cases.

---

## Performance Notes

- **First request after server restart:** ~4 seconds (one-time EFRIS handshake)
- **All subsequent requests:** ~1-2 seconds (AES key cached for 24 hours)
- This is per-company — each company's first call is slower
