import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface AgingBucket {
  current: number; // Not yet due
  days1to30: number; // 1-30 days overdue
  days31to60: number; // 31-60 days overdue
  days61to90: number; // 61-90 days overdue
  days90plus: number; // 90+ days overdue
  total: number;
}

export interface CustomerAging extends AgingBucket {
  customerId: string;
  customerNumber: string;
  customerName: string;
  customerEmail: string | null;
  company: string | null;
  currency: string;
  creditLimit: number | null;
  invoiceCount: number;
}

export interface AgingSummary extends AgingBucket {
  totalCustomers: number;
  atRiskCustomers: number; // Customers with overdue amounts
  totalInvoices: number;
  overdueInvoices: number;
}

export interface InvoiceAging {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  totalAmount: number;
  amountDue: number;
  currency: string;
  daysOverdue: number;
  agingBucket: string;
  customerId: string;
  customerName: string;
}

export class CollectionsAgingService {
  /**
   * Get aged receivables report for all customers
   */
  static async getAgedReceivables(
    organizationId: string,
    asOfDate: Date = new Date(),
    currency?: string
  ): Promise<{
    summary: AgingSummary;
    customers: CustomerAging[];
  }> {
    // Get all unpaid invoices up to the as-of date
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        status: {
          in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'],
        },
        invoiceDate: {
          lte: asOfDate,
        },
        amountDue: {
          gt: 0,
        },
        ...(currency && { currency }),
      },
      include: {
        customer: {
          select: {
            id: true,
            customerNumber: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
            creditLimit: true,
          },
        },
      },
    });

    // Group by customer and calculate aging
    const customerMap = new Map<string, CustomerAging>();

    for (const invoice of invoices) {
      const daysOverdue = this.calculateDaysOverdue(invoice.dueDate, asOfDate);
      const amountDue = Number(invoice.amountDue);

      let customerAging = customerMap.get(invoice.customerId);
      
      if (!customerAging) {
        const customerName = invoice.customer.companyName || 
          `${invoice.customer.firstName} ${invoice.customer.lastName}`;

        customerAging = {
          customerId: invoice.customerId,
          customerNumber: invoice.customer.customerNumber,
          customerName,
          customerEmail: invoice.customer.email,
          company: invoice.customer.companyName,
          currency: invoice.currency,
          creditLimit: invoice.customer.creditLimit ? Number(invoice.customer.creditLimit) : null,
          current: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          days90plus: 0,
          total: 0,
          invoiceCount: 0,
        };
        
        customerMap.set(invoice.customerId, customerAging);
      }

      // Add to appropriate bucket
      this.addToBucket(customerAging, daysOverdue, amountDue);
      customerAging.total += amountDue;
      customerAging.invoiceCount++;
    }

    const customers = Array.from(customerMap.values())
      .sort((a, b) => b.total - a.total); // Sort by total outstanding descending

    // Calculate summary
    const summary: AgingSummary = {
      totalCustomers: customers.length,
      atRiskCustomers: customers.filter(c => 
        c.days1to30 > 0 || c.days31to60 > 0 || c.days61to90 > 0 || c.days90plus > 0
      ).length,
      totalInvoices: invoices.length,
      overdueInvoices: invoices.filter(inv => 
        this.calculateDaysOverdue(inv.dueDate, asOfDate) > 0
      ).length,
      current: customers.reduce((sum, c) => sum + c.current, 0),
      days1to30: customers.reduce((sum, c) => sum + c.days1to30, 0),
      days31to60: customers.reduce((sum, c) => sum + c.days31to60, 0),
      days61to90: customers.reduce((sum, c) => sum + c.days61to90, 0),
      days90plus: customers.reduce((sum, c) => sum + c.days90plus, 0),
      total: customers.reduce((sum, c) => sum + c.total, 0),
    };

    return { summary, customers };
  }

  /**
   * Get aged receivables for a specific customer
   */
  static async getCustomerAging(
    customerId: string,
    organizationId: string,
    asOfDate: Date = new Date()
  ): Promise<{
    aging: CustomerAging;
    invoices: InvoiceAging[];
  }> {
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        customerId,
        status: {
          in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'],
        },
        invoiceDate: {
          lte: asOfDate,
        },
        amountDue: {
          gt: 0,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            customerNumber: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
            creditLimit: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    if (invoices.length === 0) {
      throw new Error('No outstanding invoices found for this customer');
    }

    const customer = invoices[0].customer;
    const customerName = customer.companyName || 
      `${customer.firstName} ${customer.lastName}`;

    const aging: CustomerAging = {
      customerId,
      customerNumber: customer.customerNumber,
      customerName,
      customerEmail: customer.email,
      company: customer.companyName,
      currency: invoices[0].currency,
      creditLimit: customer.creditLimit ? Number(customer.creditLimit) : null,
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      days90plus: 0,
      total: 0,
      invoiceCount: invoices.length,
    };

    const invoiceAgings: InvoiceAging[] = invoices.map(invoice => {
      const daysOverdue = this.calculateDaysOverdue(invoice.dueDate, asOfDate);
      const amountDue = Number(invoice.amountDue);

      this.addToBucket(aging, daysOverdue, amountDue);
      aging.total += amountDue;

      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        totalAmount: Number(invoice.total),
        amountDue,
        currency: invoice.currency,
        daysOverdue,
        agingBucket: this.getAgingBucketName(daysOverdue),
        customerId: invoice.customerId,
        customerName,
      };
    });

    return { aging, invoices: invoiceAgings };
  }

  /**
   * Get invoices in a specific aging bucket
   */
  static async getInvoicesByBucket(
    organizationId: string,
    bucket: 'current' | '1-30' | '31-60' | '61-90' | '90+',
    asOfDate: Date = new Date()
  ): Promise<InvoiceAging[]> {
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        status: {
          in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'],
        },
        invoiceDate: {
          lte: asOfDate,
        },
        amountDue: {
          gt: 0,
        },
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    const filtered = invoices.filter(invoice => {
      const daysOverdue = this.calculateDaysOverdue(invoice.dueDate, asOfDate);
      const bucketName = this.getAgingBucketName(daysOverdue);
      return bucketName === bucket;
    });

    return filtered.map(invoice => {
      const daysOverdue = this.calculateDaysOverdue(invoice.dueDate, asOfDate);
      const customerName = invoice.customer.companyName || 
        `${invoice.customer.firstName} ${invoice.customer.lastName}`;

      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        totalAmount: Number(invoice.total),
        amountDue: Number(invoice.amountDue),
        currency: invoice.currency,
        daysOverdue,
        agingBucket: this.getAgingBucketName(daysOverdue),
        customerId: invoice.customerId,
        customerName,
      };
    });
  }

  /**
   * Calculate days overdue (negative if not yet due)
   */
  private static calculateDaysOverdue(dueDate: Date, asOfDate: Date): number {
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((asOfDate.getTime() - dueDate.getTime()) / millisecondsPerDay);
  }

  /**
   * Add amount to appropriate aging bucket
   */
  private static addToBucket(aging: AgingBucket, daysOverdue: number, amount: number): void {
    if (daysOverdue < 0) {
      aging.current += amount;
    } else if (daysOverdue <= 30) {
      aging.days1to30 += amount;
    } else if (daysOverdue <= 60) {
      aging.days31to60 += amount;
    } else if (daysOverdue <= 90) {
      aging.days61to90 += amount;
    } else {
      aging.days90plus += amount;
    }
  }

  /**
   * Get aging bucket name
   */
  private static getAgingBucketName(daysOverdue: number): string {
    if (daysOverdue < 0) return 'current';
    if (daysOverdue <= 30) return '1-30';
    if (daysOverdue <= 60) return '31-60';
    if (daysOverdue <= 90) return '61-90';
    return '90+';
  }

  /**
   * Get customers at risk (with overdue invoices)
   */
  static async getAtRiskCustomers(
    organizationId: string,
    minDaysOverdue: number = 1,
    asOfDate: Date = new Date()
  ) {
    const { customers } = await this.getAgedReceivables(organizationId, asOfDate);
    
    return customers.filter(customer => {
      const overdueAmount = customer.days1to30 + customer.days31to60 + 
                           customer.days61to90 + customer.days90plus;
      return overdueAmount > 0;
    }).map(customer => ({
      ...customer,
      overdueAmount: customer.days1to30 + customer.days31to60 + 
                    customer.days61to90 + customer.days90plus,
      percentOverdue: (customer.total > 0) 
        ? ((customer.days1to30 + customer.days31to60 + customer.days61to90 + customer.days90plus) / customer.total) * 100
        : 0,
    }));
  }
}
