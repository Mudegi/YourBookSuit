'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface FXGainLossItem {
  id: string;
  fxType: 'REALIZED' | 'UNREALIZED';
  documentType: 'INVOICE' | 'BILL';
  documentNumber: string;
  foreignCurrency: string;
  foreignAmount: number;
  transactionDate: Date;
  transactionRate: number;
  settlementDate?: Date;
  settlementRate?: number;
  gainLossAmount: number;
  baseCurrency: string;
}

interface FXReport {
  startDate: string;
  endDate: string;
  baseCurrency: string;
  realized: {
    items: FXGainLossItem[];
    totalGain: number;
    totalLoss: number;
    netGainLoss: number;
  };
  unrealized: {
    items: FXGainLossItem[];
    totalGain: number;
    totalLoss: number;
    netGainLoss: number;
  };
  summary: {
    totalRealizedGain: number;
    totalRealizedLoss: number;
    totalUnrealizedGain: number;
    totalUnrealizedLoss: number;
    netGainLoss: number;
  };
}

export default function FXGainLossReportPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [report, setReport] = useState<FXReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/fx-gain-loss/report?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch FX gain/loss report');
      }

      const data = await response.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const exportToCSV = () => {
    if (!report) return;

    const rows: string[] = [
      'FX Gain/Loss Report',
      `Period: ${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`,
      `Base Currency: ${report.baseCurrency}`,
      '',
      'Type,Document,Currency,Foreign Amount,Transaction Date,Transaction Rate,Settlement Date,Settlement Rate,Gain/Loss',
    ];

    // Realized gains/losses
    report.realized.items.forEach((item) => {
      rows.push(
        `Realized,${item.documentNumber},${item.foreignCurrency},${item.foreignAmount},${format(new Date(item.transactionDate), 'yyyy-MM-dd')},${item.transactionRate},${item.settlementDate ? format(new Date(item.settlementDate), 'yyyy-MM-dd') : ''},${item.settlementRate || ''},${item.gainLossAmount}`
      );
    });

    // Unrealized gains/losses
    report.unrealized.items.forEach((item) => {
      rows.push(
        `Unrealized,${item.documentNumber},${item.foreignCurrency},${item.foreignAmount},${format(new Date(item.transactionDate), 'yyyy-MM-dd')},${item.transactionRate},,,${item.gainLossAmount}`
      );
    });

    rows.push('');
    rows.push(`Total Realized Gain,${report.summary.totalRealizedGain}`);
    rows.push(`Total Realized Loss,${report.summary.totalRealizedLoss}`);
    rows.push(`Total Unrealized Gain,${report.summary.totalUnrealizedGain}`);
    rows.push(`Total Unrealized Loss,${report.summary.totalUnrealizedLoss}`);
    rows.push(`Net Gain/Loss,${report.summary.netGainLoss}`);

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fx-gain-loss-report-${startDate}-to-${endDate}.csv`;
    link.click();
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Foreign Exchange Gain/Loss Report</h1>
        <p className="text-muted-foreground">
          Track realized and unrealized foreign exchange gains and losses
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={fetchReport} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Report
            </Button>
            {report && (
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6 text-destructive">{error}</CardContent>
        </Card>
      )}

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Realized Gain/Loss</CardTitle>
                {report.realized.netGainLoss >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${report.realized.netGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(report.realized.netGainLoss, report.baseCurrency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Gain: {formatCurrency(report.realized.totalGain, report.baseCurrency)} | 
                  Loss: {formatCurrency(Math.abs(report.realized.totalLoss), report.baseCurrency)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unrealized Gain/Loss</CardTitle>
                {report.unrealized.netGainLoss >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${report.unrealized.netGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(report.unrealized.netGainLoss, report.baseCurrency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Gain: {formatCurrency(report.unrealized.totalGain, report.baseCurrency)} | 
                  Loss: {formatCurrency(Math.abs(report.unrealized.totalLoss), report.baseCurrency)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Gain/Loss</CardTitle>
                {report.summary.netGainLoss >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${report.summary.netGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(report.summary.netGainLoss, report.baseCurrency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Realized + Unrealized
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Realized Gains/Losses */}
          {report.realized.items.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Realized Foreign Exchange Gains/Losses</CardTitle>
                <CardDescription>
                  Gains and losses from settled foreign currency transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead className="text-right">Foreign Amount</TableHead>
                      <TableHead>Transaction Date</TableHead>
                      <TableHead className="text-right">Trans. Rate</TableHead>
                      <TableHead>Settlement Date</TableHead>
                      <TableHead className="text-right">Settle. Rate</TableHead>
                      <TableHead className="text-right">Gain/Loss</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.realized.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.documentNumber}</TableCell>
                        <TableCell>{item.foreignCurrency}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.foreignAmount, item.foreignCurrency)}
                        </TableCell>
                        <TableCell>{format(new Date(item.transactionDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="text-right">{item.transactionRate.toFixed(6)}</TableCell>
                        <TableCell>
                          {item.settlementDate && format(new Date(item.settlementDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.settlementRate?.toFixed(6)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${item.gainLossAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(item.gainLossAmount, report.baseCurrency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Unrealized Gains/Losses */}
          {report.unrealized.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Unrealized Foreign Exchange Gains/Losses</CardTitle>
                <CardDescription>
                  Gains and losses from open foreign currency balances (not yet settled)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead className="text-right">Foreign Amount</TableHead>
                      <TableHead>Transaction Date</TableHead>
                      <TableHead className="text-right">Trans. Rate</TableHead>
                      <TableHead className="text-right">Current Rate</TableHead>
                      <TableHead className="text-right">Gain/Loss</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.unrealized.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.documentNumber}</TableCell>
                        <TableCell>{item.foreignCurrency}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.foreignAmount, item.foreignCurrency)}
                        </TableCell>
                        <TableCell>{format(new Date(item.transactionDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="text-right">{item.transactionRate.toFixed(6)}</TableCell>
                        <TableCell className="text-right">
                          {item.settlementRate?.toFixed(6)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${item.gainLossAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(item.gainLossAmount, report.baseCurrency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {report.realized.items.length === 0 && report.unrealized.items.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No foreign exchange gains or losses found for the selected period.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
