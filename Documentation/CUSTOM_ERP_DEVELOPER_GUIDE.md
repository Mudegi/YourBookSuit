# Custom ERP - EFRIS Integration Developer Guide

**Version:** 2.0  
**Last Updated:** February 16, 2026  
**API Base URL:** `https://efrisintegration.nafacademy.com`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Product Registration (T130)](#3-product-registration-t130)
4. [Invoice Submission (T109)](#4-invoice-submission-t109)
5. [Excise Duty Handling](#5-excise-duty-handling)
6. [Response Structure](#6-response-structure)
7. [Error Handling](#7-error-handling)
8. [Complete Code Examples](#8-complete-code-examples)
9. [Common Mistakes & Solutions](#9-common-mistakes--solutions)
10. [Testing Checklist](#10-testing-checklist)

---

## 1. Overview

This API allows your Custom ERP to:
- Register products with EFRIS (T130)
- Submit invoices for fiscalization (T109)
- Receive complete fiscal data (FDN, QR Code, Verification Code)

### Key Concepts

| Term | Description |
|------|-------------|
| **FDN** | Fiscal Document Number - unique EFRIS invoice identifier |
| **T109** | EFRIS interface code for invoice upload |
| **T130** | EFRIS interface code for product registration |
| **Excise Duty** | Special tax on specific goods (beverages, fuel, etc.) |
| **Tax Category** | 01=Standard VAT (18%), 02=Zero-rated, 03=Exempt, 05=Excise |

---

## 2. Authentication

### API Key Authentication

All requests must include your API key in the header:

```
X-API-Key: your-api-key-here
```

### Get Your API Key

Contact your system administrator to obtain an API key linked to your company's EFRIS credentials.

### Example Request Header

```javascript
const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': 'efris_sk_live_abc123xyz789'
};
```

---

## 3. Product Registration (T130)

Before selling a product, it **MUST** be registered with EFRIS.

### Endpoint

```
POST /api/external/efris/register-product
```

### Request Body

```json
{
  "operationType": "101",
  "goodsName": "HP Pavilion Laptop",
  "goodsCode": "HP-PAV-001",
  "measureUnit": "101",
  "unitPrice": "2500000",
  "currency": "UGX",
  "commodityCategoryId": "44102906",
  "haveExciseTax": "102",
  "description": "HP Pavilion 15-inch laptop",
  "stockPrewarning": "10",
  "ppiValue": "",
  "ppiUnit": "",
  "havePiecePrice": "102",
  "piecePrice": "",
  "pieceMeasureUnit": ""
}
```

### Field Reference

| Field | Required | Values | Description |
|-------|----------|--------|-------------|
| `operationType` | Yes | "101" | 101=Add, 102=Update, 103=Delete |
| `goodsName` | Yes | string | Product display name |
| `goodsCode` | Yes | string | Unique product code (your SKU) |
| `measureUnit` | Yes | string | Unit code from T115 |
| `unitPrice` | Yes | string | Default unit price |
| `currency` | Yes | "UGX" | Currency code |
| `commodityCategoryId` | Yes | string | Commodity classification code |
| `haveExciseTax` | Yes | string | "101"=Yes, "102"=No |
| `exciseDutyCode` | If excise | string | Excise category code (e.g., "LED110000") |

### Unit of Measure Codes (measureUnit)

| Code | Unit | Code | Unit |
|------|------|------|------|
| 101 | Piece/Each | 105 | Gram |
| 102 | Litre | 106 | Kilogram |
| 103 | Millilitre | 107 | Metre |
| 104 | Centilitre | 108 | Pack |

### ⚠️ CRITICAL: Excise Product Unit Matching

**If your product has excise duty, the `measureUnit` MUST match the excise unit from T125.**

Example:
- Beer/Beverages: Must use `102` (Litre)
- Fuel/Diesel: Must use `102` (Litre)
- Cigarettes: Must use `101` (Piece) or appropriate unit

### Response

```json
{
  "success": true,
  "message": "Product registered successfully",
  "goods_code": "HP-PAV-001",
  "efris_product_id": "12345678901234"
}
```

---

## 4. Invoice Submission (T109)

### Endpoint

```
POST /api/external/efris/submit-invoice
```

### Standard Invoice (VAT Only)

```json
{
  "invoice_number": "INV-2026-0001",
  "invoice_date": "2026-02-16",
  "currency": "UGX",
  "buyer_type": "1",
  "customer_name": "John Doe",
  "customer_tin": "",
  "payment_method": "101",
  "items": [
    {
      "item": "HP Pavilion Laptop",
      "itemCode": "HP-PAV-001",
      "qty": "2",
      "unitOfMeasure": "101",
      "unitPrice": "2500000.00",
      "total": "5000000.00",
      "taxRate": "0.18",
      "tax": "762711.86",
      "orderNumber": "1",
      "discountFlag": "2",
      "deemedFlag": "2",
      "exciseFlag": "2",
      "goodsCategoryId": "44102906",
      "vatApplicableFlag": "1"
    }
  ],
  "tax_details": [
    {
      "taxCategoryCode": "01",
      "netAmount": "4237288.14",
      "taxRate": "0.18",
      "taxAmount": "762711.86",
      "grossAmount": "5000000.00"
    }
  ],
  "total_amount": 4237288.14,
  "total_tax": 762711.86
}
```

### Field Reference - Invoice

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `invoice_number` | Yes | string | Your internal invoice number |
| `invoice_date` | Yes | string | Format: YYYY-MM-DD |
| `currency` | Yes | string | "UGX" |
| `buyer_type` | Yes | string | "0"=Business, "1"=Individual, "2"=Government |
| `customer_name` | Yes | string | Customer/buyer name |
| `customer_tin` | B2B only | string | Required if buyer_type is "0" |
| `payment_method` | Yes | string | Payment mode code |
| `items` | Yes | array | Line items |
| `tax_details` | Yes | array | Tax breakdown by category |
| `total_amount` | Yes | number | Net amount (excluding tax) |
| `total_tax` | Yes | number | Total tax amount |

### Payment Method Codes

| Code | Method |
|------|--------|
| 101 | Cash |
| 102 | Credit |
| 103 | Mobile Money |
| 104 | Card/POS |
| 105 | Bank Transfer |

### Buyer Type Codes

| Code | Type | TIN Required? |
|------|------|---------------|
| 0 | Business (B2B) | Yes |
| 1 | Individual (B2C) | No |
| 2 | Government (B2G) | Yes |

### Field Reference - Line Items

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `item` | Yes | string | Product name |
| `itemCode` | Yes | string | Must match T130 registration |
| `qty` | Yes | string | Quantity (as string) |
| `unitOfMeasure` | Yes | string | Unit code (101, 102, etc.) |
| `unitPrice` | Yes | string | Unit price (tax-inclusive) |
| `total` | Yes | string | Line total (tax-inclusive) |
| `taxRate` | Yes | string | **"0.18"** for VAT, **"-"** for exempt |
| `tax` | Yes | string | Tax amount |
| `orderNumber` | Yes | string | Line number starting from "1" |
| `discountFlag` | Yes | string | "2"=No discount |
| `deemedFlag` | Yes | string | "2"=Not deemed |
| `exciseFlag` | Yes | string | "1"=Excise, "2"=No excise |
| `goodsCategoryId` | Yes | string | Commodity code |
| `vatApplicableFlag` | Yes | string | "0"=No VAT, "1"=VAT applies |

### Field Reference - Tax Details

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `taxCategoryCode` | Yes | string | "01"=VAT, "05"=Excise |
| `netAmount` | Yes | string | Net amount for this category |
| `taxRate` | Yes | string | **"0.18"** for VAT, **"0"** for excise |
| `taxAmount` | Yes | string | Tax amount |
| `grossAmount` | Yes | string | Gross amount |

---

## 5. Excise Duty Handling

### ⚠️ CRITICAL: Excise Tax Rate Rules

**For excise duty (taxCategoryCode: "05"):**
- If excise is **fixed amount per unit** (e.g., UGX 50 per litre): `taxRate` = `"0"`
- If excise is **percentage-based**: `taxRate` = decimal string (e.g., `"0.10"`)

**For VAT (taxCategoryCode: "01"):**
- `taxRate` MUST be exactly `"0.18"` (string, not number)

### Invoice with Excise Duty

```json
{
  "invoice_number": "INV-2026-0012",
  "invoice_date": "2026-02-16",
  "currency": "UGX",
  "buyer_type": "1",
  "customer_name": "Timothy Khabusi",
  "payment_method": "102",
  "items": [
    {
      "item": "Nivana Water",
      "itemCode": "NIVA-001",
      "qty": "10",
      "unitOfMeasure": "102",
      "unitPrice": "1239.00",
      "total": "12390.00",
      "taxRate": "0.18",
      "tax": "1890.00",
      "orderNumber": "1",
      "discountFlag": "2",
      "deemedFlag": "2",
      "exciseFlag": "1",
      "goodsCategoryId": "50202310",
      "vatApplicableFlag": "1",
      "categoryId": "LED110000",
      "categoryName": "Excise Duty",
      "exciseRate": "50",
      "exciseRule": "2",
      "exciseTax": "500.00",
      "pack": "1",
      "stick": "1",
      "exciseUnit": "102",
      "exciseCurrency": "UGX",
      "exciseRateName": "UGX50 per litre"
    }
  ],
  "tax_details": [
    {
      "taxCategoryCode": "01",
      "netAmount": "10500.00",
      "taxRate": "0.18",
      "taxAmount": "1890.00",
      "grossAmount": "12390.00"
    },
    {
      "taxCategoryCode": "05",
      "netAmount": "10000.00",
      "taxRate": "0",
      "taxAmount": "500.00",
      "grossAmount": "10500.00",
      "taxRateName": "UGX50 per litre"
    }
  ],
  "total_amount": 10000,
  "total_tax": 2390
}
```

### Excise Item Fields

| Field | Required | Description |
|-------|----------|-------------|
| `exciseFlag` | Yes | "1" = Has excise duty |
| `categoryId` | Yes | Excise duty code (e.g., "LED110000") |
| `categoryName` | Yes | "Excise Duty" |
| `exciseRate` | Yes | Rate value (e.g., "50" for UGX 50/litre) |
| `exciseRule` | Yes | "1"=Percentage, "2"=Fixed per unit |
| `exciseTax` | Yes | Calculated excise amount |
| `exciseUnit` | Yes | Unit code (must match measureUnit) |
| `exciseCurrency` | Yes | "UGX" |
| `exciseRateName` | Yes | Display name (e.g., "UGX50 per litre") |

### Excise Tax Calculation

**For Fixed Rate (exciseRule = "2"):**
```
exciseTax = exciseRate × quantity
Example: 50 × 10 = 500 UGX
```

**For Percentage (exciseRule = "1"):**
```
exciseTax = netAmount × (exciseRate / 100)
Example: 10000 × (10 / 100) = 1000 UGX
```

### VAT on Excise Products

**Important:** VAT is calculated on `netAmount + exciseTax`:

```
vatBase = netAmount + exciseTax
vatAmount = vatBase × 0.18
grossAmount = vatBase + vatAmount

Example:
netAmount = 10000
exciseTax = 500
vatBase = 10500
vatAmount = 10500 × 0.18 = 1890
grossAmount = 10500 + 1890 = 12390
```

---

## 6. Response Structure

### Successful Response

```json
{
  "success": true,
  "message": "Invoice fiscalized successfully",
  
  "seller": {
    "brn": "",
    "tin": "1014409555",
    "legal_name": "ALLELUJA REFLEXOLOGY HEALTH SOLUTIONS",
    "trade_name": "ALLELUJA REFLEXOLOGY HEALTH SOLUTIONS",
    "address": "BIFRO HOUSE OPPOSITE MBI SIR APOLLP KAGGWA ROAD",
    "reference_number": "INV-2026-0006",
    "served_by": "API User"
  },
  
  "fiscal_data": {
    "document_type": "Original",
    "fdn": "325043056477",
    "verification_code": "234893273725405146366",
    "device_number": "1014409555_02",
    "efris_invoice_id": "893997229738400343",
    "issued_date": "15/02/2026",
    "issued_time": "13:48:41",
    "qr_code": "base64_encoded_qr_image_data..."
  },
  
  "buyer": {
    "name": "Timothy Khabusi",
    "tin": "",
    "buyer_type": "1"
  },
  
  "items": [...],
  
  "tax_details": [
    {
      "taxCategoryCode": "01",
      "netAmount": "2000000",
      "taxRate": "0.18",
      "taxAmount": "360000",
      "grossAmount": "2360000"
    }
  ],
  
  "summary": {
    "net_amount": 2000000,
    "tax_amount": 360000,
    "gross_amount": 2360000,
    "gross_amount_words": "Two million three hundred sixty thousand shillings only",
    "payment_mode": "Credit",
    "total_amount": 2360000,
    "currency": "UGX",
    "number_of_items": 1,
    "mode": "Online",
    "remarks": ""
  },
  
  "invoice_number": "INV-2026-0006",
  "fiscalized_at": "2026-02-15T10:48:47"
}
```

### Using the Response for Invoice Printing

Store and display:
- `fiscal_data.fdn` - Fiscal Document Number
- `fiscal_data.verification_code` - For verification
- `fiscal_data.qr_code` - QR code image (base64)
- `fiscal_data.device_number` - Device identifier
- `fiscal_data.issued_date` / `issued_time` - Official timestamp
- `summary.gross_amount_words` - Amount in words

---

## 7. Error Handling

### Error Response Format

```json
{
  "detail": {
    "success": false,
    "error_code": "2833",
    "message": "taxDetails-->taxRate: If 'taxCategoryCode' is '01', 'taxRate' must be '0.18'!",
    "details": "EFRIS rejected the invoice"
  }
}
```

### Common Errors & Solutions

| Error Code | Message | Solution |
|------------|---------|----------|
| **1115** | emailAddress cannot be empty | Seller email is auto-filled by API |
| **1131** | operator cannot be empty | Operator is auto-filled by API |
| **1205** | discountTotal must be empty | When `discountFlag="2"`, don't send `discountTotal` |
| **1323** | invoiceNo must be empty | Don't send `invoiceNo` - EFRIS generates FDN |
| **2124** | itemCode does not match goodsCategoryId | Use correct commodity code from T130 |
| **2268** | paymentAmount cannot be 0 | Send correct total amounts |
| **2833** | taxRate must be '0.18' | Use string `"0.18"`, not number `0.18` |

### TypeScript Error Handling

```typescript
try {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify(invoicePayload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    const errorCode = errorData.detail?.error_code;
    const errorMessage = errorData.detail?.message;
    
    // Handle specific errors
    switch (errorCode) {
      case '2833':
        console.error('Tax rate format error:', errorMessage);
        // Fix: Ensure taxRate is string "0.18"
        break;
      case '2124':
        console.error('Product mismatch:', errorMessage);
        // Fix: Verify product is registered with correct commodity code
        break;
      default:
        console.error('EFRIS Error:', errorMessage);
    }
    
    throw new Error(`EFRIS Error ${errorCode}: ${errorMessage}`);
  }

  const fiscalData = await response.json();
  return fiscalData;

} catch (error) {
  console.error('Invoice submission failed:', error);
  throw error;
}
```

---

## 8. Complete Code Examples

### TypeScript/Next.js Service

```typescript
// lib/services/efris/efris-api.service.ts

interface EfrisInvoiceItem {
  item: string;
  itemCode: string;
  qty: string;
  unitOfMeasure: string;
  unitPrice: string;
  total: string;
  taxRate: string;  // MUST be string "0.18" for VAT
  tax: string;
  orderNumber: string;
  discountFlag: string;
  deemedFlag: string;
  exciseFlag: string;
  goodsCategoryId: string;
  vatApplicableFlag: string;
  // Excise fields (if applicable)
  categoryId?: string;
  categoryName?: string;
  exciseRate?: string;
  exciseRule?: string;
  exciseTax?: string;
  exciseUnit?: string;
  exciseCurrency?: string;
  exciseRateName?: string;
  pack?: string;
  stick?: string;
}

interface EfrisTaxDetail {
  taxCategoryCode: string;  // "01" for VAT, "05" for Excise
  netAmount: string;
  taxRate: string;  // "0.18" for VAT, "0" for fixed excise
  taxAmount: string;
  grossAmount: string;
  taxRateName?: string;  // For excise display
}

interface EfrisInvoicePayload {
  invoice_number: string;
  invoice_date: string;
  currency: string;
  buyer_type: string;
  customer_name: string;
  customer_tin?: string;
  payment_method: string;
  items: EfrisInvoiceItem[];
  tax_details: EfrisTaxDetail[];
  total_amount: number;
  total_tax: number;
}

interface EfrisFiscalResponse {
  success: boolean;
  message: string;
  seller: {
    tin: string;
    legal_name: string;
    trade_name: string;
    address: string;
    reference_number: string;
    served_by: string;
  };
  fiscal_data: {
    document_type: string;
    fdn: string;
    verification_code: string;
    device_number: string;
    efris_invoice_id: string;
    issued_date: string;
    issued_time: string;
    qr_code: string;
  };
  buyer: {
    name: string;
    tin: string;
    buyer_type: string;
  };
  items: EfrisInvoiceItem[];
  tax_details: EfrisTaxDetail[];
  summary: {
    net_amount: number;
    tax_amount: number;
    gross_amount: number;
    gross_amount_words: string;
    payment_mode: string;
    total_amount: number;
    currency: string;
    number_of_items: number;
    mode: string;
  };
  invoice_number: string;
  fiscalized_at: string;
}

export class EfrisApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string) {
    this.baseUrl = 'https://efrisintegration.nafacademy.com';
    this.apiKey = apiKey;
  }

  async submitInvoice(payload: EfrisInvoicePayload): Promise<EfrisFiscalResponse> {
    const response = await fetch(`${this.baseUrl}/api/external/efris/submit-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`EFRIS Error ${error.detail?.error_code}: ${error.detail?.message}`);
    }

    return response.json();
  }

  /**
   * Build tax details array with correct formatting
   */
  buildTaxDetails(
    netAmount: number,
    vatAmount: number,
    grossAmount: number,
    exciseAmount?: number,
    exciseRateName?: string
  ): EfrisTaxDetail[] {
    const taxDetails: EfrisTaxDetail[] = [];

    // VAT entry - taxRate MUST be string "0.18"
    taxDetails.push({
      taxCategoryCode: '01',
      netAmount: netAmount.toFixed(2),
      taxRate: '0.18',  // CRITICAL: Must be exact string
      taxAmount: vatAmount.toFixed(2),
      grossAmount: grossAmount.toFixed(2)
    });

    // Excise entry (if applicable) - taxRate MUST be "0" for fixed rate
    if (exciseAmount && exciseAmount > 0) {
      taxDetails.push({
        taxCategoryCode: '05',
        netAmount: netAmount.toFixed(2),
        taxRate: '0',  // CRITICAL: "0" for fixed rate excise
        taxAmount: exciseAmount.toFixed(2),
        grossAmount: (netAmount + exciseAmount).toFixed(2),
        taxRateName: exciseRateName || ''
      });
    }

    return taxDetails;
  }

  /**
   * Build line item with correct formatting
   */
  buildLineItem(
    item: {
      name: string;
      code: string;
      quantity: number;
      unitPrice: number;
      taxAmount: number;
      commodityCode: string;
      unitOfMeasure?: string;
      hasExcise?: boolean;
      exciseData?: {
        categoryId: string;
        exciseRate: number;
        exciseRule: string;
        exciseTax: number;
        exciseUnit: string;
        exciseRateName: string;
      };
    },
    orderNumber: number
  ): EfrisInvoiceItem {
    const total = item.quantity * item.unitPrice;
    
    const lineItem: EfrisInvoiceItem = {
      item: item.name,
      itemCode: item.code,
      qty: item.quantity.toString(),
      unitOfMeasure: item.unitOfMeasure || '101',
      unitPrice: item.unitPrice.toFixed(2),
      total: total.toFixed(2),
      taxRate: '0.18',  // String format
      tax: item.taxAmount.toFixed(2),
      orderNumber: orderNumber.toString(),
      discountFlag: '2',
      deemedFlag: '2',
      exciseFlag: item.hasExcise ? '1' : '2',
      goodsCategoryId: item.commodityCode,
      vatApplicableFlag: '1'
    };

    // Add excise fields if applicable
    if (item.hasExcise && item.exciseData) {
      lineItem.categoryId = item.exciseData.categoryId;
      lineItem.categoryName = 'Excise Duty';
      lineItem.exciseRate = item.exciseData.exciseRate.toString();
      lineItem.exciseRule = item.exciseData.exciseRule;
      lineItem.exciseTax = item.exciseData.exciseTax.toFixed(2);
      lineItem.exciseUnit = item.exciseData.exciseUnit;
      lineItem.exciseCurrency = 'UGX';
      lineItem.exciseRateName = item.exciseData.exciseRateName;
      lineItem.pack = '1';
      lineItem.stick = '1';
    }

    return lineItem;
  }
}
```

### React Component for Fiscal Invoice Display

```tsx
// components/FiscalInvoice.tsx

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface FiscalInvoiceProps {
  data: EfrisFiscalResponse;
}

export const FiscalInvoice: React.FC<FiscalInvoiceProps> = ({ data }) => {
  return (
    <div className="fiscal-invoice p-6 bg-white max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center border-b pb-4 mb-4">
        <img src="/ura-logo.png" alt="URA" className="h-12 mx-auto mb-2" />
        <h1 className="text-xl font-bold">e-INVOICE/TAX INVOICE</h1>
      </div>

      {/* Section A: Seller Details */}
      <section className="mb-4">
        <h2 className="font-bold bg-gray-200 px-2 py-1">Section A: Seller's Details</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr><td className="font-medium w-1/3">TIN:</td><td>{data.seller.tin}</td></tr>
            <tr><td className="font-medium">Legal Name:</td><td>{data.seller.legal_name}</td></tr>
            <tr><td className="font-medium">Trade Name:</td><td>{data.seller.trade_name}</td></tr>
            <tr><td className="font-medium">Address:</td><td>{data.seller.address}</td></tr>
            <tr><td className="font-medium">Seller's Reference:</td><td>{data.seller.reference_number}</td></tr>
            <tr><td className="font-medium">Served by:</td><td>{data.seller.served_by}</td></tr>
          </tbody>
        </table>
      </section>

      {/* Section B: URA Information */}
      <section className="mb-4">
        <h2 className="font-bold bg-gray-200 px-2 py-1">Section B: URA Information</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr><td className="font-medium w-1/3">Document Type:</td><td>{data.fiscal_data.document_type}</td></tr>
            <tr><td className="font-medium">Issued Date:</td><td>{data.fiscal_data.issued_date}</td></tr>
            <tr><td className="font-medium">Time:</td><td>{data.fiscal_data.issued_time}</td></tr>
            <tr><td className="font-medium">Device Number:</td><td>{data.fiscal_data.device_number}</td></tr>
            <tr><td className="font-medium">Fiscal Document Number:</td><td className="font-bold">{data.fiscal_data.fdn}</td></tr>
            <tr><td className="font-medium">Verification Code:</td><td className="text-xs">{data.fiscal_data.verification_code}</td></tr>
          </tbody>
        </table>
      </section>

      {/* Section C: Buyer Details */}
      <section className="mb-4">
        <h2 className="font-bold bg-gray-200 px-2 py-1">Section C: Buyer's Details</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr><td className="font-medium w-1/3">Name:</td><td>{data.buyer.name}</td></tr>
            {data.buyer.tin && <tr><td className="font-medium">TIN:</td><td>{data.buyer.tin}</td></tr>}
          </tbody>
        </table>
      </section>

      {/* Section D: Goods & Services */}
      <section className="mb-4">
        <h2 className="font-bold bg-gray-200 px-2 py-1">Section D: Goods & Services Details</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-1 text-left">No.</th>
              <th className="border p-1 text-left">Item</th>
              <th className="border p-1 text-right">Qty</th>
              <th className="border p-1 text-right">Unit Price</th>
              <th className="border p-1 text-right">Total</th>
              <th className="border p-1 text-center">Tax</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index}>
                <td className="border p-1">{index + 1}</td>
                <td className="border p-1">{item.item}</td>
                <td className="border p-1 text-right">{item.qty}</td>
                <td className="border p-1 text-right">{Number(item.unitPrice).toLocaleString()}</td>
                <td className="border p-1 text-right">{Number(item.total).toLocaleString()}</td>
                <td className="border p-1 text-center">A</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Section E: Tax Details */}
      <section className="mb-4">
        <h2 className="font-bold bg-gray-200 px-2 py-1">Section E: Tax Details</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-1 text-left">Tax Category</th>
              <th className="border p-1 text-right">Net Amount</th>
              <th className="border p-1 text-right">Tax Amount</th>
              <th className="border p-1 text-right">Gross Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.tax_details.map((tax, index) => (
              <tr key={index}>
                <td className="border p-1">
                  {tax.taxCategoryCode === '01' ? 'A: Standard (18%)' : 
                   tax.taxCategoryCode === '05' ? 'Excise Duty' : tax.taxCategoryCode}
                </td>
                <td className="border p-1 text-right">{Number(tax.netAmount).toLocaleString()}</td>
                <td className="border p-1 text-right">{Number(tax.taxAmount).toLocaleString()}</td>
                <td className="border p-1 text-right">{Number(tax.grossAmount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Section F: Summary */}
      <section className="mb-4">
        <h2 className="font-bold bg-gray-200 px-2 py-1">Section F: Summary</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr><td className="font-medium w-1/3">Net Amount:</td><td className="text-right">{data.summary.net_amount.toLocaleString()}</td></tr>
            <tr><td className="font-medium">Tax Amount:</td><td className="text-right">{data.summary.tax_amount.toLocaleString()}</td></tr>
            <tr><td className="font-medium">Gross Amount:</td><td className="text-right font-bold">{data.summary.gross_amount.toLocaleString()}</td></tr>
            <tr><td colSpan={2} className="italic text-sm">{data.summary.gross_amount_words}</td></tr>
          </tbody>
        </table>
        <table className="w-full text-sm mt-2">
          <tbody>
            <tr className="font-bold bg-gray-100">
              <td className="p-1">Payment Mode</td>
              <td className="p-1">{data.summary.payment_mode}</td>
              <td className="p-1 text-right">{data.summary.total_amount.toLocaleString()}</td>
            </tr>
            <tr className="font-bold">
              <td className="p-1">Total Amount</td>
              <td className="p-1"></td>
              <td className="p-1 text-right">{data.summary.total_amount.toLocaleString()}</td>
            </tr>
            <tr><td className="p-1">Currency:</td><td colSpan={2}>{data.summary.currency}</td></tr>
            <tr><td className="p-1">Number of Items:</td><td colSpan={2}>{data.summary.number_of_items}</td></tr>
            <tr><td className="p-1">Mode:</td><td colSpan={2}>{data.summary.mode}</td></tr>
          </tbody>
        </table>
      </section>

      {/* QR Code */}
      <div className="text-center my-6">
        {data.fiscal_data.qr_code ? (
          <img 
            src={`data:image/png;base64,${data.fiscal_data.qr_code}`} 
            alt="QR Code"
            className="mx-auto w-32 h-32"
          />
        ) : (
          <QRCodeSVG 
            value={`FDN:${data.fiscal_data.fdn}|VC:${data.fiscal_data.verification_code}`}
            size={128}
            className="mx-auto"
          />
        )}
      </div>

      {/* Footer */}
      <div className="text-center border-t pt-4 text-sm font-bold">
        *** END OF e-INVOICE/TAX INVOICE ***
      </div>
    </div>
  );
};
```

---

## 9. Common Mistakes & Solutions

### ❌ Mistake 1: Sending taxRate as number

```javascript
// WRONG
taxRate: 0.18

// CORRECT
taxRate: "0.18"
```

### ❌ Mistake 2: Wrong taxRate for excise

```javascript
// WRONG - For fixed rate excise
taxRate: "0.05"

// CORRECT - For fixed rate excise
taxRate: "0"
```

### ❌ Mistake 3: Sending discountTotal when discountFlag is "2"

```javascript
// WRONG
{
  discountFlag: "2",
  discountTotal: "0"  // Should be empty!
}

// CORRECT
{
  discountFlag: "2"
  // Don't send discountTotal at all
}
```

### ❌ Mistake 4: Mismatched itemCode and goodsCategoryId

The `itemCode` must be registered (T130) with the same `commodityCategoryId` you send as `goodsCategoryId`.

### ❌ Mistake 5: Wrong unit for excise products

If product has excise duty, `unitOfMeasure` must match the excise duty unit:
- Beverages/Fuel: `"102"` (Litre)
- Cigarettes: `"101"` (Piece)

### ❌ Mistake 6: Sending invoice number in wrong field

```javascript
// WRONG - invoiceNo is for EFRIS to fill
invoiceNo: "INV-001"

// CORRECT - Use invoice_number or referenceNo
invoice_number: "INV-001"
```

---

## 10. Testing Checklist

### Before Going Live

- [ ] API key is configured and working
- [ ] All products are registered via T130
- [ ] Test standard VAT invoice submission
- [ ] Test excise duty invoice submission
- [ ] Verify FDN is returned in response
- [ ] Verify QR code is returned
- [ ] Invoice printing works with all fiscal data
- [ ] Error handling displays meaningful messages

### Test Cases

| Test | Expected Result |
|------|-----------------|
| Submit VAT invoice | Success, FDN returned |
| Submit excise invoice | Success, both tax categories in response |
| Submit with unregistered product | Error 2124 |
| Submit B2B without TIN | Error (TIN required) |
| Submit with wrong taxRate format | Error 2833 |

---

## Support

For API issues, contact your EFRIS integration administrator.

**API Status Page:** https://efrisintegration.nafacademy.com/health

---

*This guide covers the essential integration points. For advanced features like credit notes, stock management, and bulk uploads, contact your integration team.*
