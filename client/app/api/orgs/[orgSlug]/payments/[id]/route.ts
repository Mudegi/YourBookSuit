import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        customer: true,
        vendor: true,
        bankAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            accountType: true,
          },
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
                    name: true,
                  },
                },
              },
            },
            bill: {
              include: {
                vendor: {
                  select: {
                    id: true,
                    name: true,
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

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment' },
      { status: 500 }
    );
  }
}
