# YourBooks ERP — EFRIS Integration Guide for Mobile App Developers

**Version:** 2.0  
**Date:** February 22, 2026  
**Audience:** Mobile App (Android/iOS) ERP Developers  
**Country:** Uganda (URA EFRIS System)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Authentication & Configuration](#3-authentication--configuration)
4. [Operation 1: Product/Service Registration (Goods Upload)](#4-operation-1-productservice-registration-goods-upload)
5. [Operation 2: Stock Increase](#5-operation-2-stock-increase)
6. [Operation 3: Invoice Upload (Fiscalization)](#6-operation-3-invoice-upload-fiscalization)
7. [Operation 4: Credit Note](#7-operation-4-credit-note)
8. [Supporting Endpoints](#8-supporting-endpoints)
9. [UI Button Placement Guide](#9-ui-button-placement-guide)
10. [EFRIS Tax Categories Reference](#10-efris-tax-categories-reference)
11. [EFRIS Unit of Measure Codes](#11-efris-unit-of-measure-codes)
12. [Stock-In Type & Adjustment Codes](#12-stock-in-type--adjustment-codes)
13. [Error Handling](#13-error-handling)
14. [Testing Checklist](#14-testing-checklist)

---

## 1. Overview

EFRIS (Electronic Fiscal Receipting and Invoicing System) is URA's digital tax compliance system. Every registered Ugandan taxpayer must:

- **Register products/services** with EFRIS before selling them
- **Report stock increases** when purchasing goods from suppliers
- **Fiscalize invoices** to get a Fiscal Document Number (FDN) from URA
- **Submit credit notes** against previously fiscalized invoices

### The External EFRIS Middleware API

We do **NOT** own or run the EFRIS middleware. It is an **external third-party API** provided by NAF Academy that handles the EFRIS protocol (encryption, signing, T-code payload building, communication with URA).

Both our **web ERP** and your **mobile app** connect to this same external API independently.

---

## 2. Architecture

```
┌──────────────────┐
│  YourBooks Web   │──────┐
│  (Next.js ERP)   │      │
└──────────────────┘      │
                          ▼
                    ┌──────────────────────────────────────────────┐      ┌──────────┐
                    │  External EFRIS Middleware API                │ ───▶ │  URA     │
                    │  https://efrisintegration.nafacademy.com     │ ◀─── │  EFRIS   │
                    │  /api/external/efris                         │      └──────────┘
                    └──────────────────────────────────────────────┘
                          ▲
┌──────────────────┐      │
│  Your Mobile App │──────┘
│  (Android/iOS)   │
└──────────────────┘
```

**Your mobile app calls the EFRIS middleware directly.** There is no need to go through our backend. You authenticate with the same API key and build the same payloads.

### Base URL

```
https://efrisintegration.nafacademy.com/api/external/efris
```

### All Middleware Endpoints

| #  | Method | Path                            | Purpose                       | EFRIS Code |
|----|--------|---------------------------------|-------------------------------|------------|
| 1  | POST   | `/register-product`             | Register product/service      | T130       |
| 2  | POST   | `/stock-increase`               | Stock increase from purchase  | T131       |
| 3  | POST   | `/submit-invoice`               | Fiscalize invoice             | T109       |
| 4  | POST   | `/submit-credit-note`           | Credit note submission        | T110       |
| 5  | POST   | `/submit-debit-note`            | Debit note submission         | —          |
| 6  | POST   | `/stock-decrease`               | Stock decrease/adjustment     | T131       |
| 7  | GET    | `/invoice/{invoiceNumber}`      | Query single invoice status   | —          |
| 8  | GET    | `/invoices?page=&limit=&status=`| List invoices                 | —          |
| 9  | GET    | `/commodity-categories`         | Fetch VAT commodity codes     | T124       |
| 10 | GET    | `/excise-duty`                  | Fetch excise duty codes       | T125       |

---

## 3. Authentication & Configuration

### Required credentials

The mobile app needs these values — they come from the organization's EFRIS settings (configured in the web ERP's Settings > EFRIS page). Either store them locally on the device or fetch them from your own backend.

| Setting         | Description                              | Example                                                        |
|-----------------|------------------------------------------|----------------------------------------------------------------|
| `apiBaseUrl`    | EFRIS middleware base URL                | `https://efrisintegration.nafacademy.com/api/external/efris`   |
| `apiKey`        | API key for authenticating with middleware| `your-org-api-key`                                             |
| `tin`           | Organization's TIN (Taxpayer ID)         | `1000000001`                                                   |
| `deviceNo`      | EFRIS device serial number (DSN)         | `TKS0001234`                                                   |
| `testMode`      | Whether using test/sandbox mode          | `true` / `false`                                               |

### Headers for EVERY request

**All POST requests:**
```
Content-Type: application/json
X-API-Key: {apiKey}
```

**All GET requests:**
```
X-API-Key: {apiKey}
```

### Timeout

Set a **30-second timeout** on all API calls. EFRIS can be slow.

### Connection Test

To verify the API key works, make a simple GET:

```http
GET {baseUrl}/invoices?page=1&limit=1
Headers: X-API-Key: {apiKey}
```

If you get a `200` response (even with empty data), the connection is working.

---

## 4. Operation 1: Product/Service Registration (Goods Upload)

### What it does
Registers a product or service with URA (Interface Code **T130**). A product **must be registered** with EFRIS before it can appear on a fiscalized invoice or stock increase.

### Endpoint

```http
POST {baseUrl}/register-product
```

### Headers
```
Content-Type: application/json
X-API-Key: {apiKey}
```

### Request Body

```json
{
  "item_code": "WIDGET-PRO-001",
  "item_name": "Widget Pro",
  "unit_price": "50000",
  "commodity_code": "84713000",
  "unit_of_measure": "101",
  "have_excise_tax": "102",
  "description": "Professional-grade widget"
}
```

### Field Reference

| Field              | Type   | Required | Description                                                    |
|--------------------|--------|----------|----------------------------------------------------------------|
| `item_code`        | String | **Yes**  | Unique product identifier (use SKU or product description)     |
| `item_name`        | String | **Yes**  | Product display name                                           |
| `unit_price`       | String | **Yes**  | Unit price as string, e.g. `"50000"`                           |
| `commodity_code`   | String | **Yes**  | 8-digit EFRIS commodity category code (see Section 8)          |
| `unit_of_measure`  | String | No       | EFRIS T115 UoM code (default `"101"` = Stick/Piece). See Sec 11 |
| `have_excise_tax`  | String | No       | `"101"` = Yes, `"102"` = No (default `"102"`)                  |
| `excise_duty_code` | String | Cond.    | Required if `have_excise_tax = "101"`. E.g. `"LED010100"`      |
| `stock_quantity`   | String | No       | Initial stock quantity as string                               |
| `description`      | String | No       | Product description                                            |

### Response

**Success:**
```json
{
  "success": true,
  "product_code": "10XXXXXXXXXX",
  "efris_status": "REGISTERED"
}
```

**Failure:**
```json
{
  "success": false,
  "error_code": "E001",
  "message": "Commodity code not found"
}
```

### What to store after success

Save on your product record:
- `efrisProductCode` → `response.product_code`
- `efrisItemCode` → the `item_code` you sent
- `efrisRegisteredAt` → current timestamp
- `goodsCategoryId` → the `commodity_code` you sent

### How to get Commodity Codes (for dropdown/search)

```http
GET {baseUrl}/commodity-categories?token=test_token&pageNo=1&pageSize=100
Headers: X-API-Key: {apiKey}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "page": {
      "pageNo": "1",
      "pageSize": "100",
      "totalSize": "500",
      "pageCount": "5"
    },
    "records": [
      {
        "commodityCategoryCode": "84713000",
        "commodityCategoryName": "Portable digital ADP machines",
        "rate": "18",
        "isLeafNode": "101",
        "serviceMark": "102",
        "isZeroRate": "102",
        "isExempt": "102",
        "excisable": "102"
      }
    ]
  }
}
```

> **Tip:** Cache these locally. Paginate through all pages on first load, then refresh periodically.

### How to get Excise Duty Codes (when `have_excise_tax = "101"`)

```http
GET {baseUrl}/excise-duty?token=test_token&excise_name={search}
Headers: X-API-Key: {apiKey}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exciseDutyList": [
      {
        "exciseDutyCode": "LED010100",
        "goodService": "Beer",
        "rateText": "60%",
        "exciseDutyDetailsList": [
          {
            "rate": "0.60",
            "type": "1"
          }
        ]
      }
    ]
  }
}
```

---

## 5. Operation 2: Stock Increase

### What it does
Reports a stock increase to EFRIS when goods are purchased from a supplier (Interface Code **T131**). This is triggered from a **Bill/Purchase Receipt**.

### Endpoint

```http
POST {baseUrl}/stock-increase
```

### Headers
```
Content-Type: application/json
X-API-Key: {apiKey}
```

### Request Body

```json
{
  "goodsStockIn": {
    "operationType": "101",
    "supplierName": "ABC Suppliers Ltd",
    "supplierTin": "1000000789",
    "stockInType": "102",
    "stockInDate": "2026-02-22",
    "remarks": "BIL-001 - Purchase from ABC Suppliers Ltd",
    "goodsTypeCode": "101"
  },
  "goodsStockInItem": [
    {
      "goodsCode": "WIDGET-PRO-001",
      "quantity": "100",
      "unitPrice": "45000",
      "remarks": "Purchase from supplier"
    },
    {
      "goodsCode": "BOLT-M10",
      "quantity": "500",
      "unitPrice": "2000",
      "remarks": "Purchase from supplier"
    }
  ]
}
```

### Field Reference

**Header object (`goodsStockIn`):**

| Field            | Type   | Required | Description                                           |
|------------------|--------|----------|-------------------------------------------------------|
| `operationType`  | String | **Yes**  | Always `"101"` for stock increase                     |
| `supplierName`   | String | **Yes**  | Vendor/supplier name                                  |
| `supplierTin`    | String | **Yes**  | Supplier's TIN (Tax ID)                               |
| `stockInType`    | String | **Yes**  | See Stock-In Type Codes (Section 12)                  |
| `stockInDate`    | String | **Yes**  | Date of stock receipt, format `YYYY-MM-DD`            |
| `remarks`        | String | No       | Description (e.g. bill number + vendor)               |
| `goodsTypeCode`  | String | **Yes**  | `"101"` = Goods, `"102"` = Fuel                       |

**Line items array (`goodsStockInItem[]`):**

| Field        | Type   | Required | Description                                              |
|--------------|--------|----------|----------------------------------------------------------|
| `goodsCode`  | String | **Yes**  | The product's EFRIS item code (from registration)        |
| `quantity`   | String | **Yes**  | Quantity as string                                       |
| `unitPrice`  | String | **Yes**  | Unit price as string                                     |
| `remarks`    | String | No       | Line-level remarks                                       |

### Response

**Success:**
```json
{
  "success": true,
  "message": "Stock increase submitted successfully"
}
```

### Prerequisites

> **Every product in the bill MUST already be registered with EFRIS** (must have an EFRIS item code from a prior `/register-product` call). If any product is unregistered, the request will fail. Show a warning listing unregistered products.

---

## 6. Operation 3: Invoice Upload (Fiscalization)

### What it does
Submits an invoice to URA for fiscalization (Interface Code **T109**). URA returns a **Fiscal Document Number (FDN)**, **Verification Code**, and **QR Code** that must be printed on the invoice.

### Endpoint

```http
POST {baseUrl}/submit-invoice
```

### Headers
```
Content-Type: application/json
X-API-Key: {apiKey}
```

### Request Body

```json
{
  "invoice_number": "INV-001",
  "invoice_date": "2026-02-22",
  "customer_name": "ABC Corporation",
  "customer_tin": "1000000789",
  "customer_address": "Plot 15, Kampala Road",
  "customer_email": "billing@abc.co.ug",
  "customer_phone": "+256700123456",
  "buyer_type": "0",
  "payment_method": "102",
  "currency": "UGX",
  "items": [
    {
      "item": "Rice - 25kg Bag",
      "itemCode": "RICE-25KG",
      "qty": "10",
      "unitOfMeasure": "117",
      "unitPrice": "59000.00",
      "total": "590000.00",
      "taxRate": "0.18",
      "tax": "90305.08",
      "orderNumber": "1",
      "discountFlag": "2",
      "deemedFlag": "2",
      "exciseFlag": "2",
      "goodsCategoryId": "10061000",
      "goodsCategoryName": "Rice (husked)",
      "vatApplicableFlag": "1"
    }
  ],
  "tax_details": [
    {
      "taxCategoryCode": "01",
      "netAmount": "499694.92",
      "taxRate": "0.18",
      "taxAmount": "90305.08",
      "grossAmount": "590000.00",
      "taxRateName": "Standard Rate (18%)",
      "exciseUnit": "",
      "exciseCurrency": "UGX"
    }
  ],
  "summary": {
    "netAmount": "499694.92",
    "taxAmount": "90305.08",
    "grossAmount": "590000.00",
    "itemCount": "1",
    "modeCode": "0",
    "remarks": "",
    "qrCode": ""
  },
  "total_amount": 590000,
  "total_tax": 90305.08
}
```

### Field Reference — Top Level

| Field              | Type    | Required | Description                                            |
|--------------------|---------|----------|--------------------------------------------------------|
| `invoice_number`   | String  | **Yes**  | Invoice number                                         |
| `invoice_date`     | String  | **Yes**  | Format: `YYYY-MM-DD`                                   |
| `customer_name`    | String  | **Yes**  | Customer/buyer name                                    |
| `customer_tin`     | String  | Cond.    | Required for B2B (`buyer_type = "0"`)                  |
| `customer_address` | String  | No       | Customer address                                       |
| `customer_email`   | String  | No       | Customer email                                         |
| `customer_phone`   | String  | No       | Customer phone                                         |
| `buyer_type`       | String  | **Yes**  | `"0"` = B2B, `"1"` = B2C, `"2"` = Foreigner, `"3"` = B2G |
| `payment_method`   | String  | **Yes**  | See Payment Method Codes below                         |
| `currency`         | String  | **Yes**  | 3-letter currency code (e.g. `"UGX"`)                  |
| `items`            | Array   | **Yes**  | Line items (see below)                                 |
| `tax_details`      | Array   | **Yes**  | Tax summary by category (see below)                    |
| `summary`          | Object  | **Yes**  | Totals summary (see below)                             |
| `total_amount`     | Number  | **Yes**  | Total gross amount (number, not string)                |
| `total_tax`        | Number  | **Yes**  | Total tax amount (number, not string)                  |
| `notes`            | String  | No       | Optional notes                                         |

### Payment Method Codes

| Code  | Method            |
|-------|-------------------|
| `101` | Credit            |
| `102` | Cash              |
| `103` | Cheque            |
| `104` | Demand Draft      |
| `105` | Mobile Money      |
| `106` | Visa/MasterCard   |
| `107` | EFT               |
| `108` | POS               |
| `109` | RTGS              |
| `110` | Swift Transfer    |

### Buyer Type Codes

| Code | Meaning    | TIN Required? |
|------|------------|---------------|
| `0`  | B2B        | **Yes**       |
| `1`  | B2C        | No            |
| `2`  | Foreigner  | No            |
| `3`  | B2G        | **Yes**       |

### Field Reference — Line Items (`items[]`)

| Field               | Type   | Required | Description                                             |
|---------------------|--------|----------|---------------------------------------------------------|
| `item`              | String | **Yes**  | Product display name                                    |
| `itemCode`          | String | **Yes**  | EFRIS-registered item code (from `/register-product`)   |
| `qty`               | String | **Yes**  | Quantity as string                                      |
| `unitOfMeasure`     | String | **Yes**  | 3-digit EFRIS UoM code (see Section 11)                 |
| `unitPrice`         | String | **Yes**  | **Tax-inclusive (gross)** unit price as string           |
| `total`             | String | **Yes**  | **Tax-inclusive (gross)** line total as string           |
| `taxRate`           | String | **Yes**  | Tax rate as decimal string: `"0.18"`, `"0"`, `"-"`      |
| `tax`               | String | **Yes**  | Tax amount as string                                    |
| `orderNumber`       | String | **Yes**  | Sequential line number starting from `"1"`              |
| `discountFlag`      | String | **Yes**  | `"1"` = has discount, `"2"` = no discount               |
| `deemedFlag`        | String | **Yes**  | `"1"` = deemed, `"2"` = not deemed                      |
| `exciseFlag`        | String | **Yes**  | `"1"` = has excise, `"2"` = no excise                   |
| `goodsCategoryId`   | String | **Yes**  | Commodity category code (from product registration)     |
| `goodsCategoryName` | String | No       | Commodity category name                                 |
| `vatApplicableFlag` | String | **Yes**  | `"1"` = VAT applies, `"0"` = VAT out of scope          |

**If `discountFlag = "1"` (has discount), also include:**

| Field              | Type   | Description                              |
|--------------------|--------|------------------------------------------|
| `discountTotal`    | String | Discount amount as string                |
| `discountTaxRate`  | String | Tax rate applied to discount             |

**If `exciseFlag = "1"` (has excise duty), also include:**

| Field              | Type   | Description                              |
|--------------------|--------|------------------------------------------|
| `categoryId`       | String | Excise duty code (e.g. `"LED010100"`)    |
| `categoryName`     | String | `"Excise Duty"`                          |
| `exciseRate`       | String | Rate as decimal (e.g. `"0.10"`)          |
| `exciseRule`       | String | `"1"` = percentage, `"2"` = quantity     |
| `exciseTax`        | String | Calculated excise amount                 |
| `exciseUnit`       | String | UoM code                                |
| `exciseCurrency`   | String | Currency code (e.g. `"UGX"`)            |
| `exciseRateName`   | String | Readable name (e.g. `"10%"`)            |
| `pack`             | String | If `exciseRule="2"` (quantity-based)     |
| `stick`            | String | If `exciseRule="2"` (quantity-based)     |

### CRITICAL: Prices are TAX-INCLUSIVE (Gross)

> EFRIS expects `unitPrice` and `total` in items to be **gross amounts** (VAT included). You must calculate tax backwards from the gross:
>
> ```
> Gross unit price: 59,000 UGX
> Net (before VAT): 59,000 / 1.18 = 50,000 UGX
> VAT amount:       59,000 - 50,000 = 9,000 UGX
> ```

### Field Reference — Tax Details (`tax_details[]`)

Group all line items by tax category and provide a summary for each:

| Field             | Type   | Required | Description                                         |
|-------------------|--------|----------|-----------------------------------------------------|
| `taxCategoryCode` | String | **Yes**  | EFRIS tax category (see Section 10)                 |
| `netAmount`       | String | **Yes**  | Total net amount for this category                  |
| `taxRate`         | String | **Yes**  | Tax rate as decimal (e.g. `"0.18"`)                 |
| `taxAmount`       | String | **Yes**  | Total tax for this category                         |
| `grossAmount`     | String | **Yes**  | Total gross for this category                       |
| `taxRateName`     | String | No       | Readable name (e.g. `"Standard Rate (18%)"`)        |
| `exciseUnit`      | String | No       | For excise categories                               |
| `exciseCurrency`  | String | No       | For excise categories (e.g. `"UGX"`)                |

### Field Reference — Summary (`summary`)

| Field        | Type   | Required | Description                     |
|--------------|--------|----------|---------------------------------|
| `netAmount`  | String | **Yes**  | Total net (excl. tax) as string |
| `taxAmount`  | String | **Yes**  | Total tax as string             |
| `grossAmount`| String | **Yes**  | Total gross (incl. tax) as string|
| `itemCount`  | String | **Yes**  | Number of line items as string  |
| `modeCode`   | String | **Yes**  | `"0"` (normal mode)             |
| `remarks`    | String | No       | Optional remarks                |
| `qrCode`     | String | No       | Leave empty `""` — URA fills it |

### Response

**Success:**
```json
{
  "success": true,
  "fdn": "YBS1234567890",
  "verification_code": "ABCDEF123456",
  "qr_code": "https://efris.ura.go.ug/verify/...",
  "invoice_number": "INV-001",
  "fiscalized_at": "2026-02-22T10:30:00Z"
}
```

**Failure:**
```json
{
  "success": false,
  "error_code": "EFRIS_ERROR",
  "message": "Item code not registered with EFRIS"
}
```

### What to store after success

| Field                    | Store as                                 |
|--------------------------|------------------------------------------|
| `fdn`                   | Invoice's fiscal document number         |
| `verification_code`     | For verification portal                  |
| `qr_code`               | Display on printed invoice (QR image)    |
| `fiscalized_at`         | Timestamp of fiscalization               |
| `eInvoiceStatus`        | Set to `"ACCEPTED"`                      |

### Prerequisites

> 1. Invoice must NOT be in DRAFT status.
> 2. All products on the invoice **must be EFRIS-registered** (have an item code from `/register-product`).
> 3. Customer TIN is required for B2B transactions (`buyer_type = "0"`).

---

## 7. Operation 4: Credit Note

### What it does
Submits a credit note against a previously fiscalized invoice (Interface Code **T110**). The original invoice **must have been fiscalized** (must have an FDN).

### Endpoint

```http
POST {baseUrl}/submit-credit-note
```

### Headers
```
Content-Type: application/json
X-API-Key: {apiKey}
```

### Request Body (Simplified Format — Recommended)

The middleware builds the full T110 EFRIS payload from this simplified structure:

```json
{
  "credit_note_number": "CN-001",
  "credit_note_date": "2026-02-22",
  "original_invoice_number": "INV-001",
  "original_fdn": "YBS1234567890",
  "oriInvoiceId": "YBS1234567890",
  "oriInvoiceNo": "YBS1234567890",
  "customer_name": "ABC Corporation",
  "customer_tin": "1000000789",
  "reason": "GOODS_RETURNED",
  "currency": "UGX",
  "items": [
    {
      "item_name": "Rice - 25kg Bag",
      "item_code": "RICE-25KG",
      "quantity": 2,
      "unit_price": 59000,
      "tax_rate": 18,
      "commodity_code": "10061000"
    }
  ]
}
```

### Field Reference — Top Level

| Field                      | Type   | Required | Description                                          |
|----------------------------|--------|----------|------------------------------------------------------|
| `credit_note_number`       | String | **Yes**  | Credit note number                                   |
| `credit_note_date`         | String | **Yes**  | Format: `YYYY-MM-DD`                                 |
| `original_invoice_number`  | String | **Yes**  | Original invoice number                              |
| `original_fdn`             | String | **Yes**  | FDN from the original fiscalized invoice             |
| `oriInvoiceId`             | String | **Yes**  | Same as original FDN — required by middleware         |
| `oriInvoiceNo`             | String | **Yes**  | Same as original FDN — required by middleware         |
| `customer_name`            | String | **Yes**  | Customer name                                        |
| `customer_tin`             | String | No       | Customer TIN (if B2B)                                |
| `reason`                   | String | **Yes**  | Reason for credit note (see codes below)             |
| `currency`                 | String | **Yes**  | 3-letter currency code                               |
| `items`                    | Array  | **Yes**  | Line items being credited                            |

### Field Reference — Line Items (`items[]`)

| Field           | Type   | Required | Description                                               |
|-----------------|--------|----------|-----------------------------------------------------------|
| `item_name`     | String | **Yes**  | Product name                                              |
| `item_code`     | String | **Yes**  | EFRIS-registered item code                                |
| `quantity`      | Number | **Yes**  | **POSITIVE number** — the middleware negates it internally |
| `unit_price`    | Number | **Yes**  | **Tax-inclusive (gross)** price as a number                |
| `tax_rate`      | Number | **Yes**  | `18` = Standard, `0` = Zero-rated, `-1` = Exempt          |
| `commodity_code`| String | No       | Commodity category code                                   |

### Credit Note Reason Codes

| Reason              | Description                  |
|---------------------|------------------------------|
| `GOODS_RETURNED`    | Customer returned goods      |
| `DISCOUNT`          | Post-sale discount           |
| `PRICE_ADJUSTMENT`  | Price was incorrectly charged|
| `CANCELLATION`      | Invoice cancelled            |
| `DAMAGED_GOODS`     | Goods were damaged           |
| `OTHER`             | Other (specify in notes)     |

### Response

```json
{
  "success": true,
  "referenceNo": "CNREF1234567890",
  "verification_code": "XYZDEF654321",
  "qr_code": "https://efris.ura.go.ug/verify/...",
  "credit_note_number": "CN-001",
  "fiscalized_at": "2026-02-22T12:00:00Z"
}
```

> **IMPORTANT:** T110 credit notes return a `referenceNo`, **NOT an `fdn`**. The credit note goes through URA approval before receiving its own FDN. Display the `referenceNo` and show status as "Pending URA Approval".

### Prerequisites

> 1. The credit note must be linked to an invoice that was **already fiscalized** (has an FDN).
> 2. All items must be EFRIS-registered products.
> 3. Send quantities as **positive** numbers — the middleware negates them.

---

## 8. Supporting Endpoints

### 8.1 Fetch Commodity Categories (T124)

Used to populate the commodity code dropdown when registering products.

```http
GET {baseUrl}/commodity-categories?token=test_token&pageNo=1&pageSize=100
Headers: X-API-Key: {apiKey}
```

Paginate through all pages. Each record has:
- `commodityCategoryCode` — the 8-digit code to use
- `commodityCategoryName` — display name
- `rate` — VAT rate (e.g. `"18"`)
- `isLeafNode` — `"101"` means selectable

### 8.2 Fetch Excise Duty Codes (T125)

Used when a product has excise tax.

```http
GET {baseUrl}/excise-duty?token=test_token&excise_name={search}
Headers: X-API-Key: {apiKey}
```

Each record has:
- `exciseDutyCode` — the code to use
- `goodService` — item name
- `rateText` — readable rate (e.g. `"60%"`)

### 8.3 Query Invoice Status

```http
GET {baseUrl}/invoice/{invoiceNumber}
Headers: X-API-Key: {apiKey}
```

### 8.4 Stock Decrease

For reporting damaged, expired, or otherwise reduced stock.

```http
POST {baseUrl}/stock-decrease
Headers: Content-Type: application/json, X-API-Key: {apiKey}
```

```json
{
  "operationType": "102",
  "adjustType": "102",
  "stockInDate": "2026-02-22",
  "remarks": "Damaged in transit",
  "goodsStockInItem": [
    {
      "goodsCode": "WIDGET-PRO-001",
      "measureUnit": "109",
      "quantity": 5,
      "unitPrice": 50000,
      "remarks": "Water damage"
    }
  ]
}
```

**Adjust Type Codes:**

| Code  | Meaning        |
|-------|----------------|
| `101` | Expired        |
| `102` | Damaged        |
| `103` | Personal Use   |
| `104` | Others         |
| `105` | Raw Materials  |

---

## 9. UI Button Placement Guide

This section specifies exactly where EFRIS buttons should appear in each mobile screen relative to the normal system buttons.

### General Rules

- **All EFRIS buttons are PURPLE** (`#7C3AED`) to visually distinguish them from normal actions (blue)
- **EFRIS buttons sit to the RIGHT** of the normal system buttons in the action bar
- **Only show EFRIS buttons when `organization.homeCountry === "UG"`** (Uganda)
- Include the Uganda flag 🇺🇬 on EFRIS buttons for clarity
- After a successful EFRIS submission, **replace the button with a green status badge**

### 9.1 Product/Service Screen

```
┌───────────────────────────────────────────────────────────────┐
│  PRODUCT DETAILS                                              │
│                                                               │
│  [Product form fields...]                                     │
│  Commodity Category: [Searchable dropdown from T124 API    ]  │
│  Has Excise Tax:     [Toggle: Yes / No                     ]  │
│  Excise Code:        [Searchable dropdown from T125 API    ]  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ EFRIS: ● Not Registered  /  ✅ Registered               │  │
│  │ EFRIS Code: 10XXXXXXXXXX (if registered)               │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  BOTTOM ACTION BAR:                                           │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  [Cancel]   [Save]   [Save & Register with EFRIS 🇺🇬]  │  │
│  │   gray       blue     purple                            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Flow:                                                        │
│  1. Save product to YOUR database first                       │
│  2. Then call POST /register-product with the saved data      │
│  3. Store the returned product_code on your product record    │
│  4. Update badge to ✅ Registered                             │
│                                                               │
│  Also show "Save & Register with EFRIS" at TOP of form       │
│  After registration: change to "✅ Registered with EFRIS"    │
└───────────────────────────────────────────────────────────────┘
```

### 9.2 Bill / Purchase Screen (Stock Increase)

```
┌───────────────────────────────────────────────────────────────┐
│  BILL / PURCHASE RECEIPT                                      │
│                                                               │
│  Vendor:     [Dropdown___________]                            │
│  Vendor TIN: [Auto-filled from vendor record]  ← for EFRIS   │
│  Bill Number:[BIL-001___________]                             │
│  Bill Date:  [2026-02-22________]                             │
│                                                               │
│  Line Items:                                                  │
│  ┌───────────────────────────────────────────────────────┐    │
│  │ Product (must be EFRIS-reg) │ Qty  │ Unit Price       │    │
│  │ ✅ Rice - 25kg              │ 100  │ 45,000           │    │
│  │ ⚠️ Sugar - 50kg             │ 50   │ 12,000           │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                               │
│  ⚠️ Sugar - 50kg is not registered with EFRIS                 │  │
│                                                               │
│  BOTTOM ACTION BAR:                                           │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  [Cancel]  [Save Draft]  [Save]  [Submit to EFRIS 🇺🇬]  │  │
│  │   gray      outline      blue     purple                │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Flow:                                                        │
│  1. Save bill to YOUR database first                          │
│  2. Validate all products are EFRIS-registered                │
│  3. Build goodsStockIn payload from bill + vendor data        │
│  4. Call POST /stock-increase                                 │
│  5. Mark bill as efrisSubmitted = true                        │
│  6. Replace button with "✅ Stock Reported to EFRIS"          │
└───────────────────────────────────────────────────────────────┘
```

### 9.3 Invoice Screen (Fiscalization)

```
┌───────────────────────────────────────────────────────────────┐
│  INVOICE                                                      │
│                                                               │
│  INV-001           Status: Sent   EFRIS: ● Not Submitted     │
│                                                               │
│  Customer:  [ABC Corporation____]                             │
│  TIN:       [1000000789________]  ← Required for B2B         │
│  Buyer Type:[B2B ▼]                                           │
│  Payment:   [Cash ▼]             ← EFRIS payment code        │
│                                                               │
│  Line Items:                                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Product     │ Qty │ Unit Price │ Tax Rate │ Total       │  │
│  │ Rice 25kg   │ 10  │ 59,000    │ 18%      │ 590,000     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  BOTTOM ACTION BAR:                                           │
│                                                               │
│  (Creating/Editing — invoice not yet sent):                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  [Cancel]  [Save Draft]  [Save]  [Submit to EFRIS 🇺🇬]  │  │
│  │   gray      outline      blue     purple                │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  (Viewing — invoice sent, not yet fiscalized):                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  [Edit]  [Print]  [Email]  [Submit to EFRIS 🇺🇬]        │  │
│  │   gray    blue     green    purple                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Rules:                                                       │
│  - HIDE "Submit to EFRIS" when invoice is DRAFT               │
│  - HIDE "Submit to EFRIS" when invoice already has FDN        │
│  - DISABLE if any product is not EFRIS-registered             │
│                                                               │
│  After successful fiscalization, show:                         │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  ✅ EFRIS Fiscalized                                    │  │
│  │  FDN: YBS1234567890                                     │  │
│  │  Verification Code: ABCDEF123456                        │  │
│  │  QR Code: [████████]  ← Tap to enlarge                  │  │
│  │  Submitted: 2026-02-22 10:30 AM                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  The QR code MUST appear on the printed invoice PDF.          │
└───────────────────────────────────────────────────────────────┘
```

### 9.4 Credit Note Screen

```
┌───────────────────────────────────────────────────────────────┐
│  CREDIT NOTE                                                  │
│                                                               │
│  CN-001           Against: INV-001 (FDN: YBS12345)           │
│  Status: Approved   EFRIS: ● Not Submitted                   │
│                                                               │
│  Original Invoice: [INV-001 ▼]  ← must have FDN              │
│  Reason:           [Goods Returned ▼]                         │
│  Customer:         [Auto-filled from invoice]                 │
│                                                               │
│  Line Items (credited from original invoice):                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Product     │ Qty │ Unit Price │ Tax Rate │ Total       │  │
│  │ Rice 25kg   │ 2   │ 59,000    │ 18%      │ 118,000     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ ⚠️ Original invoice must be fiscalized (have FDN)        │  │
│  │    before submitting credit note to EFRIS               │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  BOTTOM ACTION BAR:                                           │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  [Cancel]  [Save Draft]  [Approve]  [Submit to EFRIS 🇺🇬]│ │
│  │   gray      outline      blue        purple              │ │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Rules:                                                       │
│  - DISABLE "Submit to EFRIS" if original invoice has no FDN   │
│  - Only APPROVED credit notes can be submitted                │
│  - Send quantities as POSITIVE — middleware handles negation   │
│                                                               │
│  After success:                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  ✅ Submitted to EFRIS                                  │  │
│  │  Reference: CNREF1234567890                             │  │
│  │  Status: Pending URA Approval                           │  │
│  │  Against FDN: YBS1234567890                             │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### 9.5 Button Color Scheme Summary

| Button                       | Color    | Hex Code    | When Visible                       |
|------------------------------|----------|-------------|-------------------------------------|
| Normal Save                  | Blue     | `#2563EB`   | Always                              |
| Save as Draft                | Outline  | `#6B7280`   | When creating/editing               |
| **Submit to EFRIS 🇺🇬**      | **Purple** | **`#7C3AED`** | **Uganda orgs only, not yet submitted** |
| EFRIS Success Status         | Green    | `#059669`   | After successful submission         |
| Cancel                       | Gray     | `#6B7280`   | Always                              |

---

## 10. EFRIS Tax Categories Reference

These are the tax classification codes EFRIS uses. Map your internal tax rates to these:

| Code | Category Name           | VAT Rate    | `taxRate` string | `vatApplicableFlag` |
|------|------------------------|-------------|------------------|---------------------|
| `01` | Standard Rate          | 18%         | `"0.18"`         | `"1"`               |
| `02` | Zero Rated             | 0%          | `"0"`            | `"1"`               |
| `03` | Exempt                 | —           | `"-"`            | `"1"`               |
| `04` | Deemed                 | —           | `"-"`            | `"1"`               |
| `05` | Excise Duty            | varies      | varies           | `"1"`               |
| `06` | OTT Service            | —           | —                | `"1"`               |
| `07` | Stamp Duty             | —           | —                | `"1"`               |
| `08` | Local Hotel Service Tax| —           | —                | `"1"`               |
| `09` | UCC Levy               | —           | —                | `"1"`               |
| `10` | Others                 | —           | —                | `"1"`               |
| `11` | VAT Out of Scope       | —           | —                | **`"0"`**           |

### How to build `tax_details[]` from invoice items

1. Group all line items by their `taxCategoryCode`
2. For each group, sum up `netAmount`, `taxAmount`, `grossAmount`
3. If a line has excise (`exciseFlag = "1"`), include excise as a separate `tax_details` entry with `taxCategoryCode = "05"`
4. Build one entry per group

Example for an invoice with mixed categories:
```json
"tax_details": [
  {
    "taxCategoryCode": "01",
    "netAmount": "400000.00",
    "taxRate": "0.18",
    "taxAmount": "72000.00",
    "grossAmount": "472000.00",
    "taxRateName": "Standard Rate (18%)"
  },
  {
    "taxCategoryCode": "02",
    "netAmount": "50000.00",
    "taxRate": "0",
    "taxAmount": "0.00",
    "grossAmount": "50000.00",
    "taxRateName": "Zero Rated"
  }
]
```

---

## 11. EFRIS Unit of Measure Codes (T115)

**Confirmed from EFRIS API (T115 interface).** EFRIS only has **9 unit codes**. There is no Box, Bag, Carton, Pair, Set, Dozen, or Roll code — all countable/discrete items use `101` (Stick).

| Code  | EFRIS Name                 | Meaning                                        |
|-------|----------------------------|------------------------------------------------|
| `101` | **Stick**                  | ALL countable/discrete items (pieces, units, boxes, bags, etc.) |
| `102` | **Litre**                  | Liquid volumes                                 |
| `103` | **Kg**                     | Weight (kilograms)                             |
| `104` | **User per day of access** | OTT / telecom services                         |
| `105` | **Minute**                 | Time-based billing                             |
| `106` | **1000sticks**             | Bulk cigarettes (1,000 sticks)                 |
| `107` | **50kgs**                  | Bulk weight (50 kg bags)                       |
| `108` | **-**                      | Reserved / undefined                           |
| `109` | **g**                      | Gram (small weight)                            |

### UI Selection → EFRIS Code Mapping

When the user selects a unit in your mobile app dropdown, send this code in the payload:

| User selects in UI                  | Send EFRIS code | Why                                          |
|-------------------------------------|-----------------|----------------------------------------------|
| Piece / Unit / Pcs / Each           | `"101"`         | Stick = generic countable unit               |
| Box / Carton / Bag / Sack           | `"101"`         | No specific container code; use Stick        |
| Pair / Set / Dozen / Roll / Ream    | `"101"`         | No specific grouping code; use Stick         |
| Bottle / Can / Tin / Jar / Drum     | `"101"`         | Countable containers → Stick                 |
| Sheet / Bundle / Pack / Pallet      | `"101"`         | Countable packaging → Stick                  |
| Metre / Yard / Foot / Inch / cm     | `"101"`         | Length units → Stick (countable)             |
| Hour / Day / Service                | `"101"`         | Time/service → Stick (countable)             |
| Litre / mL / Gallon / Pint          | `"102"`         | All liquid volumes → Litre                   |
| Kilogram / Pound / Ounce / Ton      | `"103"`         | All weight → Kg                              |
| Gram / Milligram                    | `"109"`         | Small weight → g                             |
| User / Access / OTT                 | `"104"`         | Telecom/OTT → User per day                   |
| Minute                              | `"105"`         | Time billing → Minute                        |

> **Default fallback: `"101"` (Stick)** for any unit that doesn't clearly match Litre, Kg, g, Minute, or User/day.

---

## 12. Stock-In Type & Adjustment Codes

### Stock-In Type (for stock increase)

| Code  | Meaning          |
|-------|------------------|
| `101` | Import           |
| `102` | Local Purchase   |
| `103` | Manufacture      |
| `104` | Opening Stock    |

### Goods Type

| Code  | Meaning |
|-------|---------|
| `101` | Goods   |
| `102` | Fuel    |

### Stock Decrease Adjust Type

| Code  | Meaning        |
|-------|----------------|
| `101` | Expired        |
| `102` | Damaged        |
| `103` | Personal Use   |
| `104` | Others         |
| `105` | Raw Materials  |

---

## 13. Error Handling

### Common Error Responses

```json
{
  "success": false,
  "error_code": "EFRIS_ERROR_CODE",
  "message": "Human-readable error description"
}
```

### Error Scenarios & How to Handle

| Error                                    | Cause                                   | Mobile App Action                              |
|------------------------------------------|-----------------------------------------|------------------------------------------------|
| `"Item code not registered"`             | Product not in EFRIS system             | Show "Register product with EFRIS first"       |
| `"Duplicate invoice"`                    | Already fiscalized                      | Show existing FDN                              |
| `"Invalid TIN"`                          | Customer TIN wrong format               | Show "Enter valid 10-digit TIN"                |
| `"Original invoice not found"`           | Wrong FDN on credit note                | Show "Check original invoice FDN"              |
| Network timeout                          | API unresponsive                        | Show "EFRIS server busy. Try again"            |
| HTTP 401 / 403                          | Bad API key                             | Show "EFRIS API key invalid. Check settings"   |
| HTTP 500                                | Middleware error                        | Show "EFRIS error. Try again later"            |
| `"Commodity code not found"`             | Invalid commodity code                  | Show "Select a valid commodity category"       |

### Retry Logic

```
Attempt 1: Immediate
Attempt 2: Wait 2 seconds
Attempt 3: Wait 5 seconds
Then: Show "EFRIS service unavailable" with manual retry button
```

> Never auto-retry invoice fiscalization — it could create duplicates. Only retry after user confirms.

---

## 14. Testing Checklist

### Product Registration (T130)
- [ ] Can register a new product via `POST /register-product`
- [ ] Commodity category selector loads from `GET /commodity-categories`
- [ ] Excise code selector shows when "Has Excise Tax = Yes"
- [ ] EFRIS product code stored after successful registration
- [ ] Already-registered products show ✅ badge

### Stock Increase (T131)
- [ ] Can submit stock increase via `POST /stock-increase`
- [ ] Shows warning if any product is unregistered
- [ ] Vendor TIN is sent as `supplierTin`
- [ ] Bill marked as EFRIS-submitted after success
- [ ] Cannot re-submit already-submitted bills

### Invoice Fiscalization (T109)
- [ ] Can fiscalize via `POST /submit-invoice`
- [ ] Prices sent as tax-inclusive (gross)
- [ ] FDN, verification code, QR code display after success
- [ ] QR code renders and is scannable
- [ ] Cannot fiscalize DRAFT invoices
- [ ] Cannot re-fiscalize already-fiscalized invoices
- [ ] B2B invoices include customer TIN
- [ ] B2C invoices work without TIN
- [ ] `tax_details[]` correctly groups by tax category
- [ ] Payment method code is correct

### Credit Note (T110)
- [ ] Can submit via `POST /submit-credit-note`
- [ ] Cannot submit if original invoice has no FDN (button disabled)
- [ ] `referenceNo` displays after success (not FDN)
- [ ] Shows "Pending URA Approval" status
- [ ] Quantities sent as positive numbers
- [ ] `oriInvoiceId` and `oriInvoiceNo` both set to original FDN

### General
- [ ] All EFRIS buttons hidden for non-Uganda organizations
- [ ] `X-API-Key` header sent on every request
- [ ] 30-second timeout on all calls
- [ ] Error messages display clearly
- [ ] Network timeout handled with retry option

---

## Quick Reference Card

```
╔═══════════════════════════════════════════════════════════════════╗
║  EFRIS MOBILE INTEGRATION — QUICK REFERENCE                     ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  External API (NOT ours — shared third-party middleware):         ║
║  Base URL: https://efrisintegration.nafacademy.com               ║
║            /api/external/efris                                    ║
║                                                                   ║
║  Auth: X-API-Key header on every request                         ║
║                                                                   ║
║  ENDPOINTS:                                                       ║
║  1. PRODUCT  → POST /register-product              (T130)        ║
║  2. STOCK    → POST /stock-increase                (T131)        ║
║  3. INVOICE  → POST /submit-invoice                (T109)        ║
║  4. CN       → POST /submit-credit-note            (T110)        ║
║                                                                   ║
║  RULES:                                                           ║
║  • Register products BEFORE invoicing or stock increase           ║
║  • Invoice prices are TAX-INCLUSIVE (gross)                       ║
║  • Credit notes need original invoice FDN                         ║
║  • Credit note quantities are POSITIVE (API negates)              ║
║  • All string numbers: quantity, price as "100", "5000"           ║
║  • All buttons: PURPLE, rightmost, Uganda orgs only               ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

*Document maintained by YourBooks ERP Team. For questions, contact the backend team.*
