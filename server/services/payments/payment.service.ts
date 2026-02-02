import { prisma } from '@/lib/prisma';
import { DoubleEntryService } from '../accounting/double-entry.service';
import { ForeignExchangeGainLossService } from '../currency/fx-gain-loss.service';
import { Decimal } from 'decimal.js';

const getCustomerDisplayName = (customer: { name?: string | null; firstName?: string | null; lastName?: string | null; companyName?: string | null }) => {
  const personalName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  return (customer.name || customer.companyName || personalName || 'Customer').trim();
};

interface RecordCustomerPaymentData {
  customerId: string;
  paymentDate: Date;
  amount: number;
  paymentMethod: 'CASH' | 'CHECK' | 'CARD' | 'ACH' | 'WIRE' | 'OTHER';
  bankAccountId: string;
  referenceNumber?: string;
  notes?: string;
  invoiceAllocations: Array<{
    invoiceId: string;
    amount: number;
  }>;
}

interface RecordVendorPaymentData {
  vendorId: string;
  paymentDate: Date;
  amount: number;
  paymentMethod: 'CASH' | 'CHECK' | 'CARD' | 'ACH' | 'WIRE' | 'OTHER';
  bankAccountId: string;
  referenceNumber?: string;
  notes?: string;
  billAllocations: Array<{
    billId: string;
    amount: number;
  }>;
}

/**
 * PaymentService handles payment recording with automatic double-entry posting
 * 
 * Customer Payment (Money In):
 * - DR: Bank/Cash Account
 * - CR: Accounts Receivable
 * 
 * Vendor Payment (Money Out):
 * - DR: Accounts Payable
 * - CR: Bank/Cash Account
 */
export class PaymentService {
  /**
   * Record a customer payment (money received)
   */
  static async recordCustomerPayment(
    data: RecordCustomerPaymentData,
    organizationId: string,
    userId: string
  ) {
    // Validate customer exists
    const customer = await prisma.customer.findFirst({
      where: {
        id: data.customerId,
        organizationId,
      },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const customerName = getCustomerDisplayName(customer);

    // Validate bank account exists
    const bankAccount = await prisma.account.findFirst({
      where: {
        id: data.bankAccountId,
        organizationId,
        accountType: 'ASSET', // Bank accounts are assets
        isActive: true,
      },
    });

    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    // Find Accounts Receivable account
    const arAccount = await prisma.account.findFirst({
      where: {
        organizationId,
        code: { startsWith: '1200' }, // A/R typically 1200-1299
        accountType: 'ASSET',
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });

    if (!arAccount) {
      throw new Error(
        'Accounts Receivable account not found. Please create an ASSET account with code starting with 1200.'
      );
    }

    // Validate invoice allocations
    const invoiceIds = data.invoiceAllocations.map((a) => a.invoiceId);
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        customerId: data.customerId,
        organizationId,
      },
    });

    if (invoices.length !== invoiceIds.length) {
      throw new Error('One or more invoices not found or do not belong to this customer');
    }

    // Validate total allocation equals payment amount
    const totalAllocated = data.invoiceAllocations.reduce(
      (sum, a) => sum + a.amount,
      0
    );

    if (Math.abs(totalAllocated - data.amount) > 0.01) {
      throw new Error(
        `Total allocated (${totalAllocated}) must equal payment amount (${data.amount})`
      );
    }

    // Prepare ledger entries
    const entries: Array<{
      accountId: string;
      debit: number;
      credit: number;
      description: string;
    }> = [
      // DR: Bank Account
      {
        accountId: data.bankAccountId,
        debit: data.amount,
        credit: 0,
        description: `Payment from ${customerName}`,
      },
      // CR: Accounts Receivable
      {
        accountId: arAccount.id,
        debit: 0,
        credit: data.amount,
        description: `Payment from ${customerName}`,
      },
    ];

    // Create payment and transaction in a single database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create GL transaction using DoubleEntryService
      const transaction = await DoubleEntryService.createTransaction(
        {
          transactionDate: data.paymentDate,
          description: `Customer Payment - ${customerName}`,
          referenceType: 'CUSTOMER_PAYMENT',
          referenceId: '', // Will be updated with payment ID
          entries,
        },
        organizationId,
        userId,
        tx
      );

      // Post the transaction immediately
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'POSTED' },
      });

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          paymentType: 'CUSTOMER_PAYMENT',
          paymentDate: data.paymentDate,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          referenceNumber: data.referenceNumber,
          notes: data.notes,
          customerId: data.customerId,
          bankAccountId: data.bankAccountId,
          transactionId: transaction.id,
          organizationId,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      // Update transaction with payment reference
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { referenceId: payment.id },
      });

      // Get organization for base currency and FX account settings
      const organization = await tx.organization.findUnique({
        where: { id: organizationId },
        select: {
          baseCurrency: true,
          fxGainAccountId: true,
          fxLossAccountId: true,
        },
      });

      let totalFxGainLoss = new Decimal(0);

      // Create payment allocations and update invoice statuses
      for (const allocation of data.invoiceAllocations) {
        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            invoiceId: allocation.invoiceId,
            amount: allocation.amount,
          },
        });

        // Get invoice with all allocations
        const invoice = await tx.invoice.findUnique({
          where: { id: allocation.invoiceId },
          include: {
            paymentAllocations: true,
          },
        });

        if (invoice) {
          const totalPaid = invoice.paymentAllocations.reduce(
            (sum, a) => sum + a.amount,
            0
          );

          // Calculate FX gain/loss if invoice is in foreign currency
          if (organization && invoice.currency !== organization.baseCurrency) {
            try {
              const fxCalculation = await ForeignExchangeGainLossService.calculateRealizedFX(
                organizationId,
                invoice.id,
                'INVOICE',
                allocation.amount,
                data.paymentDate,
                invoice.exchangeRate
              );

              if (fxCalculation && Math.abs(fxCalculation.gainLossAmount) > 0.01) {
                // Record the FX gain/loss
                await ForeignExchangeGainLossService.recordRealizedFX(
                  organizationId,
                  payment.id,
                  fxCalculation,
                  invoice.id,
                  undefined,
                  userId,
                  tx
                );

                totalFxGainLoss = totalFxGainLoss.plus(fxCalculation.gainLossAmount);
              }
            } catch (error) {
              console.error('Error calculating FX gain/loss:', error);
              // Continue processing - don't fail the payment
            }
          }

          // Update invoice status based on payment
          let newStatus = invoice.status;
          if (totalPaid >= invoice.totalAmount) {
            newStatus = 'PAID';
          } else if (totalPaid > 0) {
            // Partially paid - keep as SENT
            newStatus = 'SENT';
          }

          if (newStatus !== invoice.status) {
            await tx.invoice.update({
              where: { id: allocation.invoiceId },
              data: { status: newStatus },
            });
          }
        }
      }

      // Update payment with total FX gain/loss if applicable
      if (!totalFxGainLoss.isZero()) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            fxGainLossAmount: totalFxGainLoss.toNumber(),
            fxGainLossAccountId: totalFxGainLoss.gt(0)
              ? organization?.fxGainAccountId
              : organization?.fxLossAccountId,
          },
        });
      }

      // Fetch complete payment with relations
      return await tx.payment.findUnique({
        where: { id: payment.id },
        include: {
          customer: true,
          bankAccount: true,
          transaction: {
            include: {
              entries: {
                include: {
                  account: true,
                },
              },
            },
          },
          allocations: {
            include: {
              invoice: true,
            },
          },
        },
      });
    });

    return result;
  }

  /**
   * Record a vendor payment (money paid out)
   */
  static async recordVendorPayment(
    data: RecordVendorPaymentData,
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

    // Validate bank account exists
    const bankAccount = await prisma.account.findFirst({
      where: {
        id: data.bankAccountId,
        organizationId,
        accountType: 'ASSET',
        isActive: true,
      },
    });

    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    // Find Accounts Payable account
    const apAccount = await prisma.account.findFirst({
      where: {
        organizationId,
        code: { startsWith: '2000' }, // A/P typically 2000-2099
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

    // Validate bill allocations
    const billIds = data.billAllocations.map((a) => a.billId);
    const bills = await prisma.bill.findMany({
      where: {
        id: { in: billIds },
        vendorId: data.vendorId,
        organizationId,
      },
    });

    if (bills.length !== billIds.length) {
      throw new Error('One or more bills not found or do not belong to this vendor');
    }

    // Validate total allocation equals payment amount
    const totalAllocated = data.billAllocations.reduce((sum, a) => sum + a.amount, 0);

    if (Math.abs(totalAllocated - data.amount) > 0.01) {
      throw new Error(
        `Total allocated (${totalAllocated}) must equal payment amount (${data.amount})`
      );
    }

    // Prepare ledger entries
    const entries: Array<{
      accountId: string;
      debit: number;
      credit: number;
      description: string;
    }> = [
      // DR: Accounts Payable
      {
        accountId: apAccount.id,
        debit: data.amount,
        credit: 0,
        description: `Payment to ${vendor.name}`,
      },
      // CR: Bank Account
      {
        accountId: data.bankAccountId,
        debit: 0,
        credit: data.amount,
        description: `Payment to ${vendor.name}`,
      },
    ];

    // Create payment and transaction in a single database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create GL transaction using DoubleEntryService
      const transaction = await DoubleEntryService.createTransaction(
        {
          transactionDate: data.paymentDate,
          description: `Vendor Payment - ${vendor.name}`,
          referenceType: 'VENDOR_PAYMENT',
          referenceId: '', // Will be updated with payment ID
          entries,
        },
        organizationId,
        userId,
        tx
      );

      // Post the transaction immediately
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'POSTED' },
      });

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          paymentType: 'VENDOR_PAYMENT',
          paymentDate: data.paymentDate,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          referenceNumber: data.referenceNumber,
          notes: data.notes,
          vendorId: data.vendorId,
          bankAccountId: data.bankAccountId,
          transactionId: transaction.id,
          organizationId,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      // Update transaction with payment reference
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { referenceId: payment.id },
      });

      // Get organization for base currency and FX account settings
      const organization = await tx.organization.findUnique({
        where: { id: organizationId },
        select: {
          baseCurrency: true,
          fxGainAccountId: true,
          fxLossAccountId: true,
        },
      });

      let totalFxGainLoss = new Decimal(0);

      // Create payment allocations and update bill statuses
      for (const allocation of data.billAllocations) {
        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            billId: allocation.billId,
            amount: allocation.amount,
          },
        });

        // Get bill with all allocations
        const bill = await tx.bill.findUnique({
          where: { id: allocation.billId },
          include: {
            paymentAllocations: true,
          },
        });

        if (bill) {
          const totalPaid = bill.paymentAllocations.reduce(
            (sum, a) => sum + a.amount,
            0
          );

          // Calculate FX gain/loss if bill is in foreign currency
          if (organization && bill.currency !== organization.baseCurrency) {
            try {
              const fxCalculation = await ForeignExchangeGainLossService.calculateRealizedFX(
                organizationId,
                bill.id,
                'BILL',
                allocation.amount,
                data.paymentDate,
                bill.exchangeRate
              );

              if (fxCalculation && Math.abs(fxCalculation.gainLossAmount) > 0.01) {
                // Record the FX gain/loss
                await ForeignExchangeGainLossService.recordRealizedFX(
                  organizationId,
                  payment.id,
                  fxCalculation,
                  undefined,
                  bill.id,
                  userId,
                  tx
                );

                totalFxGainLoss = totalFxGainLoss.plus(fxCalculation.gainLossAmount);
              }
            } catch (error) {
              console.error('Error calculating FX gain/loss:', error);
              // Continue processing - don't fail the payment
            }
          }

          // Update bill status based on payment
          let newStatus = bill.status;
          if (totalPaid >= bill.totalAmount) {
            newStatus = 'PAID';
          } else if (totalPaid > 0) {
            // Partially paid - keep as SENT
            newStatus = 'SENT';
          }

          if (newStatus !== bill.status) {
            await tx.bill.update({
              where: { id: allocation.billId },
              data: { status: newStatus },
            });
          }
        }
      }

      // Update payment with total FX gain/loss if applicable
      if (!totalFxGainLoss.isZero()) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            fxGainLossAmount: totalFxGainLoss.toNumber(),
            fxGainLossAccountId: totalFxGainLoss.gt(0)
              ? organization?.fxGainAccountId
              : organization?.fxLossAccountId,
          },
        });
      }

      // Fetch complete payment with relations
      return await tx.payment.findUnique({
        where: { id: payment.id },
        include: {
          vendor: true,
          bankAccount: true,
          transaction: {
            include: {
              entries: {
                include: {
                  account: true,
                },
              },
            },
          },
          allocations: {
            include: {
              bill: true,
            },
          },
        },
      });
    });

    return result;
  }
}
