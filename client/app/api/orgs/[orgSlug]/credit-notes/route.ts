import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/orgs/[orgSlug]/credit-notes - List credit notes
export async function GET(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true }
    });

    if (!org) return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });

    const where: any = { organizationId: org.id };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (startDate || endDate) {
      where.creditDate = {};
      if (startDate) where.creditDate.gte = new Date(startDate);
      if (endDate) where.creditDate.lte = new Date(endDate);
    }

    const creditNotes = await prisma.creditNote.findMany({
      where,
      include: {
        customer: { select: { id: true, customerNumber: true, companyName: true, firstName: true, lastName: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { creditDate: 'desc' }
    });

    return NextResponse.json({ success: true, data: creditNotes });
  } catch (error: any) {
    console.error('Error fetching credit notes:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/orgs/[orgSlug]/credit-notes - Create credit note
export async function POST(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { customerId, invoiceId, branchId, creditDate, reason, description, internalNotes, lineItems } = body;

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true }
    });

    if (!org) return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });

    // Calculate total
    const subtotal = lineItems.reduce((sum: number, item: any) => {
      const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
      return sum + itemSubtotal;
    }, 0);

    const totalTax = lineItems.reduce((sum: number, item: any) => {
      const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
      const itemTax = itemSubtotal * (parseFloat(item.taxRate) / 100);
      return sum + itemTax;
    }, 0);

    const total = subtotal + totalTax;

    // Get next credit note number
    const lastCreditNote = await prisma.creditNote.findFirst({
      where: { organizationId: org.id },
      orderBy: { creditNoteNumber: 'desc' },
      select: { creditNoteNumber: true }
    });

    let creditNoteNumber = 'CN-0001';
    if (lastCreditNote && lastCreditNote.creditNoteNumber) {
      const lastNum = parseInt(lastCreditNote.creditNoteNumber.split('-')[1] || '0');
      creditNoteNumber = `CN-${String(lastNum + 1).padStart(4, '0')}`;
    }

    // Create credit note
    const creditNote = await prisma.creditNote.create({
      data: {
        organizationId: org.id,
        customerId,
        invoiceId: invoiceId || null,
        branchId: branchId || null,
        creditNoteNumber,
        creditDate: new Date(creditDate),
        reason,
        description,
        internalNotes,
        subtotal,
        totalTax,
        totalAmount: total,
        appliedAmount: 0,
        remainingAmount: total,
        status: 'DRAFT',
        createdById: user.id,
        lineItems: {
          create: lineItems.map((item: any, index: number) => ({
            lineNumber: index + 1,
            description: item.description,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            taxRate: parseFloat(item.taxRate),
            taxAmount: parseFloat(item.quantity) * parseFloat(item.unitPrice) * (parseFloat(item.taxRate) / 100),
            lineTotal: parseFloat(item.quantity) * parseFloat(item.unitPrice) * (1 + parseFloat(item.taxRate) / 100),
            productId: item.productId || null,
            accountId: item.accountId || null,
          }))
        }
      },
      include: {
        customer: true,
        invoice: true,
        lineItems: true
      }
    });

    return NextResponse.json({ success: true, data: creditNote }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating credit note:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
