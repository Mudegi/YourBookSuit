'use client';

import { useState, useEffect } from 'react';
import { ExchangeRateService } from '@/services/currency/exchange-rate.service';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isBase: boolean;
}

interface CurrencySelectorProps {
  organizationId?: string;
  orgSlug: string;
  value: string;
  onChange: (currency: string) => void;
  onRateChange?: (rate: number) => void;
  onBaseCurrencyAmountChange?: (amount: number) => void;
  amount?: number;
  transactionDate?: Date;
  disabled?: boolean;
  showRateInput?: boolean;
  showEquivalent?: boolean;
  className?: string;
}

export function CurrencySelector({
  organizationId,
  orgSlug,
  value,
  onChange,
  onRateChange,
  onBaseCurrencyAmountChange,
  amount,
  transactionDate = new Date(),
  disabled = false,
  showRateInput = true,
  showEquivalent = true,
  className = '',
}: CurrencySelectorProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState<string>('');
  const [manualRate, setManualRate] = useState(false);

  useEffect(() => {
    fetchCurrencies();
  }, [orgSlug]);

  useEffect(() => {
    if (value && value !== baseCurrency) {
      fetchExchangeRate();
    } else {
      setExchangeRate(1);
      if (onRateChange) {
        onRateChange(1);
      }
    }
  }, [value, baseCurrency, transactionDate]);

  useEffect(() => {
    if (amount && exchangeRate && onBaseCurrencyAmountChange) {
      const baseCurrencyAmount = amount * exchangeRate;
      onBaseCurrencyAmountChange(baseCurrencyAmount);
    }
  }, [amount, exchangeRate]);

  const fetchCurrencies = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/currencies`);
      if (response.ok) {
        const data = await response.json();
        setCurrencies(data.data || []);
        
        // Find base currency
        const base = data.data?.find((c: Currency) => c.isBase);
        if (base) {
          setBaseCurrency(base.code);
        }
      }
    } catch (error) {
      console.error('Error fetching currencies:', error);
    }
  };

  const fetchExchangeRate = async () => {
    if (!organizationId || !value || value === baseCurrency) return;

    setIsLoadingRate(true);
    try {
      const rate = await ExchangeRateService.getRate(
        organizationId,
        value,
        baseCurrency,
        transactionDate
      );
      
      const rateNumber = rate.toNumber();
      setExchangeRate(rateNumber);
      
      if (onRateChange) {
        onRateChange(rateNumber);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      // If rate not found, default to 1 but alert user
      setExchangeRate(1);
      if (onRateChange) {
        onRateChange(1);
      }
    } finally {
      setIsLoadingRate(false);
    }
  };

  const handleCurrencyChange = (newCurrency: string) => {
    onChange(newCurrency);
    setManualRate(false);
  };

  const handleRateChange = (newRate: number) => {
    setExchangeRate(newRate);
    setManualRate(true);
    if (onRateChange) {
      onRateChange(newRate);
    }
  };

  const selectedCurrency = currencies.find(c => c.code === value);
  const baseCurrencyObj = currencies.find(c => c.code === baseCurrency);
  const isForeignCurrency = value !== baseCurrency;
  const baseCurrencyAmount = amount && exchangeRate ? amount * exchangeRate : 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Currency Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Currency
        </label>
        <select
          value={value}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          disabled={disabled}
          className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Select currency...</option>
          {currencies.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.code} - {currency.name} ({currency.symbol})
              {currency.isBase && ' (Base)'}
            </option>
          ))}
        </select>
      </div>

      {/* Exchange Rate Input (only for foreign currencies) */}
      {isForeignCurrency && showRateInput && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Exchange Rate
            {isLoadingRate && (
              <span className="ml-2 text-xs text-gray-500">(Loading...)</span>
            )}
            {manualRate && (
              <span className="ml-2 text-xs text-amber-600">(Manual Override)</span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">1 {value} =</span>
            <input
              type="number"
              value={exchangeRate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value) || 1)}
              step="0.000001"
              min="0"
              disabled={disabled || isLoadingRate}
              className="flex-1 border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-gray-600">{baseCurrency}</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Exchange rate as of {transactionDate.toLocaleDateString()}
            {!manualRate && ' (automatically fetched)'}
          </p>
        </div>
      )}

      {/* Base Currency Equivalent */}
      {isForeignCurrency && showEquivalent && amount && amount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="text-sm text-gray-700 font-medium mb-1">
            Equivalent in {baseCurrencyObj?.name || baseCurrency}
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {baseCurrencyObj?.symbol || baseCurrency} {baseCurrencyAmount.toLocaleString(undefined, {
              minimumFractionDigits: baseCurrencyObj?.decimalPlaces || 2,
              maximumFractionDigits: baseCurrencyObj?.decimalPlaces || 2,
            })}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {selectedCurrency?.symbol}{amount.toLocaleString()} × {exchangeRate.toFixed(6)} = {baseCurrencyObj?.symbol}{baseCurrencyAmount.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

export default CurrencySelector;
