import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/[orgSlug]/credit-notes - List all credit notes with filters
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

    // Get organization
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });

    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    // Build filters
    const where: any = {
      organizationId: org.id,
    };

    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (invoiceId) where.invoiceId = invoiceId;
    if (startDate || endDate) {
      where.creditDate = {};
      if (startDate) where.creditDate.gte = new Date(startDate);
      if (endDate) where.creditDate.lte = new Date(endDate);
    }

    const creditNotes = await prisma.creditNote.findMany({
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
            applications: true,
          },
        },
      },
      orderBy: { creditDate: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: creditNotes,
    });
  } catch (error: any) {
    console.error('Error fetching credit notes:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch credit notes' },
      { status: 500 }
    );
  }
}

// POST /api/[orgSlug]/credit-notes - Create new credit note
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
      lineItems,
    } = body;

    // Get organization
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });

    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    // Generate credit note number
    const lastCreditNote = await prisma.creditNote.findFirst({
      where: { organizationId: org.id },
      orderBy: { creditNoteNumber: 'desc' },
    });

    const lastNumber = lastCreditNote
      ? parseInt(lastCreditNote.creditNoteNumber.split('-').pop() || '0')
      : 0;
    const creditNoteNumber = `CN-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(4, '0')}`;

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

    // Create credit note with line items
    const creditNote = await prisma.creditNote.create({
      data: {
        organizationId: org.id,
        creditNoteNumber,
        invoiceId: invoiceId || undefined,
        customerId,
        branchId: branchId || undefined,
        reason,
        description,
        internalNotes: internalNotes || undefined,
        subtotal,
        taxAmount,
        totalAmount,
        remainingAmount: totalAmount, // Initially, full amount is available
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
      data: creditNote,
      message: 'Credit note created successfully',
    });
  } catch (error: any) {
    console.error('Error creating credit note:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create credit note' },
      { status: 500 }
    );
  }
}
