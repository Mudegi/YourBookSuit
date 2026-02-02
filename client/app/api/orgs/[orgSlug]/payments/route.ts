import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentService } from '@/services/payments/payment.service';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';

// Zod schema for invoice allocation
const invoiceAllocationSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  amount: z.number().positive('Amount must be positive'),
});

// Zod schema for bill allocation
const billAllocationSchema = z.object({
  billId: z.string().min(1, 'Bill ID is required'),
  amount: z.number().positive('Amount must be positive'),
});

// Zod schema for customer payment
const customerPaymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  paymentDate: z.string().transform((str) => new Date(str)),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['CASH', 'CHECK', 'CARD', 'ACH', 'WIRE', 'OTHER']),
  bankAccountId: z.string().min(1, 'Bank account is required'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  invoiceAllocations: z
    .array(invoiceAllocationSchema)
    .min(1, 'At least one invoice allocation is required'),
});

// Zod schema for vendor payment
const vendorPaymentSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  paymentDate: z.string().transform((str) => new Date(str)),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['CASH', 'CHECK', 'CARD', 'ACH', 'WIRE', 'OTHER']),
  bankAccountId: z.string().min(1, 'Bank account is required'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  billAllocations: z
    .array(billAllocationSchema)
    .min(1, 'At least one bill allocation is required'),
});

/**
 * GET /api/orgs/[orgSlug]/payments
 * List all payments with optional filters
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    let organizationId = request.headers.get('x-organization-id');

    if (!organizationId) {
      const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
      if (!org) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }
      organizationId = org.id;
    }

    const { searchParams } = new URL(request.url);
    const paymentType = searchParams.get('paymentType'); // CUSTOMER_PAYMENT or VENDOR_PAYMENT
    const customerId = searchParams.get('customerId');
    const vendorId = searchParams.get('vendorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const where: any = {
      organizationId,
    };

    if (paymentType) {
      where.paymentType = paymentType;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (startDate) {
      where.paymentDate = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.paymentDate = {
        ...where.paymentDate,
        lte: new Date(endDate),
      };
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
        bankAccount: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        transaction: {
          select: {
            id: true,
            transactionNumber: true,
            status: true,
          },
        },
        allocations: {
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                totalAmount: true,
              },
            },
            bill: {
              select: {
                id: true,
                billNumber: true,
                totalAmount: true,
              },
            },
          },
        },
      },
    });

    // Calculate summary statistics
    const customerPayments = payments.filter(
      (p) => p.paymentType === 'CUSTOMER_PAYMENT'
    );
    const vendorPayments = payments.filter((p) => p.paymentType === 'VENDOR_PAYMENT');

    const stats = {
      total: payments.length,
      customerPaymentCount: customerPayments.length,
      customerPaymentAmount: customerPayments.reduce((sum, p) => sum + p.amount, 0),
      vendorPaymentCount: vendorPayments.length,
      vendorPaymentAmount: vendorPayments.reduce((sum, p) => sum + p.amount, 0),
      netCashFlow:
        customerPayments.reduce((sum, p) => sum + p.amount, 0) -
        vendorPayments.reduce((sum, p) => sum + p.amount, 0),
    };

    return NextResponse.json({
      payments,
      stats,
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[orgSlug]/payments
 * Record a new payment (customer or vendor)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requireAuth(params.orgSlug);

    const body = await request.json();

    // Determine payment type and validate accordingly
    if (body.customerId) {
      // Customer payment
      const validatedData = customerPaymentSchema.parse(body);

      const payment = await PaymentService.recordCustomerPayment(
        validatedData,
        organizationId,
        userId
      );

      return NextResponse.json(payment, { status: 201 });
    } else if (body.vendorId) {
      // Vendor payment
      const validatedData = vendorPaymentSchema.parse(body);

      const payment = await PaymentService.recordVendorPayment(
        validatedData,
        organizationId,
        userId
      );

      return NextResponse.json(payment, { status: 201 });
    } else {
      return NextResponse.json(
        { error: 'Either customerId or vendorId must be provided' },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error recording payment:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to record payment',
      },
      { status: 500 }
    );
  }
}
