/**
 * Professional Journal Entry Service
 * Implements all accounting standards and control requirements
 */

import { Decimal } from 'decimal.js';
import prisma from '@/lib/prisma';
import { DoubleEntryService } from './double-entry.service';
import { EntryType, TransactionType } from '@prisma/client';

interface JournalEntryLine {
  accountId: string;
  entryType: EntryType;
  amount: number;
  description?: string;
  departmentId?: string;
  projectId?: string;
  costCenterId?: string;
}

interface CreateJournalEntryInput {
  organizationId: string;
  userId: string;
  journalDate: Date;
  referenceNumber: string;
  journalType: string;
  currency: string;
  exchangeRate: number;
  description: string;
  notes?: string;
  isReversal: boolean;
  reversalDate: Date | null;
  entries: JournalEntryLine[];
}

export class JournalEntryService {
  /**
   * Validate that no control accounts are used
   * Control accounts (AR, AP, Inventory) must only be updated via their modules
   */
  static async validateControlAccounts(
    accountIds: string[],
    organizationId: string
  ): Promise<void> {
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        id: { in: accountIds },
        organizationId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        allowManualJournal: true,
      },
    });

    const controlAccounts = accounts.filter((a) => !a.allowManualJournal);

    if (controlAccounts.length > 0) {
      const names = controlAccounts.map((a) => `${a.code} - ${a.name}`).join(', ');
      throw new Error(
        `Manual journal entries are not allowed for control accounts: ${names}. ` +
          `Please use the appropriate module (Sales, Purchases, or Inventory).`
      );
    }
  }

  /**
   * Validate balance with high precision using Decimal.js
   */
  static validateBalance(entries: JournalEntryLine[]): void {
    let totalDebits = new Decimal(0);
    let totalCredits = new Decimal(0);

    for (const entry of entries) {
      const amount = new Decimal(entry.amount);

      if (entry.entryType === 'DEBIT') {
        totalDebits = totalDebits.plus(amount);
      } else {
        totalCredits = totalCredits.plus(amount);
      }
    }

    const difference = totalDebits.minus(totalCredits).abs();

    // Allow precision tolerance of 0.01 (1 cent)
    if (difference.greaterThan(0.01)) {
      throw new Error(
        `Journal entry is not balanced. Debits: ${totalDebits.toFixed(2)}, ` +
          `Credits: ${totalCredits.toFixed(2)}, Difference: ${difference.toFixed(2)}`
      );
    }
  }

  /**
   * Generate unique reference number for journal entry
   */
  static async generateReferenceNumber(organizationId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    // Get last journal entry for this month
    const lastEntry = await prisma.transaction.findFirst({
      where: {
        organizationId,
        transactionType: 'JOURNAL_ENTRY',
        transactionNumber: {
          startsWith: `JE-${year}-${month}-`,
        },
      },
      orderBy: {
        transactionNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastEntry) {
      const parts = lastEntry.transactionNumber.split('-');
      sequence = parseInt(parts[parts.length - 1]) + 1;
    }

    return `JE-${year}-${month}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Create a professional journal entry with all validations
   */
  static async createJournalEntry(
    input: CreateJournalEntryInput
  ): Promise<any> {
    // 1. Validate balance (Debits = Credits)
    this.validateBalance(input.entries);

    // 2. Validate control accounts
    const accountIds = input.entries.map((e) => e.accountId);
    await this.validateControlAccounts(accountIds, input.organizationId);

    // 3. Validate all accounts exist and are active
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        id: { in: accountIds },
        organizationId: input.organizationId,
        isActive: true,
      },
    });

    if (accounts.length !== accountIds.length) {
      throw new Error('One or more accounts not found or inactive');
    }

    // 4. Create main journal entry using DoubleEntryService
    const transaction = await DoubleEntryService.createTransaction({
      organizationId: input.organizationId,
      transactionDate: input.journalDate,
      transactionType: TransactionType.JOURNAL_ENTRY,
      description: `[${input.journalType}] ${input.description}`,
      notes: input.notes,
      referenceType: 'JOURNAL_ENTRY',
      referenceId: input.referenceNumber,
      createdById: input.userId,
      entries: input.entries.map((entry) => ({
        accountId: entry.accountId,
        entryType: entry.entryType,
        amount: entry.amount,
        currency: input.currency,
        exchangeRate: input.exchangeRate,
        description: entry.description || input.description,
      })),
    });

    // 5. If reversal is requested, schedule reversal entry
    if (input.isReversal && input.reversalDate) {
      await this.createReversalEntry(
        input,
        transaction.id,
        input.reversalDate
      );
    }

    return {
      id: transaction.id,
      transactionNumber: transaction.transactionNumber,
      referenceNumber: input.referenceNumber,
      journalDate: input.journalDate,
      description: input.description,
      isBalanced: true,
    };
  }

  /**
   * Create automatic reversal entry
   */
  private static async createReversalEntry(
    originalInput: CreateJournalEntryInput,
    originalTransactionId: string,
    reversalDate: Date
  ): Promise<void> {
    // Reverse all entries (flip debits to credits and vice versa)
    const reversedEntries = originalInput.entries.map((entry) => ({
      ...entry,
      entryType: (entry.entryType === 'DEBIT' ? 'CREDIT' : 'DEBIT') as EntryType,
      description: `Reversal of ${originalInput.referenceNumber}`,
    }));

    // Create reversal transaction
    await DoubleEntryService.createTransaction({
      organizationId: originalInput.organizationId,
      transactionDate: reversalDate,
      transactionType: TransactionType.JOURNAL_ENTRY,
      description: `REVERSAL: ${originalInput.description}`,
      notes: `Auto-reversal of transaction ${originalTransactionId}`,
      referenceType: 'JOURNAL_ENTRY',
      referenceId: `${originalInput.referenceNumber}-REV`,
      createdById: originalInput.userId,
      entries: reversedEntries.map((entry) => ({
        accountId: entry.accountId,
        entryType: entry.entryType,
        amount: entry.amount,
        currency: originalInput.currency,
        exchangeRate: originalInput.exchangeRate,
        description: entry.description,
      })),
    });
  }

  /**
   * Get account current balance
   */
  static async getAccountBalance(
    accountId: string,
    organizationId: string
  ): Promise<number> {
    const account = await prisma.chartOfAccount.findUnique({
      where: {
        id: accountId,
        organizationId,
      },
      select: {
        balance: true,
      },
    });

    return account?.balance ? parseFloat(account.balance.toString()) : 0;
  }

  /**
   * Validate journal entry before posting
   */
  static async validateJournalEntry(
    entries: JournalEntryLine[],
    organizationId: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check balance
    try {
      this.validateBalance(entries);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Balance validation failed');
    }

    // Check control accounts
    try {
      const accountIds = entries.map((e) => e.accountId);
      await this.validateControlAccounts(accountIds, organizationId);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Control account validation failed');
    }

    // Check for duplicate accounts (optional warning)
    const accountIds = entries.map((e) => e.accountId);
    const uniqueAccounts = new Set(accountIds);
    if (accountIds.length !== uniqueAccounts.size) {
      errors.push('Warning: Same account used multiple times in the entry');
    }

    // Check minimum entries
    if (entries.length < 2) {
      errors.push('A journal entry must have at least 2 lines');
    }

    // Check for both debits and credits
    const hasDebit = entries.some((e) => e.entryType === 'DEBIT');
    const hasCredit = entries.some((e) => e.entryType === 'CREDIT');
    if (!hasDebit || !hasCredit) {
      errors.push('A journal entry must have at least one debit and one credit');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
