/**
 * Invoice Analytics Service
 * 
 * Provides country-blind analytics for the invoice command center:
 * - Aging analysis (30/60/90+ days)
 * - Days Sales Outstanding (DSO)
 * - Revenue metrics
 * - Multi-currency aggregation
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface AgingBucket {
  bucket: string;
  count: number;
  totalAmount: number;
  percentage: number;
}

export interface InvoiceMetrics {
  totalOutstanding: number;
  overdueTotal: number;
  daysToOverdue: number;
  averageDSO: number;
  totalInvoices: number;
  agingBuckets: AgingBucket[];
}

export interface InvoiceListFilters {
  status?: string;
  customerId?: string;
  branchId?: string;
  salespersonId?: string;
  agingDays?: number; // Filter for invoices older than X days
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export class InvoiceAnalyticsService {
  /**
   * Calculate comprehensive invoice metrics for command center
   */
  static async getMetrics(organizationId: string): Promise<InvoiceMetrics> {
    const today = new Date();

    // Get organization base currency and exchange rates
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { baseCurrency: true },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Fetch all unpaid invoices with currency conversion
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        status: {
          in: ['ISSUED', 'SENT', 'PARTIAL', 'OVERDUE'],
        },
      },
      select: {
        id: true,
        invoiceDate: true,
        dueDate: true,
        status: true,
        amountDue: true,
        baseCurrencyTotal: true,
        currency: true,
        exchangeRate: true,
      },
    });

    // Calculate totals in base currency
    let totalOutstanding = 0;
    let overdueTotal = 0;
    let totalDaysToPay = 0;
    let paidInvoiceCount = 0;

    // Aging buckets
    const aging = {
      current: { count: 0, amount: 0 }, // 0-30 days
      days31to60: { count: 0, amount: 0 },
      days61to90: { count: 0, amount: 0 },
      over90: { count: 0, amount: 0 },
    };

    for (const invoice of invoices) {
      // Convert to base currency
      const amountInBaseCurrency = invoice.baseCurrencyTotal
        ? Number(invoice.baseCurrencyTotal)
        : Number(invoice.amountDue) * Number(invoice.exchangeRate);

      totalOutstanding += amountInBaseCurrency;

      const daysOverdue = this.getDaysOverdue(invoice.dueDate);

      // Check if overdue
      if (daysOverdue > 0) {
        overdueTotal += amountInBaseCurrency;
      }

      // Categorize into aging buckets
      if (daysOverdue < 0) {
        aging.current.count++;
        aging.current.amount += amountInBaseCurrency;
      } else if (daysOverdue <= 30) {
        aging.current.count++;
        aging.current.amount += amountInBaseCurrency;
      } else if (daysOverdue <= 60) {
        aging.days31to60.count++;
        aging.days31to60.amount += amountInBaseCurrency;
      } else if (daysOverdue <= 90) {
        aging.days61to90.count++;
        aging.days61to90.amount += amountInBaseCurrency;
      } else {
        aging.over90.count++;
        aging.over90.amount += amountInBaseCurrency;
      }
    }

    // Calculate DSO (Days Sales Outstanding)
    // DSO = (Accounts Receivable / Total Credit Sales) × Number of Days
    const averageDSO = await this.calculateDSO(organizationId);

    // Format aging buckets
    const agingBuckets: AgingBucket[] = [
      {
        bucket: 'Current (0-30 days)',
        count: aging.current.count,
        totalAmount: aging.current.amount,
        percentage: totalOutstanding > 0 ? (aging.current.amount / totalOutstanding) * 100 : 0,
      },
      {
        bucket: '31-60 days',
        count: aging.days31to60.count,
        totalAmount: aging.days31to60.amount,
        percentage: totalOutstanding > 0 ? (aging.days31to60.amount / totalOutstanding) * 100 : 0,
      },
      {
        bucket: '61-90 days',
        count: aging.days61to90.count,
        totalAmount: aging.days61to90.amount,
        percentage: totalOutstanding > 0 ? (aging.days61to90.amount / totalOutstanding) * 100 : 0,
      },
      {
        bucket: 'Over 90 days',
        count: aging.over90.count,
        totalAmount: aging.over90.amount,
        percentage: totalOutstanding > 0 ? (aging.over90.amount / totalOutstanding) * 100 : 0,
      },
    ];

    return {
      totalOutstanding,
      overdueTotal,
      daysToOverdue: overdueTotal > 0 ? this.getAverageOverdueDays(invoices) : 0,
      averageDSO,
      totalInvoices: invoices.length,
      agingBuckets,
    };
  }

  /**
   * Get filtered invoice list with pagination
   */
  static async getInvoices(
    organizationId: string,
    filters: InvoiceListFilters = {},
    page: number = 1,
    limit: number = 50
  ) {
    const where: Prisma.InvoiceWhereInput = {
      organizationId,
    };

    // Status filter
    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status as any;
    }

    // Customer filter
    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    // Branch filter
    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    // Salesperson filter
    if (filters.salespersonId) {
      where.salespersonId = filters.salespersonId;
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      where.invoiceDate = {};
      if (filters.startDate) {
        where.invoiceDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.invoiceDate.lte = filters.endDate;
      }
    }

    // Aging filter
    if (filters.agingDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filters.agingDays);
      where.dueDate = {
        lt: cutoffDate,
      };
      where.status = {
        in: ['ISSUED', 'SENT', 'PARTIAL', 'OVERDUE'],
      };
    }

    // Search filter
    if (filters.search) {
      where.OR = [
        { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
        { reference: { contains: filters.search, mode: 'insensitive' } },
        {
          customer: {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { companyName: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    // Fetch invoices
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              email: true,
            },
          },
          Branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' }, // Overdue first
          { dueDate: 'asc' }, // Oldest due date first
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    // Enrich with calculated fields
    const enrichedInvoices = invoices.map((invoice) => ({
      ...invoice,
      daysOverdue: this.getDaysOverdue(invoice.dueDate),
      customerName: invoice.customer.companyName ||
        `${invoice.customer.firstName || ''} ${invoice.customer.lastName || ''}`.trim(),
    }));

    return {
      invoices: enrichedInvoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Calculate Days Sales Outstanding (DSO)
   */
  private static async calculateDSO(organizationId: string): Promise<number> {
    // DSO = (Average Accounts Receivable / Revenue) × Number of Days
    // We'll calculate for the last 90 days

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Get all invoices from the last 90 days
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        invoiceDate: {
          gte: ninetyDaysAgo,
        },
      },
      select: {
        total: true,
        amountDue: true,
        invoiceDate: true,
        status: true,
        payments: {
          select: {
            payment: {
              select: {
                paymentDate: true,
              },
            },
          },
        },
      },
    });

    if (invoices.length === 0) return 0;

    let totalRevenue = 0;
    let totalDaysToPay = 0;
    let paidInvoiceCount = 0;

    for (const invoice of invoices) {
      totalRevenue += Number(invoice.total);

      if (invoice.status === 'PAID' && invoice.payments.length > 0) {
        // Calculate days between invoice date and payment date
        const invoiceDate = new Date(invoice.invoiceDate);
        const paymentDate = new Date(invoice.payments[0].payment.paymentDate);
        const daysToPay = Math.floor(
          (paymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        totalDaysToPay += daysToPay;
        paidInvoiceCount++;
      }
    }

    // Calculate average days to pay
    if (paidInvoiceCount > 0) {
      return Math.round(totalDaysToPay / paidInvoiceCount);
    }

    return 0;
  }

  /**
   * Get days overdue (negative means not yet due)
   */
  private static getDaysOverdue(dueDate: Date): number {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Get average overdue days
   */
  private static getAverageOverdueDays(invoices: any[]): number {
    const overdueInvoices = invoices.filter(
      (inv) => this.getDaysOverdue(inv.dueDate) > 0
    );

    if (overdueInvoices.length === 0) return 0;

    const totalOverdueDays = overdueInvoices.reduce(
      (sum, inv) => sum + this.getDaysOverdue(inv.dueDate),
      0
    );

    return Math.round(totalOverdueDays / overdueInvoices.length);
  }

  /**
   * Bulk send reminders
   */
  static async sendBulkReminders(organizationId: string, invoiceIds: string[]) {
    // TODO: Integrate with email service
    // For now, just mark as reminded
    await prisma.invoice.updateMany({
      where: {
        id: { in: invoiceIds },
        organizationId,
      },
      data: {
        // Add reminderSentAt field to schema
        updatedAt: new Date(),
      },
    });

    return { success: true, count: invoiceIds.length };
  }

  /**
   * Generate bulk PDFs
   */
  static async generateBulkPDFs(organizationId: string, invoiceIds: string[]) {
    // TODO: Integrate with PDF generation service
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        organizationId,
      },
      include: {
        customer: true,
        items: true,
      },
    });

    // Return URLs to PDFs (placeholder)
    return {
      success: true,
      pdfs: invoices.map((inv) => ({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        url: `/api/orgs/${organizationId}/invoices/${inv.id}/pdf`,
      })),
    };
  }
}
