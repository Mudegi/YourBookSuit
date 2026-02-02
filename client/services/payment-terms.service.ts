import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface CreatePaymentTermData {
  code: string;
  name: string;
  description?: string;
  daysUntilDue: number;
  discountPercentage?: number;
  discountDays?: number;
  isDefault?: boolean;
  displayOrder?: number;
}

export interface UpdatePaymentTermData {
  code?: string;
  name?: string;
  description?: string;
  daysUntilDue?: number;
  discountPercentage?: number;
  discountDays?: number;
  isActive?: boolean;
  isDefault?: boolean;
  displayOrder?: number;
}

export class PaymentTermsService {
  /**
   * Get all payment terms for an organization
   */
  static async getAll(organizationId: string, includeInactive = false) {
    return prisma.paymentTerm.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [
        { displayOrder: 'asc' },
        { daysUntilDue: 'asc' },
      ],
    });
  }

  /**
   * Get a single payment term by ID
   */
  static async getById(id: string, organizationId: string) {
    return prisma.paymentTerm.findFirst({
      where: {
        id,
        organizationId,
      },
    });
  }

  /**
   * Get a payment term by code
   */
  static async getByCode(code: string, organizationId: string) {
    return prisma.paymentTerm.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code,
        },
      },
    });
  }

  /**
   * Get the default payment term for an organization
   */
  static async getDefault(organizationId: string) {
    return prisma.paymentTerm.findFirst({
      where: {
        organizationId,
        isDefault: true,
        isActive: true,
      },
    });
  }

  /**
   * Create a new payment term
   */
  static async create(organizationId: string, data: CreatePaymentTermData) {
    // If this is being set as default, unset all other defaults
    if (data.isDefault) {
      await prisma.paymentTerm.updateMany({
        where: {
          organizationId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    return prisma.paymentTerm.create({
      data: {
        organizationId,
        code: data.code,
        name: data.name,
        description: data.description,
        daysUntilDue: data.daysUntilDue,
        discountPercentage: data.discountPercentage ? new Prisma.Decimal(data.discountPercentage) : null,
        discountDays: data.discountDays,
        isDefault: data.isDefault ?? false,
        displayOrder: data.displayOrder ?? 0,
      },
    });
  }

  /**
   * Update a payment term
   */
  static async update(
    id: string,
    organizationId: string,
    data: UpdatePaymentTermData
  ) {
    // If this is being set as default, unset all other defaults
    if (data.isDefault) {
      await prisma.paymentTerm.updateMany({
        where: {
          organizationId,
          isDefault: true,
          NOT: { id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    return prisma.paymentTerm.update({
      where: {
        id,
        organizationId,
      },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.daysUntilDue !== undefined && { daysUntilDue: data.daysUntilDue }),
        ...(data.discountPercentage !== undefined && { 
          discountPercentage: data.discountPercentage ? new Prisma.Decimal(data.discountPercentage) : null 
        }),
        ...(data.discountDays !== undefined && { discountDays: data.discountDays }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
      },
    });
  }

  /**
   * Delete a payment term (soft delete by setting isActive = false)
   */
  static async delete(id: string, organizationId: string) {
    // Check if it's in use
    const [customerCount, vendorCount] = await Promise.all([
      prisma.customer.count({
        where: {
          organizationId,
          paymentTermId: id,
        },
      }),
      prisma.vendor.count({
        where: {
          organizationId,
          paymentTermId: id,
        },
      }),
    ]);

    if (customerCount > 0 || vendorCount > 0) {
      throw new Error(
        `Cannot delete payment term. It is used by ${customerCount} customer(s) and ${vendorCount} vendor(s).`
      );
    }

    return prisma.paymentTerm.update({
      where: {
        id,
        organizationId,
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Calculate due date based on payment term
   */
  static calculateDueDate(invoiceDate: Date, daysUntilDue: number): Date {
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + daysUntilDue);
    return dueDate;
  }

  /**
   * Check if early payment discount applies
   */
  static isDiscountApplicable(
    paymentDate: Date,
    invoiceDate: Date,
    discountDays: number | null
  ): boolean {
    if (!discountDays) return false;
    
    const daysSinceInvoice = Math.floor(
      (paymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysSinceInvoice <= discountDays;
  }

  /**
   * Calculate discount amount if applicable
   */
  static calculateDiscountAmount(
    totalAmount: number,
    paymentDate: Date,
    invoiceDate: Date,
    discountPercentage: number | null,
    discountDays: number | null
  ): number {
    if (!discountPercentage || !discountDays) return 0;
    
    if (this.isDiscountApplicable(paymentDate, invoiceDate, discountDays)) {
      return totalAmount * (Number(discountPercentage) / 100);
    }
    
    return 0;
  }

  /**
   * Seed default payment terms for a new organization
   */
  static async seedDefaults(organizationId: string) {
    const defaultTerms = [
      {
        code: 'COD',
        name: 'Cash on Delivery',
        description: 'Payment due immediately upon delivery',
        daysUntilDue: 0,
        isDefault: false,
        displayOrder: 1,
      },
      {
        code: 'NET7',
        name: 'Net 7',
        description: 'Payment due within 7 days',
        daysUntilDue: 7,
        isDefault: false,
        displayOrder: 2,
      },
      {
        code: 'NET15',
        name: 'Net 15',
        description: 'Payment due within 15 days',
        daysUntilDue: 15,
        isDefault: false,
        displayOrder: 3,
      },
      {
        code: 'NET30',
        name: 'Net 30',
        description: 'Payment due within 30 days',
        daysUntilDue: 30,
        isDefault: true,
        displayOrder: 4,
      },
      {
        code: '2/10NET30',
        name: '2/10 Net 30',
        description: '2% discount if paid within 10 days, otherwise net 30',
        daysUntilDue: 30,
        discountPercentage: 2,
        discountDays: 10,
        isDefault: false,
        displayOrder: 5,
      },
      {
        code: 'NET45',
        name: 'Net 45',
        description: 'Payment due within 45 days',
        daysUntilDue: 45,
        isDefault: false,
        displayOrder: 6,
      },
      {
        code: 'NET60',
        name: 'Net 60',
        description: 'Payment due within 60 days',
        daysUntilDue: 60,
        isDefault: false,
        displayOrder: 7,
      },
      {
        code: 'NET90',
        name: 'Net 90',
        description: 'Payment due within 90 days',
        daysUntilDue: 90,
        isDefault: false,
        displayOrder: 8,
      },
    ];

    const created = await Promise.all(
      defaultTerms.map((term) => this.create(organizationId, term))
    );

    return created;
  }
}
