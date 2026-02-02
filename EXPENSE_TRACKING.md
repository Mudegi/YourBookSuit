# Expense Tracking Module

## Overview

The Expense Tracking module is designed for **Operational Expenditure (OPEX)** management, distinct from the Purchase/Inventory module. It handles real-world operational expenses such as rent, utilities, fuel, travel, meals, office supplies, and professional services.

## Key Features

### 1. **Country-Agnostic Localization**
- No hardcoded country logic
- Supports Mobile Money providers globally (M-Pesa, MTN, Airtel, etc.)
- Withholding Tax (WHT) thresholds based on organization's localization config
- Currency defaults from organization settings

### 2. **Payment Methods**
- **Cash**: Direct cash payments
- **Mobile Money**: Full support with transaction ID tracking
- **Bank Transfer**: Standard wire transfers
- **Petty Cash**: Small operational expenses
- **Directors Loan**: Personal funds lent to the company

### 3. **Automatic GL Integration**
- Auto-generates balanced Journal Entries
- Supports multi-line expense categorization
- Automatic tax calculations (VAT/GST recovery)
- Withholding Tax (WHT) deduction when applicable
- Real-time bank balance updates

### 4. **Receipt Management**
- Drag-and-drop receipt upload
- Camera integration for mobile devices
- Audit-ready attachment tracking
- Supports images (PNG, JPG) and PDF

### 5. **Reimbursement Tracking**
- "I paid this personally" checkbox
- Creates Employee/Director Payable entries
- Tracks pending reimbursements
- Automatic claimant user linking

### 6. **Project & Cost Center Allocation**
- Tag expenses to specific projects
- Allocate to cost centers/departments
- Multi-dimensional reporting
- Budget tracking integration

### 7. **Smart Categorization**
- Auto-suggests categories based on vendor history
- Learns from past expense patterns
- Frequency-based recommendations

## How It Works

### Recording an Expense

```
User Flow:
1. Navigate to /[orgSlug]/expenses/new
2. Fill payment details (date, account, method)
3. Select/enter payee (vendor or one-time)
4. Add expense lines with categories
5. Upload receipt
6. Submit

Backend Process:
1. Validate payment method requirements (e.g., Mobile Money TX ID)
2. Calculate tax (inclusive/exclusive)
3. Check WHT applicability based on country threshold
4. Generate Journal Entry:
   - DR: Expense Account(s)
   - DR: Input VAT (if applicable)
   - CR: Bank/Cash/Mobile Money OR Employee Payable
   - CR: WHT Payable (if applicable)
5. Post transaction
6. Update bank balance
7. Return expense number
```

### Example Journal Entry

**Scenario**: Company pays 118,000 UGX for fuel (includes 18% VAT). Paid via Mobile Money.

```
DR: Fuel & Lubricants (6XXX)      100,000 UGX
DR: Input VAT Recoverable (1600)   18,000 UGX
CR: MTN Mobile Money (1XXX)       118,000 UGX
```

**Scenario**: Employee pays 500,000 UGX for professional services (WHT threshold: 1,000,000 UGX). No WHT applied.

```
DR: Professional Fees (6700)      500,000 UGX
CR: Employee Payable (2300)       500,000 UGX
```

**Scenario**: Company pays 2,000,000 UGX for professional services (WHT rate: 6%).

```
DR: Professional Fees (6700)    2,000,000 UGX
CR: Bank Account (1XXX)         1,880,000 UGX (94%)
CR: WHT Payable (2400)            120,000 UGX (6%)
```

## API Endpoints

### Create Expense
```
POST /api/orgs/[orgSlug]/expenses

Body:
{
  "expenseDate": "2026-02-02",
  "payeeVendorId": "vendor_123",  // OR payeeName: "Shell Station"
  "paymentAccountId": "account_456",
  "paymentMethod": "MOBILE_MONEY",
  "mobileMoneyTransactionId": "MM12345678",
  "mobileMoneyProvider": "MTN",
  "isReimbursement": false,
  "lines": [
    {
      "categoryId": "account_fuel",
      "description": "Diesel for company vehicle",
      "amount": 118000,
      "taxInclusive": true,
      "taxRateId": "vat_18",
      "projectId": "project_abc",  // Optional
      "costCenterId": "dept_ops"    // Optional
    }
  ],
  "receiptAttachmentId": "attachment_789",
  "notes": "Monthly fuel expense"
}

Response:
{
  "success": true,
  "expenseId": "EXP-2026-0001",
  "transactionId": "tx_123",
  "journalEntryNumber": "EXP-2026-0001",
  "message": "Expense EXP-2026-0001 recorded successfully",
  "warnings": ["Withholding Tax Applied: 120000.00 UGX"]
}
```

### List Expenses
```
GET /api/orgs/[orgSlug]/expenses?startDate=2026-01-01&endDate=2026-01-31&paymentMethod=MOBILE_MONEY

Response:
{
  "success": true,
  "expenses": [...]
}
```

### Get Suggestions
```
GET /api/orgs/[orgSlug]/expenses/suggestions?vendorName=Shell

Response:
{
  "success": true,
  "suggestions": [
    {
      "categoryId": "account_fuel",
      "categoryName": "Fuel & Lubricants",
      "frequency": 15
    }
  ]
}
```

### Expense Summary
```
GET /api/orgs/[orgSlug]/expenses/summary?startDate=2026-01-01&endDate=2026-01-31&groupBy=CATEGORY

Response:
{
  "success": true,
  "summary": [
    {
      "key": "account_fuel",
      "name": "Fuel & Lubricants",
      "total": 2500000
    }
  ],
  "groupBy": "CATEGORY"
}
```

## Mobile Money Integration

The system is **provider-agnostic** and supports any Mobile Money service based on the organization's country:

- **East Africa**: M-Pesa (Kenya), MTN Mobile Money (Uganda), Airtel Money, Tigo Pesa
- **West Africa**: MTN Mobile Money (Ghana, Nigeria), Airtel Money
- **Other**: Any mobile money provider worldwide

**Requirements**:
- Transaction ID is mandatory for audit trail
- Provider name is optional but recommended
- System validates transaction ID format based on provider patterns (future enhancement)

## Tax Handling

### VAT/GST Recovery
- Supports both **inclusive** and **exclusive** tax calculations
- Input VAT is automatically tracked for tax authority claims
- Tax rate linked to organization's tax configuration

### Withholding Tax (WHT)
- **Threshold-based**: Only applies above country-specific thresholds
- **Rate-based**: Uses organization's WHT rules (e.g., 6% for professional services)
- **Automatic deduction**: Reduces net payment to vendor
- **Liability tracking**: Credits WHT Payable account for remittance

Configuration lives in:
```
LocalizationConfig.whtThreshold = {
  professionalServices: 1000000,  // e.g., 1M UGX in Uganda
  rentExpense: 2000000,
  ...
}
```

## Reporting & Analytics

### Expense by Category
- See which expense categories consume the most budget
- Track trends over time
- Identify cost-saving opportunities

### Expense by Project
- Allocate costs to specific projects/contracts
- Track project profitability
- Client billing reconciliation

### Expense by Payment Method
- Monitor Mobile Money vs Cash usage
- Optimize payment channels
- Reduce transaction fees

### Reimbursement Tracking
- Outstanding employee reimbursements
- Claimant-wise breakdown
- Aging analysis

## Budget Compliance (Future Enhancement)

```typescript
// Check budget before recording expense
const budgetCheck = await ExpenseService.checkBudgetCompliance(
  organizationId,
  categoryId,
  amount,
  expenseDate
);

if (!budgetCheck.withinBudget) {
  alert(`Budget exceeded! Remaining: ${budgetCheck.budgetRemaining}`);
}
```

## Best Practices

1. **Always attach receipts** for audit compliance
2. **Use proper categorization** for accurate financial reporting
3. **Tag projects** for better cost allocation
4. **Mobile Money**: Always capture transaction IDs
5. **Reimbursements**: Process promptly to maintain employee morale
6. **Review WHT**: Ensure proper tax withholding for vendor payments

## Technical Architecture

```
Client (UI)
  ├── app/(dashboard)/[orgSlug]/expenses/
  │   ├── page.tsx              # Expense list
  │   └── new/page.tsx           # Create expense
  │
  ├── app/api/orgs/[orgSlug]/expenses/
  │   ├── route.ts               # Create & list
  │   ├── suggestions/route.ts   # AI suggestions
  │   └── summary/route.ts       # Reporting
  │
  └── services/expenses/
      └── expense.service.ts     # Business logic

Server
  └── services/expenses/
      └── expense.service.ts     # Same business logic
```

## Integration Points

- **General Ledger**: Auto-posts journal entries
- **Chart of Accounts**: Uses EXPENSE type accounts
- **Bank Accounts**: Real-time balance updates
- **Tax Engine**: VAT/WHT calculations
- **Projects**: Cost allocation
- **Cost Centers**: Department tracking
- **Vendors**: Payee management
- **Attachments**: Receipt storage

## Future Enhancements

1. **OCR Receipt Scanning**: Extract amount, date, vendor from receipt images
2. **Mileage Tracking**: GPS-based travel expense calculation
3. **Per Diem**: Automatic daily allowance calculations
4. **Approval Workflows**: Multi-level expense approvals
5. **Credit Card Integration**: Import credit card statements
6. **Recurring Expenses**: Auto-generate monthly rent, subscriptions
7. **Budget Alerts**: Real-time over-budget notifications
8. **Mobile App**: Native iOS/Android expense capture
9. **Expense Policies**: Enforce company spending rules
10. **Multi-Currency**: Handle foreign currency expenses with exchange rates

---

Built with ❤️ for global ERP needs. No hardcoded countries. No assumptions.
