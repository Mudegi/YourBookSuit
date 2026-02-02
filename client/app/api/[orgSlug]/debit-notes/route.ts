import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/[orgSlug]/debit-notes - List all debit notes with filters
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const invoiceId = searchParams.get('invoiceId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });

    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    const where: any = {
      organizationId: org.id,
    };

    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (invoiceId) where.invoiceId = invoiceId;
    if (startDate || endDate) {
      where.debitDate = {};
      if (startDate) where.debitDate.gte = new Date(startDate);
      if (endDate) where.debitDate.lte = new Date(endDate);
    }

    const debitNotes = await prisma.debitNote.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            customerNumber: true,
            companyName: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
          },
        },
        lineItems: true,
        _count: {
          select: {
            payments: true,
          },
        },
      },
      orderBy: { debitDate: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: debitNotes,
    });
  } catch (error: any) {
    console.error('Error fetching debit notes:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch debit notes' },
      { status: 500 }
    );
  }
}

// POST /api/[orgSlug]/debit-notes - Create new debit note
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      invoiceId,
      customerId,
      branchId,
      reason,
      description,
      internalNotes,
      dueDate,
      lineItems,
    } = body;

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });

    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    // Generate debit note number
    const lastDebitNote = await prisma.debitNote.findFirst({
      where: { organizationId: org.id },
      orderBy: { debitNoteNumber: 'desc' },
    });

    const lastNumber = lastDebitNote
      ? parseInt(lastDebitNote.debitNoteNumber.split('-').pop() || '0')
      : 0;
    const debitNoteNumber = `DN-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(4, '0')}`;

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;

    for (const item of lineItems) {
      const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
      const itemTax = (itemSubtotal * parseFloat(item.taxRate || 0)) / 100;
      subtotal += itemSubtotal;
      taxAmount += itemTax;
    }

    const totalAmount = subtotal + taxAmount;

    // Create debit note with line items
    const debitNote = await prisma.debitNote.create({
      data: {
        organizationId: org.id,
        debitNoteNumber,
        invoiceId: invoiceId || undefined,
        customerId,
        branchId: branchId || undefined,
        reason,
        description,
        internalNotes: internalNotes || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        subtotal,
        taxAmount,
        totalAmount,
        balanceAmount: totalAmount, // Initially, full amount is unpaid
        status: 'DRAFT',
        createdBy: user.id,
        lineItems: {
          create: lineItems.map((item: any) => {
            const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
            const itemTax = (itemSubtotal * parseFloat(item.taxRate || 0)) / 100;

            return {
              productId: item.productId || undefined,
              description: item.description,
              quantity: parseFloat(item.quantity),
              unitPrice: parseFloat(item.unitPrice),
              taxRateId: item.taxRateId || undefined,
              taxRate: parseFloat(item.taxRate || 0),
              taxAmount: itemTax,
              subtotal: itemSubtotal,
              totalAmount: itemSubtotal + itemTax,
              accountId: item.accountId || undefined,
            };
          }),
        },
      },
      include: {
        customer: true,
        invoice: true,
        lineItems: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: debitNote,
      message: 'Debit note created successfully',
    });
  } catch (error: any) {
    console.error('Error creating debit note:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create debit note' },
      { status: 500 }
    );
  }
}
