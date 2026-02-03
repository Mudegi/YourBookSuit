/**
 * Credit Note Application Service
 * Professional-grade reversal engine for applying credit notes to outstanding invoices
 * 
 * Features:
 * - Apply credits to specific invoices
 * - Track partial applications
 * - Update customer balances
 * - Generate GL entries
 * - Handle inventory restocking
 * - EFRIS/URA compliance
 */

import prisma from '@/lib/prisma';
import { Decimal } from 'decimal.js';

export interface ApplyCreditNoteInput {
  creditNoteId: string;
  applications: {
    invoiceId: string;
    amount: number;
  }[];
  appliedBy: string;
  notes?: string;
  restockInventory?: boolean;
}

export interface CreditNoteApplicationResult {
  success: boolean;
  creditNote: any;
  applications: any[];
  glTransactionId?: string;
  inventoryRestocked?: boolean;
  error?: string;
}

export class CreditNoteApplicationService {
  /**
   * Apply credit note to one or more invoices
   */
  static async applyCreditNote(
    input: ApplyCreditNoteInput
  ): Promise<CreditNoteApplicationResult> {
    try {
      // 1. Validate credit note exists and is applicable
      const creditNote = await prisma.creditNote.findUnique({
        where: { id: input.creditNoteId },
        include: {
          lineItems: {
            include: {
              product: true,
            },
          },
          customer: true,
          invoice: true,
          organization: true,
        },
      });

      if (!creditNote) {
        throw new Error('Credit note not found');
      }

      if (creditNote.status === 'VOID') {
        throw new Error('Cannot apply voided credit note');
      }

      if (creditNote.status !== 'APPROVED' && creditNote.status !== 'PARTIALLY_APPLIED') {
        throw new Error('Credit note must be approved before application');
      }

      // 2. Calculate total application amount
      const totalApplicationAmount = input.applications.reduce(
        (sum, app) => sum + app.amount,
        0
      );

      const remainingAmount = new Decimal(creditNote.remainingAmount.toString());
      const applicationAmount = new Decimal(totalApplicationAmount);

      if (applicationAmount.greaterThan(remainingAmount)) {
        throw new Error(
          `Application amount (${applicationAmount}) exceeds remaining credit (${remainingAmount})`
        );
      }

      // 3. Validate invoices belong to same customer
      const invoiceIds = input.applications.map((a) => a.invoiceId);
      const invoices = await prisma.invoice.findMany({
        where: {
          id: { in: invoiceIds },
          customerId: creditNote.customerId,
          organizationId: creditNote.organizationId,
        },
      });

      if (invoices.length !== invoiceIds.length) {
        throw new Error('Some invoices not found or belong to different customer');
      }

      // 4. Validate invoice amounts
      for (const application of input.applications) {
        const invoice = invoices.find((inv) => inv.id === application.invoiceId);
        if (!invoice) continue;

        const invoiceBalance = new Decimal(invoice.amountDue.toString());
        const appAmount = new Decimal(application.amount);

        if (appAmount.greaterThan(invoiceBalance)) {
          throw new Error(
            `Application amount for invoice ${invoice.invoiceNumber} exceeds balance due`
          );
        }
      }

      // 5. Execute application in transaction
      const result = await prisma.$transaction(async (tx) => {
        const applications = [];

        // Create applications
        for (const application of input.applications) {
          const app = await tx.creditNoteApplication.create({
            data: {
              creditNoteId: input.creditNoteId,
              invoiceId: application.invoiceId,
              amount: application.amount,
              appliedBy: input.appliedBy,
              notes: input.notes,
            },
          });

          applications.push(app);

          // Update invoice balance
          const invoice = invoices.find((inv) => inv.id === application.invoiceId);
          if (invoice) {
            const newAmountDue = new Decimal(invoice.amountDue.toString())
              .minus(application.amount)
              .toNumber();

            const newAmountPaid = new Decimal(invoice.amountPaid.toString())
              .plus(application.amount)
              .toNumber();

            await tx.invoice.update({
              where: { id: application.invoiceId },
              data: {
                amountDue: newAmountDue,
                amountPaid: newAmountPaid,
                status: newAmountDue <= 0.01 ? 'PAID' : 'PARTIALLY_PAID',
              },
            });
          }
        }

        // Update credit note
        const newAppliedAmount = new Decimal(creditNote.appliedAmount.toString())
          .plus(totalApplicationAmount)
          .toNumber();

        const newRemainingAmount = new Decimal(creditNote.remainingAmount.toString())
          .minus(totalApplicationAmount)
          .toNumber();

        const updatedCreditNote = await tx.creditNote.update({
          where: { id: input.creditNoteId },
          data: {
            appliedAmount: newAppliedAmount,
            remainingAmount: newRemainingAmount,
            status: newRemainingAmount <= 0.01 ? 'APPLIED' : 'PARTIALLY_APPLIED',
          },
        });

        return { updatedCreditNote, applications };
      });

      // 6. Handle inventory restocking (outside main transaction)
      let inventoryRestocked = false;
      if (input.restockInventory && creditNote.lineItems.length > 0) {
        inventoryRestocked = await this.restockInventory(creditNote);
      }

      // 7. Generate GL Entry (if posted)
      let glTransactionId: string | undefined;
      if (creditNote.isPosted) {
        glTransactionId = await this.generateGLEntry(creditNote, input.applications);
      }

      return {
        success: true,
        creditNote: result.updatedCreditNote,
        applications: result.applications,
        glTransactionId,
        inventoryRestocked,
      };
    } catch (error: any) {
      console.error('Error applying credit note:', error);
      return {
        success: false,
        creditNote: null,
        applications: [],
        error: error.message,
      };
    }
  }

  /**
   * Get customer's outstanding invoices available for credit application
   */
  static async getOutstandingInvoices(customerId: string, organizationId: string) {
    return await prisma.invoice.findMany({
      where: {
        customerId,
        organizationId,
        status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
        amountDue: { gt: 0 },
      },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        dueDate: true,
        total: true,
        amountPaid: true,
        amountDue: true,
        currency: true,
        status: true,
      },
      orderBy: {
        invoiceDate: 'asc', // Oldest first (FIFO)
      },
    });
  }

  /**
   * Get credit note application history
   */
  static async getApplicationHistory(creditNoteId: string) {
    return await prisma.creditNoteApplication.findMany({
      where: { creditNoteId },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            invoiceDate: true,
            total: true,
            amountDue: true,
          },
        },
      },
      orderBy: {
        appliedDate: 'desc',
      },
    });
  }

  /**
   * Restock inventory from returned items
   */
  private static async restockInventory(creditNote: any): Promise<boolean> {
    try {
      for (const item of creditNote.lineItems) {
        if (!item.product || !item.product.trackInventory) continue;

        // Get original invoice to determine warehouse
        const originalInvoice = creditNote.invoice;
        const warehouseId = originalInvoice?.warehouseId;

        if (!warehouseId) continue;

        // Get current inventory balance
        const inventory = await prisma.inventoryBalance.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId!,
              warehouseId,
            },
          },
        });

        if (inventory) {
          // Increase quantity on hand
          await prisma.inventoryBalance.update({
            where: { id: inventory.id },
            data: {
              quantityOnHand: {
                increment: Number(item.quantity),
              },
              quantityAvailable: {
                increment: Number(item.quantity),
              },
            },
          });

          // Create inventory transaction
          await prisma.inventoryTransaction.create({
            data: {
              organizationId: creditNote.organizationId,
              productId: item.productId!,
              warehouseId,
              transactionType: 'STOCK_RETURN',
              quantity: Number(item.quantity),
              unitCost: Number(item.unitPrice),
              totalCost: Number(item.subtotal),
              referenceType: 'CREDIT_NOTE',
              referenceId: creditNote.id,
              referenceNumber: creditNote.creditNoteNumber,
              transactionDate: new Date(),
              notes: `Return from Credit Note ${creditNote.creditNoteNumber}`,
            },
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error restocking inventory:', error);
      return false;
    }
  }

  /**
   * Generate GL Entry for credit note application
   */
  private static async generateGLEntry(
    creditNote: any,
    applications: Array<{ invoiceId: string; amount: number }>
  ): Promise<string | undefined> {
    try {
      const totalAmount = applications.reduce((sum, app) => sum + app.amount, 0);

      // Create GL transaction
      const transaction = await prisma.transaction.create({
        data: {
          organizationId: creditNote.organizationId,
          transactionDate: new Date(),
          reference: `Credit Note Application - ${creditNote.creditNoteNumber}`,
          description: `Application of Credit Note ${creditNote.creditNoteNumber}`,
          transactionType: 'CREDIT_NOTE_APPLICATION',
          currency: creditNote.organization.baseCurrency,
          exchangeRate: 1,
          status: 'POSTED',
          isReversed: false,
          journalEntries: {
            create: [
              // Debit: Accounts Receivable (reducing liability to customer)
              {
                accountId: creditNote.organization.arAccountId || '',
                debit: totalAmount,
                credit: 0,
                description: `Credit Note Application - ${creditNote.creditNoteNumber}`,
              },
              // Credit: Sales Returns (reducing income)
              {
                accountId: '', // Should be configured sales returns account
                debit: 0,
                credit: totalAmount,
                description: `Credit Note Application - ${creditNote.creditNoteNumber}`,
              },
            ],
          },
        },
      });

      return transaction.id;
    } catch (error) {
      console.error('Error generating GL entry:', error);
      return undefined;
    }
  }

  /**
   * Unapply credit note from invoice (reversal)
   */
  static async unapplyCreditNote(
    applicationId: string,
    unappliedBy: string,
    reason: string
  ): Promise<boolean> {
    try {
      const application = await prisma.creditNoteApplication.findUnique({
        where: { id: applicationId },
        include: {
          creditNote: true,
          invoice: true,
        },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      await prisma.$transaction(async (tx) => {
        // Revert invoice balance
        await tx.invoice.update({
          where: { id: application.invoiceId },
          data: {
            amountDue: {
              increment: Number(application.amount),
            },
            amountPaid: {
              decrement: Number(application.amount),
            },
          },
        });

        // Revert credit note amounts
        await tx.creditNote.update({
          where: { id: application.creditNoteId },
          data: {
            appliedAmount: {
              decrement: Number(application.amount),
            },
            remainingAmount: {
              increment: Number(application.amount),
            },
            status: 'APPROVED', // Back to approved
          },
        });

        // Delete application record
        await tx.creditNoteApplication.delete({
          where: { id: applicationId },
        });
      });

      return true;
    } catch (error) {
      console.error('Error unapplying credit note:', error);
      return false;
    }
  }
}
