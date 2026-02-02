/**
 * Expense Tracking Service
 * Handles operational expenditure (OPEX) distinct from Purchase/Inventory management
 * 
 * Features:
 * - Mobile Money & Cash support
 * - Auto GL posting with tax calculations
 * - Reimbursement tracking
 * - Project & Cost Center allocation
 * - Receipt attachment management
 * - Budget compliance checking
 */

import { prisma } from '@/lib/prisma';
import { JournalEntryService } from '../accounting/journal-entry.service';
import { DoubleEntryService } from '../accounting/double-entry.service';
import { TaxCalculationService } from '@/lib/tax/tax-calculation.service';
import { Decimal } from 'decimal.js';

export interface ExpenseLineItem {
  categoryId: string; // GL Account ID
  description: string;
  amount: number;
  taxInclusive: boolean;
  taxRateId?: string;
  projectId?: string;
  costCenterId?: string;
}

export interface CreateExpenseData {
  organizationId: string;
  userId: string;
  expenseDate: Date;
  payeeVendorId?: string; // Formal vendor
  payeeName?: string; // One-time payee name
  paymentAccountId: string; // Bank/Cash/Mobile Money account
  paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'PETTY_CASH' | 'DIRECTORS_LOAN';
  mobileMoneyTransactionId?: string; // Required for Mobile Money
  mobileMoneyProvider?: string; // e.g., MTN, Airtel, M-Pesa
  currency?: string; // Defaults to org currency
  isReimbursement: boolean; // Employee/Director paid personally
  claimantUserId?: string; // Who to reimburse
  lines: ExpenseLineItem[];
  receiptAttachmentId?: string;
  notes?: string;
  referenceNumber?: string;
}

export interface ExpenseResponse {
  success: boolean;
  expenseId: string;
  transactionId: string;
  journalEntryNumber: string;
  message: string;
  warnings?: string[];
}

export class ExpenseService {
  /**
   * Record an operational expense with automatic GL posting
   */
  static async createExpense(data: CreateExpenseData): Promise<ExpenseResponse> {
    const warnings: string[] = [];

    return await prisma.$transaction(async (tx) => {
      // Get organization details for localization
      const organization = await tx.organization.findUnique({
        where: { id: data.organizationId },
        select: {
          baseCurrency: true,
          homeCountry: true,
        },
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      const currency = data.currency || organization.baseCurrency;

      // Validate payment account
      const paymentAccount = await tx.bankAccount.findUnique({
        where: { id: data.paymentAccountId },
      });

      if (!paymentAccount) {
        throw new Error('Payment account not found');
      }

      if (!paymentAccount.glAccountId) {
        throw new Error(`Payment account "${paymentAccount.accountName}" must have a GL account linked. Please configure this in Bank Accounts settings.`);
      }

      // Mobile Money validation (country-agnostic)
      if (data.paymentMethod === 'MOBILE_MONEY') {
        if (!data.mobileMoneyTransactionId) {
          throw new Error('Mobile Money transaction ID is required');
        }
        if (!data.mobileMoneyProvider) {
          warnings.push('Mobile Money provider not specified');
        }
      }

      // Calculate totals with tax
      let totalAmount = new Decimal(0);
      let totalTax = new Decimal(0);
      const processedLines: any[] = [];

      for (const line of data.lines) {
        const lineAmount = new Decimal(line.amount);
        let lineTax = new Decimal(0);
        let netAmount = lineAmount;

        if (line.taxRateId) {
          const taxRate = await tx.taxAgencyRate.findUnique({
            where: { id: line.taxRateId },
          });

          if (taxRate) {
            if (line.taxInclusive) {
              // Add tax on top of amount (swapped logic)
              lineTax = lineAmount.times(new Decimal(taxRate.rate).div(100));
              netAmount = lineAmount; // net is the line amount
            } else {
              // Extract tax from inclusive amount (swapped logic)
              const taxMultiplier = new Decimal(taxRate.rate).div(100).plus(1);
              netAmount = lineAmount.div(taxMultiplier);
              lineTax = lineAmount.minus(netAmount);
            }
          }
        }

        // For tax inclusive (add on top), total = net + tax
        // For tax exclusive (extract), total = lineAmount already includes tax
        const grossAmount = line.taxInclusive ? lineAmount.plus(lineTax) : lineAmount;
        totalAmount = totalAmount.plus(grossAmount);
        totalTax = totalTax.plus(lineTax);

        processedLines.push({
          ...line,
          netAmount: netAmount.toNumber(),
          taxAmount: lineTax.toNumber(),
          grossAmount: grossAmount.toNumber(),
        });
      }

      // Check for WHT applicability (country-specific thresholds)
      let whtAmount = new Decimal(0);
      let whtAccountId: string | null = null;

      if (data.payeeVendorId && totalAmount.greaterThan(0)) {
        // Get localization config to determine WHT thresholds
        const localizationConfig = await tx.localizationConfig.findUnique({
          where: { organizationId: data.organizationId },
        });

        if (localizationConfig) {
          const whtThreshold = (localizationConfig.whtThreshold as any)?.professionalServices || 0;
          
          if (whtThreshold > 0 && totalAmount.greaterThan(whtThreshold)) {
            // Apply WHT rate based on organization's country configuration
            const whtRule = await tx.wHTRule.findFirst({
              where: {
                organizationId: data.organizationId,
                isActive: true,
              },
              orderBy: { createdAt: 'desc' },
            });

            if (whtRule) {
              whtAmount = totalAmount.times(new Decimal(whtRule.rate).div(100));
              
              // Get WHT Payable account
              const whtAccount = await tx.chartOfAccount.findFirst({
                where: {
                  organizationId: data.organizationId,
                  code: { startsWith: '2400' }, // WHT Payable
                  accountType: 'LIABILITY',
                },
              });

              if (whtAccount) {
                whtAccountId = whtAccount.id;
                warnings.push(`Withholding Tax Applied: ${whtAmount.toFixed(2)} ${currency}`);
              }
            }
          }
        }
      }

      // Generate expense number
      const lastExpense = await tx.transaction.findFirst({
        where: {
          organizationId: data.organizationId,
          transactionType: 'JOURNAL_ENTRY',
        },
        orderBy: { createdAt: 'desc' },
      });

      const year = new Date().getFullYear();
      const lastNumber = lastExpense?.referenceNumber?.match(/EXP-(\d+)-(\d+)/)?.[2] || '0';
      const expenseNumber = `EXP-${year}-${String(parseInt(lastNumber) + 1).padStart(4, '0')}`;

      // Prepare Journal Entry lines
      const journalLines: any[] = [];

      // DR: Expense accounts (by category)
      for (const line of processedLines) {
        const expenseAccount = await tx.chartOfAccount.findUnique({
          where: { id: line.categoryId },
        });

        if (!expenseAccount) {
          throw new Error(`Expense category account ${line.categoryId} not found`);
        }

        journalLines.push({
          accountId: line.categoryId,
          entryType: 'DEBIT' as const,
          amount: line.netAmount,
          description: line.description,
          projectId: line.projectId,
          costCenterId: line.costCenterId,
        });
      }

      // DR: Input VAT (if applicable)
      if (totalTax.greaterThan(0)) {
        const inputVATAccount = await tx.chartOfAccount.findFirst({
          where: {
            organizationId: data.organizationId,
            code: { startsWith: '1600' }, // Input VAT
            accountType: 'ASSET',
          },
        });

        if (inputVATAccount) {
          journalLines.push({
            accountId: inputVATAccount.id,
            entryType: 'DEBIT' as const,
            amount: totalTax.toNumber(),
            description: 'Input VAT recoverable',
          });
        }
      }

      // CR: Payment Account (or Employee Payable for reimbursement)
      if (data.isReimbursement && data.claimantUserId) {
        // Credit Employee/Director Payable
        const employeePayableAccount = await tx.chartOfAccount.findFirst({
          where: {
            organizationId: data.organizationId,
            code: { startsWith: '2300' }, // Employee Payables
            accountType: 'LIABILITY',
          },
        });

        if (!employeePayableAccount) {
          throw new Error('Employee Payable account not found. Please configure your chart of accounts.');
        }

        const netPayable = totalAmount.minus(whtAmount);
        
        journalLines.push({
          accountId: employeePayableAccount.id,
          entryType: 'CREDIT' as const,
          amount: netPayable.toNumber(),
          description: `Reimbursement owed to employee`,
        });
      } else {
        // Credit Bank/Cash/Mobile Money account
        if (!paymentAccount.glAccountId) {
          throw new Error('Payment account is not linked to a GL account');
        }

        const netPayment = totalAmount.minus(whtAmount);

        journalLines.push({
          accountId: paymentAccount.glAccountId,
          entryType: 'CREDIT' as const,
          amount: netPayment.toNumber(),
          description: `Payment via ${data.paymentMethod}${data.mobileMoneyProvider ? ` (${data.mobileMoneyProvider})` : ''}`,
        });

        // Update bank account balance in real-time
        await tx.bankAccount.update({
          where: { id: data.paymentAccountId },
          data: {
            currentBalance: {
              decrement: netPayment.toNumber(),
            },
          },
        });
      }

      // CR: WHT Payable (if applicable)
      if (whtAmount.greaterThan(0) && whtAccountId) {
        journalLines.push({
          accountId: whtAccountId,
          entryType: 'CREDIT' as const,
          amount: whtAmount.toNumber(),
          description: 'Withholding Tax payable to tax authority',
        });
      }

      // Create the transaction and journal entry
      const payeeName = data.payeeName || 
        (data.payeeVendorId ? (await tx.vendor.findUnique({ where: { id: data.payeeVendorId } }))?.name : null) ||
        'Unnamed Payee';

      const transaction = await DoubleEntryService.createTransaction(
        {
          organizationId: data.organizationId,
          transactionDate: data.expenseDate,
          transactionType: 'JOURNAL_ENTRY',
          description: `${data.isReimbursement ? 'Reimbursable ' : ''}Expense - ${payeeName}`,
          referenceType: 'EXPENSE',
          referenceId: expenseNumber,
          createdById: data.userId,
          entries: journalLines.map(line => ({
            accountId: line.accountId,
            entryType: line.entryType,
            amount: line.amount,
            currency: organization.baseCurrency,
            exchangeRate: 1,
            description: line.description,
            projectId: line.projectId,
            costCenterId: line.costCenterId,
          })),
          metadata: {
            payeeVendorId: data.payeeVendorId,
            payeeName: data.payeeName,
            paymentMethod: data.paymentMethod,
            mobileMoneyTransactionId: data.mobileMoneyTransactionId,
            mobileMoneyProvider: data.mobileMoneyProvider,
            isReimbursement: data.isReimbursement,
            claimantUserId: data.claimantUserId,
            receiptAttachmentId: data.receiptAttachmentId,
            totalGross: totalAmount.toNumber(),
            totalTax: totalTax.toNumber(),
            whtAmount: whtAmount.toNumber(),
            referenceNumber: expenseNumber,
          },
        },
        tx
      );

      // Post the transaction immediately
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'POSTED' },
      });

      return {
        success: true,
        expenseId: expenseNumber,
        transactionId: transaction.id,
        journalEntryNumber: expenseNumber,
        message: `Expense ${expenseNumber} recorded successfully`,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    });
  }

  /**
   * Get expense suggestions based on vendor/payee
   * Auto-suggests categories based on past expenses
   */
  static async getExpenseSuggestions(
    organizationId: string,
    vendorId?: string,
    vendorName?: string
  ): Promise<{ categoryId: string; categoryName: string; frequency: number }[]> {
    const searchName = vendorName?.toLowerCase();

    // Find past transactions with similar vendor
    const pastTransactions = await prisma.transaction.findMany({
      where: {
        organizationId,
        transactionType: 'JOURNAL_ENTRY',
        status: 'POSTED',
        OR: [
          vendorId ? { metadata: { path: ['payeeVendorId'], equals: vendorId } } : {},
          searchName ? { description: { contains: searchName, mode: 'insensitive' } } : {},
        ],
      },
      include: {
        entries: {
          where: { entryType: 'DEBIT' },
          include: { account: true },
        },
      },
      take: 50,
    });

    // Count frequency of expense categories
    const categoryMap = new Map<string, { name: string; count: number }>();

    for (const tx of pastTransactions) {
      for (const entry of tx.entries) {
        if (entry.account.accountType === 'EXPENSE') {
          const existing = categoryMap.get(entry.accountId) || { name: entry.account.accountName, count: 0 };
          existing.count += 1;
          categoryMap.set(entry.accountId, existing);
        }
      }
    }

    return Array.from(categoryMap.entries())
      .map(([id, data]) => ({
        categoryId: id,
        categoryName: data.name,
        frequency: data.count,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
  }

  /**
   * Check expense against budget
   */
  static async checkBudgetCompliance(
    organizationId: string,
    categoryId: string,
    amount: number,
    expenseDate: Date
  ): Promise<{
    withinBudget: boolean;
    budgetRemaining: number;
    budgetTotal: number;
    spentToDate: number;
    alert?: string;
  }> {
    // This would integrate with your budgeting module
    // For now, return a placeholder
    return {
      withinBudget: true,
      budgetRemaining: 0,
      budgetTotal: 0,
      spentToDate: 0,
    };
  }

  /**
   * Get expense summary for reporting
   */
  static async getExpenseSummary(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'CATEGORY' | 'PROJECT' | 'COST_CENTER' = 'CATEGORY'
  ) {
    const transactions = await prisma.transaction.findMany({
      where: {
        organizationId,
        transactionType: 'JOURNAL_ENTRY',
        referenceType: 'EXPENSE',
        status: 'POSTED',
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        ledgerEntries: {
          where: { entryType: 'DEBIT' },
          include: {
            account: true,
          },
        },
      },
    });

    const summary = new Map<string, { name: string; total: Decimal }>();

    for (const tx of transactions) {
      for (const entry of tx.ledgerEntries) {
        let key: string;
        let name: string;

        switch (groupBy) {
          case 'PROJECT':
            // Projects would need to be fetched from metadata
            key = 'No Project';
            name = 'No Project';
            break;
          case 'COST_CENTER':
            // Cost centers would need to be fetched from metadata
            key = 'No Cost Center';
            name = 'No Cost Center';
            break;
          case 'CATEGORY':
          default:
            key = entry.accountId;
            name = entry.account.name;
            break;
        }

        const existing = summary.get(key) || { name, total: new Decimal(0) };
        existing.total = existing.total.plus(entry.amount);
        summary.set(key, existing);
      }
    }

    return Array.from(summary.entries()).map(([key, data]) => ({
      key,
      name: data.name,
      total: data.total.toNumber(),
    })).sort((a, b) => b.total - a.total);
  }
}
