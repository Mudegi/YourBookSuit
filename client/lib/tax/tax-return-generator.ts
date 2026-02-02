/**
 * Tax Return Generator
 * Generates tax returns for various jurisdictions
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { getTaxPeriod, getTaxReturnDueDate } from './uganda-ura-compliance';

const prisma = new PrismaClient();

export interface VATReturnData {
  period: string;
  startDate: Date;
  endDate: Date;
  
  // Output VAT (Sales)
  standardRateSales: number;
  standardRateVAT: number;
  zeroRatedSales: number;
  exemptSales: number;
  totalOutputVAT: number;
  
  // Input VAT (Purchases)
  standardRatePurchases: number;
  standardRateInputVAT: number;
  claimableInputVAT: number;
  nonClaimableInputVAT: number; // No EFRIS receipt
  totalInputVAT: number;
  
  // Net Position
  netVAT: number; // Positive = payable, Negative = refundable
  
  // Transaction counts
  salesInvoiceCount: number;
  purchaseBillCount: number;
  
  // Detailed transactions
  salesTransactions: Array<{
    date: Date;
    invoiceNumber: string;
    customer: string;
    amount: number;
    vatAmount: number;
    category: string;
  }>;
  
  purchaseTransactions: Array<{
    date: Date;
    billNumber: string;
    vendor: string;
    amount: number;
    vatAmount: number;
    efrisReceipt?: string;
    claimable: boolean;
  }>;
}

export interface WHTReturnData {
  period: string;
  startDate: Date;
  endDate: Date;
  
  totalWHTWithheld: number;
  
  whtByType: Array<{
    whtType: string;
    description: string;
    grossAmount: number;
    whtAmount: number;
    transactionCount: number;
  }>;
  
  whtTransactions: Array<{
    date: Date;
    vendor: string;
    description: string;
    grossAmount: number;
    whtRate: number;
    whtAmount: number;
    certificateNo?: string;
  }>;
}

/**
 * Generate Uganda VAT Return (Monthly)
 */
export async function generateUgandaVATReturn(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<VATReturnData> {
  const period = getTaxPeriod(endDate);

  // Get all sales invoices for the period
  const salesInvoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      invoiceDate: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        notIn: ['DRAFT', 'CANCELLED', 'VOIDED'],
      },
    },
    include: {
      customer: true,
      items: {
        include: {
          taxRateConfig: true,
        },
      },
    },
    orderBy: {
      invoiceDate: 'asc',
    },
  });

  // Get all purchase bills for the period
  const purchaseBills = await prisma.bill.findMany({
    where: {
      organizationId,
      billDate: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        notIn: ['DRAFT', 'CANCELLED', 'VOIDED'],
      },
    },
    include: {
      vendor: true,
      items: {
        include: {
          taxRateConfig: true,
        },
      },
    },
    orderBy: {
      billDate: 'asc',
    },
  });

  // Calculate Output VAT (Sales)
  let standardRateSales = 0;
  let standardRateVAT = 0;
  let zeroRatedSales = 0;
  let exemptSales = 0;
  const salesTransactions: VATReturnData['salesTransactions'] = [];

  for (const invoice of salesInvoices) {
    let invoiceStandardSales = 0;
    let invoiceStandardVAT = 0;
    let invoiceZeroRatedSales = 0;
    let invoiceExemptSales = 0;

    for (const item of invoice.items) {
      const itemTotal = Number(item.total);
      const itemVAT = Number(item.taxAmount);
      const taxCategory = item.taxCategory || 'STANDARD';

      if (taxCategory.includes('STANDARD')) {
        invoiceStandardSales += itemTotal - itemVAT;
        invoiceStandardVAT += itemVAT;
      } else if (taxCategory.includes('ZERO')) {
        invoiceZeroRatedSales += itemTotal;
      } else if (taxCategory.includes('EXEMPT')) {
        invoiceExemptSales += itemTotal;
      }
    }

    standardRateSales += invoiceStandardSales;
    standardRateVAT += invoiceStandardVAT;
    zeroRatedSales += invoiceZeroRatedSales;
    exemptSales += invoiceExemptSales;

    salesTransactions.push({
      date: invoice.invoiceDate,
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer.companyName || `${invoice.customer.firstName} ${invoice.customer.lastName}`,
      amount: Number(invoice.subtotal),
      vatAmount: Number(invoice.taxAmount),
      category: invoice.items[0]?.taxCategory || 'STANDARD',
    });
  }

  // Calculate Input VAT (Purchases)
  let standardRatePurchases = 0;
  let standardRateInputVAT = 0;
  let claimableInputVAT = 0;
  let nonClaimableInputVAT = 0;
  const purchaseTransactions: VATReturnData['purchaseTransactions'] = [];

  for (const bill of purchaseBills) {
    let billStandardPurchases = 0;
    let billStandardInputVAT = 0;
    let billClaimable = 0;
    let billNonClaimable = 0;

    for (const item of bill.items) {
      const itemTotal = Number(item.total);
      const itemVAT = Number(item.taxAmount);
      const taxCategory = item.taxCategory || 'STANDARD';
      const canClaim = item.claimInputTax && !!bill.efrisReceiptNo;

      if (taxCategory.includes('STANDARD')) {
        billStandardPurchases += itemTotal - itemVAT;
        billStandardInputVAT += itemVAT;

        if (canClaim) {
          billClaimable += itemVAT;
        } else {
          billNonClaimable += itemVAT;
        }
      }
    }

    standardRatePurchases += billStandardPurchases;
    standardRateInputVAT += billStandardInputVAT;
    claimableInputVAT += billClaimable;
    nonClaimableInputVAT += billNonClaimable;

    purchaseTransactions.push({
      date: bill.billDate,
      billNumber: bill.billNumber,
      vendor: bill.vendor.companyName,
      amount: Number(bill.subtotal),
      vatAmount: Number(bill.taxAmount),
      efrisReceipt: bill.efrisReceiptNo || undefined,
      claimable: !!bill.efrisReceiptNo,
    });
  }

  const totalOutputVAT = standardRateVAT;
  const totalInputVAT = claimableInputVAT;
  const netVAT = totalOutputVAT - totalInputVAT;

  return {
    period,
    startDate,
    endDate,
    standardRateSales,
    standardRateVAT,
    zeroRatedSales,
    exemptSales,
    totalOutputVAT,
    standardRatePurchases,
    standardRateInputVAT,
    claimableInputVAT,
    nonClaimableInputVAT,
    totalInputVAT,
    netVAT,
    salesInvoiceCount: salesInvoices.length,
    purchaseBillCount: purchaseBills.length,
    salesTransactions,
    purchaseTransactions,
  };
}

/**
 * Generate Uganda WHT Return (Monthly)
 */
export async function generateUgandaWHTReturn(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<WHTReturnData> {
  const period = getTaxPeriod(endDate);

  // Get all WHT transactions for the period
  const whtTransactions = await prisma.wHTTransaction.findMany({
    where: {
      organizationId,
      whtDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      vendor: true,
      whtRule: true,
    },
    orderBy: {
      whtDate: 'asc',
    },
  });

  const totalWHTWithheld = whtTransactions.reduce(
    (sum, txn) => sum + Number(txn.whtAmount),
    0
  );

  // Group by WHT type
  const whtByTypeMap = new Map<
    string,
    {
      whtType: string;
      description: string;
      grossAmount: number;
      whtAmount: number;
      transactionCount: number;
    }
  >();

  for (const txn of whtTransactions) {
    const key = txn.whtRule.whtType;
    const existing = whtByTypeMap.get(key) || {
      whtType: key,
      description: txn.whtRule.description || txn.whtRule.name,
      grossAmount: 0,
      whtAmount: 0,
      transactionCount: 0,
    };

    existing.grossAmount += Number(txn.grossAmount);
    existing.whtAmount += Number(txn.whtAmount);
    existing.transactionCount += 1;

    whtByTypeMap.set(key, existing);
  }

  const whtByType = Array.from(whtByTypeMap.values());

  const whtTransactionDetails = whtTransactions.map((txn) => ({
    date: txn.whtDate,
    vendor: txn.vendor.companyName,
    description: txn.description || txn.whtRule.name,
    grossAmount: Number(txn.grossAmount),
    whtRate: Number(txn.whtRate),
    whtAmount: Number(txn.whtAmount),
    certificateNo: txn.whtCertificateNo || undefined,
  }));

  return {
    period,
    startDate,
    endDate,
    totalWHTWithheld,
    whtByType,
    whtTransactions: whtTransactionDetails,
  };
}

/**
 * Save VAT Return to database
 */
export async function saveVATReturn(
  organizationId: string,
  vatReturnData: VATReturnData
): Promise<string> {
  const taxReturn = await prisma.taxReturn.create({
    data: {
      organizationId,
      returnType: 'VAT_MONTHLY',
      taxPeriod: vatReturnData.period,
      startDate: vatReturnData.startDate,
      endDate: vatReturnData.endDate,
      country: 'UG',
      status: 'DRAFT',
      totalSales: new Prisma.Decimal(
        vatReturnData.standardRateSales + vatReturnData.zeroRatedSales + vatReturnData.exemptSales
      ),
      totalPurchases: new Prisma.Decimal(vatReturnData.standardRatePurchases),
      outputVAT: new Prisma.Decimal(vatReturnData.totalOutputVAT),
      inputVAT: new Prisma.Decimal(vatReturnData.totalInputVAT),
      netVAT: new Prisma.Decimal(vatReturnData.netVAT),
      paymentDueDate: getTaxReturnDueDate(vatReturnData.endDate),
      returnData: vatReturnData as any,
    },
  });

  return taxReturn.id;
}

/**
 * Save WHT Return to database
 */
export async function saveWHTReturn(
  organizationId: string,
  whtReturnData: WHTReturnData
): Promise<string> {
  const taxReturn = await prisma.taxReturn.create({
    data: {
      organizationId,
      returnType: 'WHT_MONTHLY',
      taxPeriod: whtReturnData.period,
      startDate: whtReturnData.startDate,
      endDate: whtReturnData.endDate,
      country: 'UG',
      status: 'DRAFT',
      whtWithheld: new Prisma.Decimal(whtReturnData.totalWHTWithheld),
      paymentDueDate: getTaxReturnDueDate(whtReturnData.endDate),
      returnData: whtReturnData as any,
    },
  });

  return taxReturn.id;
}

/**
 * Mark tax return as filed
 */
export async function fileTaxReturn(
  taxReturnId: string,
  filedBy: string,
  referenceNumber?: string
): Promise<void> {
  await prisma.taxReturn.update({
    where: { id: taxReturnId },
    data: {
      status: 'FILED',
      filedDate: new Date(),
      filedBy,
      referenceNumber,
    },
  });
}
