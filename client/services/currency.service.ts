/**
 * Currency Service
 * Handles organization-specific currency formatting and conversion
 */

import prisma from '@/lib/prisma';

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
  locale: string;
}

export interface OrganizationLocale {
  country: string;
  currency: string;
  locale: string;
  timezone: string;
}

export class CurrencyService {
  private static currencyCache = new Map<string, CurrencyInfo>();
  private static orgLocaleCache = new Map<string, OrganizationLocale>();

  /**
   * Get organization's locale settings
   */
  static async getOrganizationLocale(organizationId: string): Promise<OrganizationLocale> {
    if (this.orgLocaleCache.has(organizationId)) {
      return this.orgLocaleCache.get(organizationId)!;
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        homeCountry: true,
        baseCurrency: true,
      },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const locale = this.getLocaleFromCountry(organization.homeCountry);
    
    const orgLocale: OrganizationLocale = {
      country: organization.homeCountry,
      currency: organization.baseCurrency,
      locale: locale,
      timezone: this.getTimezoneFromCountry(organization.homeCountry),
    };

    this.orgLocaleCache.set(organizationId, orgLocale);
    return orgLocale;
  }

  /**
   * Get currency information
   */
  static getCurrencyInfo(currencyCode: string): CurrencyInfo {
    if (this.currencyCache.has(currencyCode)) {
      return this.currencyCache.get(currencyCode)!;
    }

    const currencyInfo = this.getCurrencyData(currencyCode);
    this.currencyCache.set(currencyCode, currencyInfo);
    return currencyInfo;
  }

  /**
   * Format currency amount using organization's currency
   */
  static async formatCurrency(
    amount: number | string,
    organizationId: string,
    options?: {
      showSymbol?: boolean;
      showCode?: boolean;
      decimalPlaces?: number;
    }
  ): Promise<string> {
    const orgLocale = await this.getOrganizationLocale(organizationId);
    const currencyInfo = this.getCurrencyInfo(orgLocale.currency);
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const decimalPlaces = options?.decimalPlaces ?? currencyInfo.decimalPlaces;

    // Format using the organization's locale
    const formatter = new Intl.NumberFormat(orgLocale.locale, {
      style: 'currency',
      currency: orgLocale.currency,
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });

    let formatted = formatter.format(numAmount);

    // Handle custom display options
    if (options?.showCode && !options?.showSymbol) {
      // Replace symbol with code
      formatted = formatted.replace(currencyInfo.symbol, currencyInfo.code);
    } else if (options?.showCode && options?.showSymbol) {
      // Add code after formatted amount
      formatted = `${formatted} (${currencyInfo.code})`;
    } else if (options?.showSymbol === false) {
      // Remove symbol, just show number
      formatted = numAmount.toLocaleString(orgLocale.locale, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      });
    }

    return formatted;
  }

  /**
   * Get locale string from country code
   */
  private static getLocaleFromCountry(countryCode: string): string {
    const locales: Record<string, string> = {
      US: 'en-US',
      UG: 'en-UG',
      KE: 'en-KE',
      NG: 'en-NG',
      GB: 'en-GB',
      CA: 'en-CA',
      AU: 'en-AU',
      ZA: 'en-ZA',
      IN: 'en-IN',
      // Add more as needed
    };
    return locales[countryCode] || 'en-US';
  }

  /**
   * Get timezone from country code
   */
  private static getTimezoneFromCountry(countryCode: string): string {
    const timezones: Record<string, string> = {
      US: 'America/New_York',
      UG: 'Africa/Kampala',
      KE: 'Africa/Nairobi',
      NG: 'Africa/Lagos',
      GB: 'Europe/London',
      CA: 'America/Toronto',
      AU: 'Australia/Sydney',
      ZA: 'Africa/Johannesburg',
      IN: 'Asia/Kolkata',
      // Add more as needed
    };
    return timezones[countryCode] || 'UTC';
  }

  /**
   * Get currency data
   */
  private static getCurrencyData(currencyCode: string): CurrencyInfo {
    const currencies: Record<string, CurrencyInfo> = {
      USD: {
        code: 'USD',
        symbol: '$',
        name: 'US Dollar',
        decimalPlaces: 2,
        locale: 'en-US',
      },
      UGX: {
        code: 'UGX',
        symbol: 'USh',
        name: 'Ugandan Shilling',
        decimalPlaces: 0, // UGX typically doesn't use decimal places
        locale: 'en-UG',
      },
      KES: {
        code: 'KES',
        symbol: 'KSh',
        name: 'Kenyan Shilling',
        decimalPlaces: 2,
        locale: 'en-KE',
      },
      NGN: {
        code: 'NGN',
        symbol: '₦',
        name: 'Nigerian Naira',
        decimalPlaces: 2,
        locale: 'en-NG',
      },
      GBP: {
        code: 'GBP',
        symbol: '£',
        name: 'British Pound',
        decimalPlaces: 2,
        locale: 'en-GB',
      },
      EUR: {
        code: 'EUR',
        symbol: '€',
        name: 'Euro',
        decimalPlaces: 2,
        locale: 'en-EU',
      },
      // Add more currencies as needed
    };

    return currencies[currencyCode] || currencies['USD'];
  }

  /**
   * Clear cache (useful for testing or when organization settings change)
   */
  static clearCache() {
    this.currencyCache.clear();
    this.orgLocaleCache.clear();
  }
}