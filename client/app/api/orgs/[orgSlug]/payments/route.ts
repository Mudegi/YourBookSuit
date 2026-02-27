import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentService } from '@/services/payments/payment.service';
import { requireAuth } from '@/lib/api-auth';
import { z } from 'zod';

// ──────────── Zod Schemas ────────────

const invoiceAllocationSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  amount: z.number().positive('Amount must be positive'),
});

const billAllocationSchema = z.object({
  billId: z.string().min(1, 'Bill ID is required'),
  amount: z.number().positive('Amount must be positive'),
});

const customerPaymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  paymentDate: z.string().transform((str) => new Date(str)),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.string().default('OTHER'),
  bankAccountId: z.string().min(1, 'Bank account is required'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  mobileMoneyProvider: z.string().optional(),
  mobileMoneyTxnId: z.string().optional(),
  invoiceAllocations: z.array(invoiceAllocationSchema).optional().default([]),
});

const vendorPaymentSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  paymentDate: z.string().transform((str) => new Date(str)),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.string().default('OTHER'),
  bankAccountId: z.string().min(1, 'Bank account is required'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  mobileMoneyProvider: z.string().optional(),
  mobileMoneyTxnId: z.string().optional(),
  billAllocations: z.array(billAllocationSchema).optional().default([]),
});

// ──────────── GET ────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    let organizationId = request.headers.get('x-organization-id');

    if (!organizationId) {
      const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
      if (!org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }
      organizationId = org.id;
    }

    const { searchParams } = new URL(request.url);
    const paymentType = searchParams.get('paymentType');
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const vendorId = searchParams.get('vendorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const sortBy = searchParams.get('sortBy') || 'paymentDate';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build where clause
    const where: any = { organizationId };

    // Map filter values to actual enum values
    if (paymentType === 'RECEIPT' || paymentType === 'CUSTOMER_PAYMENT') {
      where.paymentType = 'RECEIPT';
    } else if (paymentType === 'PAYMENT' || paymentType === 'VENDOR_PAYMENT') {
      where.paymentType = 'PAYMENT';
    }

    if (status) {
      where.status = status;
    }

    if (customerId) where.customerId = customerId;
    if (vendorId) where.vendorId = vendorId;

    if (startDate) where.paymentDate = { gte: new Date(startDate) };
    if (endDate) where.paymentDate = { ...where.paymentDate, lte: new Date(endDate) };

    // Search across paymentNumber, referenceNumber, customer name, vendor name
    if (search) {
      where.OR = [
        { paymentNumber: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { mobileMoneyTxnId: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
        { vendor: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Dynamic sort
    const orderBy: any = {};
    if (sortBy === 'amount') orderBy.amount = sortOrder;
    else if (sortBy === 'paymentNumber') orderBy.paymentNumber = sortOrder;
    else orderBy.paymentDate = sortOrder;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          vendor: { select: { id: true, companyName: true, contactName: true } },
          bankAccount: { select: { id: true, accountName: true, accountNumber: true, bankName: true, glAccountId: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          allocations: {
            include: {
              invoice: { select: { id: true, invoiceNumber: true, total: true } },
              bill: { select: { id: true, billNumber: true, total: true } },
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    // Enrich with computed allocation status and display names
    const enrichedPayments = payments.map((p) => {
      const customerName = p.customer
        ? (p.customer.companyName || [p.customer.firstName, p.customer.lastName].filter(Boolean).join(' ') || 'Customer')
        : null;
      const vendorName = p.vendor
        ? (p.vendor.companyName || p.vendor.contactName || 'Vendor')
        : null;
      return {
        ...p,
        customer: p.customer ? { id: p.customer.id, name: customerName } : null,
        vendor: p.vendor ? { id: p.vendor.id, name: vendorName } : null,
        bankAccount: p.bankAccount ? {
          id: p.bankAccount.id,
          code: p.bankAccount.accountNumber,
          name: p.bankAccount.accountName,
          bankName: p.bankAccount.bankName,
        } : null,
        createdBy: p.createdBy ? {
          id: p.createdBy.id,
          name: [p.createdBy.firstName, p.createdBy.lastName].filter(Boolean).join(' '),
        } : null,
        allocations: p.allocations.map((a: any) => ({
          ...a,
          invoice: a.invoice ? { ...a.invoice, totalAmount: a.invoice.total } : null,
          bill: a.bill ? { ...a.bill, totalAmount: a.bill.total } : null,
        })),
        allocationStatus: PaymentService.getAllocationStatus(p.amount, p.allocatedAmount),
      };
    });

    // Summary stats (across ALL matching payments, not just current page)
    const allMatchingPayments = await prisma.payment.findMany({
      where,
      select: { paymentType: true, amount: true, status: true },
    });

    const receipts = allMatchingPayments.filter((p) => p.paymentType === 'RECEIPT' && p.status !== 'VOIDED');
    const paymentsOut = allMatchingPayments.filter((p) => p.paymentType === 'PAYMENT' && p.status !== 'VOIDED');

    const stats = {
      total,
      customerPaymentCount: receipts.length,
      customerPaymentAmount: receipts.reduce((sum, p) => sum + Number(p.amount), 0),
      vendorPaymentCount: paymentsOut.length,
      vendorPaymentAmount: paymentsOut.reduce((sum, p) => sum + Number(p.amount), 0),
      netCashFlow:
        receipts.reduce((sum, p) => sum + Number(p.amount), 0) -
        paymentsOut.reduce((sum, p) => sum + Number(p.amount), 0),
    };

    return NextResponse.json({
      payments: enrichedPayments,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

// ──────────── POST ────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requireAuth(params.orgSlug);
    const body = await request.json();

    if (body.customerId) {
      const validatedData = customerPaymentSchema.parse(body);
      const payment = await PaymentService.recordCustomerPayment(validatedData, organizationId, userId);
      return NextResponse.json(payment, { status: 201 });
    } else if (body.vendorId) {
      const validatedData = vendorPaymentSchema.parse(body);
      const payment = await PaymentService.recordVendorPayment(validatedData, organizationId, userId);
      return NextResponse.json(payment, { status: 201 });
    } else {
      return NextResponse.json(
        { error: 'Either customerId or vendorId must be provided' },
        { status: 400 },
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Error recording payment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record payment' },
      { status: 500 },
    );
  }
}
