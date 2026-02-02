import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { ForeignExchangeGainLossService } from '@/services/currency/fx-gain-loss.service';
import { Decimal } from 'decimal.js';

/**
 * GET /api/orgs/[orgSlug]/fx-gain-loss/report
 * Get FX gain/loss report for a date range
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgSlug: string }> | { orgSlug: string } }
) {
  try {
    // Handle both Promise and non-Promise params
    const resolvedParams = context.params instanceof Promise ? await context.params : context.params;
    const orgSlug = resolvedParams.orgSlug;
    console.log('🔍 Route - orgSlug:', orgSlug, 'Type:', typeof orgSlug);
    const { userId, organizationId } = await requireAuth(orgSlug);

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const report = await ForeignExchangeGainLossService.getFXGainLossReport(
      organizationId,
      new Date(startDate),
      new Date(endDate)
    );

    // Transform to expected format with safe Decimal handling
    const transformedReport = {
      startDate,
      endDate,
      baseCurrency: 'UGX', // TODO: get from org
      realized: {
        items: report.realized.map((r: any) => ({
          id: r.id,
          fxType: r.fxType,
          documentType: r.invoiceId ? 'INVOICE' : 'BILL',
          documentNumber: r.invoice?.invoiceNumber || r.bill?.billNumber || 'N/A',
          customerVendor: r.invoice?.customer ? 
            `${r.invoice.customer.firstName || ''} ${r.invoice.customer.lastName || ''}`.trim() || r.invoice.customer.companyName :
            r.bill?.vendor?.companyName || 'N/A',
          foreignCurrency: r.foreignCurrency,
          foreignAmount: parseFloat(r.foreignAmount.toString()),
          transactionDate: r.transactionDate,
          transactionRate: parseFloat(r.transactionRate.toString()),
          settlementDate: r.settlementDate,
          settlementRate: parseFloat(r.settlementRate.toString()),
          gainLossAmount: parseFloat(r.gainLossAmount.toString()),
        })),
        totalGain: typeof report.summary.totalRealizedGain === 'number' 
          ? report.summary.totalRealizedGain 
          : report.summary.totalRealizedGain.toNumber(),
        totalLoss: typeof report.summary.totalRealizedLoss === 'number'
          ? report.summary.totalRealizedLoss
          : report.summary.totalRealizedLoss.toNumber(),
        netGainLoss: typeof report.summary.totalRealizedGain === 'number'
          ? report.summary.totalRealizedGain - report.summary.totalRealizedLoss
          : new Decimal(report.summary.totalRealizedGain).minus(report.summary.totalRealizedLoss).toNumber(),
      },
      unrealized: {
        items: report.unrealized.map((r: any) => ({
          id: r.id,
          fxType: r.fxType,
          documentType: r.invoiceId ? 'INVOICE' : 'BILL',
          documentNumber: r.invoice?.invoiceNumber || r.bill?.billNumber || 'N/A',
          customerVendor: r.invoice?.customer ? 
            `${r.invoice.customer.firstName || ''} ${r.invoice.customer.lastName || ''}`.trim() || r.invoice.customer.companyName :
            r.bill?.vendor?.companyName || 'N/A',
          foreignCurrency: r.foreignCurrency,
          foreignAmount: parseFloat(r.foreignAmount.toString()),
          transactionDate: r.transactionDate,
          transactionRate: parseFloat(r.transactionRate.toString()),
          settlementDate: r.settlementDate,
          settlementRate: parseFloat(r.settlementRate.toString()),
          gainLossAmount: parseFloat(r.gainLossAmount.toString()),
        })),
        totalGain: typeof report.summary.totalUnrealizedGain === 'number'
          ? report.summary.totalUnrealizedGain
          : report.summary.totalUnrealizedGain.toNumber(),
        totalLoss: typeof report.summary.totalUnrealizedLoss === 'number'
          ? report.summary.totalUnrealizedLoss
          : report.summary.totalUnrealizedLoss.toNumber(),
        netGainLoss: typeof report.summary.totalUnrealizedGain === 'number'
          ? report.summary.totalUnrealizedGain - report.summary.totalUnrealizedLoss
          : new Decimal(report.summary.totalUnrealizedGain).minus(report.summary.totalUnrealizedLoss).toNumber(),
      },
      summary: {
        totalRealizedGain: typeof report.summary.totalRealizedGain === 'number'
          ? report.summary.totalRealizedGain
          : report.summary.totalRealizedGain.toNumber(),
        totalRealizedLoss: typeof report.summary.totalRealizedLoss === 'number'
          ? report.summary.totalRealizedLoss
          : report.summary.totalRealizedLoss.toNumber(),
        totalUnrealizedGain: typeof report.summary.totalUnrealizedGain === 'number'
          ? report.summary.totalUnrealizedGain
          : report.summary.totalUnrealizedGain.toNumber(),
        totalUnrealizedLoss: typeof report.summary.totalUnrealizedLoss === 'number'
          ? report.summary.totalUnrealizedLoss
          : report.summary.totalUnrealizedLoss.toNumber(),
        netGainLoss: typeof report.summary.netFXImpact === 'number'
          ? report.summary.netFXImpact
          : report.summary.netFXImpact.toNumber(),
      },
    };

    return NextResponse.json(transformedReport);
  } catch (error: any) {
    console.error('Error generating FX gain/loss report:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to generate FX gain/loss report', details: error.stack },
      { status: 500 }
    );
  }
}
