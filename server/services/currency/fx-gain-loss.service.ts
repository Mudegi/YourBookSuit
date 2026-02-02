/**
 * Foreign Exchange Gain/Loss Service
 * Handles calculation and recording of FX gains/losses
 * 
 * Types of FX Gains/Losses:
 * 1. REALIZED - When payment is made/received at different rate than invoice/bill
 * 2. UNREALIZED - Month-end revaluation of open foreign currency balances
 */

import { Decimal } from 'decimal.js';
import prisma from '@/lib/prisma';
import { ExchangeRateService } from './exchange-rate.service';
import { DoubleEntryService } from '../accounting/double-entry.service';
import { TransactionType } from '@prisma/client';

export interface RealizedFXCalculation {
  foreignCurrency: string;
  foreignAmount: Decimal;
  transactionDate: Date;
  transactionRate: Decimal;
  transactionBaseAmount: Decimal;
  settlementDate: Date;
  settlementRate: Decimal;
  settlementBaseAmount: Decimal;
  gainLossAmount: Decimal;
  isGain: boolean;
}

export class ForeignExchangeGainLossService {
  /**
   * Calculate realized FX gain/loss on payment
   * This is called when a payment is applied to a foreign currency invoice/bill
   */
  static async calculateRealizedFX(
    organizationId: string,
    invoiceOrBillId: string,
    invoiceOrBillType: 'invoice' | 'bill',
    paymentAmount: Decimal,
    paymentDate: Date,
    paymentCurrency: string,
    paymentRate: Decimal
  ): Promise<RealizedFXCalculation> {
    // Get organization base currency
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { baseCurrency: true },
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Get invoice/bill details
    const document = invoiceOrBillType === 'invoice'
      ? await prisma.invoice.findUnique({
          where: { id: invoiceOrBillId },
          select: {
            invoiceDate: true,
            currency: true,
            exchangeRate: true,
            baseCurrencyTotal: true,
            total: true,
          },
        })
      : await prisma.bill.findUnique({
          where: { id: invoiceOrBillId },
          select: {
            billDate: true,
            currency: true,
            exchangeRate: true,
            total: true,
          },
        });

    if (!document) {
      throw new Error(`${invoiceOrBillType} not found`);
    }

    const transactionDate = invoiceOrBillType === 'invoice' 
      ? (document as any).invoiceDate 
      : (document as any).billDate;
    
    const transactionRate = new Decimal(document.exchangeRate.toString());
    const foreignAmount = paymentAmount;
    const foreignCurrency = document.currency;

    // Calculate base amounts
    const transactionBaseAmount = foreignAmount.times(transactionRate);
    const settlementBaseAmount = foreignAmount.times(paymentRate);
    const gainLossAmount = settlementBaseAmount.minus(transactionBaseAmount);

    return {
      foreignCurrency,
      foreignAmount,
      transactionDate,
      transactionRate,
      transactionBaseAmount,
      settlementDate: paymentDate,
      settlementRate: paymentRate,
      settlementBaseAmount,
      gainLossAmount,
      isGain: gainLossAmount.isPositive(),
    };
  }

  /**
   * Record realized FX gain/loss to General Ledger
   */
  static async recordRealizedFX(
    organizationId: string,
    paymentId: string,
    fxCalculation: RealizedFXCalculation,
    invoiceId?: string,
    billId?: string,
    userId?: string
  ): Promise<any> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        fxGainAccountId: true,
        fxLossAccountId: true,
      },
    });

    if (!org || !org.fxGainAccountId || !org.fxLossAccountId) {
      throw new Error('FX Gain/Loss accounts not configured in organization settings');
    }

    const isGain = fxCalculation.gainLossAmount.isPositive();
    const absAmount = fxCalculation.gainLossAmount.abs();

    // Determine which account to use
    const fxAccountId = isGain ? org.fxGainAccountId : org.fxLossAccountId;

    // Record the FX gain/loss transaction
    return await prisma.$transaction(async (tx) => {
      // Create FX gain/loss record
      const fxRecord = await tx.foreignExchangeGainLoss.create({
        data: {
          organizationId,
          paymentId,
          invoiceId,
          billId,
          fxType: 'REALIZED',
          foreignCurrency: fxCalculation.foreignCurrency,
          foreignAmount: fxCalculation.foreignAmount,
          transactionDate: fxCalculation.transactionDate,
          transactionRate: fxCalculation.transactionRate,
          transactionBaseAmount: fxCalculation.transactionBaseAmount,
          settlementDate: fxCalculation.settlementDate,
          settlementRate: fxCalculation.settlementRate,
          settlementBaseAmount: fxCalculation.settlementBaseAmount,
          gainLossAmount: fxCalculation.gainLossAmount,
          glAccountId: fxAccountId,
        },
      });

      // Create GL transaction for the FX gain/loss
      // Only create if amount is not zero
      if (!absAmount.isZero()) {
        const entries = [];

        if (isGain) {
          // Gain: DR Bank (already done), CR FX Gain
          entries.push({
            accountId: fxAccountId,
            entryType: 'CREDIT' as const,
            amount: absAmount.toNumber(),
            description: `Realized FX Gain on payment - ${fxCalculation.foreignCurrency}`,
          });
        } else {
          // Loss: DR FX Loss, CR Bank (adjustment)
          entries.push({
            accountId: fxAccountId,
            entryType: 'DEBIT' as const,
            amount: absAmount.toNumber(),
            description: `Realized FX Loss on payment - ${fxCalculation.foreignCurrency}`,
          });
        }

        // The offsetting entry is handled by the payment service
        // This is just the FX component
      }

      return fxRecord;
    });
  }

  /**
   * Calculate unrealized FX gains/losses for month-end revaluation
   * This revalues all open foreign currency AR/AP at current spot rate
   */
  static async calculateUnrealizedFX(
    organizationId: string,
    asOfDate: Date = new Date()
  ): Promise<Array<{
    type: 'AR' | 'AP';
    documentId: string;
    documentNumber: string;
    foreignCurrency: string;
    foreignBalance: Decimal;
    originalRate: Decimal;
    currentRate: Decimal;
    originalBaseAmount: Decimal;
    currentBaseAmount: Decimal;
    unrealizedGainLoss: Decimal;
  }>> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { baseCurrency: true },
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    const results: Array<any> = [];

    // Get all open invoices in foreign currency
    const openInvoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ['SENT', 'PARTIALLY_PAID'] },
        currency: { not: org.baseCurrency },
        amountDue: { gt: 0 },
      },
      select: {
        id: true,
        invoiceNumber: true,
        currency: true,
        exchangeRate: true,
        amountDue: true,
        baseCurrencyTotal: true,
      },
    });

    for (const invoice of openInvoices) {
      const originalRate = new Decimal(invoice.exchangeRate.toString());
      const foreignBalance = new Decimal(invoice.amountDue.toString());
      
      const currentRate = await ExchangeRateService.getRate(
        organizationId,
        invoice.currency,
        org.baseCurrency,
        asOfDate
      );

      const originalBaseAmount = foreignBalance.times(originalRate);
      const currentBaseAmount = foreignBalance.times(currentRate);
      const unrealizedGainLoss = currentBaseAmount.minus(originalBaseAmount);

      if (!unrealizedGainLoss.isZero()) {
        results.push({
          type: 'AR',
          documentId: invoice.id,
          documentNumber: invoice.invoiceNumber,
          foreignCurrency: invoice.currency,
          foreignBalance,
          originalRate,
          currentRate,
          originalBaseAmount,
          currentBaseAmount,
          unrealizedGainLoss,
        });
      }
    }

    // Get all open bills in foreign currency
    const openBills = await prisma.bill.findMany({
      where: {
        organizationId,
        status: { in: ['APPROVED', 'PARTIALLY_PAID'] },
        currency: { not: org.baseCurrency },
        amountDue: { gt: 0 },
      },
      select: {
        id: true,
        billNumber: true,
        currency: true,
        exchangeRate: true,
        amountDue: true,
      },
    });

    for (const bill of openBills) {
      const originalRate = new Decimal(bill.exchangeRate.toString());
      const foreignBalance = new Decimal(bill.amountDue.toString());
      
      const currentRate = await ExchangeRateService.getRate(
        organizationId,
        bill.currency,
        org.baseCurrency,
        asOfDate
      );

      const originalBaseAmount = foreignBalance.times(originalRate);
      const currentBaseAmount = foreignBalance.times(currentRate);
      const unrealizedGainLoss = currentBaseAmount.minus(originalBaseAmount);

      if (!unrealizedGainLoss.isZero()) {
        results.push({
          type: 'AP',
          documentId: bill.id,
          documentNumber: bill.billNumber,
          foreignCurrency: bill.currency,
          foreignBalance,
          originalRate,
          currentRate,
          originalBaseAmount,
          currentBaseAmount,
          unrealizedGainLoss,
        });
      }
    }

    return results;
  }

  /**
   * Record unrealized FX gains/losses for month-end
   */
  static async recordUnrealizedFX(
    organizationId: string,
    asOfDate: Date,
    userId: string
  ): Promise<{ transactionId: string; totalGain: Decimal; totalLoss: Decimal }> {
    const unrealizedFX = await this.calculateUnrealizedFX(organizationId, asOfDate);

    if (unrealizedFX.length === 0) {
      throw new Error('No unrealized FX gains/losses to record');
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        unrealizedFxGainAccountId: true,
        unrealizedFxLossAccountId: true,
      },
    });

    if (!org || !org.unrealizedFxGainAccountId || !org.unrealizedFxLossAccountId) {
      throw new Error('Unrealized FX Gain/Loss accounts not configured');
    }

    let totalGain = new Decimal(0);
    let totalLoss = new Decimal(0);

    // Aggregate gains and losses
    for (const fx of unrealizedFX) {
      if (fx.unrealizedGainLoss.isPositive()) {
        totalGain = totalGain.plus(fx.unrealizedGainLoss);
      } else {
        totalLoss = totalLoss.plus(fx.unrealizedGainLoss.abs());
      }
    }

    // Create GL entries
    const entries = [];

    if (totalGain.isPositive()) {
      // DR AR/AP (increase asset or decrease liability)
      // CR Unrealized FX Gain
      entries.push({
        accountId: org.unrealizedFxGainAccountId,
        entryType: 'CREDIT' as const,
        amount: totalGain.toNumber(),
        description: `Unrealized FX Gain - Month End ${asOfDate.toISOString().split('T')[0]}`,
      });
    }

    if (totalLoss.isPositive()) {
      // DR Unrealized FX Loss
      // CR AR/AP (decrease asset or increase liability)
      entries.push({
        accountId: org.unrealizedFxLossAccountId,
        entryType: 'DEBIT' as const,
        amount: totalLoss.toNumber(),
        description: `Unrealized FX Loss - Month End ${asOfDate.toISOString().split('T')[0]}`,
      });
    }

    // Create transaction
    const transaction = await DoubleEntryService.createTransaction({
      organizationId,
      transactionDate: asOfDate,
      transactionType: TransactionType.JOURNAL_ENTRY,
      description: `Unrealized FX Revaluation - ${asOfDate.toISOString().split('T')[0]}`,
      referenceType: 'FX_REVALUATION',
      createdById: userId,
      entries,
    });

    // Record each FX item
    await Promise.all(
      unrealizedFX.map((fx) =>
        prisma.foreignExchangeGainLoss.create({
          data: {
            organizationId,
            transactionId: transaction.id,
            invoiceId: fx.type === 'AR' ? fx.documentId : undefined,
            billId: fx.type === 'AP' ? fx.documentId : undefined,
            fxType: 'UNREALIZED',
            foreignCurrency: fx.foreignCurrency,
            foreignAmount: fx.foreignBalance,
            transactionDate: asOfDate,
            transactionRate: fx.originalRate,
            transactionBaseAmount: fx.originalBaseAmount,
            settlementDate: asOfDate,
            settlementRate: fx.currentRate,
            settlementBaseAmount: fx.currentBaseAmount,
            gainLossAmount: fx.unrealizedGainLoss,
            glAccountId: fx.unrealizedGainLoss.isPositive()
              ? org.unrealizedFxGainAccountId!
              : org.unrealizedFxLossAccountId!,
          },
        })
      )
    );

    return {
      transactionId: transaction.id,
      totalGain,
      totalLoss,
    };
  }

  /**
   * Get FX gain/loss report for a period
   */
  static async getFXGainLossReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    realized: Array<any>;
    unrealized: Array<any>;
    summary: {
      totalRealizedGain: Decimal;
      totalRealizedLoss: Decimal;
      totalUnrealizedGain: Decimal;
      totalUnrealizedLoss: Decimal;
      netFXImpact: Decimal;
    };
  }> {
    const fxRecords = await prisma.foreignExchangeGainLoss.findMany({
      where: {
        organizationId,
        settlementDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        payment: {
          select: { paymentNumber: true, paymentDate: true },
        },
        invoice: {
          select: { invoiceNumber: true, customer: { select: { companyName: true, firstName: true, lastName: true } } },
        },
        bill: {
          select: { billNumber: true, vendor: { select: { name: true } } },
        },
      },
      orderBy: {
        settlementDate: 'desc',
      },
    });

    const realized = fxRecords.filter((r) => r.fxType === 'REALIZED');
    const unrealized = fxRecords.filter((r) => r.fxType === 'UNREALIZED');

    const totalRealizedGain = realized
      .filter((r) => new Decimal(r.gainLossAmount.toString()).isPositive())
      .reduce((sum, r) => sum.plus(new Decimal(r.gainLossAmount.toString())), new Decimal(0));

    const totalRealizedLoss = realized
      .filter((r) => new Decimal(r.gainLossAmount.toString()).isNegative())
      .reduce((sum, r) => sum.plus(new Decimal(r.gainLossAmount.toString()).abs()), new Decimal(0));

    const totalUnrealizedGain = unrealized
      .filter((r) => new Decimal(r.gainLossAmount.toString()).isPositive())
      .reduce((sum, r) => sum.plus(new Decimal(r.gainLossAmount.toString())), new Decimal(0));

    const totalUnrealizedLoss = unrealized
      .filter((r) => new Decimal(r.gainLossAmount.toString()).isNegative())
      .reduce((sum, r) => sum.plus(new Decimal(r.gainLossAmount.toString()).abs()), new Decimal(0));

    const netFXImpact = totalRealizedGain
      .minus(totalRealizedLoss)
      .plus(totalUnrealizedGain)
      .minus(totalUnrealizedLoss);

    return {
      realized,
      unrealized,
      summary: {
        totalRealizedGain,
        totalRealizedLoss,
        totalUnrealizedGain,
        totalUnrealizedLoss,
        netFXImpact,
      },
    };
  }
}

export default ForeignExchangeGainLossService;
