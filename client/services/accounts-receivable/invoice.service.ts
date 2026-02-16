/**
 * Invoice Service
 * Handles invoice creation and automatic posting to General Ledger
 */

import { Decimal } from 'decimal.js';
import prisma from '@/lib/prisma';
import { InvoiceStatus, TransactionType, EntryType } from '@prisma/client';
import DoubleEntryService from '../accounting/double-entry.service';
import { DocumentSequenceService } from '@/lib/document-sequence.service';
import { calculateTax, calculateLineItem } from '@/lib/tax/tax-calculation';
import { ExchangeRateService } from '../currency/exchange-rate.service';

export interface InvoiceTaxLineInput {
  taxType: string;
  rate: number;
  jurisdictionId?: string;
  taxRuleId?: string;
  isCompound?: boolean;
  compoundSequence?: number;
  isWithholding?: boolean;
}

export interface InvoiceItemInput {
  productId?: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  taxRateId?: string; // Link to TaxRate configuration (EFRIS-enabled)
  taxAgencyRateId?: string; // Link to TaxAgencyRate (legacy multi-country)
  taxLines?: InvoiceTaxLineInput[];
  isInclusive?: boolean; // Whether unitPrice includes tax
}

export interface CreateInvoiceInput {
  organizationId: string;
  branchId?: string;
  customerId: string;
  invoiceDate: Date;
  dueDate: Date;
  currency?: string;
  exchangeRate?: number;
  taxCalculationMethod?: 'EXCLUSIVE' | 'INCLUSIVE';
  items: InvoiceItemInput[];
  notes?: string;
  terms?: string;
  createdById: string;
}

interface CalculatedInvoiceTaxLine extends InvoiceTaxLineInput {
  baseAmount: number;
  taxAmount: number;
}

interface CalculatedInvoiceItem {
  item: InvoiceItemInput;
  lineSubtotal: number;
  lineNet: number;
  lineDiscount: number;
  taxAmount: number;
  withholdingAmount: number;
  total: number;
  appliedTaxRate: number;
  taxLines: CalculatedInvoiceTaxLine[];
}

interface InvoiceCalculationResult {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountDue: number;
  withholdingAmount: number;
  withholdingRate: number;
  calculatedItems: CalculatedInvoiceItem[];
}

export class InvoiceService {
  /**
   * Creates an invoice and posts to General Ledger
   * 
   * Accounting entries:
   * Debit:  Accounts Receivable (Asset)
   * Credit: Sales Revenue (Revenue)
   * Credit: Tax Payable (Liability) - if applicable
   */
  static async createInvoice(input: CreateInvoiceInput) {
    this.validateInvoiceItems(input.items);

    const taxCalculationMethod = input.taxCalculationMethod || 'EXCLUSIVE';

    // Calculate invoice totals using the new tax calculation logic
    const calculations = this.calculateInvoiceTotals(input.items, taxCalculationMethod);

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(input.organizationId, input.branchId);

    // Get account mappings from organization settings
    const accountMappings = await this.getAccountMappings(input.organizationId);

    // Auto-fetch exchange rate if foreign currency and no rate provided
    const organization = await prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { baseCurrency: true },
    });

    let finalCurrency = input.currency || organization?.baseCurrency || 'USD';
    let finalExchangeRate = input.exchangeRate || 1;

    if (organization && finalCurrency !== organization.baseCurrency && !input.exchangeRate) {
      try {
        const rate = await ExchangeRateService.getRate(
          input.organizationId,
          finalCurrency,
          organization.baseCurrency,
          input.invoiceDate
        );
        if (rate) {
          finalExchangeRate = rate.toNumber();
          console.log(`Auto-fetched exchange rate for ${finalCurrency} to ${organization.baseCurrency}: ${finalExchangeRate}`);
        }
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
        // Continue with rate of 1 as fallback
      }
    }

    // Create invoice and post to GL in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the invoice
      const invoice = await tx.invoice.create({
        data: {
          organizationId: input.organizationId,
          branchId: input.branchId,
          customerId: input.customerId,
          invoiceNumber,
          invoiceDate: input.invoiceDate,
          dueDate: input.dueDate,
          currency: finalCurrency,
          exchangeRate: finalExchangeRate,
          taxCalculationMethod,
          subtotal: calculations.subtotal,
          taxAmount: calculations.taxAmount,
          discountAmount: calculations.discountAmount,
          total: calculations.total,
          amountDue: calculations.amountDue,
          status: InvoiceStatus.DRAFT,
          notes: input.notes,
          terms: input.terms,
          whtApplicable: calculations.withholdingAmount > 0,
          whtAmount: calculations.withholdingAmount,
          whtRate: calculations.withholdingRate,
          items: {
            create: calculations.calculatedItems.map((line, index) => ({
              productId: line.item.productId,
              serviceId: line.item.serviceId,
              description: line.item.description,
              quantity: new Decimal(line.item.quantity).toNumber(),
              unitPrice: new Decimal(line.item.unitPrice).toNumber(),
              netAmount: new Decimal(line.lineNet).toNumber(),
              discount: new Decimal(line.lineDiscount).toNumber(),
              taxRate: new Decimal(line.appliedTaxRate).toNumber(),
              taxRateId: line.item.taxRateId, // Link to TaxRate (EFRIS-enabled)
              taxAgencyRateId: line.item.taxAgencyRateId, // Link to TaxAgencyRate (legacy)
              taxAmount: new Decimal(line.taxAmount).toNumber(),
              subtotal: new Decimal(line.lineSubtotal).toNumber(),
              total: new Decimal(line.total).toNumber(),
              sortOrder: index,
              taxLines:
                line.taxLines.length > 0
                  ? {
                      create: line.taxLines.map((taxLine) => ({
                        taxRuleId: taxLine.taxRuleId,
                        jurisdictionId: taxLine.jurisdictionId,
                        taxType: taxLine.taxType,
                        rate: new Decimal(taxLine.rate).toNumber(),
                        baseAmount: new Decimal(taxLine.baseAmount).toNumber(),
                        taxAmount: new Decimal(taxLine.taxAmount).toNumber(),
                        isCompound: !!taxLine.isCompound,
                        compoundSequence: taxLine.compoundSequence || 1,
                        isWithholding: !!taxLine.isWithholding,
                      })),
                    }
                  : undefined,
            })),
          },
        },
        include: {
          items: {
            include: {
              taxLines: true,
            },
          },
          customer: true,
        },
      });

      // Post to General Ledger
      // Debit: Accounts Receivable
      // Credit: Sales Revenue
      // Credit: Tax Payable (if tax > 0)
      const arAmount = calculations.amountDue;
      const withholdingAmount = calculations.withholdingAmount;

      const glEntries = [
        {
          accountId: accountMappings.accountsReceivableId,
          entryType: EntryType.DEBIT,
          amount: arAmount,
          description: `Invoice ${invoiceNumber} - ${invoice.customer.firstName} ${invoice.customer.lastName}`,
        },
        {
          accountId: accountMappings.salesRevenueId,
          entryType: EntryType.CREDIT,
          amount: calculations.subtotal,
          description: `Sales - Invoice ${invoiceNumber}`,
        },
      ];

      // Add tax entry if applicable
      if (calculations.taxAmount > 0) {
        glEntries.push({
          accountId: accountMappings.taxPayableId,
          entryType: EntryType.CREDIT,
          amount: calculations.taxAmount,
          description: `Tax - Invoice ${invoiceNumber}`,
        });
      }

      if (withholdingAmount > 0) {
        if (!accountMappings.withholdingReceivableId) {
          throw new Error(
            'Withholding tax receivable account not configured. Please create an asset account such as code 1300 named "Withholding Tax Receivable".'
          );
        }

        glEntries.push({
          accountId: accountMappings.withholdingReceivableId,
          entryType: EntryType.DEBIT,
          amount: withholdingAmount,
          description: `Withholding - Invoice ${invoiceNumber}`,
        });
      }

      // Create GL transaction
      const glTransaction = await DoubleEntryService.createTransaction({
        organizationId: input.organizationId,
        transactionDate: input.invoiceDate,
        transactionType: TransactionType.INVOICE,
        description: `Invoice ${invoiceNumber}`,
        referenceType: 'Invoice',
        referenceId: invoice.id,
        createdById: input.createdById,
        entries: glEntries,
      });

      // Update invoice with transaction ID and mark as SENT
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          transactionId: glTransaction.id,
          status: InvoiceStatus.SENT,
        },
        include: {
          items: {
            include: {
              taxLines: true,
            },
          },
          customer: true,
        },
      });

      // Update inventory if products are tracked
      for (const item of input.items) {
        if (item.productId) {
          await this.updateInventoryOnSale(tx, item.productId, item.quantity);
        }
      }

      return {
        invoice: updatedInvoice,
        glTransaction,
      };
    });

    return result;
  }

  /**
   * Calculate invoice totals using QuickBooks-style tax calculation
   */
  private static calculateInvoiceTotals(
    items: InvoiceItemInput[],
    taxCalculationMethod: 'EXCLUSIVE' | 'INCLUSIVE' = 'EXCLUSIVE'
  ): InvoiceCalculationResult {
    const calculatedItems = items.map((item) => 
      this.calculateLineTotals(item, taxCalculationMethod)
    );

    let subtotal = new Decimal(0);
    let taxAmount = new Decimal(0);
    let discountAmount = new Decimal(0);
    let withholdingAmount = new Decimal(0);

    for (const line of calculatedItems) {
      subtotal = subtotal.plus(line.lineNet);
      taxAmount = taxAmount.plus(line.taxAmount);
      discountAmount = discountAmount.plus(line.lineDiscount);
      withholdingAmount = withholdingAmount.plus(line.withholdingAmount);
    }

    const total = subtotal.plus(taxAmount);
    const amountDue = total.minus(withholdingAmount);
    const withholdingRate =
      subtotal.gt(0) && withholdingAmount.gt(0)
        ? withholdingAmount.dividedBy(subtotal).times(100)
        : new Decimal(0);

    return {
      subtotal: subtotal.toNumber(),
      taxAmount: taxAmount.toNumber(),
      discountAmount: discountAmount.toNumber(),
      total: total.toNumber(),
      amountDue: amountDue.toNumber(),
      withholdingAmount: withholdingAmount.toNumber(),
      withholdingRate: withholdingRate.toNumber(),
      calculatedItems,
    };
  }

  private static calculateLineTotals(
    item: InvoiceItemInput,
    taxCalculationMethod: 'EXCLUSIVE' | 'INCLUSIVE' = 'EXCLUSIVE'
  ): CalculatedInvoiceItem {
    const quantity = new Decimal(item.quantity);
    const unitPrice = new Decimal(item.unitPrice);
    const discount = new Decimal(item.discount || 0);

    // Determine if this line item uses inclusive pricing
    const isInclusive = item.isInclusive !== undefined 
      ? item.isInclusive 
      : taxCalculationMethod === 'INCLUSIVE';

    // Use multi-tax lines if provided, otherwise use simple taxRate
    const taxLinesInput = item.taxLines?.length
      ? item.taxLines
      : item.taxRate
        ? [{ taxType: 'STANDARD', rate: item.taxRate }]
        : [];

    // For simple case (single tax rate), use the new tax calculation
    if (taxLinesInput.length === 1 && !taxLinesInput[0].isCompound && !taxLinesInput[0].isWithholding) {
      const taxLine = taxLinesInput[0];
      const taxRateDecimal = (taxLine.rate || 0) / 100; // Convert percentage to decimal

      // Use the QuickBooks-style calculation
      const lineCalc = calculateLineItem(
        item.quantity,
        item.unitPrice,
        taxRateDecimal,
        isInclusive,
        item.discount || 0
      );

      const calculatedTaxLine: CalculatedInvoiceTaxLine = {
        ...taxLine,
        taxType: taxLine.taxType || 'STANDARD',
        rate: taxLine.rate || 0,
        baseAmount: lineCalc.lineNet,
        taxAmount: lineCalc.lineTax,
        compoundSequence: 1,
        isCompound: false,
        isWithholding: false,
      };

      return {
        item,
        lineSubtotal: lineCalc.lineSubtotal,
        lineNet: lineCalc.lineNet,
        lineDiscount: lineCalc.lineDiscount,
        taxAmount: lineCalc.lineTax,
        withholdingAmount: 0,
        total: lineCalc.lineTotal,
        appliedTaxRate: taxLine.rate || 0,
        taxLines: [calculatedTaxLine],
      };
    }

    // For complex cases (multiple taxes, compound, withholding), use the old logic
    const lineSubtotal = quantity.times(unitPrice);
    const lineNet = lineSubtotal.minus(discount);

    const sortedTaxLines = [...taxLinesInput].sort(
      (a, b) => (a.compoundSequence || 1) - (b.compoundSequence || 1)
    );

    let taxAccum = new Decimal(0);
    let withholdingAccum = new Decimal(0);

    const calculatedTaxLines: CalculatedInvoiceTaxLine[] = sortedTaxLines.map((line) => {
      const base = line.isCompound ? lineNet.plus(taxAccum) : lineNet;
      const rate = new Decimal(line.rate || 0);
      const amount = base.times(rate).dividedBy(100);

      if (line.isWithholding) {
        withholdingAccum = withholdingAccum.plus(amount);
      } else {
        taxAccum = taxAccum.plus(amount);
      }

      return {
        ...line,
        taxType: line.taxType || 'TAX',
        rate: rate.toNumber(),
        baseAmount: base.toNumber(),
        taxAmount: amount.toNumber(),
        compoundSequence: line.compoundSequence || 1,
        isCompound: !!line.isCompound,
        isWithholding: !!line.isWithholding,
      };
    });

    const appliedTaxRate = taxLinesInput
      .filter((line) => !line.isWithholding)
      .reduce((sum, line) => sum + (line.rate || 0), 0);

    const total = lineNet.plus(taxAccum);

    return {
      item,
      lineSubtotal: lineSubtotal.toNumber(),
      lineNet: lineNet.toNumber(),
      lineDiscount: discount.toNumber(),
      taxAmount: taxAccum.toNumber(),
      withholdingAmount: withholdingAccum.toNumber(),
      total: total.toNumber(),
      appliedTaxRate,
      taxLines: calculatedTaxLines,
    };
  }

  private static validateInvoiceItems(items: InvoiceItemInput[]) {
    if (!items || items.length === 0) {
      throw new Error('At least one invoice item is required.');
    }

    items.forEach((item, index) => {
      const lineNo = index + 1;
      if (!item.description || typeof item.description !== 'string') {
        throw new Error(`Item ${lineNo}: description is required.`);
      }

      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        throw new Error(`Item ${lineNo}: quantity must be greater than zero.`);
      }

      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        throw new Error(`Item ${lineNo}: unit price must be zero or greater.`);
      }

      if (item.discount !== undefined && (!Number.isFinite(item.discount) || item.discount < 0)) {
        throw new Error(`Item ${lineNo}: discount cannot be negative.`);
      }

      if (item.taxRate !== undefined && (!Number.isFinite(item.taxRate) || item.taxRate < 0)) {
        throw new Error(`Item ${lineNo}: taxRate cannot be negative.`);
      }

      if (item.taxLines !== undefined && !Array.isArray(item.taxLines)) {
        throw new Error(`Item ${lineNo}: taxLines must be an array when provided.`);
      }

      if (Array.isArray(item.taxLines)) {
        item.taxLines.forEach((line, taxIndex) => {
          const taxNo = taxIndex + 1;

          if (line.taxType !== undefined && typeof line.taxType !== 'string') {
            throw new Error(`Item ${lineNo} tax ${taxNo}: taxType must be a string when provided.`);
          }

          if (!Number.isFinite(line.rate) || line.rate < 0) {
            throw new Error(`Item ${lineNo} tax ${taxNo}: rate must be zero or greater.`);
          }

          if (
            line.compoundSequence !== undefined &&
            (!Number.isInteger(line.compoundSequence) || line.compoundSequence < 1)
          ) {
            throw new Error(`Item ${lineNo} tax ${taxNo}: compoundSequence must be a positive integer.`);
          }
        });
      }
    });
  }

  /**
   * Generate invoice number
   */
  private static async generateInvoiceNumber(organizationId: string, branchId?: string): Promise<string> {
    const config = await DocumentSequenceService.getSequenceConfig(organizationId, branchId, 'INVOICE');
    return DocumentSequenceService.generateDocumentNumber(organizationId, 'INVOICE', branchId, config);
  }

  /**
   * Get account mappings for GL posting
   * In a real system, these would be configured per organization
   */
  private static async getAccountMappings(organizationId: string) {
    // Get default accounts for posting
    // You would typically store these in organization settings
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        organizationId,
        isActive: true,
      },
    });

    const accountsReceivable = accounts.find(a => a.code === '1200' && a.accountType === 'ASSET');
    const salesRevenue = accounts.find(a => a.code === '4000' && a.accountType === 'REVENUE');
    const taxPayable = accounts.find(a => a.code === '2100' && a.accountType === 'LIABILITY');
    const withholdingReceivable = accounts.find((a) => {
      const lowerName = a.name?.toLowerCase() || '';
      return (
        a.accountType === 'ASSET' &&
        (a.code === '1300' || a.code === '1310' || lowerName.includes('withholding'))
      );
    });

    if (!accountsReceivable || !salesRevenue || !taxPayable) {
      throw new Error('Required GL accounts not found. Please set up Chart of Accounts first.');
    }

    return {
      accountsReceivableId: accountsReceivable.id,
      salesRevenueId: salesRevenue.id,
      taxPayableId: taxPayable.id,
      withholdingReceivableId: withholdingReceivable?.id,
    };
  }

  /**
   * Update inventory on sale
   */
  private static async updateInventoryOnSale(
    tx: any,
    productId: string,
    quantity: number
  ) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: { inventoryItems: true },
    });

    if (!product || !product.trackInventory) {
      return;
    }

    // Get main warehouse inventory
    const inventory = product.inventoryItems[0];
    if (!inventory) {
      throw new Error(`No inventory found for product ${product.name}`);
    }

    const newQuantity = new Decimal(inventory.quantityOnHand).minus(quantity);

    if (newQuantity.isNegative()) {
      throw new Error(`Insufficient inventory for product ${product.name}`);
    }

    // Update inventory
    await tx.inventoryItem.update({
      where: { id: inventory.id },
      data: {
        quantityOnHand: newQuantity.toNumber(),
        quantityAvailable: newQuantity.toNumber(),
      },
    });

    // Create stock movement record
    await tx.stockMovement.create({
      data: {
        productId,
        movementType: 'SALE',
        quantity: -quantity,
        unitCost: inventory.averageCost,
        totalCost: new Decimal(inventory.averageCost).times(quantity).toNumber(),
        movementDate: new Date(),
      },
    });
  }
}

export default InvoiceService;
