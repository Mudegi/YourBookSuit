/**
 * Sales Receipt Service
 * Handles instant cash/mobile-money sales that bypass Accounts Receivable
 * 
 * Key Principles:
 * 1. One-step transaction: Sale + Payment recorded atomically
 * 2. Immediate inventory deduction (not just committed)
 * 3. Direct bank/cash account increase
 * 4. No AR impact - customer balance unchanged
 */

import { prisma } from '@/lib/prisma';
import { Prisma, PaymentMethod, SalesReceiptStatus, DocumentType } from '@prisma/client';
import { TaxCalculationService } from './tax/tax-calculation.service';
import { TaxCalculationService as TaxCalcService } from '@/lib/services/tax/TaxCalculationService';
import { InventoryService } from './inventory/inventory.service';

export interface SalesReceiptInput {
  receiptDate: Date;
  customerId?: string; // Optional - walk-in customer
  currency?: string;
  exchangeRate?: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string; // Mobile Money ID, Check number
  depositToAccountId: string; // Required: Bank/Cash account
  mobileNetwork?: string; // MTN, Airtel, etc.
  payerPhoneNumber?: string;
  branchId?: string;
  warehouseId?: string;
  salespersonId?: string;
  commissionRate?: number;
  reference?: string;
  notes?: string;
  taxCalculationMethod?: 'INCLUSIVE' | 'EXCLUSIVE';
  items: SalesReceiptItemInput[];
}

export interface SalesReceiptItemInput {
  productId?: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountType?: 'AMOUNT' | 'PERCENTAGE';
  taxRuleId?: string;
  warehouseId?: string;
  lotNumber?: string;
  serialNumber?: string;
}

export interface SalesReceiptOutput {
  salesReceipt: any;
  transaction: any;
  inventoryUpdates: any[];
}

export class SalesReceiptService {
  /**
   * Create a Sales Receipt with atomic transaction
   * Records sale and payment in one step
   */
  static async createSalesReceipt(
    organizationId: string,
    userId: string,
    input: SalesReceiptInput
  ): Promise<SalesReceiptOutput> {
    return await prisma.$transaction(async (tx) => {
      // 1. Validate deposit account is Asset/Bank
      const depositAccount = await tx.chartOfAccount.findUnique({
        where: { id: input.depositToAccountId },
      });

      console.log('🏦 Deposit account lookup:', {
        requestedId: input.depositToAccountId,
        found: !!depositAccount,
        account: depositAccount ? {
          id: depositAccount.id,
          code: depositAccount.code,
          name: depositAccount.name,
          type: depositAccount.accountType
        } : null
      });

      if (!depositAccount) {
        throw new Error(`Deposit account not found: ${input.depositToAccountId}`);
      }

      // Validate it's an asset account (bank/cash accounts are ASSET type)
      if (depositAccount.accountType !== 'ASSET') {
        throw new Error('Deposit account must be an Asset account (Bank or Cash)');
      }

      // 2. Validate reference number uniqueness for the day (if provided)
      if (input.referenceNumber) {
        const startOfDay = new Date(input.receiptDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(input.receiptDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existingReceipt = await tx.salesReceipt.findFirst({
          where: {
            organizationId,
            referenceNumber: input.referenceNumber,
            receiptDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });

        if (existingReceipt) {
          throw new Error(`Duplicate reference number ${input.referenceNumber} for today`);
        }
      }

      // 3. Get organization settings
      const organization = await tx.organization.findUnique({
        where: { id: organizationId },
        select: {
          baseCurrency: true,
          homeCountry: true,
        },
      });

      const currency = input.currency || organization?.baseCurrency || 'USD';
      const exchangeRate = input.exchangeRate || 1;
      const taxCalculationMethod = input.taxCalculationMethod || 'INCLUSIVE'; // Default to inclusive for retail

      // 3.5 Validate warehouse if provided
      let warehouseId = input.warehouseId;
      if (warehouseId) {
        const warehouse = await tx.inventoryWarehouse.findUnique({
          where: { id: warehouseId },
          select: { id: true },
        });
        if (!warehouse) {
          throw new Error(`Warehouse not found: ${warehouseId}`);
        }
      }

      // 4. Generate receipt number
      const receiptNumber = await this.generateReceiptNumber(tx, organizationId, input.branchId);

      // 5. Calculate line items with tax
      const lineItemsData: any[] = [];
      let subtotal = 0;
      let totalTaxAmount = 0;
      let totalDiscount = 0;

      for (const item of input.items) {
        const itemQuantity = item.quantity;
        const itemUnitPrice = item.unitPrice;
        const itemDiscount = item.discount || 0;
        const discountType = item.discountType || 'AMOUNT';

        // Calculate discount
        const lineDiscount = discountType === 'PERCENTAGE'
          ? (itemUnitPrice * itemQuantity * itemDiscount) / 100
          : itemDiscount;

        totalDiscount += lineDiscount;

        // Find tax rate for calculation - validate taxRuleId exists first
        let taxRateValue = 0;
        let validTaxRuleId: string | undefined;
        if (item.taxRuleId) {
          // Look up TaxAgencyRate (the dropdown sends taxAgencyRate IDs, not taxRule IDs)
          const taxRate = await tx.taxAgencyRate.findUnique({
            where: { id: item.taxRuleId },
            select: { id: true, rate: true },
          });
          if (taxRate) {
            validTaxRuleId = item.taxRuleId;  // Keep the original ID for reference
            taxRateValue = Number(taxRate.rate);
          } else {
            // ID could be a TaxRule, try that as fallback
            const taxRule = await tx.taxRule.findUnique({
              where: { id: item.taxRuleId },
              select: { id: true, taxRate: true },
            });
            if (taxRule) {
              validTaxRuleId = taxRule.id;
              taxRateValue = Number(taxRule.taxRate);
            } else {
              // Neither found, so don't use it
              validTaxRuleId = undefined;
            }
          }
        }

        // Use TaxCalculationService for proper inclusive/exclusive calculation
        const lineCalc = TaxCalcService.calculateLineItem({
          unitPrice: itemUnitPrice,
          quantity: itemQuantity,
          taxRate: taxRateValue,
          discount: lineDiscount,
          calculationMethod: taxCalculationMethod,
        });

        const taxAmount = Number(lineCalc.lineTaxAmount);
        const lineTotal = Number(lineCalc.lineTotal);
        const netAmount = Number(lineCalc.lineNetAmount);

        totalTaxAmount += taxAmount;

        // Get product cost for COGS
        let unitCost: number | undefined;
        if (item.productId) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { purchasePrice: true },
          });
          unitCost = product ? Number(product.purchasePrice) : undefined;
        }

        // Create tax lines if tax is applied
        const taxLines: any[] = [];
        if (validTaxRuleId && taxAmount > 0) {
          taxLines.push({
            taxRuleId: validTaxRuleId,
            taxType: 'VAT',
            rate: taxRateValue,
            baseAmount: netAmount,
            taxAmount: taxAmount,
            isCompound: false,
            compoundSequence: 1,
          });
        }

        lineItemsData.push({
          item: {
            productId: item.productId,
            serviceId: item.serviceId,
            description: item.description,
            quantity: itemQuantity,
            unitPrice: itemUnitPrice,
            discount: lineDiscount,
            discountType,
            taxAmount,
            taxRuleId: validTaxRuleId,
            lineTotal,
            warehouseId: item.warehouseId,
            lotNumber: item.lotNumber,
            serialNumber: item.serialNumber,
            unitCost,
          },
          netAmount,
          taxLines,
        });

        subtotal += netAmount;
      }

      // 6. Calculate totals - for inclusive, subtotal is net (tax extracted), for exclusive, subtotal is before tax
      const total = taxCalculationMethod === 'INCLUSIVE'
        ? subtotal + totalTaxAmount  // Inclusive: total = net + tax
        : subtotal + totalTaxAmount; // Exclusive: total = net + tax (same formula, different meaning)

      const baseCurrencyTotal = total * exchangeRate;

      // Calculate commission
      const commissionAmount = input.commissionRate
        ? (total * input.commissionRate) / 100
        : undefined;

      // 7. Create Sales Receipt
      const salesReceipt = await tx.salesReceipt.create({
        data: {
          organizationId,
          receiptNumber,
          receiptDate: input.receiptDate,
          customerId: input.customerId,
          currency,
          exchangeRate,
          baseCurrencyTotal,
          subtotal,
          taxAmount: totalTaxAmount,
          discountAmount: totalDiscount,
          total,
          taxCalculationMethod,
          paymentMethod: input.paymentMethod,
          referenceNumber: input.referenceNumber,
          depositToAccountId: input.depositToAccountId,
          mobileNetwork: input.mobileNetwork,
          payerPhoneNumber: input.payerPhoneNumber,
          branchId: input.branchId,
          warehouseId: input.warehouseId,
          status: SalesReceiptStatus.COMPLETED,
          salespersonId: input.salespersonId,
          commissionRate: input.commissionRate,
          commissionAmount,
          reference: input.reference,
          notes: input.notes,
          createdById: userId,
        },
        include: {
          customer: true,
          depositToAccount: true,
          branch: true,
        },
      });

      // 8. Create line items and tax lines
      for (const lineData of lineItemsData) {
        // Build item data, excluding null/undefined foreign keys to avoid FK constraint errors
        const itemData = {
          salesReceiptId: salesReceipt.id,
          productId: lineData.item.productId,
          serviceId: lineData.item.serviceId,
          description: lineData.item.description,
          quantity: lineData.item.quantity,
          unitPrice: lineData.item.unitPrice,
          discount: lineData.item.discount,
          discountType: lineData.item.discountType,
          taxAmount: lineData.item.taxAmount,
          lineTotal: lineData.item.lineTotal,
          lotNumber: lineData.item.lotNumber,
          serialNumber: lineData.item.serialNumber,
          ...(lineData.item.warehouseId ? { warehouseId: lineData.item.warehouseId } : {}),
          ...(lineData.item.taxRuleId ? { taxRuleId: lineData.item.taxRuleId } : {}),
        };

        const lineItem = await tx.salesReceiptItem.create({
          data: itemData,
        });

        // Create tax lines for this item
        for (const taxLine of lineData.taxLines) {
          await tx.salesReceiptTaxLine.create({
            data: {
              salesReceiptItemId: lineItem.id,
              taxRuleId: taxLine.taxRuleId,
              jurisdictionId: taxLine.jurisdictionId,
              taxType: taxLine.taxType,
              rate: taxLine.rate,
              baseAmount: taxLine.baseAmount,
              taxAmount: taxLine.taxAmount,
              isCompound: taxLine.isCompound || false,
              compoundSequence: taxLine.compoundSequence || 1,
            },
          });
        }
      }

      // 9. Create GL Transaction (Atomic Accounting)
      const transaction = await this.postSalesReceiptAccounting(
        tx,
        organizationId,
        userId,
        salesReceipt,
        lineItemsData
      );

      // 10. Deduct Inventory (Immediate - not committed)
      const inventoryUpdates: any[] = [];
      for (const lineData of lineItemsData) {
        if (lineData.item.productId) {
          // Use warehouse location - default to "Main" if not specified
          const warehouseLocation = 'Main';
          
          const update = await InventoryService.deductInventory(
            tx,
            organizationId,
            lineData.item.productId,
            warehouseLocation,
            lineData.item.quantity,
            {
              transactionType: 'RECEIPT',
              transactionId: salesReceipt.id,
              transactionNumber: salesReceipt.receiptNumber,
              lotNumber: lineData.item.lotNumber,
              serialNumber: lineData.item.serialNumber,
            }
          );
          inventoryUpdates.push(update);
        }
      }

      // 11. Update inventory deducted flag
      await tx.salesReceipt.update({
        where: { id: salesReceipt.id },
        data: {
          inventoryDeducted: true,
          inventoryDeductedAt: new Date(),
          transactionId: transaction.id,
        },
      });

      return {
        salesReceipt,
        transaction,
        inventoryUpdates,
      };
    });
  }

  /**
   * Post Sales Receipt Accounting (Atomic)
   * 
   * Journal Entry:
   * DR: Bank/Cash Account (depositToAccountId)
   * CR: Sales Revenue Account
   * CR: Tax Payable Account
   * DR: Cost of Goods Sold (COGS)
   * CR: Inventory Asset Account
   */
  private static async postSalesReceiptAccounting(
    tx: any,
    organizationId: string,
    userId: string,
    salesReceipt: any,
    lineItemsData: any[]
  ): Promise<any> {
    // Generate transaction number
    const transactionNumber = await this.generateTransactionNumber(tx, organizationId);

    // Create GL Transaction
    const transaction = await tx.transaction.create({
      data: {
        organizationId,
        branchId: salesReceipt.branchId,
        transactionNumber,
        transactionDate: salesReceipt.receiptDate,
        transactionType: 'RECEIPT',
        referenceType: 'SalesReceipt',
        referenceId: salesReceipt.id,
        description: `Sales Receipt ${salesReceipt.receiptNumber}`,
        notes: salesReceipt.notes,
        status: 'POSTED',
        createdById: userId,
      },
    });

    const ledgerEntries: Prisma.LedgerEntryCreateManyInput[] = [];

    // 1. DR: Bank/Cash Account (Total Amount)
    ledgerEntries.push({
      transactionId: transaction.id,
      accountId: salesReceipt.depositToAccountId,
      entryType: 'DEBIT',
      amount: salesReceipt.total,
      currency: salesReceipt.currency,
      exchangeRate: salesReceipt.exchangeRate,
      amountInBase: salesReceipt.baseCurrencyTotal,
      description: `Cash/Bank from ${salesReceipt.receiptNumber}`,
    });

    // 2. CR: Sales Revenue Account (Subtotal - varies by product)
    // Group by revenue account
    const revenueAccountMap = new Map<string, number>();

    for (const lineData of lineItemsData) {
      let revenueAccountId: string;

      if (lineData.item.productId) {
        const product = await tx.product.findUnique({
          where: { id: lineData.item.productId },
          select: { incomeAccountId: true },
        });
        revenueAccountId = product?.incomeAccountId || await this.getDefaultRevenueAccountId(tx, organizationId);
      } else {
        revenueAccountId = await this.getDefaultServiceRevenueAccountId(tx, organizationId);
      }

      const currentAmount = revenueAccountMap.get(revenueAccountId) || 0;
      const lineBaseAmount = lineData.item.lineTotal - lineData.item.taxAmount;
      revenueAccountMap.set(revenueAccountId, currentAmount + lineBaseAmount);
    }

    // Create revenue ledger entries
    for (const [accountId, amount] of revenueAccountMap.entries()) {
      ledgerEntries.push({
        transactionId: transaction.id,
        accountId,
        entryType: 'CREDIT',
        amount: amount,
        currency: salesReceipt.currency,
        exchangeRate: salesReceipt.exchangeRate,
        amountInBase: amount * salesReceipt.exchangeRate,
        description: `Sales revenue from ${salesReceipt.receiptNumber}`,
      });
    }

    // 3. CR: Tax Payable Account (if tax > 0)
    if (salesReceipt.taxAmount > 0) {
      const taxPayableAccountId = await this.getDefaultTaxPayableAccountId(tx, organizationId);
      ledgerEntries.push({
        transactionId: transaction.id,
        accountId: taxPayableAccountId,
        entryType: 'CREDIT',
        amount: salesReceipt.taxAmount,
        currency: salesReceipt.currency,
        exchangeRate: salesReceipt.exchangeRate,
        amountInBase: salesReceipt.taxAmount * salesReceipt.exchangeRate,
        description: `Tax collected from ${salesReceipt.receiptNumber}`,
      });
    }

    // 4. COGS Entry (DR: COGS, CR: Inventory)
    let totalCOGS = 0;
    for (const lineData of lineItemsData) {
      if (lineData.item.productId && lineData.item.unitCost) {
        const cogs = lineData.item.unitCost * lineData.item.quantity;
        totalCOGS += cogs;
      }
    }

    if (totalCOGS > 0) {
      const cogsAccountId = await this.getDefaultCOGSAccountId(tx, organizationId);
      const inventoryAssetAccountId = await this.getDefaultInventoryAssetAccountId(tx, organizationId);

      // DR: COGS
      ledgerEntries.push({
        transactionId: transaction.id,
        accountId: cogsAccountId,
        entryType: 'DEBIT',
        amount: totalCOGS,
        currency: salesReceipt.currency,
        exchangeRate: salesReceipt.exchangeRate,
        amountInBase: totalCOGS * salesReceipt.exchangeRate,
        description: `COGS for ${salesReceipt.receiptNumber}`,
      });

      // CR: Inventory Asset
      ledgerEntries.push({
        transactionId: transaction.id,
        accountId: inventoryAssetAccountId,
        entryType: 'CREDIT',
        amount: totalCOGS,
        currency: salesReceipt.currency,
        exchangeRate: salesReceipt.exchangeRate,
        amountInBase: totalCOGS * salesReceipt.exchangeRate,
        description: `Inventory reduction for ${salesReceipt.receiptNumber}`,
      });
    }

    // Create all ledger entries
    await tx.ledgerEntry.createMany({
      data: ledgerEntries,
    });

    return transaction;
  }

  /**
   * Generate unique receipt number
   */
  private static async generateReceiptNumber(
    tx: any,
    organizationId: string,
    branchId?: string
  ): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // If no branchId provided, use the organization's headquarters branch
    let actualBranchId = branchId;
    if (!actualBranchId) {
      const headquartersBranch = await tx.branch.findFirst({
        where: {
          organizationId,
          isHeadquarters: true,
        },
        select: { id: true },
      });
      actualBranchId = headquartersBranch?.id;
    }

    const sequence = await tx.documentSequence.upsert({
      where: {
        organizationId_branchId_documentType_year_month: {
          organizationId,
          branchId: actualBranchId || '',
          documentType: DocumentType.SALES_RECEIPT,
          year,
          month,
        },
      },
      update: {
        currentNumber: { increment: 1 },
      },
      create: {
        organizationId,
        branchId: actualBranchId || null,
        documentType: DocumentType.SALES_RECEIPT,
        prefix: 'SR',
        currentNumber: 1,
        year,
        month,
      },
    });

    const paddedNumber = String(sequence.currentNumber).padStart(5, '0');
    return `${sequence.prefix}-${year}${String(month).padStart(2, '0')}-${paddedNumber}`;
  }

  /**
   * Generate transaction number
   */
  private static async generateTransactionNumber(
    tx: any,
    organizationId: string
  ): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Get the headquarters branch
    const headquartersBranch = await tx.branch.findFirst({
      where: {
        organizationId,
        isHeadquarters: true,
      },
      select: { id: true },
    });

    const branchId = headquartersBranch?.id || '';

    const sequence = await tx.documentSequence.upsert({
      where: {
        organizationId_branchId_documentType_year_month: {
          organizationId,
          branchId,
          documentType: 'JOURNAL',
          year,
          month,
        },
      },
      update: {
        currentNumber: { increment: 1 },
      },
      create: {
        organizationId,
        branchId: branchId || null,
        documentType: 'JOURNAL',
        prefix: 'JE',
        currentNumber: 1,
        year,
        month,
      },
    });

    const paddedNumber = String(sequence.currentNumber).padStart(6, '0');
    return `${sequence.prefix}-${year}${String(month).padStart(2, '0')}-${paddedNumber}`;
  }

  // Default Account Getters (Fallbacks)
  private static async getDefaultRevenueAccountId(tx: any, organizationId: string): Promise<string> {
    const account = await tx.chartOfAccount.findFirst({
      where: {
        organizationId,
        accountType: 'REVENUE',
        code: { startsWith: '4' },
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });

    if (!account) {
      throw new Error('No revenue account found. Please configure your Chart of Accounts.');
    }

    return account.id;
  }

  private static async getDefaultServiceRevenueAccountId(tx: any, organizationId: string): Promise<string> {
    // Try to find service-specific revenue account
    const account = await tx.chartOfAccount.findFirst({
      where: {
        organizationId,
        accountType: 'REVENUE',
        name: { contains: 'Service' },
        isActive: true,
      },
    });

    return account?.id || await this.getDefaultRevenueAccountId(tx, organizationId);
  }

  private static async getDefaultTaxPayableAccountId(tx: any, organizationId: string): Promise<string> {
    const account = await tx.chartOfAccount.findFirst({
      where: {
        organizationId,
        accountType: 'LIABILITY',
        OR: [
          { name: { contains: 'Tax Payable' } },
          { name: { contains: 'VAT Payable' } },
          { code: { startsWith: '2' } },
        ],
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });

    if (!account) {
      throw new Error('No tax payable account found. Please configure your Chart of Accounts.');
    }

    return account.id;
  }

  private static async getDefaultCOGSAccountId(tx: any, organizationId: string): Promise<string> {
    // Try to find COGS account with multiple fallback strategies
    
    // Strategy 1: Look for account with COGS in name or code starting with 5
    let account = await tx.chartOfAccount.findFirst({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { name: { contains: 'COGS', mode: 'insensitive' } },
          { name: { contains: 'Cost of Goods', mode: 'insensitive' } },
          { code: { startsWith: '5' } },
        ],
      },
      orderBy: { code: 'asc' },
    });

    // Strategy 2: If not found, look for any EXPENSE type account
    if (!account) {
      account = await tx.chartOfAccount.findFirst({
        where: {
          organizationId,
          accountType: 'EXPENSE',
          isActive: true,
        },
        orderBy: { code: 'asc' },
      });
    }

    // Strategy 3: If still not found, just get any active account of reasonable type
    if (!account) {
      account = await tx.chartOfAccount.findFirst({
        where: {
          organizationId,
          isActive: true,
          accountType: { in: ['EXPENSE', 'LIABILITY'] },
        },
        orderBy: { code: 'asc' },
      });
    }

    if (!account) {
      // Get debugging info
      const allAccounts = await tx.chartOfAccount.findMany({
        where: { organizationId },
        select: { id: true, code: true, name: true, accountType: true, isActive: true },
        take: 10,
      });
      console.error('Available accounts:', allAccounts);
      throw new Error(`No COGS account found. Available accounts: ${JSON.stringify(allAccounts)}`);
    }

    return account.id;
  }

  private static async getDefaultInventoryAssetAccountId(tx: any, organizationId: string): Promise<string> {
    const account = await tx.chartOfAccount.findFirst({
      where: {
        organizationId,
        accountType: 'ASSET',
        OR: [
          { name: { contains: 'Inventory' } },
          { code: { startsWith: '1' } },
        ],
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });

    if (!account) {
      throw new Error('No inventory asset account found. Please configure your Chart of Accounts.');
    }

    return account.id;
  }

  /**
   * Void a Sales Receipt
   */
  static async voidSalesReceipt(
    salesReceiptId: string,
    organizationId: string,
    userId: string,
    voidReason: string
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      const salesReceipt = await tx.salesReceipt.findUnique({
        where: { id: salesReceiptId },
        include: { items: true },
      });

      if (!salesReceipt) {
        throw new Error('Sales receipt not found');
      }

      if (salesReceipt.status === SalesReceiptStatus.VOIDED) {
        throw new Error('Sales receipt is already voided');
      }

      // Reverse inventory
      for (const item of salesReceipt.items) {
        if (item.productId) {
          // Use warehouse location - default to "Main" if not specified
          const warehouseLocation = 'Main';
          
          await InventoryService.addInventory(
            tx,
            organizationId,
            item.productId,
            warehouseLocation,
            Number(item.quantity),
            {
              transactionType: 'SALES_RECEIPT_VOID',
              transactionId: salesReceipt.id,
              transactionNumber: salesReceipt.receiptNumber,
            }
          );
        }
      }

      // Reverse GL transaction
      if (salesReceipt.transactionId) {
        await this.reverseTransaction(tx, salesReceipt.transactionId, userId, voidReason);
      }

      // Mark as voided
      return await tx.salesReceipt.update({
        where: { id: salesReceiptId },
        data: {
          status: SalesReceiptStatus.VOIDED,
          voidedAt: new Date(),
          voidReason,
        },
      });
    });
  }

  /**
   * Reverse a GL transaction
   */
  private static async reverseTransaction(
    tx: any,
    transactionId: string,
    userId: string,
    reason: string
  ): Promise<any> {
    const originalTransaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: { ledgerEntries: true },
    });

    if (!originalTransaction) {
      throw new Error('Original transaction not found');
    }

    // Create reversal transaction
    const reversalTransaction = await tx.transaction.create({
      data: {
        organizationId: originalTransaction.organizationId,
        branchId: originalTransaction.branchId,
        transactionNumber: `REV-${originalTransaction.transactionNumber}`,
        transactionDate: new Date(),
        transactionType: 'REVERSAL',
        referenceType: originalTransaction.referenceType,
        referenceId: originalTransaction.referenceId,
        description: `Reversal of ${originalTransaction.transactionNumber} - ${reason}`,
        status: 'POSTED',
        createdById: userId,
      },
    });

    // Create opposite ledger entries
    const reversalEntries = originalTransaction.ledgerEntries.map((entry: any) => ({
      transactionId: reversalTransaction.id,
      accountId: entry.accountId,
      entryType: entry.entryType === 'DEBIT' ? 'CREDIT' : 'DEBIT',
      amount: entry.amount,
      currency: entry.currency,
      exchangeRate: entry.exchangeRate,
      amountInBase: entry.amountInBase,
      description: `Reversal: ${entry.description}`,
    }));

    await tx.ledgerEntry.createMany({
      data: reversalEntries,
    });

    return reversalTransaction;
  }

  /**
   * Get Sales Receipt by ID
   */
  static async getSalesReceipt(salesReceiptId: string, organizationId: string): Promise<any> {
    return await prisma.salesReceipt.findFirst({
      where: {
        id: salesReceiptId,
        organizationId,
      },
      include: {
        customer: true,
        depositToAccount: true,
        branch: true,
        warehouse: true,
        items: {
          include: {
            product: true,
            service: true,
            taxRule: true,
            taxLines: true,
          },
        },
      },
    });
  }

  /**
   * List Sales Receipts
   */
  static async listSalesReceipts(
    organizationId: string,
    filters: {
      status?: SalesReceiptStatus;
      customerId?: string;
      paymentMethod?: PaymentMethod;
      fromDate?: Date;
      toDate?: Date;
      branchId?: string;
    },
    pagination: { page: number; limit: number }
  ): Promise<{ salesReceipts: any[]; total: number }> {
    const where: any = { organizationId };

    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.fromDate || filters.toDate) {
      where.receiptDate = {};
      if (filters.fromDate) where.receiptDate.gte = filters.fromDate;
      if (filters.toDate) where.receiptDate.lte = filters.toDate;
    }

    const [salesReceipts, total] = await Promise.all([
      prisma.salesReceipt.findMany({
        where,
        include: {
          customer: true,
          depositToAccount: { select: { name: true } },
          branch: { select: { name: true } },
        },
        orderBy: { receiptDate: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      prisma.salesReceipt.count({ where }),
    ]);

    return { salesReceipts, total };
  }
}
