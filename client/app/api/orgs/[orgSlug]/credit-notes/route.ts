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
    const {
      customerId, invoiceId, branchId, creditDate, reason, description,
      internalNotes, lineItems, restockInventory
    } = body;

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true }
    });

    if (!org) return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });

    // Determine tax calculation method from linked invoice (if any)
    let taxInclusive = false;
    if (invoiceId) {
      const inv = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { taxCalculationMethod: true },
      });
      taxInclusive = inv?.taxCalculationMethod === 'INCLUSIVE';
    }

    // Helper: calculate line amounts respecting inclusive/exclusive pricing
    const calcLine = (qty: number, unitPrice: number, taxRate: number) => {
      if (taxInclusive && taxRate > 0) {
        const gross = qty * unitPrice;
        const taxAmt = gross * taxRate / (100 + taxRate);
        const sub = gross - taxAmt;
        return {
          subtotal: Math.round(sub * 100) / 100,
          taxAmount: Math.round(taxAmt * 100) / 100,
          totalAmount: Math.round(gross * 100) / 100,
        };
      }
      const sub = qty * unitPrice;
      const taxAmt = sub * taxRate / 100;
      return {
        subtotal: Math.round(sub * 100) / 100,
        taxAmount: Math.round(taxAmt * 100) / 100,
        totalAmount: Math.round((sub + taxAmt) * 100) / 100,
      };
    };

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    let totalAmount = 0;
    const computedItems = lineItems.map((item: any) => {
      const qty = parseFloat(item.quantity);
      const price = parseFloat(item.unitPrice);
      const rate = parseFloat(item.taxRate || 0);
      const line = calcLine(qty, price, rate);
      subtotal += line.subtotal;
      taxAmount += line.taxAmount;
      totalAmount += line.totalAmount;
      return { ...item, qty, price, rate, ...line };
    });

    // Generate credit note number: CN-YYYY-XXXX
    const year = new Date(creditDate).getFullYear();
    const prefix = `CN-${year}-`;
    const lastCreditNote = await prisma.creditNote.findFirst({
      where: {
        organizationId: org.id,
        creditNoteNumber: { startsWith: prefix },
      },
      orderBy: { creditNoteNumber: 'desc' },
      select: { creditNoteNumber: true }
    });

    let seq = 1;
    if (lastCreditNote?.creditNoteNumber) {
      const parts = lastCreditNote.creditNoteNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1] || '0', 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    const creditNoteNumber = `${prefix}${String(seq).padStart(4, '0')}`;

    // Use a transaction for atomicity
    const creditNote = await prisma.$transaction(async (tx) => {
      // Create credit note with line items
      const cn = await tx.creditNote.create({
        data: {
          organizationId: org.id,
          customerId,
          invoiceId: invoiceId || null,
          branchId: branchId || null,
          creditNoteNumber,
          creditDate: new Date(creditDate),
          reason,
          description,
          internalNotes: internalNotes || null,
          subtotal,
          taxAmount,
          totalAmount,
          appliedAmount: 0,
          remainingAmount: totalAmount,
          status: 'DRAFT',
          createdBy: user.id,
          lineItems: {
            create: computedItems.map((item: any) => {
              return {
                description: item.description,
                quantity: item.qty,
                unitPrice: item.price,
                taxRate: item.rate,
                taxRateId: item.taxRateId || null,
                taxAmount: item.taxAmount,
                subtotal: item.subtotal,
                totalAmount: item.totalAmount,
                productId: item.productId || null,
                accountId: item.accountId || null,
              };
            })
          }
        },
        include: {
          customer: true,
          invoice: true,
          lineItems: true,
        }
      });

      // Restock inventory if requested
      if (restockInventory) {
        const restockItems = lineItems.filter((item: any) => item.restock && item.productId);
        for (const item of restockItems) {
          const qty = parseFloat(item.quantity);
          if (qty <= 0) continue;

          // Resolve warehouse location name
          let warehouseLocation = 'Main';
          if (item.warehouseId) {
            const wh = await tx.inventoryWarehouse.findUnique({
              where: { id: item.warehouseId },
              select: { name: true },
            });
            if (wh) warehouseLocation = wh.name;
          }

          // Update or create inventory item balance
          const existingItem = await tx.inventoryItem.findFirst({
            where: {
              productId: item.productId,
              warehouseLocation,
            }
          });

          if (existingItem) {
            await tx.inventoryItem.update({
              where: { id: existingItem.id },
              data: {
                quantityOnHand: { increment: qty },
                quantityAvailable: { increment: qty },
              }
            });
          } else {
            await tx.inventoryItem.create({
              data: {
                productId: item.productId,
                warehouseLocation,
                quantityOnHand: qty,
                quantityAvailable: qty,
              }
            });
          }

          // Create stock movement for audit trail
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              movementType: 'RETURN',
              quantity: qty,
              warehouseLocation,
              referenceType: 'CreditNote',
              referenceId: cn.id,
              notes: `Credit note return: ${description}`,
            }
          });
        }
      }

      return cn;
    });

    return NextResponse.json({ success: true, data: creditNote }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating credit note:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
