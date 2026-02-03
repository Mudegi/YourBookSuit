# VAT Return Configuration for Any Country

## Overview
Your ERP system is **already 90% ready** for multi-country VAT configuration! Here's how to enable VAT returns for any country:

---

## Current Architecture ✅

### 1. **Country-Specific Templates Already Built**
Location: `client/services/tax/localization-manager.ts`

**Supported Countries:**
- 🇺🇬 **Uganda (UG)** - URA - 10 boxes, 18% standard rate, EFRIS required
- 🇰🇪 **Kenya (KE)** - KRA - 15 boxes, 16% standard rate, eTIMS system
- 🇹🇿 **Tanzania (TZ)** - TRA - 8 boxes, 18% standard rate, VFD system

### 2. **Database Fields Ready**
- `Organization.homeCountry` - Country code (UG, KE, TZ, NG, ZA, etc.)
- `Organization.compliancePack` - Tax compliance configuration
- `EInvoiceConfig.country` - E-invoicing country
- `EInvoiceConfig.provider` - E-invoicing provider (EFRIS, eTIMS, VFD, etc.)

### 3. **Smart EFRIS/E-Invoicing Logic**
- EFRIS buttons only show for Uganda organizations ✅
- Each country can have its own e-invoicing system
- VAT return filters adapt based on country requirements

---

## How to Add a New Country

### Option 1: Code-Based (For Developers) 🔧

**Step 1: Add Template to LocalizationManager**
```typescript
// In client/services/tax/localization-manager.ts

private static getNigeriaVATReturnTemplate(): TaxReturnTemplate {
  return {
    countryCode: 'NG',
    countryName: 'Nigeria',
    taxAuthority: 'Federal Inland Revenue Service (FIRS)',
    formName: 'VAT Return Form',
    formVersion: '2024',
    
    boxes: [
      {
        boxNumber: '1',
        label: 'Output VAT (7.5%)',
        description: 'Total VAT on taxable supplies',
        type: 'TAX',
        category: 'OUTPUT_VAT',
        sourceMapping: {
          taxRates: [7.5],
          transactionTypes: ['SALES_INVOICE'],
        },
        format: 'CURRENCY',
        editable: false,
        required: true,
      },
      {
        boxNumber: '2',
        label: 'Input VAT',
        description: 'VAT on business purchases',
        type: 'TAX',
        category: 'INPUT_VAT',
        sourceMapping: {
          transactionTypes: ['PURCHASE_INVOICE'],
        },
        format: 'CURRENCY',
        editable: false,
        required: true,
      },
      {
        boxNumber: '3',
        label: 'Net VAT Payable',
        description: 'Output VAT minus Input VAT',
        type: 'CALCULATED',
        category: 'NET',
        sourceMapping: {},
        format: 'CURRENCY',
        editable: false,
        required: true,
      },
    ],
    
    validation: {
      allowNegativeVAT: true,
      requireEFRIS: false, // Nigeria doesn't use EFRIS
      minimumComplianceRate: 100, // Adjust as needed
      requiredDocuments: ['VAT Input Schedule', 'VAT Output Schedule'],
    },
    
    filing: {
      frequency: 'MONTHLY',
      dueDate: '21st of following month',
      latePenalty: '10% of unpaid tax',
      exportFormat: 'XML', // FIRS uses XML
    },
  };
}
```

**Step 2: Register in Template Map**
```typescript
static getTaxReturnTemplate(countryCode: string): TaxReturnTemplate {
  const templates: Record<string, TaxReturnTemplate> = {
    UG: this.getUgandaVATReturnTemplate(),
    KE: this.getKenyaVATReturnTemplate(),
    TZ: this.getTanzaniaVATReturnTemplate(),
    NG: this.getNigeriaVATReturnTemplate(), // Add here
    ZA: this.getSouthAfricaVATReturnTemplate(), // Add here
    // ... more countries
  };

  return templates[countryCode] || templates['UG']; // Default fallback
}
```

**Step 3: Configure E-Invoicing (Optional)**

If the country has e-invoicing requirements:

```typescript
// In EInvoiceConfig table
{
  country: 'NG',
  provider: 'FIRS_EINVOICE', // Custom provider
  apiEndpoint: 'https://firs-api.gov.ng',
  // ... other config
}
```

---

### Option 2: Database-Driven (Recommended for Flexibility) 🗄️

**Add New Schema Model for Dynamic Configuration:**

```prisma
model TaxReturnConfig {
  id                String       @id @default(cuid())
  organizationId    String?      // Null = global template
  countryCode       String       // UG, KE, TZ, NG, ZA, etc.
  countryName       String
  taxAuthority      String
  formName          String
  formVersion       String
  
  // JSON configuration
  boxes             Json         // Array of box definitions
  validation        Json         // Validation rules
  filing            Json         // Filing requirements
  
  isActive          Boolean      @default(true)
  isCustom          Boolean      @default(false) // User-customized
  
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  organization      Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@unique([countryCode, organizationId])
  @@index([countryCode, isActive])
}

model EInvoiceProvider {
  id                String       @id @default(cuid())
  countryCode       String
  providerName      String       // EFRIS, eTIMS, VFD, FIRS, SARS
  displayName       String
  description       String?
  
  // API Configuration Template
  apiEndpoint       String
  authMethod        String       // API_KEY, OAUTH2, CERTIFICATE
  requiredFields    Json         // Array of required config fields
  
  isActive          Boolean      @default(true)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  
  @@unique([countryCode, providerName])
}
```

**Benefits:**
- ✅ No code changes needed to add countries
- ✅ Organizations can customize their own templates
- ✅ Admin UI can manage configurations
- ✅ Easy to update when tax laws change

---

## Configuration UI (Future Enhancement)

### Admin Interface Example:

```
┌─────────────────────────────────────────────────────┐
│ Tax Return Configuration                            │
├─────────────────────────────────────────────────────┤
│ Country: Nigeria 🇳🇬                                │
│ Tax Authority: FIRS                                 │
│ Form Name: VAT Return                               │
│ Standard Rate: 7.5%                                 │
│                                                     │
│ ┌─ VAT Return Boxes ──────────────────┐            │
│ │ Box 1: Output VAT (7.5%)            │            │
│ │ Box 2: Input VAT                    │            │
│ │ Box 3: Net VAT Payable              │            │
│ │ [+ Add Box]                         │            │
│ └─────────────────────────────────────┘            │
│                                                     │
│ Filing Frequency: [Monthly ▼]                      │
│ Due Date: 21st of following month                  │
│ Export Format: [XML ▼]                             │
│                                                     │
│ E-Invoicing:                                       │
│ □ Require e-invoice integration                    │
│ Provider: [FIRS E-Invoice ▼]                       │
│                                                     │
│ [Save Configuration]                                │
└─────────────────────────────────────────────────────┘
```

---

## Quick Setup for Specific Countries

### 🇳🇬 Nigeria (FIRS)
- **Standard Rate:** 7.5%
- **Filing:** Monthly (21st)
- **E-Invoicing:** Optional (FIRS portal)
- **Special:** Withholding VAT on services

### 🇿🇦 South Africa (SARS)
- **Standard Rate:** 15%
- **Filing:** Bi-monthly (25th)
- **E-Invoicing:** Not required
- **Special:** Zero-rated exports

### 🇬🇭 Ghana (GRA)
- **Standard Rates:** 12.5% (NHIL), 2.5% (GETFund), 2.5% (COVID-19)
- **Filing:** Monthly (15th)
- **E-Invoicing:** Not required
- **Special:** Multiple VAT types

### 🇪🇬 Egypt (ETA)
- **Standard Rate:** 14%
- **Filing:** Monthly (last day)
- **E-Invoicing:** **REQUIRED** (Egypt E-Invoice System)
- **Special:** Digital signature required

---

## Migration Path

### Phase 1: Immediate (Current State)
- ✅ Uganda, Kenya, Tanzania working
- ✅ Country-based feature toggling
- ✅ Manual template management

### Phase 2: Database Configuration (2-4 weeks)
1. Add `TaxReturnConfig` and `EInvoiceProvider` models
2. Migrate existing templates to database
3. Build seeder for default countries
4. Update LocalizationManager to read from DB

### Phase 3: Admin UI (4-6 weeks)
1. Tax configuration management page
2. Box builder interface
3. E-invoicing provider settings
4. Preview and validation tools

### Phase 4: Marketplace (Future)
1. Country compliance packs
2. Community-contributed templates
3. One-click country setup
4. Automatic tax law updates

---

## Example: Enabling Egypt 🇪🇬

### Quick Code Addition (30 minutes):

```typescript
// 1. Add template
private static getEgyptVATReturnTemplate(): TaxReturnTemplate {
  return {
    countryCode: 'EG',
    countryName: 'Egypt',
    taxAuthority: 'Egyptian Tax Authority (ETA)',
    formName: 'VAT Declaration Form',
    formVersion: '2024',
    boxes: [
      {
        boxNumber: '1',
        label: 'Taxable Sales (14%)',
        description: 'Total sales subject to 14% VAT',
        type: 'REVENUE',
        category: 'OUTPUT_VAT',
        sourceMapping: { taxRates: [14] },
        format: 'CURRENCY',
        editable: false,
        required: true,
      },
      {
        boxNumber: '2',
        label: 'Output VAT',
        description: 'VAT collected on sales',
        type: 'TAX',
        category: 'OUTPUT_VAT',
        sourceMapping: { taxRates: [14] },
        format: 'CURRENCY',
        editable: false,
        required: true,
      },
      {
        boxNumber: '3',
        label: 'Taxable Purchases',
        description: 'Purchases subject to VAT',
        type: 'REVENUE',
        category: 'INPUT_VAT',
        sourceMapping: {},
        format: 'CURRENCY',
        editable: false,
        required: true,
      },
      {
        boxNumber: '4',
        label: 'Input VAT',
        description: 'VAT paid on purchases',
        type: 'TAX',
        category: 'INPUT_VAT',
        sourceMapping: {},
        format: 'CURRENCY',
        editable: false,
        required: true,
      },
      {
        boxNumber: '5',
        label: 'Net VAT Due',
        description: 'Output VAT minus Input VAT',
        type: 'CALCULATED',
        category: 'NET',
        sourceMapping: {},
        format: 'CURRENCY',
        editable: false,
        required: true,
      },
    ],
    validation: {
      allowNegativeVAT: true,
      requireEFRIS: false,
      minimumComplianceRate: 100,
      requiredDocuments: ['E-Invoice Records', 'Purchase Ledger'],
    },
    filing: {
      frequency: 'MONTHLY',
      dueDate: 'Last day of following month',
      latePenalty: 'EGP 3,000 + interest',
      exportFormat: 'XML',
    },
  };
}

// 2. Register it
static getTaxReturnTemplate(countryCode: string): TaxReturnTemplate {
  const templates = {
    UG: this.getUgandaVATReturnTemplate(),
    KE: this.getKenyaVATReturnTemplate(),
    TZ: this.getTanzaniaVATReturnTemplate(),
    EG: this.getEgyptVATReturnTemplate(), // ✅ Done!
  };
  return templates[countryCode] || templates['UG'];
}

// 3. Add Egypt e-invoicing (if needed)
const egyptConfig = {
  country: 'EG',
  provider: 'ETA_EINVOICE',
  apiEndpoint: 'https://api.invoicing.eta.gov.eg',
  // ... rest of config
};
```

**That's it!** Egyptian users can now:
- Generate VAT returns with Egypt-specific boxes
- See Egypt-specific validation
- Export in XML format for ETA
- (Optional) Integrate with Egypt E-Invoice System

---

## Testing Multi-Country Setup

### Test Scenarios:

1. **Uganda User:**
   - See EFRIS buttons ✅
   - 10-box VAT return ✅
   - EFRIS fiscalization required ✅

2. **Nigeria User:**
   - No EFRIS buttons ✅
   - 3-box VAT return (if configured) ✅
   - No e-invoicing requirement ✅

3. **Egypt User:**
   - No EFRIS buttons ✅
   - 5-box VAT return (if configured) ✅
   - Optional ETA integration ✅

---

## Recommended Next Steps

1. **Immediate (No Code):**
   - Document your target countries
   - Gather their VAT return forms
   - Identify e-invoicing requirements

2. **Short Term (1-2 weeks):**
   - Add 2-3 priority country templates in LocalizationManager
   - Test with sample data per country
   - Deploy to production

3. **Medium Term (1-2 months):**
   - Implement database-driven configuration
   - Build admin UI for managing templates
   - Add more countries as needed

4. **Long Term (3-6 months):**
   - Compliance pack marketplace
   - Automated tax law updates
   - Professional tax services integration

---

## Support Matrix

| Country | VAT Return | E-Invoicing | Status |
|---------|-----------|-------------|--------|
| 🇺🇬 Uganda | ✅ 10 boxes | ✅ EFRIS | Production |
| 🇰🇪 Kenya | ✅ 15 boxes | 🟡 eTIMS (template ready) | Production |
| 🇹🇿 Tanzania | ✅ 8 boxes | 🟡 VFD (template ready) | Production |
| 🇳🇬 Nigeria | 🟡 Easy to add | ❌ Not required | Ready in 1 day |
| 🇿🇦 South Africa | 🟡 Easy to add | ❌ Not required | Ready in 1 day |
| 🇪🇬 Egypt | 🟡 Easy to add | 🟡 ETA (needs integration) | Ready in 2-3 days |
| 🇬🇭 Ghana | 🟡 Easy to add | ❌ Not required | Ready in 1 day |

---

## Conclusion

**Your system is ALREADY multi-country ready!** 

You just need to:
1. Add country templates (30 min per country)
2. Test with sample data
3. Deploy

For **true self-service configuration**, invest in the database-driven approach (Phase 2-3), which will allow customers to configure their own tax returns without code changes.

**Bottom line:** Nigerian, Egyptian, South African customers can absolutely use VAT returns - you just need to add their country templates!
