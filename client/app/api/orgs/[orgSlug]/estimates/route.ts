import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

// ─── GET: List estimates ─────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);
    const { searchParams } = new URL(request.url);

    const status    = searchParams.get('status')     || undefined;
    const customerId = searchParams.get('customerId') || undefined;
    const search    = searchParams.get('search')     || undefined;
    const page      = parseInt(searchParams.get('page')  || '1');
    const limit     = parseInt(searchParams.get('limit') || '50');

    const where: any = { organizationId };
    if (status && status !== 'ALL') where.status = status;
    if (customerId) where.customerId = customerId;
    if (search) {
      where.OR = [
        { estimateNumber: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
        { customer: { firstName:   { contains: search, mode: 'insensitive' } } },
        { customer: { lastName:    { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [estimates, total] = await Promise.all([
      prisma.estimate.findMany({
        where,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, companyName: true, email: true },
          },
          items: { select: { id: true, total: true, isOptional: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.estimate.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: estimates, total, page, limit });
  } catch (error: any) {
    console.error('GET /estimates error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch estimates' }, { status: 500 });
  }
}

// ─── POST: Create estimate ───────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requireAuth(params.orgSlug);

    // Fetch org to get baseCurrency for default
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { baseCurrency: true },
    });

    const body = await request.json();

    const { customerId, estimateDate, expirationDate, items, currency = org?.baseCurrency || 'USD',
            exchangeRate = 1, notes, terms, reference, deliveryAddress,
            taxCalculationMethod = 'EXCLUSIVE', shippingAmount = 0 } = body;

    if (!customerId || !estimateDate || !expirationDate || !items?.length) {
      return NextResponse.json({ error: 'customerId, estimateDate, expirationDate and at least one item are required' }, { status: 400 });
    }

    // Verify customer belongs to org
    const customer = await prisma.customer.findFirst({ where: { id: customerId, organizationId } });
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    // Generate estimate number: EST-YYYY-XXXX
    const year = new Date().getFullYear();
    const countThisYear = await prisma.estimate.count({
      where: { organizationId, estimateNumber: { startsWith: `EST-${year}-` } },
    });
    const estimateNumber = `EST-${year}-${String(countThisYear + 1).padStart(4, '0')}`;

    // Calculate totals from items
    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;

    const processedItems = items.map((item: any, index: number) => {
      const qty    = parseFloat(item.quantity) || 0;
      const price  = parseFloat(item.unitPrice) || 0;
      const discPct = parseFloat(item.discountPercent) || 0;
      const discAmt = parseFloat(item.discount) || (qty * price * discPct / 100);
      const taxRate = parseFloat(item.taxRate) || 0;
      const itemSubtotal = qty * price;
      const itemAfterDisc = itemSubtotal - discAmt;
      const itemTax = taxCalculationMethod === 'INCLUSIVE'
        ? itemAfterDisc - (itemAfterDisc / (1 + taxRate / 100))
        : itemAfterDisc * (taxRate / 100);
      const itemTotal = taxCalculationMethod === 'INCLUSIVE'
        ? itemAfterDisc
        : itemAfterDisc + itemTax;

      subtotal      += itemSubtotal;
      taxAmount     += itemTax;
      discountAmount += discAmt;

      return {
        productId:       item.productId   || null,
        serviceId:       item.serviceId   || null,
        description:     item.description || '',
        isOptional:      item.isOptional  || false,
        quantity:        qty,
        unitPrice:       price,
        discount:        discAmt,
        discountPercent: discPct || null,
        taxRate:         taxRate,
        taxAmount:       itemTax,
        taxCategory:     item.taxCategory || null,
        taxRateId:       item.taxRateId   || null,
        taxExempt:       item.taxExempt   || false,
        subtotal:        itemSubtotal,
        total:           itemTotal,
        sortOrder:       item.sortOrder ?? index,
        notes:           item.notes || null,
      };
    });

    const shipping = parseFloat(shippingAmount) || 0;
    const total = subtotal - discountAmount + taxAmount + shipping;

    const estimate = await prisma.estimate.create({
      data: {
        organizationId,
        customerId,
        estimateNumber,
        estimateDate:  new Date(estimateDate),
        expirationDate: new Date(expirationDate),
        currency,
        exchangeRate,
        taxCalculationMethod,
        subtotal,
        taxAmount,
        discountAmount,
        shippingAmount: shipping,
        total,
        notes:           notes   || null,
        terms:           terms   || null,
        reference:       reference || null,
        deliveryAddress: deliveryAddress || null,
        createdById:     userId,
        items: { create: processedItems },
      },
      include: {
        customer: true,
        items:    true,
      },
    });

    return NextResponse.json({ success: true, data: estimate }, { status: 201 });
  } catch (error: any) {
    console.error('POST /estimates error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create estimate' }, { status: 500 });
  }
}
