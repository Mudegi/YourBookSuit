'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  RefreshCw, 
  Download, 
  Upload, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
  isBase: boolean;
  displayOrder: number;
}

interface ExchangeRate {
  id: string;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rate: string;
  effectiveDate: string;
  source: string;
  isManualOverride: boolean;
}

interface OrganizationSettings {
  baseCurrency: string;
  fxGainAccountId: string | null;
  fxLossAccountId: string | null;
  unrealizedFxGainAccountId: string | null;
  unrealizedFxLossAccountId: string | null;
  defaultExchangeRateProvider: string | null;
  enableAutoFetchRates: boolean;
  exchangeRateBufferPercent: string | null;
}

export default function CurrencySettingsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [loading, setLoading] = useState(true);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [fetchingRates, setFetchingRates] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCurrency, setNewCurrency] = useState({
    code: '',
    name: '',
    symbol: '',
    decimalPlaces: 2,
  });
  const [submitting, setSubmitting] = useState(false);

  // Common currencies for quick selection
  const commonCurrencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵' },
    { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
  ];

  useEffect(() => {
    fetchData();
  }, [orgSlug]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch currencies
      const currenciesRes = await fetch(`/api/${orgSlug}/currencies`);
      if (currenciesRes.ok) {
        const currenciesData = await currenciesRes.json();
        setCurrencies(currenciesData.data || []);
      }

      // Fetch exchange rates
      const ratesRes = await fetch(`/api/${orgSlug}/exchange-rates?date=${selectedDate}`);
      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        setExchangeRates(ratesData.data || []);
      }

      // Fetch organization settings
      const settingsRes = await fetch(`/api/${orgSlug}/settings/currency`);
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData.data);
      }
    } catch (error) {
      console.error('Error fetching currency data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchRates = async () => {
    try {
      setFetchingRates(true);
      const res = await fetch(`/api/${orgSlug}/exchange-rates/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Successfully fetched ${data.ratesFetched} exchange rates`);
        await fetchData();
      } else {
        const error = await res.json();
        alert(`Failed to fetch rates: ${error.message}`);
      }
    } catch (error) {
      console.error('Error fetching rates:', error);
      alert('Failed to fetch exchange rates');
    } finally {
      setFetchingRates(false);
    }
  };

  const handleAddCurrency = () => {
    setAddDialogOpen(true);
  };

  const handleCurrencySelect = (code: string) => {
    const selected = commonCurrencies.find(c => c.code === code);
    if (selected) {
      setNewCurrency({
        code: selected.code,
        name: selected.name,
        symbol: selected.symbol,
        decimalPlaces: ['JPY', 'KRW'].includes(selected.code) ? 0 : 2,
      });
    }
  };

  const handleSubmitCurrency = async () => {
    if (!newCurrency.code || !newCurrency.name || !newCurrency.symbol) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/orgs/${orgSlug}/currencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          code: newCurrency.code.toUpperCase(),
          name: newCurrency.name,
          symbol: newCurrency.symbol,
          decimalPlaces: newCurrency.decimalPlaces,
          isActive: true,
        }),
      });

      if (res.ok) {
        alert('Currency added successfully');
        setAddDialogOpen(false);
        setNewCurrency({ code: '', name: '', symbol: '', decimalPlaces: 2 });
        await fetchData();
      } else {
        const error = await res.json();
        alert(`Failed to add currency: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding currency:', error);
      alert('Failed to add currency');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRate = (rate: ExchangeRate) => {
    router.push(`/${orgSlug}/settings/currencies/rates/${rate.id}`);
  };

  const baseCurrency = currencies.find(c => c.isBase);
  const activeCurrencies = currencies.filter(c => c.isActive);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Multi-Currency Management</h1>
          <p className="text-gray-600 mt-1">
            Manage currencies and exchange rates for your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleFetchRates} disabled={fetchingRates}>
            <RefreshCw className={`w-4 h-4 mr-2 ${fetchingRates ? 'animate-spin' : ''}`} />
            Fetch Latest Rates
          </Button>
          <Button onClick={handleAddCurrency}>
            <Plus className="w-4 h-4 mr-2" />
            Add Currency
          </Button>
        </div>
      </div>

      {/* Base Currency Info */}
      {baseCurrency && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <CardTitle>Base Currency</CardTitle>
            </div>
            <CardDescription>
              All transactions are recorded in this currency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold">{baseCurrency.symbol}</div>
              <div>
                <div className="font-semibold text-lg">{baseCurrency.name}</div>
                <div className="text-sm text-gray-600">
                  {baseCurrency.code} • {baseCurrency.decimalPlaces} decimal places
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Currencies */}
      <Card>
        <CardHeader>
          <CardTitle>Active Currencies</CardTitle>
          <CardDescription>
            Currencies enabled for transactions in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCurrencies.map((currency) => (
              <Card key={currency.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{currency.symbol}</span>
                      {currency.isBase && (
                        <Badge variant="default">Base</Badge>
                      )}
                    </div>
                    <div className="font-semibold mt-1">{currency.name}</div>
                    <div className="text-sm text-gray-600">{currency.code}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Exchange Rates Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Exchange Rates</CardTitle>
              <CardDescription>
                Current exchange rates as of {new Date(selectedDate).toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded px-3 py-1"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {exchangeRates.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No exchange rates found for this date</p>
              <p className="text-sm text-gray-500 mt-2">
                Click "Fetch Latest Rates" to get current exchange rates
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Currency Pair</th>
                    <th className="text-right py-3 px-4">Rate</th>
                    <th className="text-center py-3 px-4">Source</th>
                    <th className="text-center py-3 px-4">Effective Date</th>
                    <th className="text-center py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exchangeRates.map((rate) => {
                    const rateValue = parseFloat(rate.rate);
                    const isIncreasing = rateValue > 1;
                    
                    return (
                      <tr key={rate.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">
                            {rate.fromCurrencyCode}/{rate.toCurrencyCode}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-mono font-semibold">
                              {parseFloat(rate.rate).toFixed(6)}
                            </span>
                            {isIncreasing ? (
                              <TrendingUp className="w-4 h-4 text-green-600" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={rate.isManualOverride ? 'secondary' : 'default'}>
                            {rate.source}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-600">
                          {new Date(rate.effectiveDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRate(rate)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>Currency Settings</CardTitle>
            <CardDescription>
              Configure exchange rate providers and FX accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Exchange Rate Provider
                </label>
                <div className="mt-1 text-sm">
                  {settings.defaultExchangeRateProvider || 'MANUAL'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Auto-Fetch Rates
                </label>
                <div className="mt-1">
                  <Badge variant={settings.enableAutoFetchRates ? 'default' : 'secondary'}>
                    {settings.enableAutoFetchRates ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </div>

            {settings.exchangeRateBufferPercent && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Exchange Rate Buffer
                </label>
                <div className="mt-1 text-sm">
                  {settings.exchangeRateBufferPercent}% (applied to purchases)
                </div>
              </div>
            )}

            <div className="pt-4">
              <Button variant="outline" onClick={() => router.push(`/${orgSlug}/settings/currencies/configure`)}>
                Configure Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Currency Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Currency</DialogTitle>
            <DialogDescription>
              Add a new currency to your organization for multi-currency transactions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currency-select">Quick Select</Label>
              <Select onValueChange={handleCurrencySelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a common currency" />
                </SelectTrigger>
                <SelectContent>
                  {commonCurrencies.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.code} - {curr.name} ({curr.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Currency Code *</Label>
                <Input
                  id="code"
                  placeholder="USD"
                  value={newCurrency.code}
                  onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol *</Label>
                <Input
                  id="symbol"
                  placeholder="$"
                  value={newCurrency.symbol}
                  onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Currency Name *</Label>
              <Input
                id="name"
                placeholder="US Dollar"
                value={newCurrency.name}
                onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="decimals">Decimal Places</Label>
              <Select
                value={newCurrency.decimalPlaces.toString()}
                onValueChange={(value) => setNewCurrency({ ...newCurrency, decimalPlaces: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 (e.g., JPY, KRW)</SelectItem>
                  <SelectItem value="2">2 (most currencies)</SelectItem>
                  <SelectItem value="3">3 (e.g., BHD, KWD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitCurrency} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Currency'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
