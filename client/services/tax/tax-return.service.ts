/**
 * Tax Return Service
 * Professional-grade statutory reporting engine
 * Aggregates tax data for government filing (VAT, GST, etc.)
 */

import { Decimal } from 'decimal.js';
import prisma from '@/lib/prisma';
import { TransactionType } from '@prisma/client';

export interface TaxReturnSummary {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
  baseCurrency: string;
  basis: 'ACCRUAL' | 'CASH';
  
  // Standard VAT Return Boxes
  boxes: {
    box1_standardRatedSales: {
      revenue: Decimal;
      outputVAT: Decimal;
      transactionCount: number;
    };
    box2_zeroRatedExemptSales: {
      revenue: Decimal;
      transactionCount: number;
    };
    box3_inputTax: {
      purchases: Decimal;
      inputVAT: Decimal;
      transactionCount: number;
    };
    box4_netTaxPayable: Decimal; // positive = pay, negative = refund
  };
  
  // EFRIS/Fiscal Compliance
  efrisCompliance: {
    totalTransactions: number;
    fiscalizedTransactions: number;
    nonFiscalizedTransactions: number;
    complianceRate: number; // percentage
  };
  
  // Detailed breakdown
  breakdown: {
    byTaxRate: Array<{
      taxRuleId: string;
      taxRuleName: string;
      taxRate: number;
      revenue: Decimal;
      taxAmount: Decimal;
      transactionCount: number;
    }>;
    byAccount: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      amount: Decimal;
      taxAmount: Decimal;
    }>;
  };
  
  // Lock status
  isLocked: boolean;
  lockedAt?: Date;
  lockedBy?: string;
}

export interface TaxTransactionDetail {
  id: string;
  date: Date;
  transactionType: TransactionType;
  referenceNumber: string;
  customerVendor: string;
  description: string;
  baseAmount: Decimal;
  taxAmount: Decimal;
  taxRate: number;
  taxRuleName: string;
  accountCode: string;
  accountName: string;
  efrisFiscalNumber?: string;
  isFiscalized: boolean;
}

export class TaxReturnService {
  /**
   * Generate Tax Return Summary for a period
   */
  static async generateTaxReturn(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
    basis: 'ACCRUAL' | 'CASH' = 'ACCRUAL'
  ): Promise<TaxReturnSummary> {
    // Get organization base currency
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { baseCurrency: true },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Check if period is locked
    const periodLock = await prisma.taxPeriodLock.findFirst({
      where: {
        organizationId,
        periodStart,
        periodEnd,
      },
    });

    // Aggregate output VAT (Sales)
    const outputVATData = await this.aggregateOutputVAT(
      organizationId,
      periodStart,
      periodEnd,
      basis
    );

    // Aggregate input VAT (Purchases)
    const inputVATData = await this.aggregateInputVAT(
      organizationId,
      periodStart,
      periodEnd,
      basis
    );

    // Calculate net tax payable
    const netTaxPayable = outputVATData.totalOutputVAT.minus(inputVATData.totalInputVAT);

    // Get EFRIS compliance stats
    const efrisStats = await this.getEFRISComplianceStats(
      organizationId,
      periodStart,
      periodEnd
    );

    // Get detailed breakdown
    const breakdown = await this.getDetailedBreakdown(
      organizationId,
      periodStart,
      periodEnd,
      basis
    );

    return {
      organizationId,
      periodStart,
      periodEnd,
      baseCurrency: organization.baseCurrency,
      basis,
      boxes: {
        box1_standardRatedSales: {
          revenue: outputVATData.standardRatedRevenue,
          outputVAT: outputVATData.totalOutputVAT,
          transactionCount: outputVATData.transactionCount,
        },
        box2_zeroRatedExemptSales: {
          revenue: outputVATData.zeroRatedExemptRevenue,
          transactionCount: outputVATData.zeroRatedCount,
        },
        box3_inputTax: {
          purchases: inputVATData.totalPurchases,
          inputVAT: inputVATData.totalInputVAT,
          transactionCount: inputVATData.transactionCount,
        },
        box4_netTaxPayable: netTaxPayable,
      },
      efrisCompliance: efrisStats,
      breakdown,
      isLocked: !!periodLock,
      lockedAt: periodLock?.lockedAt,
      lockedBy: periodLock?.lockedByUserId,
    };
  }

  /**
   * Aggregate Output VAT from Sales
   */
  private static async aggregateOutputVAT(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
    basis: 'ACCRUAL' | 'CASH'
  ): Promise<{
    standardRatedRevenue: Decimal;
    totalOutputVAT: Decimal;
    zeroRatedExemptRevenue: Decimal;
    transactionCount: number;
    zeroRatedCount: number;
  }> {
    const dateField = basis === 'CASH' ? 'paymentDate' : 'invoiceDate';

    // Check if organization is in Uganda (EFRIS applies)
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { homeCountry: true },
    });
    const isUganda = org?.homeCountry === 'UG' || org?.homeCountry === 'UGANDA';

    // Get all sales invoices for the period
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        [dateField]: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
        // Only apply EFRIS filter for Uganda
        ...(isUganda ? { efrisFDN: { not: null } } : {}),
      },
      include: {
        items: {
          include: {
            taxRateConfig: true,
          },
        },
      },
    });

    let standardRatedRevenue = new Decimal(0);
    let totalOutputVAT = new Decimal(0);
    let zeroRatedExemptRevenue = new Decimal(0);
    let transactionCount = 0;
    let zeroRatedCount = 0;

    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const itemTotal = new Decimal(item.total.toString());
        const taxAmount = new Decimal(item.taxAmount.toString());
        const taxRate = Number(item.taxRate);

        if (taxRate > 0) {
          // Standard rated
          standardRatedRevenue = standardRatedRevenue.plus(itemTotal);
          totalOutputVAT = totalOutputVAT.plus(taxAmount);
        } else {
          // Zero-rated or exempt
          zeroRatedExemptRevenue = zeroRatedExemptRevenue.plus(itemTotal);
          zeroRatedCount++;
        }
      }
      transactionCount++;
    }

    return {
      standardRatedRevenue,
      totalOutputVAT,
      zeroRatedExemptRevenue,
      transactionCount,
      zeroRatedCount,
    };
  }

  /**
   * Aggregate Input VAT from Purchases
   */
  private static async aggregateInputVAT(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
    basis: 'ACCRUAL' | 'CASH'
  ): Promise<{
    totalPurchases: Decimal;
    totalInputVAT: Decimal;
    transactionCount: number;
  }> {
    const dateField = basis === 'CASH' ? 'paymentDate' : 'billDate';

    // Check if organization is in Uganda (EFRIS applies)
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { homeCountry: true },
    });
    const isUganda = org?.homeCountry === 'UG' || org?.homeCountry === 'UGANDA';

    // Get all bills for the period
    const bills = await prisma.bill.findMany({
      where: {
        organizationId,
        [dateField]: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
        // Only apply EFRIS filter for Uganda
        ...(isUganda ? { efrisReceiptNo: { not: null } } : {}),
      },
      include: {
        items: {
          include: {
            taxRateConfig: true,
          },
        },
      },
    });

    let totalPurchases = new Decimal(0);
    let totalInputVAT = new Decimal(0);
    let transactionCount = 0;

    for (const bill of bills) {
      for (const item of bill.items) {
        const itemTotal = new Decimal(item.total.toString());
        const taxAmount = new Decimal(item.taxAmount.toString());

        totalPurchases = totalPurchases.plus(itemTotal);
        totalInputVAT = totalInputVAT.plus(taxAmount);
      }
      transactionCount++;
    }

    return {
      totalPurchases,
      totalInputVAT,
      transactionCount,
    };
  }

  /**
   * Get EFRIS/Fiscal compliance statistics
   */
  private static async getEFRISComplianceStats(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    totalTransactions: number;
    fiscalizedTransactions: number;
    nonFiscalizedTransactions: number;
    complianceRate: number;
  }> {
    // Count total invoices
    const totalInvoices = await prisma.invoice.count({
      where: {
        organizationId,
        invoiceDate: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
      },
    });

    // Count fiscalized invoices (those with EFRIS reference)
    const fiscalizedInvoices = await prisma.invoice.count({
      where: {
        organizationId,
        invoiceDate: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
        efrisFDN: { not: null },
      },
    });

    const nonFiscalized = totalInvoices - fiscalizedInvoices;
    const complianceRate = totalInvoices > 0 ? (fiscalizedInvoices / totalInvoices) * 100 : 100;

    return {
      totalTransactions: totalInvoices,
      fiscalizedTransactions: fiscalizedInvoices,
      nonFiscalizedTransactions: nonFiscalized,
      complianceRate,
    };
  }

  /**
   * Get detailed breakdown by tax rate and account
   */
  private static async getDetailedBreakdown(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
    basis: 'ACCRUAL' | 'CASH'
  ): Promise<{
    byTaxRate: Array<{
      taxRuleId: string;
      taxRuleName: string;
      taxRate: number;
      revenue: Decimal;
      taxAmount: Decimal;
      transactionCount: number;
    }>;
    byAccount: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      amount: Decimal;
      taxAmount: Decimal;
    }>;
  }> {
    // Aggregate by tax rule
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          organizationId,
          invoiceDate: {
            gte: periodStart,
            lte: periodEnd,
          },
          status: { notIn: ['DRAFT', 'CANCELLED'] },
        },
      },
      include: {
        taxRateConfig: true,
      },
    });

    const byTaxRateMap = new Map<string, {
      taxRuleId: string;
      taxRuleName: string;
      taxRate: number;
      revenue: Decimal;
      taxAmount: Decimal;
      transactionCount: number;
    }>();

    for (const item of invoiceItems) {
      const taxRuleId = item.taxRateId || 'no-tax';
      const taxRuleName = item.taxRateConfig?.name || 'No Tax';
      const taxRate = Number(item.taxRate);

      if (!byTaxRateMap.has(taxRuleId)) {
        byTaxRateMap.set(taxRuleId, {
          taxRuleId,
          taxRuleName,
          taxRate,
          revenue: new Decimal(0),
          taxAmount: new Decimal(0),
          transactionCount: 0,
        });
      }

      const entry = byTaxRateMap.get(taxRuleId)!;
      entry.revenue = entry.revenue.plus(item.total.toString());
      entry.taxAmount = entry.taxAmount.plus(item.taxAmount.toString());
      entry.transactionCount++;
    }

    return {
      byTaxRate: Array.from(byTaxRateMap.values()),
      byAccount: [], // TODO: Implement account-level breakdown
    };
  }

  /**
   * Get drill-down details for a specific box/category
   */
  static async getDrillDownDetails(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
    category: 'OUTPUT_VAT' | 'INPUT_VAT' | 'ZERO_RATED',
    taxRuleId?: string
  ): Promise<TaxTransactionDetail[]> {
    if (category === 'OUTPUT_VAT' || category === 'ZERO_RATED') {
      return this.getOutputVATDetails(organizationId, periodStart, periodEnd, taxRuleId);
    } else {
      return this.getInputVATDetails(organizationId, periodStart, periodEnd, taxRuleId);
    }
  }

  /**
   * Get output VAT transaction details
   */
  private static async getOutputVATDetails(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
    taxRuleId?: string
  ): Promise<TaxTransactionDetail[]> {
    // Check if organization is in Uganda (EFRIS applies)
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { homeCountry: true },
    });
    const isUganda = org?.homeCountry === 'UG' || org?.homeCountry === 'UGANDA';

    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        invoiceDate: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
        // Only apply EFRIS filter for Uganda
        ...(isUganda ? { efrisFDN: { not: null } } : {}),
      },
      include: {
        customer: true,
        items: {
          where: taxRuleId ? { taxRateId: taxRuleId } : undefined,
          include: {
            taxRateConfig: true,
          },
        },
      },
      orderBy: {
        invoiceDate: 'desc',
      },
    });

    const details: TaxTransactionDetail[] = [];

    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const netAmount = item.netAmount ? new Decimal(item.netAmount.toString()) : 
          new Decimal(item.total.toString()).minus(new Decimal(item.taxAmount.toString()));
        details.push({
          id: invoice.id,
          date: invoice.invoiceDate,
          transactionType: TransactionType.SALES_INVOICE,
          referenceNumber: invoice.invoiceNumber,
          customerVendor: invoice.customer.companyName || 
            `${invoice.customer.firstName} ${invoice.customer.lastName}`.trim(),
          description: item.description || 'Sales',
          baseAmount: netAmount,
          taxAmount: new Decimal(item.taxAmount.toString()),
          taxRate: Number(item.taxRate),
          taxRuleName: item.taxRateConfig?.name || 'No Tax',
          accountCode: '',
          accountName: 'Revenue',
          efrisFiscalNumber: invoice.efrisFDN || undefined,
          isFiscalized: !!invoice.efrisFDN,
        });
      }
    }

    return details;
  }

  /**
   * Get input VAT transaction details
   */
  private static async getInputVATDetails(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
    taxRuleId?: string
  ): Promise<TaxTransactionDetail[]> {
    const bills = await prisma.bill.findMany({
      where: {
        organizationId,
        billDate: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
        efrisReceiptNo: { not: null }, // Only bills with vendor EFRIS FDN
        efrisReceiptNo: { not: null }, // Only bills with vendor EFRIS FDN
      },
      include: {
        vendor: true,
        items: {
          where: taxRuleId ? { taxRateId: taxRuleId } : undefined,
          include: {
            taxRateConfig: true,
            account: true,
          },
        },
      },
      orderBy: {
        billDate: 'desc',
      },
    });

    const details: TaxTransactionDetail[] = [];

    for (const bill of bills) {
      for (const item of bill.items) {
        const subtotal = new Decimal(item.total.toString()).minus(new Decimal(item.taxAmount.toString()));
        details.push({
          id: bill.id,
          date: bill.billDate,
          transactionType: TransactionType.PURCHASE_INVOICE,
          referenceNumber: bill.billNumber,
          customerVendor: bill.vendor.companyName || '',
          description: item.description || 'Purchase',
          baseAmount: subtotal,
          taxAmount: new Decimal(item.taxAmount.toString()),
          taxRate: Number(item.taxRate),
          taxRuleName: item.taxRateConfig?.name || 'No Tax',
          accountCode: item.account?.code || '',
          accountName: item.account?.name || 'Expense',
          efrisFiscalNumber: bill.efrisReceiptNo || undefined,
          isFiscalized: !!bill.efrisReceiptNo,
        });
      }
    }

    return details;
  }

  /**
   * Lock a tax period to prevent further changes
   */
  static async lockPeriod(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
    userId: string
  ): Promise<void> {
    // Check if already locked
    const existing = await prisma.taxPeriodLock.findFirst({
      where: {
        organizationId,
        periodStart,
        periodEnd,
      },
    });

    if (existing) {
      throw new Error('Period is already locked');
    }

    // Create lock
    await prisma.taxPeriodLock.create({
      data: {
        organizationId,
        periodStart,
        periodEnd,
        lockedAt: new Date(),
        lockedByUserId: userId,
      },
    });
  }

  /**
   * Unlock a tax period (admin only)
   */
  static async unlockPeriod(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    await prisma.taxPeriodLock.deleteMany({
      where: {
        organizationId,
        periodStart,
        periodEnd,
      },
    });
  }
}

export default TaxReturnService;
