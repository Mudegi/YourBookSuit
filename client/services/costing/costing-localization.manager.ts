/**
 * CostingLocalizationManager
 * 
 * Provides regional cost adjustments and localization strategies for Standard Costing.
 * This replaces hardcoded country-specific logic with a configurable system.
 */

import { prisma } from '@/lib/prisma';

export interface CostingLocalizationSettings {
  organizationId: string;
  countryCode: string;
  baseCurrency: string;
  
  // Regional cost multipliers
  materialMultiplier: number;      // Uganda: 1.15 (import duties), USA: 1.0
  laborMultiplier: number;         // Uganda: 0.3 (lower wages), UK: 2.5 (higher wages)
  overheadMultiplier: number;      // Uganda: 1.8 (unreliable utilities), US: 1.0
  
  // Transportation and logistics
  freightMultiplier: number;       // Distance-based adjustment
  customsDutyRate: number;         // Country-specific import duties
  
  // Currency and inflation
  inflationAdjustment: number;     // Annual inflation factor
  exchangeRateBuffer: number;      // Currency volatility buffer (5-15%)
  
  // Tax implications
  vatRate: number;                 // VAT/Sales tax for cost calculations
  withholdingTaxRate: number;      // Withholding tax on services
  
  // Regional constraints
  minimumWageRate: number;         // Local minimum wage in base currency
  utilityReliabilityFactor: number; // 0.6 (Uganda) to 1.0 (developed)
  
  lastUpdated: Date;
}

export class CostingLocalizationManager {
  private static instance: CostingLocalizationManager;
  private settingsCache = new Map<string, CostingLocalizationSettings>();
  private countryCode: string;
  private baseCurrency: string;
  
  constructor(countryCode?: string, baseCurrency?: string) {
    this.countryCode = countryCode || 'US';
    this.baseCurrency = baseCurrency || 'USD';
  }
  
  static getInstance(): CostingLocalizationManager {
    if (!CostingLocalizationManager.instance) {
      CostingLocalizationManager.instance = new CostingLocalizationManager();
    }
    return CostingLocalizationManager.instance;
  }

  /**
   * Get region-specific variance reason codes
   * This provides the "Financial Truth" dimension for variance analysis
   */
  async getVarianceReasonCodes(): Promise<string[]> {
    const countryReasonCodes: Record<string, string[]> = {
      'UG': [ // Uganda - East Africa specific
        'EXCHANGE_RATE_FLUCTUATION',
        'FUEL_SURCHARGE',
        'BORDER_DELAY_COSTS',
        'POWER_OUTAGE_LOSSES',
        'SUPPLIER_PRICE_HIKE',
        'IMPORT_DUTY_INCREASE',
        'ROAD_CONDITION_DELAYS',
        'CUSTOMS_PROCESSING_FEES',
        'POLITICAL_INSTABILITY',
        'SEASONAL_SUPPLY_SHORTAGE',
        'RAINFALL_IMPACT',
        'TRANSPORT_STRIKE',
      ],
      'US': [ // United States
        'SUPPLIER_PRICE_HIKE',
        'PRODUCTION_INEFFICIENCY',
        'QUALITY_REWORK',
        'LABOR_OVERTIME',
        'MATERIAL_SHORTAGE',
        'EQUIPMENT_BREAKDOWN',
        'REGULATORY_COMPLIANCE',
        'INFLATION_ADJUSTMENT',
      ],
      'GB': [ // United Kingdom
        'BREXIT_IMPACT',
        'SUPPLIER_PRICE_HIKE',
        'PRODUCTION_INEFFICIENCY',
        'LABOR_SHORTAGE',
        'ENERGY_COST_INCREASE',
        'REGULATORY_COMPLIANCE',
        'MATERIAL_SHORTAGE',
        'TRANSPORT_DISRUPTION',
      ],
      'IN': [ // India
        'MONSOON_IMPACT',
        'FUEL_SURCHARGE',
        'SUPPLIER_PRICE_HIKE',
        'LABOR_UNREST',
        'POWER_SHORTAGE',
        'RAW_MATERIAL_SHORTAGE',
        'GOVERNMENT_POLICY_CHANGE',
        'INFRASTRUCTURE_DELAYS',
      ],
    };

    return countryReasonCodes[this.countryCode] || countryReasonCodes['US'];
  }

  /**
   * Get localized variance account mapping
   * Maps variance reason codes to appropriate GL accounts
   */
  async getVarianceGLAccountMapping(): Promise<Record<string, string>> {
    const baseMapping: Record<string, string> = {
      'SUPPLIER_PRICE_HIKE': '5410', // Purchase Price Variance
      'PRODUCTION_INEFFICIENCY': '5420', // Labor Efficiency Variance
      'MATERIAL_SHORTAGE': '5430', // Material Usage Variance
      'EXCHANGE_RATE_FLUCTUATION': '5450', // Currency Variance
      'QUALITY_REWORK': '5460', // Quality Variance
      'EQUIPMENT_BREAKDOWN': '5470', // Manufacturing Overhead Variance
    };

    // Uganda-specific GL account mappings
    if (this.countryCode === 'UG') {
      return {
        ...baseMapping,
        'FUEL_SURCHARGE': '5480', // Transport Cost Variance
        'BORDER_DELAY_COSTS': '5490', // Import Cost Variance
        'POWER_OUTAGE_LOSSES': '5470', // Overhead Variance
        'IMPORT_DUTY_INCREASE': '5430', // Material Cost Variance
        'CUSTOMS_PROCESSING_FEES': '5490', // Import Cost Variance
      };
    }

    return baseMapping;
  }

  /**
   * Get country-specific landed cost types
   * Essential for landlocked countries where freight/customs add 20-40% to costs
   */
  async getLandedCostTypes(): Promise<Array<{
    code: string;
    name: string;
    description: string;
    glAccountCode?: string;
  }>> {
    const baseCostTypes = [
      {
        code: 'FREIGHT',
        name: 'Freight Cost',
        description: 'Transportation costs from origin to destination',
        glAccountCode: '5100',
      },
      {
        code: 'INSURANCE',
        name: 'Insurance Cost',
        description: 'Cargo insurance during transit',
        glAccountCode: '5110',
      },
      {
        code: 'CUSTOMS_DUTY',
        name: 'Customs Duty',
        description: 'Import duties and taxes',
        glAccountCode: '5120',
      },
      {
        code: 'HANDLING',
        name: 'Handling Cost',
        description: 'Port/airport handling charges',
        glAccountCode: '5130',
      },
    ];

    // Country-specific cost types
    const countrySpecificTypes: Record<string, any[]> = {
      'UG': [ // Uganda - Landlocked country specifics
        ...baseCostTypes,
        {
          code: 'WITHHOLDING_TAX_IMPORTS',
          name: 'Withholding Tax on Imports',
          description: 'Tax withheld on imported services',
          glAccountCode: '2110',
        },
        {
          code: 'RAILWAY_DEVELOPMENT_LEVY',
          name: 'Railway Development Levy',
          description: 'Infrastructure development levy',
          glAccountCode: '5140',
        },
        {
          code: 'CUSTOMS_PROCESSING_FEES',
          name: 'Customs Processing Fees',
          description: 'Customs clearance and processing fees',
          glAccountCode: '5150',
        },
        {
          code: 'CLEARING_AGENT_FEES',
          name: 'Clearing Agent Fees',
          description: 'Professional clearing agent services',
          glAccountCode: '5160',
        },
        {
          code: 'BORDER_DELAY_COSTS',
          name: 'Border Delay Costs',
          description: 'Additional costs due to border delays',
          glAccountCode: '5170',
        },
        {
          code: 'FUEL_SURCHARGE',
          name: 'Fuel Surcharge',
          description: 'Additional transport costs due to fuel prices',
          glAccountCode: '5180',
        },
        {
          code: 'STORAGE_DEMURRAGE',
          name: 'Storage/Demurrage',
          description: 'Container storage and demurrage charges',
          glAccountCode: '5190',
        },
      ],
      'KE': [ // Kenya - Port country specifics
        ...baseCostTypes,
        {
          code: 'PORT_CHARGES',
          name: 'Port Charges',
          description: 'Mombasa port handling charges',
          glAccountCode: '5200',
        },
        {
          code: 'CONTAINER_DEPOSIT',
          name: 'Container Deposit',
          description: 'Container deposit and handling',
          glAccountCode: '5210',
        },
      ],
      'US': [
        ...baseCostTypes,
        {
          code: 'BROKER_FEES',
          name: 'Customs Broker Fees',
          description: 'Licensed customs broker services',
          glAccountCode: '5300',
        },
        {
          code: 'DRAYAGE',
          name: 'Drayage',
          description: 'Local container transport',
          glAccountCode: '5310',
        },
      ],
    };

    return countrySpecificTypes[this.countryCode] || baseCostTypes;
  }

  /**
   * Get typical cost percentages by country
   * Helps estimate landed costs before actual bills arrive
   */
  async getTypicalLandedCostPercentages(): Promise<{
    freight: number;
    insurance: number;
    customsDuty: number;
    handling: number;
    other: number;
    total: number;
  }> {
    const countryPercentages: Record<string, any> = {
      'UG': { // Uganda - High due to landlocked status
        freight: 15, // 15% of FOB value
        insurance: 1,
        customsDuty: 25, // High import duties
        handling: 5,
        other: 8, // Border delays, fuel surcharges, etc.
        total: 54, // Can add 54% to FOB cost
      },
      'KE': { // Kenya - Port country, lower costs
        freight: 8,
        insurance: 1,
        customsDuty: 20,
        handling: 3,
        other: 3,
        total: 35,
      },
      'US': { // United States
        freight: 5,
        insurance: 0.5,
        customsDuty: 8,
        handling: 2,
        other: 2,
        total: 17.5,
      },
      'GB': { // United Kingdom
        freight: 6,
        insurance: 0.5,
        customsDuty: 12,
        handling: 2.5,
        other: 2,
        total: 23,
      },
    };

    return countryPercentages[this.countryCode] || countryPercentages['US'];
  }

  /**
   * Get comprehensive localization settings for an organization
   */
  async getLocalizationSettings(organizationId: string): Promise<CostingLocalizationSettings> {
    const cacheKey = `settings_${organizationId}`;
    
    if (this.settingsCache.has(cacheKey)) {
      return this.settingsCache.get(cacheKey)!;
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        baseCurrency: true,
        homeCountry: true,
      },
    });

    if (!organization) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    const settings = await this.buildLocalizationSettings(
      organizationId, 
      organization.homeCountry, 
      organization.baseCurrency
    );

    // Cache for 1 hour
    this.settingsCache.set(cacheKey, settings);
    setTimeout(() => this.settingsCache.delete(cacheKey), 3600000);

    return settings;
  }

  /**
   * Get regional overhead multiplier based on country logistics
   */
  async getOverheadMultiplier(organizationId: string): Promise<number> {
    const settings = await this.getLocalizationSettings(organizationId);
    return settings.overheadMultiplier;
  }

  /**
   * Get material cost adjustment based on import duties and availability
   */
  async getMaterialMultiplier(organizationId: string): Promise<number> {
    const settings = await this.getLocalizationSettings(organizationId);
    return settings.materialMultiplier;
  }

  /**
   * Get labor cost multiplier based on regional wage levels
   */
  async getLaborMultiplier(organizationId: string): Promise<number> {
    const settings = await this.getLocalizationSettings(organizationId);
    return settings.laborMultiplier;
  }

  /**
   * Apply comprehensive localization adjustments to cost components
   */
  async applyLocalizationAdjustments(
    organizationId: string,
    costs: {
      materialCost: number;
      laborCost: number;
      overheadCost: number;
    }
  ): Promise<{
    localizedMaterialCost: number;
    localizedLaborCost: number;
    localizedOverheadCost: number;
    totalLocalizedCost: number;
    adjustmentSummary: string[];
  }> {
    const settings = await this.getLocalizationSettings(organizationId);
    
    const localizedMaterialCost = costs.materialCost * settings.materialMultiplier;
    const localizedLaborCost = costs.laborCost * settings.laborMultiplier;
    const localizedOverheadCost = costs.overheadCost * settings.overheadMultiplier;
    
    const totalLocalizedCost = localizedMaterialCost + localizedLaborCost + localizedOverheadCost;
    
    const adjustmentSummary = [
      `Material: ${((settings.materialMultiplier - 1) * 100).toFixed(1)}% adjustment`,
      `Labor: ${((settings.laborMultiplier - 1) * 100).toFixed(1)}% adjustment`,
      `Overhead: ${((settings.overheadMultiplier - 1) * 100).toFixed(1)}% adjustment`,
    ];

    return {
      localizedMaterialCost,
      localizedLaborCost,
      localizedOverheadCost,
      totalLocalizedCost,
      adjustmentSummary,
    };
  }

  /**
   * Format currency amount with proper localization
   */
  async formatCurrency(
    amount: number, 
    organizationId: string, 
    targetCurrencyCode?: string
  ): Promise<string> {
    const settings = await this.getLocalizationSettings(organizationId);
    const currency = targetCurrencyCode || settings.baseCurrency;
    
    // Get currency formatting based on country
    const locale = this.getLocaleFromCountry(settings.countryCode);
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  }

  /**
   * Get live exchange rate with localized buffer
   */
  async getExchangeRateWithBuffer(
    organizationId: string,
    fromCurrency: string,
    toCurrency: string
  ): Promise<{ rate: number; bufferedRate: number; bufferPercent: number }> {
    const settings = await this.getLocalizationSettings(organizationId);
    
    // In production, this would call a real exchange rate API
    const mockExchangeRate = fromCurrency === toCurrency ? 1.0 : 3800; // UGX per USD
    
    const bufferedRate = mockExchangeRate * (1 + settings.exchangeRateBuffer);
    
    return {
      rate: mockExchangeRate,
      bufferedRate,
      bufferPercent: settings.exchangeRateBuffer * 100,
    };
  }

  /**
   * Build localization settings based on country profile
   */
  private async buildLocalizationSettings(
    organizationId: string,
    countryCode: string,
    baseCurrency: string
  ): Promise<CostingLocalizationSettings> {
    
    // Country-specific profiles
    const countryProfiles: Record<string, Partial<CostingLocalizationSettings>> = {
      'UG': { // Uganda
        materialMultiplier: 1.25,      // High import duties
        laborMultiplier: 0.15,         // Low labor costs
        overheadMultiplier: 1.8,       // Unreliable utilities
        freightMultiplier: 2.5,        // Landlocked country
        customsDutyRate: 0.25,
        inflationAdjustment: 1.08,     // 8% annual inflation
        exchangeRateBuffer: 0.15,      // 15% volatility buffer
        vatRate: 0.18,
        withholdingTaxRate: 0.06,
        minimumWageRate: 6000,         // 6,000 UGX per day
        utilityReliabilityFactor: 0.6,
      },
      'US': { // United States
        materialMultiplier: 1.0,
        laborMultiplier: 1.0,
        overheadMultiplier: 1.0,
        freightMultiplier: 1.0,
        customsDutyRate: 0.05,
        inflationAdjustment: 1.03,     // 3% annual inflation
        exchangeRateBuffer: 0.05,      // 5% volatility buffer
        vatRate: 0.08,                 // Average state sales tax
        withholdingTaxRate: 0.0,
        minimumWageRate: 7.25,         // $7.25 per hour
        utilityReliabilityFactor: 1.0,
      },
      'GB': { // United Kingdom
        materialMultiplier: 1.1,
        laborMultiplier: 2.2,          // High labor costs
        overheadMultiplier: 1.4,       // High real estate costs
        freightMultiplier: 1.2,
        customsDutyRate: 0.10,
        inflationAdjustment: 1.04,
        exchangeRateBuffer: 0.08,
        vatRate: 0.20,                 // 20% VAT
        withholdingTaxRate: 0.0,
        minimumWageRate: 10.42,        // £10.42 per hour
        utilityReliabilityFactor: 0.95,
      },
    };

    const profile = countryProfiles[countryCode] || countryProfiles['US'];

    return {
      organizationId,
      countryCode,
      baseCurrency,
      materialMultiplier: profile.materialMultiplier || 1.0,
      laborMultiplier: profile.laborMultiplier || 1.0,
      overheadMultiplier: profile.overheadMultiplier || 1.0,
      freightMultiplier: profile.freightMultiplier || 1.0,
      customsDutyRate: profile.customsDutyRate || 0.0,
      inflationAdjustment: profile.inflationAdjustment || 1.0,
      exchangeRateBuffer: profile.exchangeRateBuffer || 0.05,
      vatRate: profile.vatRate || 0.0,
      withholdingTaxRate: profile.withholdingTaxRate || 0.0,
      minimumWageRate: profile.minimumWageRate || 0,
      utilityReliabilityFactor: profile.utilityReliabilityFactor || 1.0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get appropriate locale string from country code
   */
  private getLocaleFromCountry(countryCode: string): string {
    const localeMap: Record<string, string> = {
      'UG': 'en-UG',
      'US': 'en-US',
      'GB': 'en-GB',
      'CA': 'en-CA',
      'AU': 'en-AU',
      'IN': 'en-IN',
      'ZA': 'en-ZA',
    };
    
    return localeMap[countryCode] || 'en-US';
  }

  /**
   * Clear cached settings (useful for testing or when org settings change)
   */
  clearCache(organizationId?: string): void {
    if (organizationId) {
      this.settingsCache.delete(`settings_${organizationId}`);
    } else {
      this.settingsCache.clear();
    }
  }
}

// Export singleton instance
export const costingLocalizationManager = CostingLocalizationManager.getInstance();