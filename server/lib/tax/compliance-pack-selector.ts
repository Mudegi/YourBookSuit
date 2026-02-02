/**
 * Compliance Pack Selector
 * Automatically selects and initializes the correct compliance pack based on country
 */

import { initializeUgandaURAPack } from './uganda-ura-compliance';

export interface CompliancePackInfo {
  country: string;
  countryName: string;
  compliancePack: string;
  currency: string;
  features: string[];
  taxTypes: string[];
}

/**
 * Supported countries and their compliance packs
 */
export const SUPPORTED_COUNTRIES: Record<string, CompliancePackInfo> = {
  UG: {
    country: 'UG',
    countryName: 'Uganda',
    compliancePack: 'UG_URA',
    currency: 'UGX',
    features: [
      'VAT (18% standard, 0% zero-rated, exempt)',
      'WHT (6-15% on various services)',
      'PAYE (Progressive income tax)',
      'EFRIS e-Invoicing integration',
      'Input Tax Credit validation',
      'One-click monthly tax returns',
    ],
    taxTypes: ['VAT', 'WHT', 'PAYE'],
  },
  KE: {
    country: 'KE',
    countryName: 'Kenya',
    compliancePack: 'KE_KRA',
    currency: 'KES',
    features: [
      'VAT (16% standard)',
      'WHT on various payments',
      'PAYE (Progressive income tax)',
      'iTax integration (planned)',
    ],
    taxTypes: ['VAT', 'WHT', 'PAYE'],
  },
  TZ: {
    country: 'TZ',
    countryName: 'Tanzania',
    compliancePack: 'TZ_TRA',
    currency: 'TZS',
    features: [
      'VAT (18% standard)',
      'WHT on various payments',
      'PAYE (Progressive income tax)',
    ],
    taxTypes: ['VAT', 'WHT', 'PAYE'],
  },
  RW: {
    country: 'RW',
    countryName: 'Rwanda',
    compliancePack: 'RW_RRA',
    currency: 'RWF',
    features: [
      'VAT (18% standard)',
      'WHT on various payments',
      'PAYE (Progressive income tax)',
    ],
    taxTypes: ['VAT', 'WHT', 'PAYE'],
  },
  US: {
    country: 'US',
    countryName: 'United States',
    compliancePack: 'US_GAAP',
    currency: 'USD',
    features: [
      'State-level sales tax',
      'Form 1099 reporting',
      'GAAP accounting standards',
    ],
    taxTypes: ['SALES_TAX', 'INCOME_TAX'],
  },
  DEFAULT: {
    country: 'DEFAULT',
    countryName: 'Other',
    compliancePack: 'DEFAULT',
    currency: 'USD',
    features: [
      'Basic tax handling',
      'Manual tax configuration',
    ],
    taxTypes: ['MANUAL'],
  },
};

/**
 * Get compliance pack info for a country code
 */
export function getCompliancePackInfo(countryCode: string): CompliancePackInfo {
  return SUPPORTED_COUNTRIES[countryCode] || SUPPORTED_COUNTRIES.DEFAULT;
}

/**
 * Get list of all supported countries
 */
export function getSupportedCountries(): CompliancePackInfo[] {
  return Object.values(SUPPORTED_COUNTRIES).filter((c) => c.country !== 'DEFAULT');
}

/**
 * Check if a country has full compliance pack support
 */
export function isCountryFullySupported(countryCode: string): boolean {
  const fullySupported = ['UG']; // Add more as implemented
  return fullySupported.includes(countryCode);
}

/**
 * Initialize compliance pack for a country
 * This is called during organization onboarding after country selection
 */
export async function initializeCompliancePackForCountry(
  organizationId: string,
  countryCode: string
): Promise<{ success: boolean; message: string; features?: string[] }> {
  const packInfo = getCompliancePackInfo(countryCode);

  switch (countryCode) {
    case 'UG':
      // Uganda - Full implementation
      const ugandaResult = await initializeUgandaURAPack(organizationId);
      return {
        success: ugandaResult.success,
        message: ugandaResult.message,
        features: packInfo.features,
      };

    case 'KE':
    case 'TZ':
    case 'RW':
      // Not yet implemented - return placeholder
      return {
        success: false,
        message: `${packInfo.countryName} compliance pack not yet implemented. Using default tax handling.`,
        features: [],
      };

    case 'US':
      // US - Basic setup
      return {
        success: true,
        message: 'US GAAP compliance activated. Configure state sales tax rates in settings.',
        features: packInfo.features,
      };

    default:
      // Default pack
      return {
        success: true,
        message: 'Default compliance pack activated. Configure tax rates manually in settings.',
        features: packInfo.features,
      };
  }
}

/**
 * Check if Uganda-specific features should be shown
 */
export function shouldShowUgandaFeatures(homeCountry: string | null): boolean {
  return homeCountry === 'UG';
}

/**
 * Check if Kenya-specific features should be shown
 */
export function shouldShowKenyaFeatures(homeCountry: string | null): boolean {
  return homeCountry === 'KE';
}

/**
 * Get tax features available for a country
 */
export function getAvailableTaxFeatures(homeCountry: string): {
  hasVAT: boolean;
  hasWHT: boolean;
  hasPAYE: boolean;
  hasEFRIS: boolean;
  hasInputTaxCredit: boolean;
  hasTaxReturns: boolean;
} {
  switch (homeCountry) {
    case 'UG':
      return {
        hasVAT: true,
        hasWHT: true,
        hasPAYE: true,
        hasEFRIS: true,
        hasInputTaxCredit: true,
        hasTaxReturns: true,
      };

    case 'KE':
    case 'TZ':
    case 'RW':
      return {
        hasVAT: false, // Not yet implemented
        hasWHT: false,
        hasPAYE: false,
        hasEFRIS: false,
        hasInputTaxCredit: false,
        hasTaxReturns: false,
      };

    case 'US':
      return {
        hasVAT: false,
        hasWHT: false,
        hasPAYE: false,
        hasEFRIS: false,
        hasInputTaxCredit: false,
        hasTaxReturns: false,
      };

    default:
      return {
        hasVAT: false,
        hasWHT: false,
        hasPAYE: false,
        hasEFRIS: false,
        hasInputTaxCredit: false,
        hasTaxReturns: false,
      };
  }
}
