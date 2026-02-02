import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';

// GET /api/orgs/[orgSlug]/inventory/goods-receipts/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    // Fetch the actual goods receipt from database
    const goodsReceipt = await prisma.goodsReceipt.findFirst({
      where: {
        id: params.id,
        organizationId: org.id,
      },
      include: {
        vendor: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!goodsReceipt) {
      return NextResponse.json(
        { success: false, error: 'Goods receipt not found' },
        { status: 404 }
      );
    }

    // Format the response to match the UI expectations
    const formattedReceipt = {
      id: goodsReceipt.id,
      receiptNumber: goodsReceipt.receiptNumber,
      receiptDate: goodsReceipt.receiptDate.toISOString(),
      vendorName: goodsReceipt.vendor.companyName || goodsReceipt.vendor.contactName || goodsReceipt.vendor.name || 'Unknown Vendor',
      referenceNumber: goodsReceipt.referenceNumber,
      notes: goodsReceipt.notes,
      subtotal: Number(goodsReceipt.subtotal),
      taxAmount: Number(goodsReceipt.taxAmount),
      total: Number(goodsReceipt.total),
      status: goodsReceipt.status,
      efrisSubmitted: goodsReceipt.efrisSubmitted,
      efrisStatus: goodsReceipt.efrisStatus,
      efrisReference: goodsReceipt.efrisReference,
      createdAt: goodsReceipt.createdAt.toISOString(),
      items: goodsReceipt.items.map((item) => ({
        id: item.id,
        productName: item.product.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        taxRate: Number(item.taxRate),
        lineTotal: Number(item.quantity) * Number(item.unitPrice) * (1 + Number(item.taxRate) / 100),
      })),
    };

    return NextResponse.json(formattedReceipt);
  } catch (error: any) {
    console.error('Error fetching goods receipt:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch goods receipt' },
      { status: 400 }
    );
  }
}
