import { prisma } from '@/lib/prisma';
import { DoubleEntryService } from '../accounting/double-entry.service';
import { ForeignExchangeGainLossService } from '../currency/fx-gain-loss.service';
import { Decimal } from 'decimal.js';

// ──────────── Helpers ────────────

const getCustomerDisplayName = (customer: {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
}) => {
  const personalName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  return (customer.companyName || personalName || 'Customer').trim();
};

const getVendorDisplayName = (vendor: {
  companyName?: string | null;
  contactName?: string | null;
}) => {
  return (vendor.companyName || vendor.contactName || 'Vendor').trim();
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  CASH: 'CASH',
  CHECK: 'CHECK',
  CARD: 'CREDIT_CARD',
  CREDIT_CARD: 'CREDIT_CARD',
  DEBIT_CARD: 'DEBIT_CARD',
  ACH: 'BANK_TRANSFER',
  WIRE: 'BANK_TRANSFER',
  BANK_TRANSFER: 'BANK_TRANSFER',
  MOBILE_MONEY: 'MOBILE_MONEY',
  ONLINE_PAYMENT: 'ONLINE_PAYMENT',
  OTHER: 'OTHER',
};

function normalizePaymentMethod(method: string): string {
  return PAYMENT_METHOD_MAP[method] || 'OTHER';
}

// ──────────── Interfaces ────────────

export interface RecordCustomerPaymentData {
  customerId: string;
  paymentDate: Date;
  amount: number;
  paymentMethod: string;
  bankAccountId: string;
  referenceNumber?: string;
  notes?: string;
  mobileMoneyProvider?: string;
  mobileMoneyTxnId?: string;
  invoiceAllocations?: Array<{
    invoiceId: string;
    amount: number;
  }>;
}

export interface RecordVendorPaymentData {
  vendorId: string;
  paymentDate: Date;
  amount: number;
  paymentMethod: string;
  bankAccountId: string;
  referenceNumber?: string;
  notes?: string;
  mobileMoneyProvider?: string;
  mobileMoneyTxnId?: string;
  billAllocations?: Array<{
    billId: string;
    amount: number;
  }>;
}

export interface AllocatePaymentData {
  paymentId: string;
  allocations: Array<{
    invoiceId?: string;
    billId?: string;
    amount: number;
  }>;
}

// ──────────── Service ────────────

/**
 * PaymentService — handles payment recording, allocation, prepayments, and voiding
 *
 * Customer Payment (Money In):
 *   DR Bank/Cash   →  CR Accounts Receivable
 *
 * Vendor Payment (Money Out):
 *   DR Accounts Payable  →  CR Bank/Cash
 *
 * Allocation status is derived from allocatedAmount vs amount:
 *   allocatedAmount === 0         → UNAPPLIED   (prepayment / credit on account)
 *   0 < allocatedAmount < amount  → PARTIALLY_APPLIED
 *   allocatedAmount === amount    → FULLY_APPLIED
 */
export class PaymentService {

  // ─── Customer Payment (Money In) ──────────────────────────────

  static async recordCustomerPayment(
    data: RecordCustomerPaymentData,
    organizationId: string,
    userId: string,
  ) {
    // Validate customer
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, organizationId },
    });
    if (!customer) throw new Error('Customer not found');
    const customerName = getCustomerDisplayName(customer);

    // Validate bank account
    const bankAccount = await prisma.chartOfAccount.findFirst({
      where: { id: data.bankAccountId, organizationId, accountType: 'ASSET', isActive: true },
    });
    if (!bankAccount) throw new Error('Bank account not found');

    // Find AR account
    const arAccount = await prisma.chartOfAccount.findFirst({
      where: { organizationId, code: { startsWith: '1200' }, accountType: 'ASSET', isActive: true },
      orderBy: { code: 'asc' },
    });
    if (!arAccount) {
      throw new Error('Accounts Receivable account not found. Please create an ASSET account with code starting with 1200.');
    }

    // Validate allocations if provided (prepayments allowed — allocations optional)
    const allocations = data.invoiceAllocations || [];
    let totalAllocated = 0;

    if (allocations.length > 0) {
      const invoiceIds = allocations.map((a) => a.invoiceId);
      const invoices = await prisma.invoice.findMany({
        where: { id: { in: invoiceIds }, customerId: data.customerId, organizationId },
      });
      if (invoices.length !== invoiceIds.length) {
        throw new Error('One or more invoices not found or do not belong to this customer');
      }
      totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
      if (totalAllocated > data.amount + 0.01) {
        throw new Error(`Total allocated (${totalAllocated}) cannot exceed payment amount (${data.amount})`);
      }
    }

    // GL entries
    const entries = [
      { accountId: data.bankAccountId, entryType: 'DEBIT' as const, amount: data.amount, description: `Payment from ${customerName}` },
      { accountId: arAccount.id, entryType: 'CREDIT' as const, amount: data.amount, description: `Payment from ${customerName}` },
    ];

    const result = await prisma.$transaction(async (tx) => {
      // Payment number
      const lastPayment = await tx.payment.findFirst({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });
      const lastNumber = lastPayment?.paymentNumber
        ? parseInt(lastPayment.paymentNumber.replace(/\D/g, '')) || 0
        : 0;
      const paymentNumber = `PAY${String(lastNumber + 1).padStart(6, '0')}`;

      // GL transaction
      const transaction = await DoubleEntryService.createTransaction(
        {
          organizationId,
          transactionDate: data.paymentDate,
          transactionType: 'PAYMENT',
          description: `Customer Payment - ${customerName}`,
          referenceType: 'CUSTOMER_PAYMENT',
          referenceId: '',
          createdById: userId,
          entries,
          metadata: {
            mobileMoneyProvider: data.mobileMoneyProvider,
            mobileMoneyTxnId: data.mobileMoneyTxnId,
          },
        },
        tx,
      );

      // Post immediately
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'POSTED' },
      });

      // Create payment
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          paymentType: 'RECEIPT',
          status: 'POSTED',
          paymentDate: data.paymentDate,
          amount: data.amount,
          allocatedAmount: totalAllocated,
          paymentMethod: normalizePaymentMethod(data.paymentMethod),
          referenceNumber: data.referenceNumber,
          mobileMoneyProvider: data.mobileMoneyProvider,
          mobileMoneyTxnId: data.mobileMoneyTxnId,
          notes: data.notes,
          customer: { connect: { id: data.customerId } },
          bankAccount: { connect: { id: data.bankAccountId } },
          organizationId,
          transactionId: transaction.id,
          createdBy: { connect: { id: userId } },
          updatedBy: { connect: { id: userId } },
        },
      });

      // Update transaction reference
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { referenceId: payment.id },
      });

      // Organization for FX
      const organization = await tx.organization.findUnique({
        where: { id: organizationId },
        select: { baseCurrency: true, fxGainAccountId: true, fxLossAccountId: true },
      });

      let totalFxGainLoss = new Decimal(0);

      // Allocations & invoice status updates
      for (const allocation of allocations) {
        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            invoiceId: allocation.invoiceId,
            amount: allocation.amount,
          },
        });

        const invoice = await tx.invoice.findUnique({
          where: { id: allocation.invoiceId },
          include: { paymentAllocations: true },
        });

        if (invoice) {
          const totalPaid = invoice.paymentAllocations.reduce((sum, a) => sum + a.amount, 0);

          // FX gain/loss
          if (organization && invoice.currency !== organization.baseCurrency) {
            try {
              const fxCalc = await ForeignExchangeGainLossService.calculateRealizedFX(
                organizationId, invoice.id, 'INVOICE', allocation.amount, data.paymentDate, invoice.exchangeRate,
              );
              if (fxCalc && Math.abs(fxCalc.gainLossAmount) > 0.01) {
                await ForeignExchangeGainLossService.recordRealizedFX(
                  organizationId, payment.id, fxCalc, invoice.id, undefined, userId, tx,
                );
                totalFxGainLoss = totalFxGainLoss.plus(fxCalc.gainLossAmount);
              }
            } catch (error) {
              console.error('Error calculating FX gain/loss:', error);
            }
          }

          // Update invoice status
          let newStatus = invoice.status;
          if (totalPaid >= invoice.totalAmount) {
            newStatus = 'PAID';
          } else if (totalPaid > 0) {
            newStatus = 'SENT';
          }
          if (newStatus !== invoice.status) {
            await tx.invoice.update({ where: { id: allocation.invoiceId }, data: { status: newStatus } });
          }
        }
      }

      // Update FX gain/loss on payment
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

      return await tx.payment.findUnique({
        where: { id: payment.id },
        include: {
          customer: true,
          bankAccount: true,
          transaction: { include: { entries: { include: { account: true } } } },
          allocations: { include: { invoice: true } },
        },
      });
    });

    return result;
  }

  // ─── Vendor Payment (Money Out) ──────────────────────────────

  static async recordVendorPayment(
    data: RecordVendorPaymentData,
    organizationId: string,
    userId: string,
  ) {
    // Validate vendor
    const vendor = await prisma.vendor.findFirst({
      where: { id: data.vendorId, organizationId },
    });
    if (!vendor) throw new Error('Vendor not found');

    // Validate bank account
    const bankAccount = await prisma.chartOfAccount.findFirst({
      where: { id: data.bankAccountId, organizationId, accountType: 'ASSET', isActive: true },
    });
    if (!bankAccount) throw new Error('Bank account not found');

    // Find AP account
    const apAccount = await prisma.chartOfAccount.findFirst({
      where: { organizationId, code: { startsWith: '2000' }, accountType: 'LIABILITY', isActive: true },
      orderBy: { code: 'asc' },
    });
    if (!apAccount) {
      throw new Error('Accounts Payable account not found. Please create a LIABILITY account with code starting with 2000.');
    }

    // Validate allocations if provided (prepayments allowed — allocations optional)
    const allocations = data.billAllocations || [];
    let totalAllocated = 0;

    if (allocations.length > 0) {
      const billIds = allocations.map((a) => a.billId);
      const bills = await prisma.bill.findMany({
        where: { id: { in: billIds }, vendorId: data.vendorId, organizationId },
      });
      if (bills.length !== billIds.length) {
        throw new Error('One or more bills not found or do not belong to this vendor');
      }
      totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
      if (totalAllocated > data.amount + 0.01) {
        throw new Error(`Total allocated (${totalAllocated}) cannot exceed payment amount (${data.amount})`);
      }
    }

    // GL entries
    const entries = [
      { accountId: apAccount.id, entryType: 'DEBIT' as const, amount: data.amount, description: `Payment to ${getVendorDisplayName(vendor)}` },
      { accountId: data.bankAccountId, entryType: 'CREDIT' as const, amount: data.amount, description: `Payment to ${getVendorDisplayName(vendor)}` },
    ];

    const result = await prisma.$transaction(async (tx) => {
      // Payment number
      const lastPayment = await tx.payment.findFirst({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });
      const lastNumber = lastPayment?.paymentNumber
        ? parseInt(lastPayment.paymentNumber.replace(/\D/g, '')) || 0
        : 0;
      const paymentNumber = `PAY${String(lastNumber + 1).padStart(6, '0')}`;

      // GL transaction
      const transaction = await DoubleEntryService.createTransaction(
        {
          organizationId,
          transactionDate: data.paymentDate,
          transactionType: 'PAYMENT',
          description: `Vendor Payment - ${getVendorDisplayName(vendor)}`,
          referenceType: 'VENDOR_PAYMENT',
          referenceId: '',
          createdById: userId,
          entries,
          metadata: {
            mobileMoneyProvider: data.mobileMoneyProvider,
            mobileMoneyTxnId: data.mobileMoneyTxnId,
          },
        },
        tx,
      );

      // Post immediately
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'POSTED' },
      });

      // Create payment
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          paymentType: 'PAYMENT',
          status: 'POSTED',
          paymentDate: data.paymentDate,
          amount: data.amount,
          allocatedAmount: totalAllocated,
          paymentMethod: normalizePaymentMethod(data.paymentMethod),
          referenceNumber: data.referenceNumber,
          mobileMoneyProvider: data.mobileMoneyProvider,
          mobileMoneyTxnId: data.mobileMoneyTxnId,
          notes: data.notes,
          vendor: { connect: { id: data.vendorId } },
          bankAccount: { connect: { id: data.bankAccountId } },
          organizationId,
          transactionId: transaction.id,
          createdBy: { connect: { id: userId } },
          updatedBy: { connect: { id: userId } },
        },
      });

      // Update transaction reference
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { referenceId: payment.id },
      });

      // Organization for FX
      const organization = await tx.organization.findUnique({
        where: { id: organizationId },
        select: { baseCurrency: true, fxGainAccountId: true, fxLossAccountId: true },
      });

      let totalFxGainLoss = new Decimal(0);

      // Allocations & bill status updates
      for (const allocation of allocations) {
        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            billId: allocation.billId,
            amount: allocation.amount,
          },
        });

        const bill = await tx.bill.findUnique({
          where: { id: allocation.billId },
          include: { paymentAllocations: true },
        });

        if (bill) {
          const totalPaid = bill.paymentAllocations.reduce((sum, a) => sum + a.amount, 0);

          // FX gain/loss
          if (organization && bill.currency !== organization.baseCurrency) {
            try {
              const fxCalc = await ForeignExchangeGainLossService.calculateRealizedFX(
                organizationId, bill.id, 'BILL', allocation.amount, data.paymentDate, bill.exchangeRate,
              );
              if (fxCalc && Math.abs(fxCalc.gainLossAmount) > 0.01) {
                await ForeignExchangeGainLossService.recordRealizedFX(
                  organizationId, payment.id, fxCalc, undefined, bill.id, userId, tx,
                );
                totalFxGainLoss = totalFxGainLoss.plus(fxCalc.gainLossAmount);
              }
            } catch (error) {
              console.error('Error calculating FX gain/loss:', error);
            }
          }

          // Update bill status
          let newStatus = bill.status;
          if (totalPaid >= bill.totalAmount) {
            newStatus = 'PAID';
          } else if (totalPaid > 0) {
            newStatus = 'SENT';
          }
          if (newStatus !== bill.status) {
            await tx.bill.update({ where: { id: allocation.billId }, data: { status: newStatus } });
          }
        }
      }

      // Update FX gain/loss on payment
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

      return await tx.payment.findUnique({
        where: { id: payment.id },
        include: {
          vendor: true,
          bankAccount: true,
          transaction: { include: { entries: { include: { account: true } } } },
          allocations: { include: { bill: true } },
        },
      });
    });

    return result;
  }

  // ─── Auto-Allocate (FIFO) ──────────────────────────────

  /**
   * Auto-allocate an unapplied/partially-applied payment to the oldest
   * open invoices (customer) or bills (vendor) using FIFO.
   */
  static async autoAllocate(
    paymentId: string,
    organizationId: string,
    userId: string,
  ) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, organizationId },
      include: { allocations: true },
    });

    if (!payment) throw new Error('Payment not found');
    if (payment.status === 'VOIDED') throw new Error('Cannot allocate a voided payment');

    const allocated = Number(payment.allocatedAmount);
    const remaining = Number(payment.amount) - allocated;
    if (remaining <= 0.01) throw new Error('Payment is already fully applied');

    const isReceipt = payment.paymentType === 'RECEIPT';

    const result = await prisma.$transaction(async (tx) => {
      let amountToAllocate = remaining;
      const newAllocations: Array<{ invoiceId?: string; billId?: string; amount: number }> = [];

      if (isReceipt && payment.customerId) {
        // Find oldest open invoices for this customer
        const openInvoices = await tx.invoice.findMany({
          where: {
            organizationId,
            customerId: payment.customerId,
            status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] },
          },
          include: { paymentAllocations: true },
          orderBy: { invoiceDate: 'asc' },
        });

        for (const invoice of openInvoices) {
          if (amountToAllocate <= 0.01) break;
          const invoicePaid = invoice.paymentAllocations.reduce((s, a) => s + Number(a.amount), 0);
          const invoiceDue = Number(invoice.totalAmount) - invoicePaid;
          if (invoiceDue <= 0) continue;

          const applyAmount = Math.min(amountToAllocate, invoiceDue);
          await tx.paymentAllocation.create({
            data: { paymentId, invoiceId: invoice.id, amount: applyAmount },
          });
          newAllocations.push({ invoiceId: invoice.id, amount: applyAmount });
          amountToAllocate -= applyAmount;

          // Update invoice status
          const totalPaidNow = invoicePaid + applyAmount;
          const newStatus = totalPaidNow >= Number(invoice.totalAmount) ? 'PAID' : 'SENT';
          if (newStatus !== invoice.status) {
            await tx.invoice.update({ where: { id: invoice.id }, data: { status: newStatus } });
          }
        }
      } else if (!isReceipt && payment.vendorId) {
        // Find oldest open bills for this vendor
        const openBills = await tx.bill.findMany({
          where: {
            organizationId,
            vendorId: payment.vendorId,
            status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID', 'RECEIVED'] },
          },
          include: { paymentAllocations: true },
          orderBy: { billDate: 'asc' },
        });

        for (const bill of openBills) {
          if (amountToAllocate <= 0.01) break;
          const billPaid = bill.paymentAllocations.reduce((s, a) => s + Number(a.amount), 0);
          const billDue = Number(bill.totalAmount) - billPaid;
          if (billDue <= 0) continue;

          const applyAmount = Math.min(amountToAllocate, billDue);
          await tx.paymentAllocation.create({
            data: { paymentId, billId: bill.id, amount: applyAmount },
          });
          newAllocations.push({ billId: bill.id, amount: applyAmount });
          amountToAllocate -= applyAmount;

          // Update bill status
          const totalPaidNow = billPaid + applyAmount;
          const newStatus = totalPaidNow >= Number(bill.totalAmount) ? 'PAID' : 'SENT';
          if (newStatus !== bill.status) {
            await tx.bill.update({ where: { id: bill.id }, data: { status: newStatus } });
          }
        }
      }

      // Update allocatedAmount on payment
      const totalNowAllocated = allocated + (remaining - amountToAllocate);
      await tx.payment.update({
        where: { id: paymentId },
        data: { allocatedAmount: totalNowAllocated },
      });

      return { allocated: remaining - amountToAllocate, newAllocations };
    });

    return result;
  }

  // ─── Void Payment ──────────────────────────────

  static async voidPayment(
    paymentId: string,
    organizationId: string,
    userId: string,
    reason?: string,
  ) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, organizationId },
      include: {
        allocations: {
          include: { invoice: true, bill: true },
        },
      },
    });

    if (!payment) throw new Error('Payment not found');
    if (payment.status === 'VOIDED') throw new Error('Payment is already voided');
    if (payment.isLocked) throw new Error('Payment is locked and cannot be voided');
    if (payment.isReconciled) throw new Error('Cannot void a reconciled payment. Remove from reconciliation first.');

    const result = await prisma.$transaction(async (tx) => {
      // 1. Void the GL transaction
      if (payment.transactionId) {
        await tx.transaction.update({
          where: { id: payment.transactionId },
          data: { status: 'VOIDED' },
        });

        // Zero out ledger entries
        await tx.ledgerEntry.updateMany({
          where: { transactionId: payment.transactionId },
          data: { debit: 0, credit: 0 },
        });
      }

      // 2. Reverse invoice/bill status for each allocation
      for (const alloc of payment.allocations) {
        if (alloc.invoiceId && alloc.invoice) {
          const otherAllocations = await tx.paymentAllocation.findMany({
            where: { invoiceId: alloc.invoiceId, id: { not: alloc.id } },
          });
          const otherPaid = otherAllocations.reduce((s, a) => s + Number(a.amount), 0);
          let newStatus = 'SENT';
          if (otherPaid >= Number(alloc.invoice.totalAmount)) newStatus = 'PAID';
          else if (otherPaid > 0) newStatus = 'SENT';
          await tx.invoice.update({ where: { id: alloc.invoiceId }, data: { status: newStatus } });
        }

        if (alloc.billId && alloc.bill) {
          const otherAllocations = await tx.paymentAllocation.findMany({
            where: { billId: alloc.billId, id: { not: alloc.id } },
          });
          const otherPaid = otherAllocations.reduce((s, a) => s + Number(a.amount), 0);
          let newStatus = 'SENT';
          if (otherPaid >= Number(alloc.bill.totalAmount)) newStatus = 'PAID';
          else if (otherPaid > 0) newStatus = 'SENT';
          await tx.bill.update({ where: { id: alloc.billId }, data: { status: newStatus } });
        }
      }

      // 3. Delete allocations
      await tx.paymentAllocation.deleteMany({
        where: { paymentId },
      });

      // 4. Mark payment as VOIDED
      const voided = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'VOIDED',
          allocatedAmount: 0,
          voidedAt: new Date(),
          voidedById: userId,
          voidReason: reason || 'Voided by user',
        },
        include: {
          customer: true,
          vendor: true,
          bankAccount: true,
        },
      });

      return voided;
    });

    return result;
  }

  // ─── Get Payment with allocation status ──────────────────────────────

  static getAllocationStatus(amount: number | Decimal, allocatedAmount: number | Decimal): string {
    const amt = Number(amount);
    const alloc = Number(allocatedAmount);
    if (alloc <= 0.01) return 'UNAPPLIED';
    if (Math.abs(alloc - amt) < 0.01) return 'FULLY_APPLIED';
    return 'PARTIALLY_APPLIED';
  }
}
