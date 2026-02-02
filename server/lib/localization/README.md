# Localization Architecture

## Overview

The localization system implements a **"Global by Design but Localized by Configuration"** architecture that prevents hardcoded country logic while enabling easy addition of new countries through configurable drivers.

## Architecture Components

### 1. LocalizationProvider (Strategy Pattern)
- **File**: `src/lib/localization/localization-provider.ts`
- **Purpose**: Central service that manages country-specific localization strategies
- **Pattern**: Singleton with strategy registry for different countries

### 2. Country Drivers
- **Location**: `src/lib/localization/drivers/`
- **Purpose**: Country-specific implementations of localization requirements
- **Current Drivers**:
  - `uganda-driver.ts` - Uganda (URA/EFRIS compliance)
  - `kenya-driver.ts` - Kenya (KRA/iTax compliance)
  - `country-driver-template.ts` - Template for new countries

### 3. Enhanced Database Schema
- **Model**: `LocalizationConfig` in `prisma/schema.prisma`
- **New Fields**:
  - `apiEndpoints` - Tax authority API configurations
  - `taxReturnTemplates` - Tax return form templates
  - `digitalFiscalization` - E-invoicing, QR codes, digital signatures
  - `translationKeys` - Localized tax labels and messages
  - `complianceDrivers` - Country-specific compliance features
  - `fiscalCalendar` - Tax year and filing deadline configurations
  - `regulatoryBodies` - Tax authority contact information

### 4. Updated UI
- **File**: `src/app/(dashboard)/[orgSlug]/tax/localization/page.tsx`
- **Enhancements**:
  - Country selection dropdown
  - Tax return templates configuration
  - Digital fiscalization settings
  - Translation keys management
  - API endpoints configuration

## Key Features

### ✅ Strategy Pattern Implementation
- Clean separation between global logic and country-specific implementations
- Easy addition of new countries without modifying core code
- Type-safe interfaces for all localization components

### ✅ Metadata-Driven Configuration
- API endpoints stored in database for easy updates
- Tax return templates configurable per country
- Digital fiscalization settings (e-invoicing, QR codes, etc.)
- Translation keys for multi-language support

### ✅ Compliance Automation
- Country-specific compliance drivers
- Regulatory body information and requirements
- Fiscal calendar management
- Automated validation of configurations

### ✅ No Hardcoded Logic
- Eliminated hardcoded Uganda-specific logic from `uganda-ura-compliance.ts`
- All country logic moved to strategy pattern drivers
- Database-driven configuration prevents code changes for new countries

## Usage Examples

### Setting Localization Strategy
```typescript
import { localizationProvider } from '@/lib/localization/localization-provider';

// Set Uganda localization
await localizationProvider.setLocalizationStrategy({
  organizationId: 'org-123',
  country: 'UG',
  language: 'en',
});

// Get localization metadata
const metadata = await localizationProvider.getLocalizationMetadata();
console.log(metadata.apiEndpoints); // Uganda URA endpoints
```

### Getting Tax Authority Endpoints
```typescript
const endpoints = await localizationProvider.getTaxAuthorityEndpoints();
console.log(endpoints.baseUrl); // https://efris.ursb.go.ug
console.log(endpoints.authentication.type); // bearer_token
```

### Getting Translation Keys
```typescript
const translations = await localizationProvider.getTranslationKeys('en');
console.log(translations['tax.vat']); // "Value Added Tax (VAT)"
```

### Validating Configuration
```typescript
const validation = await localizationProvider.validateConfiguration(config);
if (!validation.isValid) {
  console.log('Errors:', validation.errors);
}
```

## Adding New Countries

1. **Create Country Driver**:
   ```typescript
   // src/lib/localization/drivers/new-country-driver.ts
   import { BaseLocalizationStrategy } from '../localization-provider';

   export class NewCountryLocalizationStrategy extends BaseLocalizationStrategy {
     countryCode = 'NC'; // Your country code

     async getLocalizationMetadata() {
       return {
         // Implement country-specific metadata
       };
     }

     // Implement other required methods...
   }
   ```

2. **Register Driver**:
   ```typescript
   // src/lib/localization/drivers/index.ts
   import { localizationProvider } from '../localization-provider';
   import { NewCountryLocalizationStrategy } from './new-country-driver';

   localizationProvider.registerStrategy(new NewCountryLocalizationStrategy());
   ```

3. **Update UI Dropdown**:
   ```typescript
   // Add to country select options
   <option value="NC">New Country</option>
   ```

4. **Add Dummy Data** (optional):
   ```typescript
   // src/lib/localization/dummy-data.ts
   export const localizationDummyData = {
     // ... existing data
     newCountry: {
       // Country configuration
     },
   };
   ```

## Migration from Hardcoded Logic

### Before (Hardcoded)
```typescript
// ❌ Hardcoded in uganda-ura-compliance.ts
export const UGANDA_VAT_RATES = { STANDARD: 18.00 };
export const UGANDA_WHT_RATES = { /* hardcoded rates */ };
```

### After (Strategy Pattern)
```typescript
// ✅ Configurable via LocalizationProvider
const metadata = await localizationProvider.getLocalizationMetadata();
// Access country-specific rates from metadata or API
```

## Testing

### Run Localization Tests
```bash
# Type checking
npm run type-check

# Database migration
npx prisma migrate dev --name add_localization_metadata

# Test with dummy data
# Use the dummy data from src/lib/localization/dummy-data.ts
```

### Manual Testing Steps
1. Navigate to `/[orgSlug]/tax/localization`
2. Select a country (UG or KE)
3. Configure tax return templates
4. Set digital fiscalization options
5. Add translation keys
6. Save configuration
7. Verify API endpoints are accessible

## Benefits

- **🔧 Maintainable**: Strategy pattern prevents code duplication
- **🌍 Scalable**: Easy addition of new countries
- **🔒 Compliant**: Country-specific regulatory requirements
- **🎯 Configurable**: Database-driven configuration
- **🚀 Future-Proof**: No hardcoded logic to refactor

## Future Enhancements

- [ ] Add more country drivers (TZ, UK, US, etc.)
- [ ] Implement multi-language translation system
- [ ] Add compliance validation APIs
- [ ] Create localization import/export functionality
- [ ] Add automated tax authority API testing