/**
 * Currency formatting and conversion utilities
 */

import { Decimal } from 'decimal.js';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimals: 2 },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimals: 2 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2 },
  // African Currencies
  UGX: { code: 'UGX', symbol: 'UGX', name: 'Ugandan Shilling', decimals: 0 },
  KES: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', decimals: 2 },
  TZS: { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', decimals: 2 },
  RWF: { code: 'RWF', symbol: 'RF', name: 'Rwandan Franc', decimals: 0 },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', decimals: 2 },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', decimals: 2 },
  GHS: { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', decimals: 2 },
  ETB: { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', decimals: 2 },
};

/**
 * Format amount with currency symbol
 */
export function formatCurrency(
  amount: number | string | Decimal,
  currencyCode: string = 'USD',
  showSymbol: boolean = true
): string {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const numAmount =
    amount instanceof Decimal ? amount.toNumber() : Number(amount);

  const formatted = numAmount.toFixed(currency.decimals);
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (showSymbol) {
    return `${currency.symbol}${parts.join('.')}`;
  }

  return parts.join('.');
}

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
  amount: number | Decimal,
  fromRate: number,
  toRate: number
): Decimal {
  const amt = amount instanceof Decimal ? amount : new Decimal(amount);
  const from = new Decimal(fromRate);
  const to = new Decimal(toRate);

  // Convert to base currency, then to target currency
  return amt.times(from).dividedBy(to);
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and commas
  const cleaned = value.replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Format currency for display in tables/reports
 */
export function formatCurrencyCompact(
  amount: number | Decimal,
  currencyCode: string = 'USD'
): string {
  const numAmount =
    amount instanceof Decimal ? amount.toNumber() : Number(amount);
  const absAmount = Math.abs(numAmount);
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;

  let formatted: string;
  if (absAmount >= 1000000) {
    formatted = `${(numAmount / 1000000).toFixed(1)}M`;
  } else if (absAmount >= 1000) {
    formatted = `${(numAmount / 1000).toFixed(1)}K`;
  } else {
    formatted = numAmount.toFixed(currency.decimals);
  }

  return `${currency.symbol}${formatted}`;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCIES[currencyCode]?.symbol || currencyCode;
}

/**
 * Validate currency code
 */
export function isValidCurrency(code: string): boolean {
  return code in CURRENCIES;
}

/**
 * Format amount with positive/negative styling
 */
export function formatCurrencyWithSign(
  amount: number | Decimal,
  currencyCode: string = 'USD'
): { value: string; isPositive: boolean; isNegative: boolean } {
  const numAmount =
    amount instanceof Decimal ? amount.toNumber() : Number(amount);

  return {
    value: formatCurrency(Math.abs(numAmount), currencyCode),
    isPositive: numAmount > 0,
    isNegative: numAmount < 0,
  };
}
