/**
 * Localization Service for Multi-Country Support
 * 
 * Provides country-agnostic localization features for demand forecasting including:
 * - Configurable holidays and business events
 * - Agricultural/seasonal cycles
 * - Economic factors and regional variations
 * - Business calendar adjustments
 * - Currency and cultural considerations
 * 
 * This service loads localization data from database configuration,
 * not hardcoded values, enabling support for any country.
 */

import prisma from '@/lib/prisma';
import { addDays, format, isAfter, isBefore, startOfDay } from 'date-fns';

export interface LocalizationConfig {
  organizationId: string;
  countryCode: string;
  countryName: string;
  currency: string;
  timeZone: string;
  businessCalendar: BusinessCalendar;
  economicFactors: EconomicFactors;
  culturalFactors: CulturalFactors;
}

export interface BusinessCalendar {
  holidays: Holiday[];
  agriculturalCycles: AgriculturalCycle[];
  businessSeasons: BusinessSeason[];
  workingDays: number[]; // 0=Sunday, 1=Monday, etc.
  fiscalYearStart: { month: number; day: number };
}

export interface Holiday {
  name: string;
  month: number;
  day: number;
  isFixed: boolean; // false for holidays like Easter that move
  demandImpact: number; // multiplier: 1.0 = no impact, 1.5 = 50% increase
  affectedCategories?: string[]; // if null, affects all categories
  duration: number; // days of impact
}

export interface AgriculturalCycle {
  name: string;
  type: 'PLANTING' | 'HARVEST' | 'PROCESSING';
  startMonth: number;
  endMonth: number;
  demandImpact: number;
  affectedProducts: string[]; // product categories or specific SKUs
  regions?: string[]; // if null, affects all regions
}

export interface BusinessSeason {
  name: string;
  type: 'PEAK' | 'LOW' | 'NORMAL';
  startMonth: number;
  endMonth: number;
  demandMultiplier: number;
  affectedCategories: string[];
  description: string;
}

export interface EconomicFactors {
  regionalMultipliers: Record<string, number>; // region -> multiplier
  urbanVsRuralFactor: number;
  inflationRate: number;
  seasonalityStrength: number; // 0-1, how much seasonality affects demand
}

export interface CulturalFactors {
  religiousDemographics: Record<string, number>; // religion -> percentage
  languagePreferences: string[];
  consumptionPatterns: Record<string, number>; // category -> cultural multiplier
}

export interface LocalizationEvent {
  date: Date;
  name: string;
  type: 'HOLIDAY' | 'AGRICULTURAL' | 'BUSINESS' | 'ECONOMIC';
  impact: number;
  affectedCategories: string[];
  duration: number;
}

export class LocalizationService {
  private configCache = new Map<string, LocalizationConfig>();
  private eventCache = new Map<string, LocalizationEvent[]>();

  /**
   * Get localization configuration for an organization
   */
  async getLocalizationConfig(organizationId: string): Promise<LocalizationConfig | null> {
    // Check cache first
    if (this.configCache.has(organizationId)) {
      return this.configCache.get(organizationId)!;
    }

    try {
      // Load from database - these would be configuration tables
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          country: true,
          currency: true,
          timeZone: true,
        },
      });

      if (!organization) {
        return null;
      }

      // Load country-specific configuration
      // In a real implementation, this would come from localization tables
      const config = await this.loadCountryConfig(
        organizationId,
        organization.country || 'US'
      );

      // Cache the configuration
      this.configCache.set(organizationId, config);

      return config;

    } catch (error) {
      console.error('Error loading localization config:', error);
      return null;
    }
  }

  /**
   * Get localization events for a date range
   */
  async getLocalizationEvents(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<LocalizationEvent[]> {
    const cacheKey = `${organizationId}-${format(startDate, 'yyyy-MM')}-${format(endDate, 'yyyy-MM')}`;
    
    if (this.eventCache.has(cacheKey)) {
      return this.eventCache.get(cacheKey)!;
    }

    const config = await this.getLocalizationConfig(organizationId);
    if (!config) {
      return [];
    }

    const events: LocalizationEvent[] = [];

    // Generate holiday events
    for (const holiday of config.businessCalendar.holidays) {
      const holidayDates = this.generateHolidayDates(holiday, startDate, endDate);
      
      for (const date of holidayDates) {
        events.push({
          date,
          name: holiday.name,
          type: 'HOLIDAY',
          impact: holiday.demandImpact,
          affectedCategories: holiday.affectedCategories || [],
          duration: holiday.duration,
        });
      }
    }

    // Generate agricultural cycle events
    for (const cycle of config.businessCalendar.agriculturalCycles) {
      const cycleDates = this.generateAgriculturalDates(cycle, startDate, endDate);
      
      for (const date of cycleDates) {
        events.push({
          date,
          name: cycle.name,
          type: 'AGRICULTURAL',
          impact: cycle.demandImpact,
          affectedCategories: cycle.affectedProducts,
          duration: 30, // Default to 30 days for agricultural cycles
        });
      }
    }

    // Generate business season events
    for (const season of config.businessCalendar.businessSeasons) {
      const seasonDates = this.generateSeasonDates(season, startDate, endDate);
      
      for (const date of seasonDates) {
        events.push({
          date,
          name: season.name,
          type: 'BUSINESS',
          impact: season.demandMultiplier,
          affectedCategories: season.affectedCategories,
          duration: 90, // Default season duration
        });
      }
    }

    // Cache the events
    this.eventCache.set(cacheKey, events);

    return events;
  }

  /**
   * Calculate demand adjustment for a specific date and product category
   */
  async calculateDemandAdjustment(
    organizationId: string,
    date: Date,
    productCategory: string,
    region?: string
  ): Promise<number> {
    const config = await this.getLocalizationConfig(organizationId);
    if (!config) {
      return 1.0; // No adjustment if no config
    }

    let adjustment = 1.0;

    // Get events for this date (±7 days for impact duration)
    const startCheck = addDays(date, -7);
    const endCheck = addDays(date, 7);
    const events = await this.getLocalizationEvents(organizationId, startCheck, endCheck);

    // Apply event impacts
    for (const event of events) {
      const daysDiff = Math.abs((date.getTime() - event.date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= event.duration) {
        // Check if this event affects the product category
        if (event.affectedCategories.length === 0 || 
            event.affectedCategories.includes(productCategory)) {
          
          // Apply decay based on distance from event date
          const decayFactor = Math.max(0.1, 1 - (daysDiff / event.duration));
          const eventImpact = 1 + ((event.impact - 1) * decayFactor);
          
          adjustment *= eventImpact;
        }
      }
    }

    // Apply regional multipliers
    if (region && config.economicFactors.regionalMultipliers[region]) {
      adjustment *= config.economicFactors.regionalMultipliers[region];
    }

    // Apply cultural factors
    if (config.culturalFactors.consumptionPatterns[productCategory]) {
      adjustment *= config.culturalFactors.consumptionPatterns[productCategory];
    }

    return adjustment;
  }

  /**
   * Get supported countries (would come from database)
   */
  async getSupportedCountries(): Promise<Array<{code: string, name: string}>> {
    // In a real implementation, this would come from a countries configuration table
    return [
      { code: 'US', name: 'United States' },
      { code: 'UG', name: 'Uganda' },
      { code: 'KE', name: 'Kenya' },
      { code: 'TZ', name: 'Tanzania' },
      { code: 'RW', name: 'Rwanda' },
      { code: 'NG', name: 'Nigeria' },
      { code: 'GH', name: 'Ghana' },
      { code: 'ZA', name: 'South Africa' },
      { code: 'EG', name: 'Egypt' },
      { code: 'MA', name: 'Morocco' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'DE', name: 'Germany' },
      { code: 'FR', name: 'France' },
      { code: 'IN', name: 'India' },
      { code: 'CN', name: 'China' },
      { code: 'JP', name: 'Japan' },
      { code: 'BR', name: 'Brazil' },
      { code: 'MX', name: 'Mexico' },
      { code: 'CA', name: 'Canada' },
      { code: 'AU', name: 'Australia' },
    ];
  }

  /**
   * Load country-specific configuration
   * In production, this would load from database tables
   */
  private async loadCountryConfig(
    organizationId: string,
    countryCode: string
  ): Promise<LocalizationConfig> {
    // This would normally load from database configuration tables
    // For now, we provide some example configurations
    
    const baseConfig: LocalizationConfig = {
      organizationId,
      countryCode,
      countryName: await this.getCountryName(countryCode),
      currency: await this.getCurrency(countryCode),
      timeZone: await this.getTimeZone(countryCode),
      businessCalendar: {
        holidays: await this.loadHolidays(countryCode),
        agriculturalCycles: await this.loadAgriculturalCycles(countryCode),
        businessSeasons: await this.loadBusinessSeasons(countryCode),
        workingDays: [1, 2, 3, 4, 5], // Monday-Friday default
        fiscalYearStart: { month: 1, day: 1 }, // January 1st default
      },
      economicFactors: await this.loadEconomicFactors(countryCode),
      culturalFactors: await this.loadCulturalFactors(countryCode),
    };

    return baseConfig;
  }

  /**
   * Generate holiday dates for a date range
   */
  private generateHolidayDates(holiday: Holiday, start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    
    if (holiday.isFixed) {
      // Fixed date holidays (like Christmas, New Year)
      const year = start.getFullYear();
      const endYear = end.getFullYear();
      
      for (let y = year; y <= endYear; y++) {
        const holidayDate = new Date(y, holiday.month - 1, holiday.day);
        
        if (isAfter(holidayDate, start) && isBefore(holidayDate, end)) {
          dates.push(startOfDay(holidayDate));
        }
      }
    } else {
      // Moving holidays (like Easter) - would need specific calculation
      // For now, we'll skip these and let specific implementations handle them
    }
    
    return dates;
  }

  /**
   * Generate agricultural cycle dates
   */
  private generateAgriculturalDates(cycle: AgriculturalCycle, start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const year = start.getFullYear();
    const endYear = end.getFullYear();
    
    for (let y = year; y <= endYear; y++) {
      // Add event at start of cycle
      const cycleStart = new Date(y, cycle.startMonth - 1, 15); // Mid-month
      
      if (isAfter(cycleStart, start) && isBefore(cycleStart, end)) {
        dates.push(startOfDay(cycleStart));
      }
    }
    
    return dates;
  }

  /**
   * Generate business season dates
   */
  private generateSeasonDates(season: BusinessSeason, start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const year = start.getFullYear();
    const endYear = end.getFullYear();
    
    for (let y = year; y <= endYear; y++) {
      const seasonStart = new Date(y, season.startMonth - 1, 1);
      
      if (isAfter(seasonStart, start) && isBefore(seasonStart, end)) {
        dates.push(startOfDay(seasonStart));
      }
    }
    
    return dates;
  }

  // Placeholder methods that would load from database configuration
  private async getCountryName(countryCode: string): Promise<string> {
    const countries: Record<string, string> = {
      US: 'United States',
      UG: 'Uganda',
      KE: 'Kenya',
      NG: 'Nigeria',
      GB: 'United Kingdom',
      // ... more countries
    };
    return countries[countryCode] || countryCode;
  }

  private async getCurrency(countryCode: string): Promise<string> {
    const currencies: Record<string, string> = {
      US: 'USD',
      UG: 'UGX',
      KE: 'KES',
      NG: 'NGN',
      GB: 'GBP',
      // ... more currencies
    };
    return currencies[countryCode] || 'USD';
  }

  private async getTimeZone(countryCode: string): Promise<string> {
    const timeZones: Record<string, string> = {
      US: 'America/New_York',
      UG: 'Africa/Kampala',
      KE: 'Africa/Nairobi',
      NG: 'Africa/Lagos',
      GB: 'Europe/London',
      // ... more time zones
    };
    return timeZones[countryCode] || 'UTC';
  }

  private async loadHolidays(countryCode: string): Promise<Holiday[]> {
    // This would load from a holidays configuration table
    const holidayConfigs: Record<string, Holiday[]> = {
      UG: [
        { name: 'New Year', month: 1, day: 1, isFixed: true, demandImpact: 1.4, duration: 3 },
        { name: 'Liberation Day', month: 1, day: 26, isFixed: true, demandImpact: 1.2, duration: 1 },
        { name: 'International Women\'s Day', month: 3, day: 8, isFixed: true, demandImpact: 1.1, duration: 1 },
        { name: 'Labour Day', month: 5, day: 1, isFixed: true, demandImpact: 1.2, duration: 1 },
        { name: 'Martyrs Day', month: 6, day: 3, isFixed: true, demandImpact: 1.25, duration: 2 },
        { name: 'Heroes Day', month: 6, day: 9, isFixed: true, demandImpact: 1.15, duration: 1 },
        { name: 'Independence Day', month: 10, day: 9, isFixed: true, demandImpact: 1.35, duration: 2 },
        { name: 'Christmas', month: 12, day: 25, isFixed: true, demandImpact: 1.5, duration: 5 },
        { name: 'Boxing Day', month: 12, day: 26, isFixed: true, demandImpact: 1.3, duration: 2 },
      ],
      US: [
        { name: 'New Year', month: 1, day: 1, isFixed: true, demandImpact: 1.3, duration: 2 },
        { name: 'Independence Day', month: 7, day: 4, isFixed: true, demandImpact: 1.4, duration: 3 },
        { name: 'Thanksgiving', month: 11, day: 24, isFixed: false, demandImpact: 1.6, duration: 4 },
        { name: 'Christmas', month: 12, day: 25, isFixed: true, demandImpact: 1.5, duration: 5 },
      ],
      // ... more countries
    };
    
    return holidayConfigs[countryCode] || [];
  }

  private async loadAgriculturalCycles(countryCode: string): Promise<AgriculturalCycle[]> {
    const agricultureConfigs: Record<string, AgriculturalCycle[]> = {
      UG: [
        {
          name: 'First Harvest Season',
          type: 'HARVEST',
          startMonth: 3,
          endMonth: 4,
          demandImpact: 0.85,
          affectedProducts: ['Food & Beverages', 'Staple Foods'],
        },
        {
          name: 'Second Harvest Season',
          type: 'HARVEST',
          startMonth: 9,
          endMonth: 10,
          demandImpact: 0.85,
          affectedProducts: ['Food & Beverages', 'Staple Foods'],
        },
      ],
      US: [
        {
          name: 'Harvest Season',
          type: 'HARVEST',
          startMonth: 9,
          endMonth: 11,
          demandImpact: 0.9,
          affectedProducts: ['Food & Beverages'],
        },
      ],
      // ... more countries
    };
    
    return agricultureConfigs[countryCode] || [];
  }

  private async loadBusinessSeasons(countryCode: string): Promise<BusinessSeason[]> {
    return [
      {
        name: 'Holiday Season',
        type: 'PEAK',
        startMonth: 11,
        endMonth: 1,
        demandMultiplier: 1.2,
        affectedCategories: ['Electronics', 'Personal Care'],
        description: 'Holiday shopping season',
      },
      {
        name: 'Back to School',
        type: 'PEAK',
        startMonth: 8,
        endMonth: 9,
        demandMultiplier: 1.15,
        affectedCategories: ['Electronics', 'Household Items'],
        description: 'Back to school shopping period',
      },
    ];
  }

  private async loadEconomicFactors(countryCode: string): Promise<EconomicFactors> {
    const economicConfigs: Record<string, EconomicFactors> = {
      UG: {
        regionalMultipliers: {
          'Central': 1.5,
          'Eastern': 1.0,
          'Western': 0.8,
          'Northern': 0.6,
        },
        urbanVsRuralFactor: 1.3,
        inflationRate: 0.05,
        seasonalityStrength: 0.8,
      },
      US: {
        regionalMultipliers: {
          'Northeast': 1.2,
          'Southeast': 1.0,
          'Midwest': 0.9,
          'West': 1.1,
        },
        urbanVsRuralFactor: 1.4,
        inflationRate: 0.03,
        seasonalityStrength: 0.6,
      },
      // ... more countries
    };
    
    return economicConfigs[countryCode] || {
      regionalMultipliers: {},
      urbanVsRuralFactor: 1.0,
      inflationRate: 0.02,
      seasonalityStrength: 0.5,
    };
  }

  private async loadCulturalFactors(countryCode: string): Promise<CulturalFactors> {
    return {
      religiousDemographics: {},
      languagePreferences: [],
      consumptionPatterns: {},
    };
  }

  /**
   * Get regional risk multiplier for Safety Stock calculations
   * This adjusts safety stock levels based on regional risk factors
   */
  getRegionalRiskMultiplier(country: string): number {
    const config = this.getCountryConfig(country);
    
    // Base multiplier from economic stability and infrastructure
    let multiplier = 1.0;
    
    // Adjust based on economic indicators
    if (config.economicStability < 0.7) {
      multiplier += 0.3; // Higher risk = more safety stock
    } else if (config.economicStability < 0.8) {
      multiplier += 0.15;
    }
    
    // Adjust based on infrastructure quality
    if (config.infrastructureQuality < 0.7) {
      multiplier += 0.2;
    } else if (config.infrastructureQuality < 0.8) {
      multiplier += 0.1;
    }
    
    // Adjust based on supply chain reliability
    if (config.supplyChainReliability < 0.7) {
      multiplier += 0.25;
    } else if (config.supplyChainReliability < 0.8) {
      multiplier += 0.1;
    }
    
    // Cap the maximum multiplier to prevent excessive safety stock
    return Math.min(multiplier, 2.0);
  }

  /**
   * Get seasonal adjustment factors for demand forecasting
   * Used by safety stock calculations to account for seasonal variations
   */
  getSeasonalAdjustments(country: string): { [month: number]: number } {
    const config = this.getCountryConfig(country);
    
    // Default seasonal pattern (Northern Hemisphere business cycle)
    const defaultPattern = {
      1: 0.9,  // January - post-holiday slow
      2: 0.85, // February - lowest
      3: 1.0,  // March - recovery
      4: 1.05, // April
      5: 1.1,  // May - spring peak
      6: 1.0,  // June
      7: 0.95, // July - summer slow
      8: 0.9,  // August
      9: 1.1,  // September - back-to-school/work
      10: 1.15, // October - pre-holiday buildup
      11: 1.2,  // November - holiday season
      12: 1.1   // December - holiday peak
    };
    
    // Adjust for Southern Hemisphere countries
    if (config.hemisphere === 'Southern') {
      // Shift seasonal pattern by 6 months
      const shiftedPattern: { [month: number]: number } = {};
      for (let month = 1; month <= 12; month++) {
        const shiftedMonth = ((month + 5) % 12) + 1;
        shiftedPattern[month] = defaultPattern[shiftedMonth];
      }
      return shiftedPattern;
    }
    
    return defaultPattern;
  }

  /**
   * Get lead time variability factor for regional supply chains
   */
  getLeadTimeVariabilityFactor(country: string): number {
    const config = this.getCountryConfig(country);
    
    // Base variability (1.0 = no additional variability)
    let variability = 1.0;
    
    // Increase variability based on infrastructure issues
    if (config.infrastructureQuality < 0.6) {
      variability += 0.5; // 50% more variable lead times
    } else if (config.infrastructureQuality < 0.8) {
      variability += 0.2; // 20% more variable
    }
    
    // Adjust for supply chain reliability
    if (config.supplyChainReliability < 0.7) {
      variability += 0.3;
    }
    
    return Math.min(variability, 2.0); // Cap at 2x variability
  }
}