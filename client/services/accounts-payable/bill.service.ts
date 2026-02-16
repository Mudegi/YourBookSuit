import { prisma } from '@/lib/prisma';
import { DoubleEntryService, LedgerEntryInput } from '../accounting/double-entry.service';
import { BillStatus, EntryType, TransactionType } from '@prisma/client';

interface BillItem {
  description: string;
  quantity: number;
  unitPrice: number;
  productId?: string;
  serviceId?: string;
  accountId?: string; // Expense account (required only for non-inventory items)
  taxAmount: number;
  taxRate?: number; // VAT rate for this item
  taxCategory?: string; // 'STANDARD' (18%), 'ZERO' (0%), 'EXEMPT' for URA
  claimInputTax?: boolean; // Whether to claim input VAT
}

interface CreateBillData {
  vendorId: string;
  billDate: Date;
  dueDate: Date;
  billNumber?: string;
  items: BillItem[];
  notes?: string;
  referenceNumber?: string;
  vendorInvoiceNo?: string;
  taxCategory?: string; // Overall bill tax category for URA compliance
  whtApplicable?: boolean;
  whtRate?: number;
  whtAmount?: number;
  efrisReceiptNo?: string;
  stockInType?: string; // EFRIS: 101=Import, 102=Local, 103=Manufacture, 104=Opening
}

/**
 * BillService handles bill creation with automatic double-entry posting
 * 
 * Double-entry structure for a bill:
 * 
 * For Inventory Purchases (stockInType: 101, 102, 103):
 * - DR: Inventory Asset (1300) for items with productId
 * - DR: Expense Account (from accountId) for non-inventory items
 * - DR: VAT Input / Recoverable (if claimable and tax applies)
 * - CR: Accounts Payable (total gross amount)
 * - [Optional] CR: WHT Payable (if withholding applies)
 * - [Optional] DR: Accounts Payable (to reduce for withheld amount)
 * 
 * For Opening Stock (stockInType: 104):
 * - DR: Inventory Asset (1300)
 * - CR: Opening Balance Equity (3900) - NOT Accounts Payable!
 * - No expense accounts, no AP liability
 */
export class BillService {
  /**
   * Create a new bill with automatic GL posting via DoubleEntryService
   * Creates balanced ledger entries that enforce debit = credit
   */
  static async createBill(
    data: CreateBillData,
    organizationId: string,
    userId: string
  ) {
    // Validate vendor exists
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: data.vendorId,
        organizationId,
      },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Find Accounts Payable account (LIABILITY type)
    const apAccount = await prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        code: { startsWith: '2000' }, // Accounts Payable typically 2000-2999
        accountType: 'LIABILITY',
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });

    if (!apAccount) {
      throw new Error(
        'Accounts Payable account not found. Please create a LIABILITY account with code starting with 2000.'
      );
    }

    // Find VAT Input / Recoverable account (ASSET type or similar)
    // Common code: 1400 (Input VAT / Recoverable Tax)
    const vatInputAccount = await prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        code: { startsWith: '1400' },
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });

    // Find WHT Payable account if WHT applies (LIABILITY)
    let whtPayableAccount = null;
    if (data.whtApplicable && data.whtRate && data.whtRate > 0) {
      whtPayableAccount = await prisma.chartOfAccount.findFirst({
        where: {
          organizationId,
          code: { startsWith: '2100' }, // WHT Payable typically 2100-2199
          accountType: 'LIABILITY',
          isActive: true,
        },
        orderBy: { code: 'asc' },
      });
    }

    // Find Inventory Asset account for inventory purchases (ASSET type)
    // Common code: 1300 (Inventory / Stock)
    const inventoryAssetAccount = await prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        code: { startsWith: '1300' },
        accountType: 'ASSET',
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });

    // Find Opening Balance Equity account for opening stock (EQUITY type)
    // Common code: 3900 (Opening Balance Equity)
    let openingBalanceEquityAccount = null;
    if (data.stockInType === '104') {
      openingBalanceEquityAccount = await prisma.chartOfAccount.findFirst({
        where: {
          organizationId,
          code: { startsWith: '3900' },
          accountType: 'EQUITY',
          isActive: true,
        },
        orderBy: { code: 'asc' },
      });

      if (!openingBalanceEquityAccount) {
        throw new Error(
          'Opening Balance Equity account not found. Please create an EQUITY account with code starting with 3900 for opening stock.'
        );
      }
    }

    // Calculate totals
    const subtotal = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const totalTaxAmount = data.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    const whtAmount = data.whtAmount || 0;
    const totalGross = subtotal + totalTaxAmount;
    const totalPayable = totalGross - whtAmount; // Reduce for withheld portion

    // Generate bill number if not provided
    const billNumber =
      data.billNumber || (await this.generateBillNumber(organizationId));

    // Build double-entry ledger entries
    const ledgerEntries: LedgerEntryInput[] = [];
    const isOpeningStock = data.stockInType === '104';

    // 1. DR: Inventory Asset (for inventory items) OR Expense Account (for non-inventory items)
    for (const item of data.items) {
      const lineNetAmount = item.quantity * item.unitPrice;
      
      // Determine which account to debit
      let accountToDebit: string;
      
      if (item.productId) {
        // Inventory item - use Inventory Asset account
        if (!inventoryAssetAccount) {
          throw new Error(
            'Inventory Asset account not found. Please create an ASSET account with code starting with 1300 for inventory purchases.'
          );
        }
        accountToDebit = inventoryAssetAccount.id;
      } else if (item.accountId) {
        // Non-inventory item - use provided expense account
        accountToDebit = item.accountId;
      } else {
        throw new Error(
          `Item "${item.description}" must have either a productId (for inventory) or accountId (for expenses).`
        );
      }
      
      ledgerEntries.push({
        accountId: accountToDebit,
        entryType: EntryType.DEBIT,
        amount: lineNetAmount,
        description: item.description,
        currency: 'USD',
      });
    }

    // 2. DR: VAT Input / Recoverable (if applicable and account exists)
    // Skip VAT for opening stock as it's not a new purchase
    if (!isOpeningStock && totalTaxAmount > 0 && vatInputAccount) {
      // Sum tax on items where claimable is true
      const claimableVat = data.items
        .filter((item) => item.claimInputTax !== false)
        .reduce((sum, item) => sum + (item.taxAmount || 0), 0);

      if (claimableVat > 0) {
        ledgerEntries.push({
          accountId: vatInputAccount.id,
          entryType: EntryType.DEBIT,
          amount: claimableVat,
          description: `Input VAT - ${billNumber}`,
          currency: 'USD',
        });
      }
    }

    // 3. CR: Opening Balance Equity (for opening stock) OR Accounts Payable (for purchases)
    if (isOpeningStock) {
      // Opening stock: CR Opening Balance Equity (no liability created)
      ledgerEntries.push({
        accountId: openingBalanceEquityAccount!.id,
        entryType: EntryType.CREDIT,
        amount: totalGross,
        description: `Opening Stock - Bill ${billNumber}`,
        currency: 'USD',
      });
    } else {
      // Regular purchase: CR Accounts Payable (creates liability)
      ledgerEntries.push({
        accountId: apAccount.id,
        entryType: EntryType.CREDIT,
        amount: totalGross,
        description: `Bill ${billNumber} - ${vendor.companyName}`,
        currency: 'USD',
      });
    }

    // 4. [Optional] CR: WHT Payable + DR: AP Reduction (not applicable for opening stock)
    if (!isOpeningStock && whtAmount > 0 && whtPayableAccount) {
      ledgerEntries.push({
        accountId: whtPayableAccount.id,
        entryType: EntryType.CREDIT,
        amount: whtAmount,
        description: `WHT Payable - Bill ${billNumber}`,
        currency: 'USD',
      });

      // DR: AP to reduce for withheld portion
      ledgerEntries.push({
        accountId: apAccount.id,
        entryType: EntryType.DEBIT,
        amount: whtAmount,
        description: `WHT reduction on Bill ${billNumber}`,
        currency: 'USD',
      });
    }

    // Create transaction and bill in a single database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create GL transaction using DoubleEntryService
      const transaction = await DoubleEntryService.createTransaction(
        {
          organizationId,
          transactionDate: data.billDate,
          transactionType: TransactionType.BILL,
          description: `Bill ${billNumber} - ${vendor.companyName}`,
          referenceType: 'BILL',
          referenceId: '', // Will be updated after bill creation
          createdById: userId,
          entries: ledgerEntries,
        },
        tx
      );

      // Create bill with URA fields
      const bill = await tx.bill.create({
        data: {
          billNumber,
          vendorId: data.vendorId,
          organizationId,
          billDate: data.billDate,
          dueDate: data.dueDate,
          subtotal: subtotal.toString(),
          taxAmount: totalTaxAmount.toString(),
          total: totalGross.toString(),
          amountDue: totalPayable.toString(),
          status: BillStatus.DRAFT,
          notes: data.notes,
          vendorInvoiceNo: data.vendorInvoiceNo || null,
          whtApplicable: data.whtApplicable || false,
          whtRate: data.whtRate || 0,
          whtAmount: whtAmount > 0 ? whtAmount.toString() : '0',
          efrisReceiptNo: data.efrisReceiptNo || null,
          stockInType: data.stockInType || null,
          transactionId: transaction.id,
          items: {
            create: data.items.map((item, index) => ({
              description: item.description,
              quantity: item.quantity.toString(),
              unitPrice: item.unitPrice.toString(),
              productId: item.productId,
              serviceId: item.serviceId,
              taxAmount: (item.taxAmount || 0).toString(),
              total: (item.quantity * item.unitPrice + (item.taxAmount || 0)).toString(),
              accountId: item.accountId,
              taxRate: (item.taxRate || 0).toString(),
              taxCategory: item.taxCategory || 'STANDARD',
              claimInputTax: item.claimInputTax !== false,
              sortOrder: index,
            })),
          },
        },
        include: {
          items: true,
          vendor: true,
          transaction: {
            include: {
              ledgerEntries: {
                include: {
                  account: true,
                },
              },
            },
          },
        },
      });

      // Update transaction with bill reference
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { referenceId: bill.id },
      });

      return bill;
    });

    return result;
  }

  /**
   * Generate a unique bill number
   */
  private static async generateBillNumber(organizationId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `BILL-${currentYear}`;

    // Find the latest bill for this year
    const latestBill = await prisma.bill.findFirst({
      where: {
        organizationId,
        billNumber: { startsWith: prefix },
      },
      orderBy: { billNumber: 'desc' },
    });

    let nextNumber = 1;
    if (latestBill) {
      const match = latestBill.billNumber.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Update bill status
   * When marked as SENT, post the GL transaction
   */
  static async updateBillStatus(
    billId: string,
    newStatus: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED',
    organizationId: string,
    userId: string
  ) {
    const toDbStatus = (status: typeof newStatus): BillStatus => {
      switch (status) {
        case 'SENT':
          return BillStatus.SUBMITTED;
        case 'PAID':
          return BillStatus.PAID;
        case 'OVERDUE':
          return BillStatus.OVERDUE;
        case 'CANCELLED':
          return BillStatus.CANCELLED;
        case 'DRAFT':
        default:
          return BillStatus.DRAFT;
      }
    };

    const targetStatus = toDbStatus(newStatus);
    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        organizationId,
      },
      include: {
        transaction: true,
      },
    });

    if (!bill) {
      throw new Error('Bill not found');
    }

    // Update bill status
    const updatedBill = await prisma.$transaction(async (tx) => {
      // If changing to SENT and transaction not posted, post it
      if (
        newStatus === 'SENT' &&
        bill.transaction &&
        bill.transaction.status === 'DRAFT'
      ) {
        await tx.transaction.update({
          where: { id: bill.transaction.id },
          data: { status: 'POSTED' },
        });
      }

      return await tx.bill.update({
        where: { id: billId },
        data: {
          status: targetStatus,
        },
        include: {
          items: true,
          vendor: true,
          transaction: {
            include: {
              ledgerEntries: {
                include: {
                  account: true,
                },
              },
            },
          },
        },
      });
    });

    return updatedBill;
  }

  /**
   * Void a bill (also voids the GL transaction)
   */
  static async voidBill(
    billId: string,
    organizationId: string,
    userId: string
  ) {
    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        organizationId,
      },
      include: {
        transaction: true,
      },
    });

    if (!bill) {
      throw new Error('Bill not found');
    }

    if (bill.status === BillStatus.PAID) {
      throw new Error('Cannot void a paid bill. Reverse the payment first.');
    }

    // Update bill status to CANCELLED
    await prisma.bill.update({
      where: { id: billId },
      data: {
        status: BillStatus.CANCELLED,
      },
    });

    return true;
  }
}
