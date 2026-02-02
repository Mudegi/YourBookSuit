/**
 * Customer Statement Service
 * Generates customer account statements with running balance
 */

import { prisma } from '@/lib/prisma';

export interface StatementTransaction {
  date: Date;
  type: 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'OPENING_BALANCE';
  reference: string;
  description: string;
  debit: number;  // Invoice amounts (what customer owes)
  credit: number; // Payment amounts (what customer paid)
  balance: number; // Running balance
}

export interface CustomerStatementData {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    billingAddress: string | null;
    accountNumber: string | null;
  };
  organization: {
    name: string;
    legalName: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  };
  statement: {
    fromDate: Date;
    toDate: Date;
    openingBalance: number;
    closingBalance: number;
    totalInvoiced: number;
    totalPaid: number;
    currency: string;
  };
  transactions: StatementTransaction[];
  aging: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90plus: number;
    total: number;
  };
}

export class CustomerStatementService {
  /**
   * Generate customer statement for a date range
   */
  static async generateStatement(
    customerId: string,
    organizationId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<CustomerStatementData> {
    // Fetch customer details
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        organizationId,
      },
      include: {
        organization: true,
      },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Calculate opening balance (all transactions before fromDate)
    const openingBalance = await this.calculateOpeningBalance(
      customerId,
      organizationId,
      fromDate
    );

    // Get all transactions in the period
    const transactions = await this.getStatementTransactions(
      customerId,
      organizationId,
      fromDate,
      toDate,
      openingBalance
    );

    // Calculate totals
    const totalInvoiced = transactions
      .filter(t => t.type === 'INVOICE')
      .reduce((sum, t) => sum + t.debit, 0);

    const totalPaid = transactions
      .filter(t => t.type === 'PAYMENT' || t.type === 'CREDIT_NOTE')
      .reduce((sum, t) => sum + t.credit, 0);

    const closingBalance = transactions.length > 0 
      ? transactions[transactions.length - 1].balance 
      : openingBalance;

    // Calculate aging for current outstanding balance
    const aging = await this.calculateAging(customerId, organizationId, toDate);

    return {
      customer: {
        id: customer.id,
        name: customer.companyName || `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        phone: customer.phone,
        billingAddress: typeof customer.billingAddress === 'string' ? customer.billingAddress : null,
        accountNumber: null, // Field doesn't exist in schema
      },
      organization: {
        name: customer.organization.name,
        legalName: customer.organization.legalName,
        address: null, // Field doesn't exist in schema
        phone: customer.organization.phone,
        email: customer.organization.email,
        website: null, // Field doesn't exist in schema
      },
      statement: {
        fromDate,
        toDate,
        openingBalance,
        closingBalance,
        totalInvoiced,
        totalPaid,
        currency: customer.organization.baseCurrency || 'USD',
      },
      transactions,
      aging,
    };
  }

  /**
   * Calculate opening balance (all activity before statement start date)
   */
  private static async calculateOpeningBalance(
    customerId: string,
    organizationId: string,
    beforeDate: Date
  ): Promise<number> {
    // Get all invoices before the period
    const invoices = await prisma.invoice.findMany({
      where: {
        customerId,
        organizationId,
        invoiceDate: { lt: beforeDate },
        status: { not: 'CANCELLED' },
      },
    });

    const totalInvoiced = invoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0
    );

    // Get all payments before the period
    const payments = await prisma.payment.findMany({
      where: {
        customerId,
        organizationId,
        paymentDate: { lt: beforeDate },
        // Payment doesn't have status field in schema
      },
    });

    const totalPaid = payments.reduce(
      (sum, pay) => sum + Number(pay.amount),
      0
    );

    // Get all credit notes before the period
    const creditNotes = await prisma.creditNote.findMany({
      where: {
        customerId,
        organizationId,
        creditDate: { lt: beforeDate },
        status: { not: 'VOID' },
      },
    });

    const totalCreditNotes = creditNotes.reduce(
      (sum, cn) => sum + Number(cn.totalAmount),
      0
    );

    return totalInvoiced - totalPaid - totalCreditNotes;
  }

  /**
   * Get all transactions in the period with running balance
   */
  private static async getStatementTransactions(
    customerId: string,
    organizationId: string,
    fromDate: Date,
    toDate: Date,
    openingBalance: number
  ): Promise<StatementTransaction[]> {
    const transactions: StatementTransaction[] = [];
    let runningBalance = openingBalance;

    // Add opening balance as first line
    if (openingBalance !== 0) {
      transactions.push({
        date: fromDate,
        type: 'OPENING_BALANCE',
        reference: '-',
        description: 'Opening Balance',
        debit: openingBalance > 0 ? openingBalance : 0,
        credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
        balance: openingBalance,
      });
    }

    // Fetch all transaction types
    const [invoices, payments, creditNotes] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          customerId,
          organizationId,
          invoiceDate: { gte: fromDate, lte: toDate },
          status: { not: 'CANCELLED' },
        },
        orderBy: { invoiceDate: 'asc' },
      }),
      prisma.payment.findMany({
        where: {
          customerId,
          organizationId,
          paymentDate: { gte: fromDate, lte: toDate },
        },
        orderBy: { paymentDate: 'asc' },
      }),
      prisma.creditNote.findMany({
        where: {
          customerId,
          organizationId,
          creditDate: { gte: fromDate, lte: toDate },
          status: { not: 'VOID' },
        },
        orderBy: { creditDate: 'asc' },
      }),
    ]);

    // Combine and sort all transactions by date
    const allTransactions: Array<{
      date: Date;
      type: 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE';
      data: any;
    }> = [
      ...invoices.map(inv => ({
        date: inv.invoiceDate,
        type: 'INVOICE' as const,
        data: inv,
      })),
      ...payments.map(pay => ({
        date: pay.paymentDate,
        type: 'PAYMENT' as const,
        data: pay,
      })),
      ...creditNotes.map(cn => ({
        date: cn.creditDate,
        type: 'CREDIT_NOTE' as const,
        data: cn,
      })),
    ];

    allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Build statement lines with running balance
    for (const trans of allTransactions) {
      let debit = 0;
      let credit = 0;
      let reference = '';
      let description = '';

      switch (trans.type) {
        case 'INVOICE':
          debit = Number(trans.data.total);
          runningBalance += debit;
          reference = trans.data.invoiceNumber;
          description = `Invoice ${trans.data.invoiceNumber}`;
          break;

        case 'PAYMENT':
          credit = Number(trans.data.amount);
          runningBalance -= credit;
          reference = trans.data.referenceNumber || trans.data.id;
          description = `Payment - ${trans.data.paymentMethod || 'Payment Received'}`;
          break;

        case 'CREDIT_NOTE':
          credit = Number(trans.data.totalAmount);
          runningBalance -= credit;
          reference = trans.data.creditNoteNumber;
          description = `Credit Note ${trans.data.creditNoteNumber}`;
          break;
      }

      transactions.push({
        date: trans.date,
        type: trans.type,
        reference,
        description,
        debit,
        credit,
        balance: runningBalance,
      });
    }

    return transactions;
  }

  /**
   * Calculate current aging for the customer
   */
  private static async calculateAging(
    customerId: string,
    organizationId: string,
    asOfDate: Date
  ) {
    const invoices = await prisma.invoice.findMany({
      where: {
        customerId,
        organizationId,
        status: { notIn: ['CANCELLED', 'PAID'] },
      },
    });

    const aging = {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      days90plus: 0,
      total: 0,
    };

    for (const invoice of invoices) {
      const amountDue = Number(invoice.amountDue);
      const daysOverdue = Math.floor(
        (asOfDate.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysOverdue < 0) {
        aging.current += amountDue;
      } else if (daysOverdue <= 30) {
        aging.days1to30 += amountDue;
      } else if (daysOverdue <= 60) {
        aging.days31to60 += amountDue;
      } else if (daysOverdue <= 90) {
        aging.days61to90 += amountDue;
      } else {
        aging.days90plus += amountDue;
      }

      aging.total += amountDue;
    }

    return aging;
  }

  /**
   * Get suggested statement date ranges
   */
  static getStatementPeriods(): Array<{
    label: string;
    fromDate: Date;
    toDate: Date;
  }> {
    const today = new Date();
    const periods = [];

    // Current month
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    periods.push({
      label: 'Current Month',
      fromDate: currentMonthStart,
      toDate: today,
    });

    // Last month
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    periods.push({
      label: 'Last Month',
      fromDate: lastMonthStart,
      toDate: lastMonthEnd,
    });

    // Last 3 months
    const last3MonthsStart = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    periods.push({
      label: 'Last 3 Months',
      fromDate: last3MonthsStart,
      toDate: today,
    });

    // Year to date
    const yearStart = new Date(today.getFullYear(), 0, 1);
    periods.push({
      label: 'Year to Date',
      fromDate: yearStart,
      toDate: today,
    });

    return periods;
  }
}
