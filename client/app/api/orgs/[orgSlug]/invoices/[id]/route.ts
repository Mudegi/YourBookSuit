import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      include: {
        customer: true,
        items: {
          orderBy: {
            sortOrder: 'asc',
          },
          include: {
            taxLines: true,
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        Branch: true,
        payments: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId, userId } = await requireAuth(params.orgSlug);

    const body = await request.json();

    // Check if invoice exists
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Only allow updates to DRAFT invoices
    if (existingInvoice.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only update draft invoices' },
        { status: 400 }
      );
    }

    // Update invoice status only (for marking as sent/paid)
    const invoice = await prisma.invoice.update({
      where: {
        id: params.id,
      },
      data: {
        status: body.status,
        notes: body.notes,
      },
      include: {
        customer: true,
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    // Check if invoice exists
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of DRAFT invoices
    if (invoice.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only delete draft invoices' },
        { status: 400 }
      );
    }

    // Delete invoice items first, then invoice
    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({
        where: { invoiceId: params.id },
      }),
      prisma.invoice.delete({
        where: { id: params.id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
