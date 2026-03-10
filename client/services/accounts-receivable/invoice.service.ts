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
  warehouseId?: string; // Warehouse to deduct stock from
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
  reference?: string;
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
          baseCurrencyTotal: new Decimal(calculations.total).times(finalExchangeRate).toNumber(),
          taxCalculationMethod,
          subtotal: calculations.subtotal,
          taxAmount: calculations.taxAmount,
          discountAmount: calculations.discountAmount,
          total: calculations.total,
          amountDue: calculations.amountDue,
          status: InvoiceStatus.DRAFT,
          reference: input.reference,
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
              warehouseId: line.item.warehouseId,
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

      // Update inventory and record COGS for products
      let totalCOGS = new Decimal(0);
      for (const item of input.items) {
        if (item.productId) {
          const cogsAmount = await this.updateInventoryOnSale(
            tx,
            input.organizationId,
            item.productId,
            item.quantity,
            item.warehouseId,
            invoice.invoiceNumber
          );
          totalCOGS = totalCOGS.plus(cogsAmount);
        }
      }

      // Post COGS journal entry if any inventory items were sold
      // DR: Cost of Goods Sold (5000), CR: Inventory Asset (1300)
      if (totalCOGS.gt(0)) {
        const cogsAccount = await tx.chartOfAccount.findFirst({
          where: {
            organizationId: input.organizationId,
            code: { startsWith: '5' },
            isActive: true,
            OR: [
              { accountType: 'COST_OF_SALES' },
              { accountType: 'EXPENSE', accountSubType: { contains: 'Cost' } },
            ],
          },
          orderBy: { code: 'asc' },
        });

        const inventoryAccount = await tx.chartOfAccount.findFirst({
          where: {
            organizationId: input.organizationId,
            isActive: true,
            OR: [
              { code: '1300' },
              { code: '1200', name: { contains: 'Inventory' } },
            ],
          },
          orderBy: { code: 'desc' },
        });

        if (cogsAccount && inventoryAccount) {
          await DoubleEntryService.createTransaction(
            {
              organizationId: input.organizationId,
              transactionDate: input.invoiceDate,
              transactionType: TransactionType.INVOICE,
              description: `COGS - Invoice ${invoice.invoiceNumber}`,
              referenceType: 'Invoice',
              referenceId: invoice.id,
              createdById: input.createdById,
              entries: [
                {
                  accountId: cogsAccount.id,
                  entryType: EntryType.DEBIT,
                  amount: totalCOGS.toNumber(),
                  description: `Cost of Goods Sold - Invoice ${invoice.invoiceNumber}`,
                },
                {
                  accountId: inventoryAccount.id,
                  entryType: EntryType.CREDIT,
                  amount: totalCOGS.toNumber(),
                  description: `Inventory reduction - Invoice ${invoice.invoiceNumber}`,
                },
              ],
            },
            tx
          );
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
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        organizationId,
        isActive: true,
      },
    });

    // AR: code 1200 (preferred) or any asset with 'Receivable' in name 
    const accountsReceivable = accounts.find(a => a.code === '1200' && a.accountType === 'ASSET')
      || accounts.find(a => a.accountType === 'ASSET' && a.name.toLowerCase().includes('receivable'));

    // Sales Revenue: code 4000 (preferred) or any revenue account
    const salesRevenue = accounts.find(a => a.code === '4000' && a.accountType === 'REVENUE')
      || accounts.find(a => a.accountType === 'REVENUE');

    // Tax Payable: code 2100 (preferred) or any liability with 'tax' or 'vat'
    const taxPayable = accounts.find(a => a.code === '2100' && a.accountType === 'LIABILITY')
      || accounts.find(a => a.accountType === 'LIABILITY' && (a.name.toLowerCase().includes('tax') || a.name.toLowerCase().includes('vat')));

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
   * Update inventory on sale — warehouse-aware with COGS calculation
   * Returns the COGS amount (averageCost × quantity) for GL posting
   */
  private static async updateInventoryOnSale(
    tx: any,
    organizationId: string,
    productId: string,
    quantity: number,
    warehouseId?: string,
    invoiceNumber?: string
  ): Promise<Decimal> {
    const product = await tx.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.trackInventory) {
      return new Decimal(0);
    }

    let averageCost = new Decimal(0);
    const warehouseLocation = 'Main';

    // Try warehouse-level stock first (WarehouseStockLevel)
    if (warehouseId) {
      const warehouseStock = await tx.warehouseStockLevel.findUnique({
        where: { warehouseId_productId: { warehouseId, productId } },
      });

      if (warehouseStock) {
        const available = new Decimal(warehouseStock.quantityAvailable);
        if (available.lt(quantity)) {
          throw new Error(
            `Insufficient stock in warehouse for ${product.name}. Available: ${available.toNumber()}, Requested: ${quantity}`
          );
        }

        averageCost = new Decimal(warehouseStock.averageCost);
        const newQty = new Decimal(warehouseStock.quantityOnHand).minus(quantity);
        const removedValue = averageCost.times(quantity);
        const newValue = new Decimal(warehouseStock.totalValue).minus(removedValue);

        await tx.warehouseStockLevel.update({
          where: { warehouseId_productId: { warehouseId, productId } },
          data: {
            quantityOnHand: newQty.toNumber(),
            quantityAvailable: newQty.minus(new Decimal(warehouseStock.quantityReserved)).toNumber(),
            totalValue: Decimal.max(newValue, 0).toNumber(),
            lastMovementDate: new Date(),
          },
        });
      }
    }

    // Also update the global InventoryItem record
    const inventory = await tx.inventoryItem.findFirst({
      where: { productId, warehouseLocation },
    });

    if (inventory) {
      if (averageCost.isZero()) {
        averageCost = new Decimal(inventory.averageCost);
      }

      const newQuantity = new Decimal(inventory.quantityOnHand).minus(quantity);
      if (newQuantity.isNegative() && !warehouseId) {
        throw new Error(`Insufficient inventory for product ${product.name}`);
      }

      const removedValue = averageCost.times(quantity);
      const newValue = new Decimal(inventory.totalValue).minus(removedValue);

      await tx.inventoryItem.update({
        where: { id: inventory.id },
        data: {
          quantityOnHand: newQuantity.toNumber(),
          quantityAvailable: newQuantity.toNumber(),
          totalValue: Decimal.max(newValue, 0).toNumber(),
        },
      });
    } else if (!warehouseId) {
      // No inventory record and no warehouse — skip with zero COGS
      return new Decimal(0);
    }

    // Record stock movement
    const cogsAmount = averageCost.times(quantity);
    const balanceAfter = inventory
      ? new Decimal(inventory.quantityOnHand).minus(quantity)
      : new Decimal(0);

    await tx.stockMovement.create({
      data: {
        productId,
        movementType: 'SALE',
        quantity: -quantity,
        unitCost: averageCost.toNumber(),
        totalCost: cogsAmount.toNumber(),
        balanceAfter: balanceAfter.toNumber(),
        warehouseLocation: warehouseId ? undefined : 'Main',
        warehouseId: warehouseId || undefined,
        referenceType: 'INVOICE',
        referenceId: invoiceNumber || undefined,
        referenceNumber: invoiceNumber || undefined,
        movementDate: new Date(),
      },
    });

    return cogsAmount;
  }
}

export default InvoiceService;
