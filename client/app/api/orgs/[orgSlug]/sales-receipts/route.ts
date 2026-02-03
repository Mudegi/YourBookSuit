import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import { SalesReceiptService } from '@/services/sales-receipt.service';
import { PaymentMethod, SalesReceiptStatus } from '@prisma/client';

/**
 * GET /api/orgs/[orgSlug]/sales-receipts
 * List all sales receipts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { org } = await requireOrgMembership(user.id, params.orgSlug);
    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const filters = {
      status: searchParams.get('status') as SalesReceiptStatus | undefined,
      customerId: searchParams.get('customerId') || undefined,
      paymentMethod: searchParams.get('paymentMethod') as PaymentMethod | undefined,
      fromDate: searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : undefined,
      toDate: searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined,
      branchId: searchParams.get('branchId') || undefined,
    };

    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await SalesReceiptService.listSalesReceipts(
      org.id,
      filters,
      { page, limit }
    );

    return NextResponse.json({
      success: true,
      salesReceipts: result.salesReceipts,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching sales receipts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch sales receipts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[orgSlug]/sales-receipts
 * Create a new sales receipt (instant cash sale)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { org } = await requireOrgMembership(user.id, params.orgSlug);
    const body = await request.json();

    // Validate required fields
    if (!body.depositToAccountId) {
      return NextResponse.json(
        { success: false, error: 'depositToAccountId is required' },
        { status: 400 }
      );
    }

    if (!body.paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'paymentMethod is required' },
        { status: 400 }
      );
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Create sales receipt
    const result = await SalesReceiptService.createSalesReceipt(
      org.id,
      user.id,
      {
        receiptDate: new Date(body.receiptDate || new Date()),
        customerId: body.customerId,
        currency: body.currency,
        exchangeRate: body.exchangeRate,
        paymentMethod: body.paymentMethod,
        referenceNumber: body.referenceNumber,
        depositToAccountId: body.depositToAccountId,
        mobileNetwork: body.mobileNetwork,
        payerPhoneNumber: body.payerPhoneNumber,
        branchId: body.branchId,
        warehouseId: body.warehouseId,
        salespersonId: body.salespersonId,
        commissionRate: body.commissionRate,
        reference: body.reference,
        notes: body.notes,
        taxCalculationMethod: body.taxCalculationMethod || 'INCLUSIVE',
        items: body.items,
      }
    );

    return NextResponse.json({
      success: true,
      data: result.salesReceipt,
      salesReceipt: result.salesReceipt,
      message: 'Sales receipt created successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating sales receipt:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create sales receipt' },
      { status: 500 }
    );
  }
}
