/**
 * Localization Manager for Reorder Policies
 * Handles region-specific business rules, constraints, and formatting
 */

import { 
  ILocalizationManager, 
  LocalizationConfig, 
  RegionalConstraints,
  LocalizedReorderConfig 
} from './reorder-policy.interface';
import { CurrencyService } from '../currency.service';
import { prisma } from '@/lib/prisma';

export class ReorderPolicyLocalizationManager implements ILocalizationManager {
  
  async getLocalizationConfig(organizationId: string): Promise<LocalizationConfig> {
    // Get organization details including country and currency
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        country: true,
        baseCurrency: true,
        timezone: true,
        name: true,
      }
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Get region-specific constraints
    const regionalConstraints = this.getRegionalConstraints(organization.country);
    
    return {
      country: organization.country,
      currency: organization.baseCurrency,
      timezone: organization.timezone || 'UTC',
      regionalConstraints,
      businessRules: this.getBusinessRules(organization.country),
      legalRequirements: this.getLegalRequirements(organization.country),
      culturalPreferences: this.getCulturalPreferences(organization.country),
    };
  }

  async formatCurrency(amount: number, organizationId: string): Promise<string> {
    return CurrencyService.formatCurrency(amount, organizationId);
  }

  async formatQuantity(quantity: number, unit: string, organizationId: string): Promise<string> {
    const config = await this.getLocalizationConfig(organizationId);
    
    // Use locale-appropriate number formatting
    const numberFormat = new Intl.NumberFormat(this.getLocaleCode(config.country), {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    return `${numberFormat.format(quantity)} ${unit}`;
  }

  async formatDate(date: Date, organizationId: string): Promise<string> {
    const config = await this.getLocalizationConfig(organizationId);
    
    return new Intl.DateTimeFormat(this.getLocaleCode(config.country), {
      dateStyle: 'medium',
      timeZone: config.timezone,
    }).format(date);
  }

  async validateOrderModifiers(
    modifiers: any,
    organizationId: string
  ): Promise<{ isValid: boolean; violations: string[] }> {
    const config = await this.getLocalizationConfig(organizationId);
    const violations: string[] = [];

    // Validate against regional constraints
    const constraints = config.regionalConstraints;

    if (modifiers.minOrderQty && constraints.minOrderQuantityLimit) {
      if (modifiers.minOrderQty > constraints.minOrderQuantityLimit) {
        violations.push(`Minimum order quantity exceeds regional limit of ${constraints.minOrderQuantityLimit}`);
      }
    }

    if (modifiers.maxOrderQty && constraints.maxOrderQuantityLimit) {
      if (modifiers.maxOrderQty > constraints.maxOrderQuantityLimit) {
        violations.push(`Maximum order quantity exceeds regional limit of ${constraints.maxOrderQuantityLimit}`);
      }
    }

    // Validate order value constraints
    if (modifiers.orderValue && constraints.maxOrderValueLimit) {
      if (modifiers.orderValue > constraints.maxOrderValueLimit) {
        violations.push(`Order value exceeds regional limit of ${await this.formatCurrency(constraints.maxOrderValueLimit, organizationId)}`);
      }
    }

    // Uganda-specific validations
    if (config.country === 'UG') {
      // Check for import duty thresholds
      if (modifiers.orderValue && modifiers.orderValue > 500000) { // 500,000 UGX threshold
        violations.push('Orders above UGX 500,000 may require import duty calculations');
      }

      // VAT considerations for local vs imported goods
      if (modifiers.isImported && modifiers.orderValue > 100000) {
        violations.push('Imported goods above UGX 100,000 require VAT registration');
      }
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  async applyRegionalDefaults(
    baseConfig: any,
    organizationId: string
  ): Promise<LocalizedReorderConfig> {
    const config = await this.getLocalizationConfig(organizationId);
    
    // Apply regional defaults
    const localizedConfig: LocalizedReorderConfig = {
      ...baseConfig,
      regionalSettings: {
        country: config.country,
        currency: config.currency,
        timezone: config.timezone,
      }
    };

    // Country-specific defaults
    switch (config.country) {
      case 'UG': // Uganda
        localizedConfig.defaultLeadTimeDays = 14; // Account for cross-border logistics
        localizedConfig.defaultSafetyStockPercentage = 25; // Higher due to supply chain variability
        localizedConfig.defaultReviewFrequency = 'WEEKLY';
        localizedConfig.preferredStrategies = ['FIXED_QTY', 'MAX_QTY']; // Bulk ordering often more economical
        localizedConfig.defaultOrderModifiers = {
          minOrderQty: 10, // Minimum viable order size
          orderMultiple: 5, // Pack sizes
          leadTimeBufferDays: 3, // Additional buffer for customs/logistics
        };
        break;

      case 'US': // United States
        localizedConfig.defaultLeadTimeDays = 7;
        localizedConfig.defaultSafetyStockPercentage = 15;
        localizedConfig.defaultReviewFrequency = 'DAILY';
        localizedConfig.preferredStrategies = ['LOT_FOR_LOT', 'ORDER_TO_ORDER']; // JIT preferred
        break;

      case 'KE': // Kenya
        localizedConfig.defaultLeadTimeDays = 10;
        localizedConfig.defaultSafetyStockPercentage = 20;
        localizedConfig.defaultReviewFrequency = 'WEEKLY';
        localizedConfig.preferredStrategies = ['FIXED_QTY', 'MAX_QTY'];
        break;

      default:
        localizedConfig.defaultLeadTimeDays = 10;
        localizedConfig.defaultSafetyStockPercentage = 20;
        localizedConfig.defaultReviewFrequency = 'WEEKLY';
        localizedConfig.preferredStrategies = ['FIXED_QTY', 'MAX_QTY'];
    }

    return localizedConfig;
  }

  private getRegionalConstraints(country: string): RegionalConstraints {
    switch (country) {
      case 'UG': // Uganda
        return {
          maxOrderQuantityLimit: 10000,
          minOrderQuantityLimit: 1,
          maxOrderValueLimit: 10000000, // 10M UGX
          requiredApprovals: ['MANAGER'], // Manager approval for large orders
          taxImplications: {
            vatRate: 18,
            importDutyThreshold: 500000,
            witholdingTaxRate: 6,
          },
          complianceRequirements: [
            'URA_TAX_CLEARANCE',
            'IMPORT_PERMIT_IF_REQUIRED',
          ],
        };

      case 'KE': // Kenya
        return {
          maxOrderQuantityLimit: 50000,
          minOrderQuantityLimit: 1,
          maxOrderValueLimit: 5000000, // 5M KES
          requiredApprovals: ['MANAGER'],
          taxImplications: {
            vatRate: 16,
            importDutyThreshold: 200000,
          },
        };

      case 'US': // United States
        return {
          maxOrderQuantityLimit: 100000,
          minOrderQuantityLimit: 1,
          maxOrderValueLimit: 1000000, // $1M USD
          requiredApprovals: ['FINANCE'], // Finance approval for large orders
          taxImplications: {
            salesTaxRate: 8.5, // Average
          },
        };

      default:
        return {
          maxOrderQuantityLimit: 10000,
          minOrderQuantityLimit: 1,
          maxOrderValueLimit: 500000,
          requiredApprovals: ['MANAGER'],
        };
    }
  }

  private getBusinessRules(country: string): Record<string, any> {
    switch (country) {
      case 'UG':
        return {
          workingDays: 5,
          businessHours: { start: 8, end: 17 },
          holidayCalendar: 'UGANDA_PUBLIC_HOLIDAYS',
          orderCutoffTime: 15, // 3 PM
          preferredPaymentTerms: 'NET_30',
          localSupplierPreference: true,
        };

      case 'KE':
        return {
          workingDays: 5,
          businessHours: { start: 8, end: 17 },
          holidayCalendar: 'KENYA_PUBLIC_HOLIDAYS',
          orderCutoffTime: 16, // 4 PM
          preferredPaymentTerms: 'NET_30',
        };

      case 'US':
        return {
          workingDays: 5,
          businessHours: { start: 9, end: 17 },
          holidayCalendar: 'US_FEDERAL_HOLIDAYS',
          orderCutoffTime: 14, // 2 PM for same-day processing
          preferredPaymentTerms: 'NET_30',
        };

      default:
        return {
          workingDays: 5,
          businessHours: { start: 8, end: 17 },
          orderCutoffTime: 15,
          preferredPaymentTerms: 'NET_30',
        };
    }
  }

  private getLegalRequirements(country: string): string[] {
    switch (country) {
      case 'UG':
        return [
          'VAT registration required for orders above UGX 150,000,000 annually',
          'Import permits required for restricted goods',
          'Foreign exchange regulations apply to international orders',
          'URA compliance for tax obligations',
        ];

      case 'KE':
        return [
          'VAT registration required for taxable supplies above KES 5,000,000',
          'Import declaration required for goods above KES 200,000',
          'KRA compliance for tax obligations',
        ];

      case 'US':
        return [
          'Sales tax registration may be required',
          'Import declarations for international goods',
          'FDA/USDA approvals for regulated products',
        ];

      default:
        return [
          'Tax registration may be required',
          'Import/export compliance as applicable',
        ];
    }
  }

  private getCulturalPreferences(country: string): Record<string, any> {
    switch (country) {
      case 'UG':
        return {
          preferredCommunicationStyle: 'FORMAL',
          businessMeetingTimes: 'MORNING',
          negotiationStyle: 'RELATIONSHIP_BASED',
          paymentPreference: 'MOBILE_MONEY', // MTN Mobile Money, Airtel Money
          languagePreference: 'ENGLISH',
        };

      case 'KE':
        return {
          preferredCommunicationStyle: 'FORMAL',
          businessMeetingTimes: 'MORNING',
          negotiationStyle: 'RELATIONSHIP_BASED',
          paymentPreference: 'MOBILE_MONEY', // M-Pesa
          languagePreference: 'ENGLISH',
        };

      case 'US':
        return {
          preferredCommunicationStyle: 'DIRECT',
          businessMeetingTimes: 'FLEXIBLE',
          negotiationStyle: 'EFFICIENCY_BASED',
          paymentPreference: 'ELECTRONIC',
          languagePreference: 'ENGLISH',
        };

      default:
        return {
          preferredCommunicationStyle: 'FORMAL',
          businessMeetingTimes: 'MORNING',
          negotiationStyle: 'RELATIONSHIP_BASED',
          paymentPreference: 'BANK_TRANSFER',
          languagePreference: 'ENGLISH',
        };
    }
  }

  private getLocaleCode(country: string): string {
    const localeMap: Record<string, string> = {
      'UG': 'en-UG',
      'KE': 'en-KE',
      'US': 'en-US',
      'GB': 'en-GB',
    };

    return localeMap[country] || 'en-US';
  }
}

// Export singleton instance
export const localizationManager = new ReorderPolicyLocalizationManager();