/**
 * Exchange Rate Service
 * Handles exchange rate management, fetching, and calculations
 * 
 * Features:
 * - Fetch rates from external APIs (Oanda, XE, ECB)
 * - Manual rate entry and override
 * - Historical rate tracking
 * - Rate caching and optimization
 */

import { Decimal } from 'decimal.js';
import prisma from '@/lib/prisma';

export interface ExchangeRateData {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: Date;
  source?: string;
}

export interface FetchRatesOptions {
  provider?: 'MANUAL' | 'OANDA' | 'XE' | 'ECB' | 'FIXER';
  apiKey?: string;
}

export class ExchangeRateService {
  private static rateCache = new Map<string, { rate: Decimal; timestamp: number }>();
  private static CACHE_DURATION_MS = 3600000; // 1 hour

  /**
   * Get exchange rate for a specific date
   * Falls back to most recent rate if exact date not found
   */
  static async getRate(
    organizationId: string,
    fromCurrency: string,
    toCurrency: string,
    effectiveDate: Date = new Date()
  ): Promise<Decimal> {
    // Same currency = 1
    if (fromCurrency === toCurrency) {
      return new Decimal(1);
    }

    // Check if it's the base currency
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { baseCurrency: true },
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // If converting to/from base currency, fetch the rate
    // Otherwise, cross-calculate using base currency
    const cacheKey = `${organizationId}:${fromCurrency}:${toCurrency}:${effectiveDate.toISOString().split('T')[0]}`;
    
    const cached = this.rateCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION_MS) {
      return cached.rate;
    }

    // Find the rate for this date or the most recent before it
    const exchangeRate = await prisma.exchangeRate.findFirst({
      where: {
        organizationId,
        fromCurrencyCode: fromCurrency,
        toCurrencyCode: toCurrency,
        effectiveDate: {
          lte: effectiveDate,
        },
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    });

    if (!exchangeRate) {
      // Try inverse rate
      const inverseRate = await prisma.exchangeRate.findFirst({
        where: {
          organizationId,
          fromCurrencyCode: toCurrency,
          toCurrencyCode: fromCurrency,
          effectiveDate: {
            lte: effectiveDate,
          },
        },
        orderBy: {
          effectiveDate: 'desc',
        },
      });

      if (inverseRate) {
        const rate = new Decimal(1).div(new Decimal(inverseRate.rate.toString()));
        this.rateCache.set(cacheKey, { rate, timestamp: Date.now() });
        return rate;
      }

      throw new Error(
        `Exchange rate not found for ${fromCurrency} to ${toCurrency} on ${effectiveDate.toISOString()}`
      );
    }

    const rate = new Decimal(exchangeRate.rate.toString());
    this.rateCache.set(cacheKey, { rate, timestamp: Date.now() });
    return rate;
  }

  /**
   * Convert amount from one currency to another
   */
  static async convertAmount(
    organizationId: string,
    amount: number | Decimal,
    fromCurrency: string,
    toCurrency: string,
    effectiveDate: Date = new Date()
  ): Promise<Decimal> {
    const rate = await this.getRate(organizationId, fromCurrency, toCurrency, effectiveDate);
    const amountDecimal = amount instanceof Decimal ? amount : new Decimal(amount);
    return amountDecimal.times(rate);
  }

  /**
   * Save or update an exchange rate
   */
  static async saveRate(
    organizationId: string,
    data: ExchangeRateData
  ): Promise<any> {
    const { fromCurrency, toCurrency, rate, effectiveDate, source = 'MANUAL' } = data;

    // Ensure currencies exist
    await this.ensureCurrencyExists(organizationId, fromCurrency);
    await this.ensureCurrencyExists(organizationId, toCurrency);

    // Upsert the rate
    const exchangeRate = await prisma.exchangeRate.upsert({
      where: {
        organizationId_fromCurrencyCode_toCurrencyCode_effectiveDate: {
          organizationId,
          fromCurrencyCode: fromCurrency,
          toCurrencyCode: toCurrency,
          effectiveDate: effectiveDate,
        },
      },
      create: {
        organizationId,
        fromCurrencyCode: fromCurrency,
        toCurrencyCode: toCurrency,
        rate: new Decimal(rate),
        effectiveDate,
        source,
        isManualOverride: source === 'MANUAL',
      },
      update: {
        rate: new Decimal(rate),
        source,
        isManualOverride: source === 'MANUAL',
      },
    });

    // Clear cache for this rate
    const cacheKey = `${organizationId}:${fromCurrency}:${toCurrency}:${effectiveDate.toISOString().split('T')[0]}`;
    this.rateCache.delete(cacheKey);

    return exchangeRate;
  }

  /**
   * Fetch latest rates from external API
   */
  static async fetchLatestRates(
    organizationId: string,
    options: FetchRatesOptions = {}
  ): Promise<{ success: boolean; ratesFetched: number; errors: string[] }> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        baseCurrency: true,
        defaultExchangeRateProvider: true,
        currencies: {
          where: { isActive: true },
          select: { code: true },
        },
      },
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    const provider = options.provider || org.defaultExchangeRateProvider || 'MANUAL';
    
    if (provider === 'MANUAL') {
      return { success: false, ratesFetched: 0, errors: ['Manual rate entry required'] };
    }

    const errors: string[] = [];
    let ratesFetched = 0;
    const baseCurrency = org.baseCurrency;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch rates for each active currency
    for (const currency of org.currencies) {
      if (currency.code === baseCurrency) continue;

      try {
        let rate: number | null = null;

        // Fetch from appropriate provider
        switch (provider) {
          case 'ECB':
            rate = await this.fetchFromECB(baseCurrency, currency.code);
            break;
          case 'FIXER':
            rate = await this.fetchFromFixer(baseCurrency, currency.code, options.apiKey);
            break;
          // Add other providers as needed
          default:
            throw new Error(`Provider ${provider} not implemented`);
        }

        if (rate) {
          await this.saveRate(organizationId, {
            fromCurrency: baseCurrency,
            toCurrency: currency.code,
            rate,
            effectiveDate: today,
            source: provider,
          });
          ratesFetched++;
        }
      } catch (error) {
        errors.push(`Failed to fetch ${baseCurrency}/${currency.code}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      ratesFetched,
      errors,
    };
  }

  /**
   * Fetch rate from European Central Bank API (free, no key required)
   */
  private static async fetchFromECB(from: string, to: string): Promise<number | null> {
    // ECB only provides EUR base rates
    // This is a simplified example - you'd need to handle cross-rates
    if (from !== 'EUR') {
      throw new Error('ECB API only supports EUR as base currency');
    }

    try {
      const response = await fetch(
        `https://api.exchangerate.host/latest?base=${from}&symbols=${to}`
      );
      const data = await response.json();
      return data.rates?.[to] || null;
    } catch (error) {
      console.error('ECB fetch error:', error);
      return null;
    }
  }

  /**
   * Fetch rate from Fixer API (requires API key)
   */
  private static async fetchFromFixer(
    from: string,
    to: string,
    apiKey?: string
  ): Promise<number | null> {
    if (!apiKey) {
      throw new Error('Fixer API requires an API key');
    }

    try {
      const response = await fetch(
        `https://api.apilayer.com/fixer/latest?base=${from}&symbols=${to}`,
        {
          headers: {
            apikey: apiKey,
          },
        }
      );
      const data = await response.json();
      return data.rates?.[to] || null;
    } catch (error) {
      console.error('Fixer fetch error:', error);
      return null;
    }
  }

  /**
   * Get exchange rate history for a currency pair
   */
  static async getRateHistory(
    organizationId: string,
    fromCurrency: string,
    toCurrency: string,
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<Array<{ date: Date; rate: Decimal; source: string }>> {
    const rates = await prisma.exchangeRate.findMany({
      where: {
        organizationId,
        fromCurrencyCode: fromCurrency,
        toCurrencyCode: toCurrency,
        effectiveDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        effectiveDate: 'asc',
      },
    });

    return rates.map((r) => ({
      date: r.effectiveDate,
      rate: new Decimal(r.rate.toString()),
      source: r.source,
    }));
  }

  /**
   * Ensure a currency exists in the organization's currency list
   */
  private static async ensureCurrencyExists(
    organizationId: string,
    currencyCode: string
  ): Promise<void> {
    const exists = await prisma.currency.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code: currencyCode,
        },
      },
    });

    if (!exists) {
      // Create with default values - should be populated properly during setup
      const currencyInfo = this.getCurrencyInfo(currencyCode);
      await prisma.currency.create({
        data: {
          organizationId,
          code: currencyCode,
          name: currencyInfo.name,
          symbol: currencyInfo.symbol,
          decimalPlaces: currencyInfo.decimalPlaces,
          isActive: true,
        },
      });
    }
  }

  /**
   * Get currency information by code
   */
  private static getCurrencyInfo(code: string): {
    name: string;
    symbol: string;
    decimalPlaces: number;
  } {
    const currencies: Record<string, { name: string; symbol: string; decimalPlaces: number }> = {
      USD: { name: 'US Dollar', symbol: '$', decimalPlaces: 2 },
      EUR: { name: 'Euro', symbol: '€', decimalPlaces: 2 },
      GBP: { name: 'British Pound', symbol: '£', decimalPlaces: 2 },
      UGX: { name: 'Ugandan Shilling', symbol: 'UGX', decimalPlaces: 0 },
      KES: { name: 'Kenyan Shilling', symbol: 'KES', decimalPlaces: 2 },
      TZS: { name: 'Tanzanian Shilling', symbol: 'TZS', decimalPlaces: 0 },
      ZAR: { name: 'South African Rand', symbol: 'R', decimalPlaces: 2 },
      NGN: { name: 'Nigerian Naira', symbol: '₦', decimalPlaces: 2 },
      // Add more as needed
    };

    return currencies[code] || { name: code, symbol: code, decimalPlaces: 2 };
  }

  /**
   * Clear the rate cache
   */
  static clearCache(organizationId?: string): void {
    if (organizationId) {
      // Clear only for this organization
      for (const key of this.rateCache.keys()) {
        if (key.startsWith(`${organizationId}:`)) {
          this.rateCache.delete(key);
        }
      }
    } else {
      this.rateCache.clear();
    }
  }
}

export default ExchangeRateService;
