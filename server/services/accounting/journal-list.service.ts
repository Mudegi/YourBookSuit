import { prisma } from '@/lib/prisma';
import { LocalizationProvider } from '@/lib/localization/localization-provider';
import type { Organization, Transaction, LedgerEntry } from '@prisma/client';

export interface JournalEntryListFilters {
  accountingPeriod?: {
    startDate: Date;
    endDate: Date;
  };
  branchId?: string;
  transactionType?: string;
  status?: string;
  amountRange?: {
    min: number;
    max: number;
  };
  createdBy?: string;
  search?: string;
}

export interface JournalEntryMetadata {
  reference: string;
  isBalanced: boolean;
  foreignAmount?: number;
  foreignCurrency?: string;
  baseCurrencyEquivalent: number;
  baseCurrency: string;
  complianceFlags?: Record<string, any>;
  auditTrail: {
    lastModified: Date;
    lastModifiedBy: string;
    version: number;
  };
}

export interface EnhancedJournalEntry extends Transaction {
  ledgerEntries: (LedgerEntry & {
    account: {
      id: string;
      code: string;
      name: string;
      accountType: string;
    };
  })[];
  createdBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  approvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  branch?: {
    id: string;
    name: string;
    code: string;
  } | null;
  metadata: JournalEntryMetadata;
}

/**
 * Journal List Service - Country-Blind Implementation
 * 
 * This service is designed to be "Global by Design but Localized by Configuration"
 * It pulls currency settings from OrganizationSettings and compliance rules 
 * from LocalizationProvider rather than hardcoding regional logic.
 */
export class JournalListService {
  private localizationProvider = LocalizationProvider.getInstance();

  /**
   * Fetch journal entries with enterprise-grade filtering and metadata
   */
  async getJournalEntries(
    organizationId: string,
    filters: JournalEntryListFilters = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 50 }
  ): Promise<{
    entries: EnhancedJournalEntry[];
    total: number;
    organizationSettings: {
      baseCurrency: string;
      homeCountry: string;
      fiscalYearStart: number;
    };
    localizationMetadata: any;
  }> {
    // Get organization settings for currency and country context
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        baseCurrency: true,
        homeCountry: true,
        fiscalYearStart: true,
      }
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Get localization metadata for the organization's country
    const localizationContext = {
      organizationId,
      country: organization.homeCountry,
    };
    
    // Get entry-specific metadata for localization
    const localizationMetadata = await this.localizationProvider.getEntryMetadata(localizationContext);

    // Build dynamic where clause
    const whereClause = this.buildWhereClause(organizationId, filters);

    // Get total count for pagination
    const total = await prisma.transaction.count({ where: whereClause });

    // Fetch transactions with all related data
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        ledgerEntries: {
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
                accountType: true,
              },
            },
          },
          orderBy: {
            entryType: 'asc', // DEBIT first for readability
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [
        { transactionDate: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    });

    // Enhance each transaction with computed metadata
    const enhancedEntries = await Promise.all(
      transactions.map(async (transaction) => {
        const metadata = await this.computeJournalEntryMetadata(
          transaction,
          organization.baseCurrency,
          localizationMetadata
        );

        return {
          ...transaction,
          metadata,
        } as EnhancedJournalEntry;
      })
    );

    return {
      entries: enhancedEntries,
      total,
      organizationSettings: {
        baseCurrency: organization.baseCurrency,
        homeCountry: organization.homeCountry,
        fiscalYearStart: organization.fiscalYearStart,
      },
      localizationMetadata,
    };
  }

  /**
   * Create reverse entry for audit compliance
   */
  async createReverseEntry(
    organizationId: string,
    originalEntryId: string,
    createdById: string,
    reason?: string
  ): Promise<string> {
    const originalTransaction = await prisma.transaction.findFirst({
      where: {
        id: originalEntryId,
        organizationId,
      },
      include: {
        ledgerEntries: true,
      },
    });

    if (!originalTransaction) {
      throw new Error('Original transaction not found');
    }

    if (originalTransaction.status === 'VOIDED') {
      throw new Error('Cannot reverse a voided transaction');
    }

    // Generate new transaction number
    const transactionNumber = await this.generateTransactionNumber(organizationId);

    // Create reverse transaction
    const reverseTransaction = await prisma.transaction.create({
      data: {
        organizationId,
        branchId: originalTransaction.branchId,
        transactionNumber,
        transactionDate: new Date(),
        transactionType: originalTransaction.transactionType,
        referenceType: 'REVERSAL',
        referenceId: originalEntryId,
        description: `Reversal of ${originalTransaction.description}${reason ? ` - ${reason}` : ''}`,
        notes: `This entry reverses transaction ${originalTransaction.transactionNumber}`,
        status: 'POSTED',
        createdById,
        ledgerEntries: {
          create: originalTransaction.ledgerEntries.map((entry) => ({
            accountId: entry.accountId,
            entryType: entry.entryType === 'DEBIT' ? 'CREDIT' : 'DEBIT', // Swap entry types
            amount: entry.amount,
            amountInBase: entry.amountInBase || entry.amount,
            currency: entry.currency,
            exchangeRate: entry.exchangeRate || 1,
            description: `Reversal: ${entry.description || ''}`,
          })),
        },
      },
    });

    // Mark original transaction as reversed
    await prisma.transaction.update({
      where: { id: originalEntryId },
      data: {
        notes: `${originalTransaction.notes || ''} [REVERSED by ${reverseTransaction.transactionNumber}]`.trim(),
        updatedAt: new Date(),
      },
    });

    return reverseTransaction.id;
  }

  /**
   * Bulk approve journal entries
   */
  async bulkApproveEntries(
    organizationId: string,
    entryIds: string[],
    approvedById: string
  ): Promise<{ successful: string[]; failed: string[] }> {
    const successful: string[] = [];
    const failed: string[] = [];

    for (const entryId of entryIds) {
      try {
        const transaction = await prisma.transaction.findFirst({
          where: {
            id: entryId,
            organizationId,
            status: 'DRAFT',
          },
          include: {
            ledgerEntries: true,
          },
        });

        if (!transaction) {
          failed.push(entryId);
          continue;
        }

        // Verify entry is balanced
        const isBalanced = this.verifyEntryBalance(transaction.ledgerEntries);
        if (!isBalanced) {
          failed.push(entryId);
          continue;
        }

        await prisma.transaction.update({
          where: { id: entryId },
          data: {
            status: 'POSTED',
            approvedById,
            approvedAt: new Date(),
          },
        });

        successful.push(entryId);
      } catch (error) {
        console.error(`Failed to approve entry ${entryId}:`, error);
        failed.push(entryId);
      }
    }

    return { successful, failed };
  }

  /**
   * Build dynamic where clause based on filters
   */
  private buildWhereClause(organizationId: string, filters: JournalEntryListFilters) {
    const where: any = {
      organizationId,
    };

    if (filters.accountingPeriod) {
      where.transactionDate = {
        gte: filters.accountingPeriod.startDate,
        lte: filters.accountingPeriod.endDate,
      };
    }

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    if (filters.transactionType) {
      where.transactionType = filters.transactionType;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.createdBy) {
      where.createdById = filters.createdBy;
    }

    if (filters.amountRange) {
      // This requires a subquery on ledgerEntries sum
      where.ledgerEntries = {
        some: {
          amount: {
            gte: filters.amountRange.min,
            lte: filters.amountRange.max,
          },
        },
      };
    }

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { transactionNumber: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /**
   * Compute metadata for journal entry including compliance flags
   */
  private async computeJournalEntryMetadata(
    transaction: any,
    baseCurrency: string,
    localizationMetadata: any
  ): Promise<JournalEntryMetadata> {
    // Generate reference number
    const reference = transaction.transactionNumber || `JE-${transaction.id.slice(0, 8)}`;

    // Check if entry is balanced
    const isBalanced = this.verifyEntryBalance(transaction.ledgerEntries);

    // Calculate amounts
    const debitTotal = transaction.ledgerEntries
      .filter((e: any) => e.entryType === 'DEBIT')
      .reduce((sum: number, e: any) => sum + parseFloat(e.amount.toString()), 0);

    // Get foreign currency info if applicable
    const foreignCurrencyEntries = transaction.ledgerEntries.filter(
      (e: any) => e.currency !== baseCurrency
    );
    
    let foreignAmount: number | undefined;
    let foreignCurrency: string | undefined;
    
    if (foreignCurrencyEntries.length > 0) {
      foreignAmount = foreignCurrencyEntries[0].amount;
      foreignCurrency = foreignCurrencyEntries[0].currency;
    }

    // Apply localization rules for compliance flags
    const complianceFlags = this.getComplianceFlags(transaction, localizationMetadata);

    return {
      reference,
      isBalanced,
      foreignAmount,
      foreignCurrency,
      baseCurrencyEquivalent: debitTotal,
      baseCurrency,
      complianceFlags,
      auditTrail: {
        lastModified: transaction.updatedAt,
        lastModifiedBy: transaction.createdBy.email,
        version: 1, // TODO: Implement versioning
      },
    };
  }

  /**
   * Apply localization-specific compliance flags
   */
  private getComplianceFlags(transaction: any, localizationMetadata: any): Record<string, any> {
    const flags: Record<string, any> = {};

    // Example: Uganda VAT compliance check
    if (localizationMetadata?.country === 'UG') {
      // Check if transaction involves VAT accounts
      const hasVATEntries = transaction.ledgerEntries.some((entry: any) => 
        entry.account.code.includes('VAT') || entry.account.name.includes('VAT')
      );
      
      if (hasVATEntries) {
        flags.vatInclusive = transaction.taxAmount > 0;
        flags.uraCompliant = this.checkURACompliance(transaction);
      }
    }

    // Add more country-specific flags as needed
    return flags;
  }

  /**
   * Uganda Revenue Authority compliance check
   */
  private checkURACompliance(transaction: any): boolean {
    // Implement URA-specific validation logic
    // This is a placeholder - real implementation would check against URA rules
    return transaction.attachments && transaction.attachments.length > 0;
  }

  /**
   * Verify that journal entry is balanced (Debits = Credits)
   */
  private verifyEntryBalance(ledgerEntries: any[]): boolean {
    const debitTotal = ledgerEntries
      .filter((e) => e.entryType === 'DEBIT')
      .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
      
    const creditTotal = ledgerEntries
      .filter((e) => e.entryType === 'CREDIT')
      .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);

    return Math.abs(debitTotal - creditTotal) < 0.01; // Allow for small rounding differences
  }

  /**
   * Generate next transaction number
   */
  private async generateTransactionNumber(organizationId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `JE-${currentYear}`;

    const lastTransaction = await prisma.transaction.findFirst({
      where: {
        organizationId,
        transactionNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        transactionNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastTransaction?.transactionNumber) {
      const match = lastTransaction.transactionNumber.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
  }
}

export const journalListService = new JournalListService();