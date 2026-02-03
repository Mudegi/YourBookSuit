'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  FileText, 
  Download, 
  Lock, 
  Unlock, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface TaxReturnData {
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  baseCurrency: string;
  basis: 'ACCRUAL' | 'CASH';
  boxes: {
    box1_standardRatedSales: {
      revenue: number;
      outputVAT: number;
      transactionCount: number;
    };
    box2_zeroRatedExemptSales: {
      revenue: number;
      transactionCount: number;
    };
    box3_inputTax: {
      purchases: number;
      inputVAT: number;
      transactionCount: number;
    };
    box4_netTaxPayable: number;
  };
  efrisCompliance: {
    totalTransactions: number;
    fiscalizedTransactions: number;
    nonFiscalizedTransactions: number;
    complianceRate: number;
  };
  breakdown: {
    byTaxRate: Array<{
      taxRuleId: string;
      taxRuleName: string;
      taxRate: number;
      revenue: number;
      taxAmount: number;
      transactionCount: number;
    }>;
  };
  template: any;
  validation: {
    isValid: boolean;
    errors: string[];
  };
  isLocked: boolean;
  lockedAt?: string;
}

interface DrillDownDetail {
  id: string;
  date: string;
  transactionType: string;
  referenceNumber: string;
  customerVendor: string;
  description: string;
  baseAmount: number;
  taxAmount: number;
  taxRate: number;
  taxRuleName: string;
  accountCode: string;
  accountName: string;
  efrisFiscalNumber?: string;
  isFiscalized: boolean;
}

export default function VATReturnPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { organization } = useOrganization();
  const isUganda = organization?.homeCountry === 'UG' || organization?.homeCountry === 'UGANDA';

  // State
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return format(startOfMonth(subMonths(now, 1)), 'yyyy-MM');
  });
  const [basis, setBasis] = useState<'ACCRUAL' | 'CASH'>('ACCRUAL');
  const [countryCode, setCountryCode] = useState('UG');
  const [taxReturn, setTaxReturn] = useState<TaxReturnData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drill-down dialog
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownCategory, setDrillDownCategory] = useState<string>('');
  const [drillDownData, setDrillDownData] = useState<DrillDownDetail[]>([]);
  const [drillDownLoading, setDrillDownLoading] = useState(false);

  // Calculate period dates
  const periodStart = format(startOfMonth(new Date(period + '-01')), 'yyyy-MM-dd');
  const periodEnd = format(endOfMonth(new Date(period + '-01')), 'yyyy-MM-dd');

  // Fetch tax return data
  const fetchTaxReturn = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/tax/vat-return?` +
        `periodStart=${periodStart}&periodEnd=${periodEnd}&basis=${basis}&countryCode=${countryCode}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch VAT return');
      }

      const data = await response.json();
      setTaxReturn(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxReturn();
  }, [period, basis, countryCode]);

  // Open drill-down details
  const openDrillDown = async (category: 'OUTPUT_VAT' | 'INPUT_VAT' | 'ZERO_RATED', title: string) => {
    setDrillDownCategory(title);
    setDrillDownOpen(true);
    setDrillDownLoading(true);

    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/tax/vat-return/details?` +
        `periodStart=${periodStart}&periodEnd=${periodEnd}&category=${category}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch details');
      }

      const data = await response.json();
      setDrillDownData(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setDrillDownLoading(false);
    }
  };

  // Lock/unlock period
  const toggleLock = async () => {
    if (!taxReturn) return;

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/tax/vat-return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart,
          periodEnd,
          action: taxReturn.isLocked ? 'unlock' : 'lock',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to lock/unlock period');
      }

      await fetchTaxReturn();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: taxReturn?.baseCurrency || 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading && !taxReturn) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">VAT Return</h1>
          <p className="text-muted-foreground mt-1">
            Statutory tax reporting for {taxReturn?.template?.taxAuthority || 'Tax Authority'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <FileText className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {taxReturn && (
            <Button
              variant={taxReturn.isLocked ? 'destructive' : 'default'}
              onClick={toggleLock}
            >
              {taxReturn.isLocked ? (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock Period
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Lock & File
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* EFRIS Compliance Notice - Uganda Only */}
      {isUganda && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">EFRIS Compliant VAT Return</p>
                <p className="text-sm text-blue-700 mt-1">
                  This return only includes <strong>fiscalized transactions</strong>:
                </p>
                <ul className="text-sm text-blue-700 mt-2 ml-4 space-y-1 list-disc">
                  <li><strong>Box 1 (Output VAT):</strong> Only invoices with EFRIS FDN (Fiscal Document Number)</li>
                  <li><strong>Box 3 (Input VAT):</strong> Only bills with vendor's EFRIS receipt number</li>
                </ul>
                <p className="text-xs text-blue-600 mt-2">
                  Non-fiscalized transactions are excluded to ensure audit compliance with URA regulations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Period</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = subMonths(new Date(), i);
                    const value = format(date, 'yyyy-MM');
                    const label = format(date, 'MMMM yyyy');
                    return (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Basis</label>
              <Select value={basis} onValueChange={(v) => setBasis(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACCRUAL">Accrual (Standard)</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Country</label>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UG">Uganda (URA)</SelectItem>
                  <SelectItem value="KE">Kenya (KRA)</SelectItem>
                  <SelectItem value="TZ">Tanzania (TRA)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={fetchTaxReturn} className="w-full">
                Regenerate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Alerts */}
      {taxReturn && !taxReturn.validation.isValid && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-destructive">Validation Errors</h3>
                <ul className="mt-2 space-y-1">
                  {taxReturn.validation.errors.map((error, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      • {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lock Status */}
      {taxReturn?.isLocked && (
        <Card className="border-orange-500 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-900">Period Locked</p>
                <p className="text-sm text-orange-700">
                  This period was locked on {taxReturn.lockedAt && format(new Date(taxReturn.lockedAt), 'PPP')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tax Return Summary */}
      {taxReturn && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Box 1: Standard Rated Sales */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => openDrillDown('OUTPUT_VAT', 'Box 1: Standard Rated Sales')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Box 1: Standard Sales</CardTitle>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(taxReturn.boxes.box1_standardRatedSales.revenue)}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(taxReturn.boxes.box1_standardRatedSales.outputVAT)}
                  </p>
                  <p className="text-xs text-muted-foreground">Output VAT (18%)</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {taxReturn.boxes.box1_standardRatedSales.transactionCount} transactions
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Box 2: Zero-Rated/Exempt */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => openDrillDown('ZERO_RATED', 'Box 2: Zero-Rated/Exempt Sales')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Box 2: Zero-Rated/Exempt</CardTitle>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(taxReturn.boxes.box2_zeroRatedExemptSales.revenue)}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-lg font-semibold text-blue-600">
                    {formatCurrency(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">No VAT (0%)</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {taxReturn.boxes.box2_zeroRatedExemptSales.transactionCount} transactions
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Box 3: Input Tax */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => openDrillDown('INPUT_VAT', 'Box 3: Input Tax (Purchases)')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Box 3: Input Tax</CardTitle>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(taxReturn.boxes.box3_inputTax.purchases)}</p>
                  <p className="text-xs text-muted-foreground">Purchases</p>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-lg font-semibold text-orange-600">
                    {formatCurrency(taxReturn.boxes.box3_inputTax.inputVAT)}
                  </p>
                  <p className="text-xs text-muted-foreground">Claimable VAT</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {taxReturn.boxes.box3_inputTax.transactionCount} transactions
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Box 4: Net Tax Payable */}
          <Card className={
            taxReturn.boxes.box4_netTaxPayable > 0 
              ? 'bg-red-50 border-red-200' 
              : 'bg-green-50 border-green-200'
          }>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Box 4: Net Tax</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {taxReturn.boxes.box4_netTaxPayable > 0 ? (
                    <TrendingUp className="h-6 w-6 text-red-600" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-green-600" />
                  )}
                  <p className={`text-3xl font-bold ${
                    taxReturn.boxes.box4_netTaxPayable > 0 ? 'text-red-700' : 'text-green-700'
                  }`}>
                    {formatCurrency(Math.abs(taxReturn.boxes.box4_netTaxPayable))}
                  </p>
                </div>
                <p className="text-sm font-medium">
                  {taxReturn.boxes.box4_netTaxPayable > 0 ? 'Tax Payable' : 'Tax Refundable'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Output VAT - Input VAT
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* EFRIS Compliance */}
      {taxReturn && (
        <Card>
          <CardHeader>
            <CardTitle>EFRIS/Fiscal Compliance</CardTitle>
            <CardDescription>Electronic Fiscal Receipt Integration Status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-bold">{taxReturn.efrisCompliance.totalTransactions}</p>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{taxReturn.efrisCompliance.fiscalizedTransactions}</p>
                <p className="text-sm text-muted-foreground">Fiscalized</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{taxReturn.efrisCompliance.nonFiscalizedTransactions}</p>
                <p className="text-sm text-muted-foreground">Non-Fiscalized</p>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{taxReturn.efrisCompliance.complianceRate.toFixed(1)}%</p>
                  {taxReturn.efrisCompliance.complianceRate >= 95 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Compliance Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breakdown by Tax Rate */}
      {taxReturn && taxReturn.breakdown.byTaxRate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Breakdown by Tax Rate</CardTitle>
            <CardDescription>Detailed analysis of transactions by tax category</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tax Rule</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Tax Amount</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxReturn.breakdown.byTaxRate.map((item) => (
                  <TableRow key={item.taxRuleId}>
                    <TableCell className="font-medium">{item.taxRuleName}</TableCell>
                    <TableCell className="text-right">{item.taxRate}%</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(item.taxAmount)}</TableCell>
                    <TableCell className="text-right">{item.transactionCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Drill-Down Dialog */}
      <Dialog open={drillDownOpen} onOpenChange={setDrillDownOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drillDownCategory}</DialogTitle>
            <DialogDescription>
              Detailed transaction list for period {format(new Date(periodStart), 'PP')} to {format(new Date(periodEnd), 'PP')}
            </DialogDescription>
          </DialogHeader>

          {drillDownLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Customer/Vendor</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Base Amount</TableHead>
                    <TableHead className="text-right">Tax Amount</TableHead>
                    <TableHead className="text-center">EFRIS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillDownData.map((detail) => (
                    <TableRow key={detail.id}>
                      <TableCell>{format(new Date(detail.date), 'PP')}</TableCell>
                      <TableCell className="font-medium">{detail.referenceNumber}</TableCell>
                      <TableCell>{detail.customerVendor}</TableCell>
                      <TableCell className="text-muted-foreground">{detail.description}</TableCell>
                      <TableCell className="text-right">{formatCurrency(detail.baseAmount)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(detail.taxAmount)}</TableCell>
                      <TableCell className="text-center">
                        {detail.isFiscalized ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {detail.efrisFiscalNumber}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Not Fiscalized
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {drillDownData.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No transactions found for this category
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
