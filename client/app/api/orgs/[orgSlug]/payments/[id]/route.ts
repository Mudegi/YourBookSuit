import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentService } from '@/services/payments/payment.service';

/**
 * GET /api/orgs/[orgSlug]/payments/[id]
 * Get a single payment by ID with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
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

    const payment = await prisma.payment.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        vendor: { select: { id: true, companyName: true, contactName: true } },
        bankAccount: {
          select: {
            id: true,
            accountName: true,
            accountNumber: true,
            bankName: true,
            accountType: true,
            glAccountId: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        transaction: {
          include: {
            entries: {
              include: {
                account: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    accountType: true,
                  },
                },
              },
              orderBy: { debit: 'desc' },
            },
          },
        },
        allocations: {
          include: {
            invoice: {
              include: {
                customer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    companyName: true,
                  },
                },
              },
            },
            bill: {
              include: {
                vendor: {
                  select: {
                    id: true,
                    companyName: true,
                    contactName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Enrich with computed allocation status and display names
    const customerName = payment.customer
      ? (payment.customer.companyName || [payment.customer.firstName, payment.customer.lastName].filter(Boolean).join(' ') || 'Customer')
      : null;
    const vendorName = payment.vendor
      ? (payment.vendor.companyName || payment.vendor.contactName || 'Vendor')
      : null;

    const enriched = {
      ...payment,
      customer: payment.customer ? { id: payment.customer.id, name: customerName } : null,
      vendor: payment.vendor ? { id: payment.vendor.id, name: vendorName } : null,
      bankAccount: payment.bankAccount ? {
        id: payment.bankAccount.id,
        code: payment.bankAccount.accountNumber,
        name: payment.bankAccount.accountName,
        bankName: payment.bankAccount.bankName,
        accountType: payment.bankAccount.accountType,
      } : null,
      createdBy: payment.createdBy ? {
        id: payment.createdBy.id,
        name: [payment.createdBy.firstName, payment.createdBy.lastName].filter(Boolean).join(' '),
        email: payment.createdBy.email,
      } : null,
      allocations: payment.allocations.map((a: any) => ({
        ...a,
        invoice: a.invoice ? {
          ...a.invoice,
          totalAmount: a.invoice.total,
          customer: a.invoice.customer ? {
            id: a.invoice.customer.id,
            name: a.invoice.customer.companyName || [a.invoice.customer.firstName, a.invoice.customer.lastName].filter(Boolean).join(' ') || 'Customer',
          } : null,
        } : null,
        bill: a.bill ? {
          ...a.bill,
          totalAmount: a.bill.total,
          vendor: a.bill.vendor ? {
            id: a.bill.vendor.id,
            name: a.bill.vendor.companyName || a.bill.vendor.contactName || 'Vendor',
          } : null,
        } : null,
      })),
      allocationStatus: PaymentService.getAllocationStatus(payment.amount, payment.allocatedAmount),
    };

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment' },
      { status: 500 }
    );
  }
}
}
