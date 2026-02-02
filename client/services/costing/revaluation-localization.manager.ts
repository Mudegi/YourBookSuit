/**
 * Revaluation Localization Manager
 * 
 * Provides country-specific configuration for inventory revaluations
 * without hardcoding business logic. Supports "Global by Design but
 * Localized by Configuration" architecture.
 * 
 * Features:
 * 1. Country-specific reason codes (e.g., Uganda currency fluctuations)
 * 2. Regional compliance requirements and thresholds
 * 3. Market price integration and adjustment factors
 * 4. Approval workflow configurations by country
 */

import { PrismaClient } from '@prisma/client';

export interface RevaluationLocalizationConfig {
  country: string;
  baseCurrency: string;
  reasonCodes: ReasonCode[];
  autoApprovalThreshold: number;
  largeVarianceThreshold: number; // Percentage
  marketPriceAdjustmentFactor: number;
  requiredApprovers: string[];
  complianceRequirements: string[];
}

export interface ReasonCode {
  code: string;
  name: string;
  description: string;
  category: 'MARKET_ADJUSTMENT' | 'CURRENCY_IMPACT' | 'DAMAGE_OBSOLESCENCE' | 'ERROR_CORRECTION' | 'REGULATORY';
  requiresApproval: boolean;
  supportingDocuments?: string[];
}

export interface MarketAdjustmentFactor {
  country: string;
  productCategory?: string;
  adjustmentFactor: number; // Multiplier for market price calculations
  seasonality: Record<string, number>; // Monthly adjustments
  volatilityIndex: number; // 0-100, higher = more volatile
}

export class RevaluationLocalizationManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get localization configuration for an organization
   */
  async getLocalizationConfig(organizationId: string): Promise<RevaluationLocalizationConfig> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        homeCountry: true,
        baseCurrency: true,
      },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const country = organization.homeCountry || 'US';
    const reasonCodes = this.getReasonCodes(country);
    const config = this.getCountryConfiguration(country);

    return {
      country,
      baseCurrency: organization.baseCurrency || 'USD',
      reasonCodes,
      ...config,
    };
  }

  /**
   * Get country-specific reason codes without hardcoding
   */
  private getReasonCodes(country: string): ReasonCode[] {
    const baseReasonCodes: ReasonCode[] = [
      {
        code: 'MARKET_DECLINE',
        name: 'Market Price Decline',
        description: 'Adjustment due to market price decrease',
        category: 'MARKET_ADJUSTMENT',
        requiresApproval: false,
      },
      {
        code: 'MARKET_INCREASE',
        name: 'Market Price Increase',
        description: 'Adjustment due to market price increase',
        category: 'MARKET_ADJUSTMENT',
        requiresApproval: true,
      },
      {
        code: 'DAMAGE_WRITE_DOWN',
        name: 'Damage/Obsolescence',
        description: 'Write-down due to damaged or obsolete inventory',
        category: 'DAMAGE_OBSOLESCENCE',
        requiresApproval: true,
        supportingDocuments: ['DAMAGE_REPORT', 'PHOTOS'],
      },
      {
        code: 'ERROR_CORRECTION',
        name: 'Error Correction',
        description: 'Correction of previously recorded incorrect cost',
        category: 'ERROR_CORRECTION',
        requiresApproval: true,
        supportingDocuments: ['SUPPORTING_DOCUMENTATION'],
      },
    ];

    // Add country-specific reason codes
    const countrySpecificCodes = this.getCountrySpecificReasonCodes(country);
    
    return [...baseReasonCodes, ...countrySpecificCodes];
  }

  /**
   * Get country-specific reason codes based on regional business conditions
   */
  private getCountrySpecificReasonCodes(country: string): ReasonCode[] {
    switch (country) {
      case 'UG': // Uganda
        return [
          {
            code: 'CURRENCY_FLUCTUATION',
            name: 'Currency Fluctuation Impact',
            description: 'Adjustment due to significant USD/UGX exchange rate changes affecting import costs',
            category: 'CURRENCY_IMPACT',
            requiresApproval: true,
            supportingDocuments: ['EXCHANGE_RATE_ANALYSIS'],
          },
          {
            code: 'FUEL_PRICE_IMPACT',
            name: 'Fuel Price Impact',
            description: 'Cost adjustment due to fuel price changes affecting transportation costs',
            category: 'MARKET_ADJUSTMENT',
            requiresApproval: false,
          },
          {
            code: 'BORDER_DELAY_COSTS',
            name: 'Border Delay Additional Costs',
            description: 'Additional costs incurred due to border delays and storage',
            category: 'MARKET_ADJUSTMENT',
            requiresApproval: true,
            supportingDocuments: ['BORDER_DOCUMENTATION', 'STORAGE_RECEIPTS'],
          },
          {
            code: 'URA_TAX_ADJUSTMENT',
            name: 'URA Tax Adjustment',
            description: 'Cost adjustment due to Uganda Revenue Authority tax changes',
            category: 'REGULATORY',
            requiresApproval: true,
            supportingDocuments: ['URA_DOCUMENTATION'],
          },
        ];

      case 'KE': // Kenya
        return [
          {
            code: 'KRA_COMPLIANCE',
            name: 'KRA Compliance Adjustment',
            description: 'Cost adjustment for Kenya Revenue Authority compliance',
            category: 'REGULATORY',
            requiresApproval: true,
            supportingDocuments: ['KRA_DOCUMENTATION'],
          },
          {
            code: 'MOMBASA_PORT_COSTS',
            name: 'Mombasa Port Cost Changes',
            description: 'Adjustment due to changes in Mombasa port handling costs',
            category: 'MARKET_ADJUSTMENT',
            requiresApproval: false,
          },
        ];

      case 'ZA': // South Africa
        return [
          {
            code: 'SARS_TAX_ADJUSTMENT',
            name: 'SARS Tax Adjustment',
            description: 'Cost adjustment due to South African Revenue Service changes',
            category: 'REGULATORY',
            requiresApproval: true,
            supportingDocuments: ['SARS_DOCUMENTATION'],
          },
        ];

      case 'US': // United States
        return [
          {
            code: 'TARIFF_ADJUSTMENT',
            name: 'Tariff Impact Adjustment',
            description: 'Cost adjustment due to tariff changes',
            category: 'REGULATORY',
            requiresApproval: true,
            supportingDocuments: ['CUSTOMS_DOCUMENTATION'],
          },
        ];

      default:
        return [];
    }
  }

  /**
   * Get country-specific configuration parameters
   */
  private getCountryConfiguration(country: string) {
    switch (country) {
      case 'UG': // Uganda - High inflation, currency volatility
        return {
          autoApprovalThreshold: 500000, // 500K UGX
          largeVarianceThreshold: 20, // 20% considered large variance
          marketPriceAdjustmentFactor: 1.1, // 10% buffer for volatility
          requiredApprovers: ['FINANCE_MANAGER', 'CFO'],
          complianceRequirements: [
            'URA_TAX_CLEARANCE',
            'INVENTORY_AUDIT_TRAIL',
            'SUPPORTING_DOCUMENTATION',
          ],
        };

      case 'KE': // Kenya - Moderate inflation
        return {
          autoApprovalThreshold: 200000, // 200K KES
          largeVarianceThreshold: 15, // 15% considered large variance
          marketPriceAdjustmentFactor: 1.05, // 5% buffer
          requiredApprovers: ['FINANCE_MANAGER'],
          complianceRequirements: [
            'KRA_COMPLIANCE_CHECK',
            'INVENTORY_AUDIT_TRAIL',
          ],
        };

      case 'ZA': // South Africa
        return {
          autoApprovalThreshold: 50000, // 50K ZAR
          largeVarianceThreshold: 12, // 12% considered large variance
          marketPriceAdjustmentFactor: 1.03, // 3% buffer
          requiredApprovers: ['FINANCE_MANAGER'],
          complianceRequirements: [
            'SARS_COMPLIANCE',
            'INVENTORY_AUDIT_TRAIL',
          ],
        };

      case 'US': // United States - Low inflation baseline
        return {
          autoApprovalThreshold: 10000, // $10K USD
          largeVarianceThreshold: 10, // 10% considered large variance
          marketPriceAdjustmentFactor: 1.0, // No adjustment
          requiredApprovers: ['FINANCE_MANAGER'],
          complianceRequirements: [
            'INVENTORY_AUDIT_TRAIL',
            'SUPPORTING_DOCUMENTATION',
          ],
        };

      default: // Default configuration
        return {
          autoApprovalThreshold: 5000,
          largeVarianceThreshold: 10,
          marketPriceAdjustmentFactor: 1.0,
          requiredApprovers: ['MANAGER'],
          complianceRequirements: [
            'INVENTORY_AUDIT_TRAIL',
          ],
        };
    }
  }

  /**
   * Validate if a reason code is allowed for a country
   */
  async validateReasonCode(reasonCode: string, country: string): Promise<boolean> {
    const reasonCodes = this.getReasonCodes(country);
    return reasonCodes.some(rc => rc.code === reasonCode);
  }

  /**
   * Get market adjustment factors by country and product category
   */
  async getMarketAdjustmentFactors(
    country: string,
    productCategory?: string
  ): Promise<MarketAdjustmentFactor> {
    const baseConfig = this.getCountryConfiguration(country);

    // Country-specific market adjustments
    const countryFactors: Record<string, Partial<MarketAdjustmentFactor>> = {
      'UG': {
        adjustmentFactor: 1.15, // High volatility
        seasonality: {
          '1': 1.1, // January - post-holiday price increases
          '2': 1.0,
          '3': 1.0,
          '4': 1.05, // April - fiscal year changes
          '5': 1.0,
          '6': 1.0,
          '7': 1.1, // July - mid-year adjustments
          '8': 1.0,
          '9': 1.0,
          '10': 1.05, // October - harvest season impact
          '11': 1.0,
          '12': 1.1, // December - year-end demand
        },
        volatilityIndex: 85, // High volatility
      },
      'KE': {
        adjustmentFactor: 1.08,
        seasonality: {
          '1': 1.05, '2': 1.0, '3': 1.0, '4': 1.0,
          '5': 1.0, '6': 1.0, '7': 1.05, '8': 1.0,
          '9': 1.0, '10': 1.0, '11': 1.0, '12': 1.05,
        },
        volatilityIndex: 65, // Moderate volatility
      },
      'ZA': {
        adjustmentFactor: 1.05,
        seasonality: {
          '1': 1.02, '2': 1.0, '3': 1.0, '4': 1.0,
          '5': 1.0, '6': 1.0, '7': 1.0, '8': 1.0,
          '9': 1.0, '10': 1.0, '11': 1.0, '12': 1.02,
        },
        volatilityIndex: 45,
      },
      'US': {
        adjustmentFactor: 1.0,
        seasonality: {
          '1': 1.0, '2': 1.0, '3': 1.0, '4': 1.0,
          '5': 1.0, '6': 1.0, '7': 1.0, '8': 1.0,
          '9': 1.0, '10': 1.0, '11': 1.0, '12': 1.0,
        },
        volatilityIndex: 25, // Low volatility
      },
    };

    const countryFactor = countryFactors[country] || countryFactors['US'];

    return {
      country,
      productCategory,
      adjustmentFactor: countryFactor.adjustmentFactor || 1.0,
      seasonality: countryFactor.seasonality || {},
      volatilityIndex: countryFactor.volatilityIndex || 25,
    };
  }

  /**
   * Get required supporting documents for a reason code
   */
  async getRequiredDocuments(reasonCode: string, country: string): Promise<string[]> {
    const reasonCodes = this.getReasonCodes(country);
    const reasonCodeConfig = reasonCodes.find(rc => rc.code === reasonCode);
    
    return reasonCodeConfig?.supportingDocuments || [];
  }

  /**
   * Format currency amount using country-specific formatting
   */
  async formatCurrency(
    amount: number,
    organizationId: string
  ): Promise<string> {
    const config = await this.getLocalizationConfig(organizationId);
    
    const locale = this.getLocaleCode(config.country);
    const currency = config.baseCurrency;
    const decimals = currency === 'UGX' || currency === 'KES' ? 0 : 2;

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  }

  /**
   * Get compliance warnings for large revaluations
   */
  async getComplianceWarnings(
    organizationId: string,
    adjustmentAmount: number,
    reasonCode: string
  ): Promise<string[]> {
    const config = await this.getLocalizationConfig(organizationId);
    const warnings: string[] = [];

    // Large adjustment warnings by country
    if (Math.abs(adjustmentAmount) > config.autoApprovalThreshold) {
      switch (config.country) {
        case 'UG':
          warnings.push('Large revaluation requires URA documentation for tax purposes');
          warnings.push('Consider currency impact analysis for imported goods');
          break;
        case 'KE':
          warnings.push('Large revaluation requires KRA compliance documentation');
          break;
        case 'ZA':
          warnings.push('Large revaluation requires SARS compliance review');
          break;
        default:
          warnings.push('Large revaluation requires additional approval');
      }
    }

    // Reason-specific warnings
    if (reasonCode === 'CURRENCY_FLUCTUATION' && config.country === 'UG') {
      warnings.push('Currency fluctuation adjustments should be supported by exchange rate analysis');
    }

    return warnings;
  }

  /**
   * Get locale code for country
   */
  private getLocaleCode(country: string): string {
    const localeMap: Record<string, string> = {
      'UG': 'en-UG',
      'KE': 'en-KE',
      'ZA': 'en-ZA',
      'US': 'en-US',
      'GB': 'en-GB',
    };

    return localeMap[country] || 'en-US';
  }

  /**
   * Calculate seasonal adjustment factor for current month
   */
  async getSeasonalAdjustment(country: string): Promise<number> {
    const factors = await this.getMarketAdjustmentFactors(country);
    const currentMonth = new Date().getMonth() + 1;
    
    return factors.seasonality[currentMonth.toString()] || 1.0;
  }
}

// Export singleton instance
export const revaluationLocalizationManager = new RevaluationLocalizationManager(
  // Will be injected with prisma instance
  {} as PrismaClient
);