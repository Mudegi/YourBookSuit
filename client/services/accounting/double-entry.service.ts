/**
 * Core Double-Entry Bookkeeping Service
 * 
 * This service handles the fundamental rule of accounting:
 * Sum of Debits = Sum of Credits for every transaction
 */

import { Decimal } from 'decimal.js';
import prisma from '@/lib/prisma';
import { EntryType, TransactionType, TransactionStatus } from '@prisma/client';

export interface LedgerEntryInput {
  accountId: string;
  entryType: EntryType;
  amount: Decimal | number;
  currency?: string;
  exchangeRate?: Decimal | number;
  description?: string;
}

export interface TransactionInput {
  organizationId: string;
  transactionDate: Date;
  transactionType: TransactionType;
  description: string;
  notes?: string;
  referenceType?: string;
  referenceId?: string;
  createdById: string;
  entries: LedgerEntryInput[];
}

type PrismaTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export class DoubleEntryService {
  /**
   * Validates that debits equal credits
   * Core rule: Σ(Debits) = Σ(Credits)
   */
  static validateBalance(entries: LedgerEntryInput[]): boolean {
    let totalDebits = new Decimal(0);
    let totalCredits = new Decimal(0);

    for (const entry of entries) {
      const amount = new Decimal(entry.amount);
      
      if (entry.entryType === EntryType.DEBIT) {
        totalDebits = totalDebits.plus(amount);
      } else {
        totalCredits = totalCredits.plus(amount);
      }
    }

    // Check if debits equal credits (accounting equation)
    return totalDebits.equals(totalCredits);
  }

  /**
   * Get the sum of debits and credits
   */
  static getBalanceSummary(entries: LedgerEntryInput[]) {
    let totalDebits = new Decimal(0);
    let totalCredits = new Decimal(0);

    for (const entry of entries) {
      const amount = new Decimal(entry.amount);
      
      if (entry.entryType === EntryType.DEBIT) {
        totalDebits = totalDebits.plus(amount);
      } else {
        totalCredits = totalCredits.plus(amount);
      }
    }

    return {
      totalDebits: totalDebits.toNumber(),
      totalCredits: totalCredits.toNumber(),
      difference: totalDebits.minus(totalCredits).toNumber(),
      isBalanced: totalDebits.equals(totalCredits),
    };
  }

  /**
   * Creates a transaction with ledger entries
   * Validates double-entry balance before saving
   * @param input Transaction input data
   * @param tx Optional Prisma transaction client for nested transactions (for bill creation, etc.)
   */
  static async createTransaction(
    input: TransactionInput,
    tx?: PrismaTransaction
  ) {
    // Validate balance
    if (!this.validateBalance(input.entries)) {
      const summary = this.getBalanceSummary(input.entries);
      throw new Error(
        `Transaction is not balanced. Debits: ${summary.totalDebits}, Credits: ${summary.totalCredits}, Difference: ${summary.difference}`
      );
    }

    // Validate minimum entries (at least 2: one debit, one credit)
    if (input.entries.length < 2) {
      throw new Error('A transaction must have at least 2 entries (1 debit and 1 credit)');
    }

    // Check that we have both debits and credits
    const hasDebit = input.entries.some(e => e.entryType === EntryType.DEBIT);
    const hasCredit = input.entries.some(e => e.entryType === EntryType.CREDIT);

    if (!hasDebit || !hasCredit) {
      throw new Error('A transaction must have at least one debit and one credit entry');
    }

    // Generate transaction number
    const transactionNumber = await this.generateTransactionNumber(
      input.organizationId,
      input.transactionType
    );

    // Use provided transaction client or create a new one
    const client = tx || prisma;

    // Create transaction with entries in a database transaction
    const transaction = await (tx 
      ? this.createTransactionInClient(client, input, transactionNumber)
      : prisma.$transaction(async (innerTx) => {
          return this.createTransactionInClient(innerTx, input, transactionNumber);
        })
    );

    return transaction;
  }

  /**
   * Helper to create transaction within a Prisma transaction client
   */
  private static async createTransactionInClient(
    client: any,
    input: TransactionInput,
    transactionNumber: string
  ) {
    // Create the transaction
    const newTransaction = await client.transaction.create({
      data: {
        organizationId: input.organizationId,
        transactionNumber,
        transactionDate: input.transactionDate,
        transactionType: input.transactionType,
        description: input.description,
        notes: input.notes,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        status: TransactionStatus.POSTED,
        createdById: input.createdById,
        ledgerEntries: {
          create: input.entries.map(entry => {
            const amount = new Decimal(entry.amount);
            const exchangeRate = new Decimal(entry.exchangeRate || 1);
            const amountInBase = amount.times(exchangeRate);

            return {
              accountId: entry.accountId,
              entryType: entry.entryType,
              amount: amount.toNumber(),
              currency: entry.currency || 'USD',
              exchangeRate: exchangeRate.toNumber(),
              amountInBase: amountInBase.toNumber(),
              description: entry.description,
            };
          }),
        },
      },
      include: {
        ledgerEntries: {
          include: {
            account: true,
          },
        },
      },
    });

    // Update account balances
    for (const entry of input.entries) {
      const amount = new Decimal(entry.amount);
      const account = await client.chartOfAccount.findUnique({
        where: { id: entry.accountId },
      });

      if (!account) {
        throw new Error(`Account ${entry.accountId} not found`);
      }

      // Calculate new balance based on account type and entry type
      let newBalance = new Decimal(account.balance);

      // Assets and Expenses increase with Debits, decrease with Credits
      // Liabilities, Equity, and Revenue increase with Credits, decrease with Debits
      if (
        (account.accountType === 'ASSET' || 
         account.accountType === 'EXPENSE' ||
         account.accountType === 'COST_OF_SALES') &&
        entry.entryType === EntryType.DEBIT
      ) {
        newBalance = newBalance.plus(amount);
      } else if (
        (account.accountType === 'ASSET' || 
         account.accountType === 'EXPENSE' ||
         account.accountType === 'COST_OF_SALES') &&
        entry.entryType === EntryType.CREDIT
      ) {
        newBalance = newBalance.minus(amount);
      } else if (
        (account.accountType === 'LIABILITY' || 
         account.accountType === 'EQUITY' ||
         account.accountType === 'REVENUE') &&
        entry.entryType === EntryType.CREDIT
      ) {
        newBalance = newBalance.plus(amount);
      } else {
        newBalance = newBalance.minus(amount);
      }

      // Update account balance
      await client.chartOfAccount.update({
        where: { id: entry.accountId },
        data: { balance: newBalance.toNumber() },
      });
    }

    return newTransaction;
  }

  /**
   * Generates a unique transaction number
   * Format: TXN-2025-0001, INV-2025-0001, etc.
   */
  private static async generateTransactionNumber(
    organizationId: string,
    transactionType: TransactionType
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = this.getTransactionPrefix(transactionType);

    // Get the last transaction number for this type and year
    const lastTransaction = await prisma.transaction.findFirst({
      where: {
        organizationId,
        transactionType,
        transactionNumber: {
          startsWith: `${prefix}-${year}`,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastTransaction) {
      const lastNumber = parseInt(lastTransaction.transactionNumber.split('-')[2] || '0');
      nextNumber = lastNumber + 1;
    }

    return `${prefix}-${year}-${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Get transaction prefix based on type
   */
  private static getTransactionPrefix(type: TransactionType): string {
    const prefixes: Record<TransactionType, string> = {
      JOURNAL_ENTRY: 'JE',
      INVOICE: 'INV',
      BILL: 'BILL',
      PAYMENT: 'PAY',
      RECEIPT: 'REC',
      BANK_TRANSFER: 'TRF',
      INVENTORY_ADJUSTMENT: 'INV-ADJ',
      DEPRECIATION: 'DEP',
      OPENING_BALANCE: 'OB',
      CLOSING_ENTRY: 'CE',
    };

    return prefixes[type] || 'TXN';
  }

  /**
   * Posts a transaction (for systems that draft first, then post)
   */
  static async postTransaction(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { ledgerEntries: true },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status === TransactionStatus.POSTED) {
      return transaction; // Already posted
    }

    // Update status to posted
    return await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.POSTED },
    });
  }

  /**
   * Voids a transaction (reverses all entries)
   * @param transactionId Transaction to void
   * @param userId User performing the void
   * @param tx Optional Prisma transaction client for nested transactions
   */
  static async voidTransaction(
    transactionId: string,
    userId: string,
    tx?: PrismaTransaction
  ) {
    const client = tx || prisma;

    const transaction = await client.transaction.findUnique({
      where: { id: transactionId },
      include: { ledgerEntries: true },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status === TransactionStatus.VOIDED) {
      throw new Error('Transaction is already voided');
    }

    // Create reversing entries
    const reversingEntries: LedgerEntryInput[] = transaction.ledgerEntries.map(entry => ({
      accountId: entry.accountId,
      // Reverse the entry type
      entryType: entry.entryType === EntryType.DEBIT ? EntryType.CREDIT : EntryType.DEBIT,
      amount: entry.amount,
      currency: entry.currency,
      exchangeRate: entry.exchangeRate,
      description: `Void of ${transaction.transactionNumber}`,
    }));

    // Create reversing transaction
    const reversingTransaction = await this.createTransaction({
      organizationId: transaction.organizationId,
      transactionDate: new Date(),
      transactionType: TransactionType.JOURNAL_ENTRY,
      description: `Void of ${transaction.transactionNumber}: ${transaction.description}`,
      notes: `Reversing transaction for voided ${transaction.transactionNumber}`,
      referenceType: 'Transaction',
      referenceId: transactionId,
      createdById: userId,
      entries: reversingEntries,
    }, tx);

    // Update original transaction status
    await client.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.VOIDED },
    });

    return {
      original: transaction,
      reversing: reversingTransaction,
    };
  }
}

export default DoubleEntryService;
