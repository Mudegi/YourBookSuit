/**
 * Tax Localization Manager
 * 
 * Provides country-specific tax templates and configurations.
 * This is the "country-blind" seeding strategy that allows
 * the system to support any country without hardcoding.
 */

export interface TaxAgencyTemplate {
  code: string;
  name: string;
  registrationNumber?: string;
  taxType: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  filingFrequency?: string;
  rates: TaxRateTemplate[];
}

export interface TaxRateTemplate {
  name: string;
  displayName?: string;
  rate: number;
  isInclusiveDefault: boolean;
  externalTaxCode?: string;
  reportingCategory?: string;
  exemptionReasonCode?: string;
  effectiveFrom: Date;
}

export interface TaxGroupTemplate {
  name: string;
  code: string;
  description: string;
  rates: Array<{
    rateName: string; // References TaxRateTemplate by name
    sequence: number;
    isCompound: boolean;
  }>;
}

export interface TaxExemptionTemplate {
  code: string;
  name: string;
  description?: string;
  category: string;
  externalCode?: string;
  requiresDocumentation: boolean;
}

export interface ExternalTaxCategory {
  code: string;
  name: string;
  description: string;
  applicableTo?: string[]; // ['GOODS', 'SERVICES', 'BOTH']
}

export interface CountryTaxTemplate {
  country: string;
  countryCode: string;
  countryName: string;
  defaultCurrency: string;
  agencies: TaxAgencyTemplate[];
  groups?: TaxGroupTemplate[];
  exemptions?: TaxExemptionTemplate[];
}

export class LocalizationManager {
  /**
   * Get tax templates for a specific country
   */
  static getTaxTemplates(countryCode: string): CountryTaxTemplate | null {
    const templates: Record<string, CountryTaxTemplate> = {
      // UGANDA
      UG: {
        country: 'Uganda',
        countryCode: 'UG',
        countryName: 'Uganda',
        defaultCurrency: 'UGX',
        agencies: [
          {
            code: 'URA',
            name: 'Uganda Revenue Authority',
            taxType: 'VAT',
            address: 'Plot M843 Nakawa, Kampala',
            phone: '+256-0800-117-000',
            email: 'taxpayer@ura.go.ug',
            website: 'https://www.ura.go.ug',
            filingFrequency: 'MONTHLY',
            rates: [
              {
                name: 'VAT Standard',
                displayName: 'VAT 18%',
                rate: 18,
                isInclusiveDefault: false,
                externalTaxCode: 'VAT_STANDARD_18',
                reportingCategory: 'STANDARD_RATED',
                effectiveFrom: new Date('2023-01-01'),
              },
              {
                name: 'VAT Zero-Rated',
                displayName: 'VAT 0%',
                rate: 0,
                isInclusiveDefault: false,
                externalTaxCode: 'VAT_ZERO_RATED',
                reportingCategory: 'ZERO_RATED',
                exemptionReasonCode: 'EXPORT',
                effectiveFrom: new Date('2023-01-01'),
              },
              {
                name: 'VAT Exempt',
                displayName: 'VAT Exempt',
                rate: 0,
                isInclusiveDefault: false,
                externalTaxCode: 'VAT_EXEMPT',
                reportingCategory: 'EXEMPT',
                exemptionReasonCode: 'EXEMPT_SUPPLY',
                effectiveFrom: new Date('2023-01-01'),
              },
            ],
          },
        ],
        groups: [
          {
            name: 'Standard VAT',
            code: 'STD_VAT',
            description: 'Standard VAT 18%',
            rates: [
              {
                rateName: 'VAT Standard',
                sequence: 1,
                isCompound: false,
              },
            ],
          },
        ],
        exemptions: [
          {
            code: 'EXPORT',
            name: 'Export - Zero-Rated',
            description: 'Exports outside Uganda',
            category: 'ZERO_RATED',
            externalCode: 'EXPORT',
            requiresDocumentation: true,
          },
          {
            code: 'EXEMPT_SUPPLY',
            name: 'Exempt Supply',
            description: 'VAT-exempt supplies (education, health, etc.)',
            category: 'EXEMPT',
            externalCode: 'EXEMPT',
            requiresDocumentation: false,
          },
          {
            code: 'DIPLOMATIC',
            name: 'Diplomatic Exemption',
            description: 'Diplomatic missions and international organizations',
            category: 'EXEMPT',
            externalCode: 'DIPLOMATIC',
            requiresDocumentation: true,
          },
        ],
      },

      // KENYA
      KE: {
        country: 'Kenya',
        countryCode: 'KE',
        countryName: 'Kenya',
        defaultCurrency: 'KES',
        agencies: [
          {
            code: 'KRA',
            name: 'Kenya Revenue Authority',
            taxType: 'VAT',
            website: 'https://www.kra.go.ke',
            filingFrequency: 'MONTHLY',
            rates: [
              {
                name: 'VAT Standard',
                displayName: 'VAT 16%',
                rate: 16,
                isInclusiveDefault: false,
                externalTaxCode: 'VAT_STANDARD_16',
                effectiveFrom: new Date('2023-01-01'),
              },
              {
                name: 'VAT Zero-Rated',
                displayName: 'VAT 0%',
                rate: 0,
                isInclusiveDefault: false,
                externalTaxCode: 'VAT_ZERO_RATED',
                effectiveFrom: new Date('2023-01-01'),
              },
            ],
          },
        ],
        exemptions: [
          {
            code: 'EXPORT',
            name: 'Export - Zero-Rated',
            category: 'ZERO_RATED',
            requiresDocumentation: true,
          },
        ],
      },

      // UNITED STATES
      US: {
        country: 'United States',
        countryCode: 'US',
        countryName: 'United States',
        defaultCurrency: 'USD',
        agencies: [
          {
            code: 'IRS',
            name: 'Internal Revenue Service',
            taxType: 'SALES_TAX',
            website: 'https://www.irs.gov',
            filingFrequency: 'QUARTERLY',
            rates: [
              {
                name: 'Sales Tax',
                displayName: 'Sales Tax',
                rate: 0, // Varies by state
                isInclusiveDefault: false,
                effectiveFrom: new Date('2023-01-01'),
              },
            ],
          },
        ],
        exemptions: [
          {
            code: 'RESALE',
            name: 'Resale Certificate',
            category: 'EXEMPT',
            requiresDocumentation: true,
          },
        ],
      },

      // UNITED KINGDOM
      GB: {
        country: 'United Kingdom',
        countryCode: 'GB',
        countryName: 'United Kingdom',
        defaultCurrency: 'GBP',
        agencies: [
          {
            code: 'HMRC',
            name: 'HM Revenue & Customs',
            taxType: 'VAT',
            website: 'https://www.gov.uk/government/organisations/hm-revenue-customs',
            filingFrequency: 'QUARTERLY',
            rates: [
              {
                name: 'VAT Standard',
                displayName: 'VAT 20%',
                rate: 20,
                isInclusiveDefault: false,
                externalTaxCode: 'VAT_STANDARD_20',
                effectiveFrom: new Date('2023-01-01'),
              },
              {
                name: 'VAT Reduced',
                displayName: 'VAT 5%',
                rate: 5,
                isInclusiveDefault: false,
                externalTaxCode: 'VAT_REDUCED_5',
                effectiveFrom: new Date('2023-01-01'),
              },
              {
                name: 'VAT Zero-Rated',
                displayName: 'VAT 0%',
                rate: 0,
                isInclusiveDefault: false,
                externalTaxCode: 'VAT_ZERO_RATED',
                effectiveFrom: new Date('2023-01-01'),
              },
            ],
          },
        ],
        exemptions: [
          {
            code: 'EXPORT',
            name: 'Export Outside UK',
            category: 'ZERO_RATED',
            requiresDocumentation: true,
          },
        ],
      },

      // AUSTRALIA
      AU: {
        country: 'Australia',
        countryCode: 'AU',
        countryName: 'Australia',
        defaultCurrency: 'AUD',
        agencies: [
          {
            code: 'ATO',
            name: 'Australian Taxation Office',
            taxType: 'GST',
            website: 'https://www.ato.gov.au',
            filingFrequency: 'QUARTERLY',
            rates: [
              {
                name: 'GST',
                displayName: 'GST 10%',
                rate: 10,
                isInclusiveDefault: true, // Australia typically uses inclusive pricing
                externalTaxCode: 'GST_STANDARD_10',
                effectiveFrom: new Date('2023-01-01'),
              },
              {
                name: 'GST-Free',
                displayName: 'GST-Free',
                rate: 0,
                isInclusiveDefault: false,
                externalTaxCode: 'GST_FREE',
                effectiveFrom: new Date('2023-01-01'),
              },
            ],
          },
        ],
        exemptions: [
          {
            code: 'GST_FREE',
            name: 'GST-Free Supply',
            category: 'ZERO_RATED',
            requiresDocumentation: false,
          },
        ],
      },
    };

    return templates[countryCode] || null;
  }

  /**
   * Get list of supported countries
   */
  static getSupportedCountries(): Array<{ code: string; name: string; currency: string }> {
    return [
      { code: 'UG', name: 'Uganda', currency: 'UGX' },
      { code: 'KE', name: 'Kenya', currency: 'KES' },
      { code: 'US', name: 'United States', currency: 'USD' },
      { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
      { code: 'AU', name: 'Australia', currency: 'AUD' },
    ];
  }

  /**
   * Check if a country is supported
   */
  static isCountrySupported(countryCode: string): boolean {
    return this.getTaxTemplates(countryCode) !== null;
  }

  /**
   * Get default tax rate for a country
   */
  static getDefaultTaxRate(countryCode: string): number {
    const template = this.getTaxTemplates(countryCode);
    if (!template || template.agencies.length === 0) {
      return 0;
    }

    const standardRate = template.agencies[0].rates.find(
      (r) => r.name.includes('Standard') && r.rate > 0
    );

    return standardRate?.rate || 0;
  }

  /**
   * Get EFRIS/e-invoicing information for a country
   */
  static getEInvoicingInfo(countryCode: string): {
    supported: boolean;
    system?: string;
    apiEndpoint?: string;
  } {
    const eInvoicingSystems: Record<string, { system: string; apiEndpoint: string }> = {
      UG: {
        system: 'EFRIS',
        apiEndpoint: 'https://efris.ura.go.ug/api',
      },
      KE: {
        system: 'eTIMS',
        apiEndpoint: 'https://etims.kra.go.ke/api',
      },
    };

    const info = eInvoicingSystems[countryCode];
    return {
      supported: !!info,
      ...info,
    };
  }

  /**
   * Get external tax categories for statutory mapping
   * Returns EFRIS, eTIMS, MTD category codes based on country
   */
  getExternalTaxCategories(countryCode: string): ExternalTaxCategory[] {
    const categories: Record<string, ExternalTaxCategory[]> = {
      // UGANDA - EFRIS Tax Categories
      UG: [
        { code: '01', name: 'Standard Rated', description: 'Standard VAT at 18%', applicableTo: ['GOODS', 'SERVICES'] },
        { code: '02', name: 'Zero Rated', description: 'Zero-rated supplies (0%)', applicableTo: ['GOODS', 'SERVICES'] },
        { code: '03', name: 'Exempt', description: 'VAT-exempt supplies', applicableTo: ['GOODS', 'SERVICES'] },
        { code: '04', name: 'Deemed', description: 'Deemed supplies', applicableTo: ['GOODS', 'SERVICES'] },
      ],

      // KENYA - eTIMS Tax Categories
      KE: [
        { code: 'A', name: 'Standard Rate', description: 'Standard VAT at 16%', applicableTo: ['GOODS', 'SERVICES'] },
        { code: 'B', name: 'Zero Rated', description: 'Zero-rated supplies (0%)', applicableTo: ['GOODS', 'SERVICES'] },
        { code: 'C', name: 'Exempt', description: 'VAT-exempt supplies', applicableTo: ['GOODS', 'SERVICES'] },
        { code: 'E', name: 'Special Relief', description: 'Special relief items', applicableTo: ['GOODS'] },
      ],

      // UNITED KINGDOM - Making Tax Digital (MTD)
      GB: [
        { code: 'STANDARD', name: 'Standard Rate', description: 'Standard VAT at 20%', applicableTo: ['GOODS', 'SERVICES'] },
        { code: 'REDUCED', name: 'Reduced Rate', description: 'Reduced VAT at 5%', applicableTo: ['GOODS', 'SERVICES'] },
        { code: 'ZERO', name: 'Zero Rated', description: 'Zero-rated supplies (0%)', applicableTo: ['GOODS', 'SERVICES'] },
        { code: 'EXEMPT', name: 'Exempt', description: 'VAT-exempt supplies', applicableTo: ['GOODS', 'SERVICES'] },
        { code: 'REVERSE_CHARGE', name: 'Reverse Charge', description: 'Reverse charge mechanism', applicableTo: ['SERVICES'] },
      ],

      // AUSTRALIA - GST Categories
      AU: [
        { code: 'GST', name: 'GST (10%)', description: 'Goods and Services Tax at 10%', applicableTo: ['GOODS', 'SERVICES'] },
        { code: 'GST_FREE', name: 'GST Free', description: 'GST-free supplies', applicableTo: ['GOODS', 'SERVICES'] },
        { code: 'INPUT_TAXED', name: 'Input Taxed', description: 'Input taxed supplies', applicableTo: ['SERVICES'] },
      ],

      // UNITED STATES - No federal VAT, but state sales tax codes
      US: [
        { code: 'TAXABLE', name: 'Taxable', description: 'Subject to state/local sales tax', applicableTo: ['GOODS', 'SERVICES'] },
        { code: 'EXEMPT', name: 'Exempt', description: 'Exempt from sales tax', applicableTo: ['GOODS', 'SERVICES'] },
        { code: 'RESALE', name: 'Resale', description: 'For resale (no tax)', applicableTo: ['GOODS'] },
      ],
    };

    return categories[countryCode] || [];
  }
}

export default LocalizationManager;
