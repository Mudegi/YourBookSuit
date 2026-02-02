import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { EfrisApiService } from '@/lib/services/efris/efris-api.service';
import { GoodsReceiptService } from '@/services/procurement/goods-receipt.service';

// GET /api/orgs/[orgSlug]/inventory/goods-receipts
export async function GET(
  _request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    // Fetch goods receipts from the database
    const receipts = await prisma.goodsReceipt.findMany({
      where: { organizationId: org.id },
      include: {
        vendor: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format the data for the UI
    const formattedReceipts = receipts.map((receipt) => ({
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      receiptDate: receipt.receiptDate.toISOString(),
      vendorName: receipt.vendor.companyName || receipt.vendor.contactName || receipt.vendor.name || 'Unknown',
      totalAmount: Number(receipt.total),
      status: receipt.status,
      efrisSubmitted: receipt.efrisSubmitted,
      efrisStatus: receipt.efrisStatus,
      createdAt: receipt.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data: formattedReceipts });
  } catch (error: any) {
    console.error('Error fetching goods receipts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch goods receipts' },
      { status: 400 }
    );
  }
}

// POST /api/orgs/[orgSlug]/inventory/goods-receipts
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);

    const body = await request.json();
    const {
      purchaseOrderId,
      vendorId,
      warehouseId,
      receiptDate,
      referenceNumber,
      currency,
      exchangeRate,
      notes,
      items,
      landedCosts,
      postToGL = true,
      createAPBill = false,
      submitToEfris = false,
      assetAccountId,
      apAccountId,
    } = body;

    // Validate required fields
    if (!vendorId) {
      return NextResponse.json({ success: false, error: 'Vendor is required' }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one item is required' }, { status: 400 });
    }

    // Validate items
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.unitPrice) {
        return NextResponse.json(
          { success: false, error: 'Each item must have productId, quantity, and unitPrice' },
          { status: 400 }
        );
      }
    }

    // Create goods receipt using service
    const goodsReceiptService = new GoodsReceiptService(prisma);
    
    const result = await goodsReceiptService.createGoodsReceipt(
      {
        organizationId: org.id,
        purchaseOrderId,
        vendorId,
        warehouseId,
        receiptDate: new Date(receiptDate),
        referenceNumber,
        currency,
        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : undefined,
        notes,
        assetAccountId,
        apAccountId,
        items: items.map((item: any) => ({
          productId: item.productId,
          poItemId: item.poItemId,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          taxRate: item.taxRate ? parseFloat(item.taxRate) : 0,
          description: item.description,
          weight: item.weight ? parseFloat(item.weight) : undefined,
          volume: item.volume ? parseFloat(item.volume) : undefined,
        })),
        landedCosts: landedCosts ? {
          freightCost: landedCosts.freightCost ? parseFloat(landedCosts.freightCost) : undefined,
          insuranceCost: landedCosts.insuranceCost ? parseFloat(landedCosts.insuranceCost) : undefined,
          customsDuty: landedCosts.customsDuty ? parseFloat(landedCosts.customsDuty) : undefined,
          otherCosts: landedCosts.otherCosts ? parseFloat(landedCosts.otherCosts) : undefined,
          allocationMethod: landedCosts.allocationMethod,
        } : undefined,
        postToGL,
        createAPBill,
        submitToEfris: false, // Handle EFRIS separately
      },
      user.id
    );

    // Submit to EFRIS if requested
    let efrisResponse = null;
    if (submitToEfris) {
      try {
        const efrisConfig = await prisma.eInvoiceConfig.findUnique({
          where: { organizationId: org.id },
        });

        if (!efrisConfig || !efrisConfig.isActive) {
          return NextResponse.json(
            {
              success: true,
              data: result,
              warning: 'EFRIS integration is not configured or not active',
            },
            { status: 200 }
          );
        }

        const efrisService = new EfrisApiService(
          efrisConfig.apiEndpoint,
          efrisConfig.apiKey,
          efrisConfig.tin
        );

        const vendor = await prisma.vendor.findUnique({
          where: { id: vendorId },
        });

        // Prepare EFRIS payload
        const productsData = await Promise.all(
          items.map(async (item: any) => {
            const product = await prisma.product.findUnique({
              where: { id: item.productId },
            });
            return {
              productId: product?.sku || product?.id || '',
              productName: product?.name || '',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate || 0,
            };
          })
        );

        const efrisPayload = {
          po_number: result.goodsReceipt.receiptNumber,
          po_date: receiptDate,
          vendor_name: vendor?.companyName || vendor?.contactName || '',
          vendor_tin: vendor?.taxIdNumber || '',
          total_amount: Number(result.goodsReceipt.total),
          currency: result.goodsReceipt.currency || 'UGX',
          items: productsData,
        };

        efrisResponse = await efrisService.submitPurchaseOrder(efrisPayload);

        // Update goods receipt with EFRIS info
        await prisma.goodsReceipt.update({
          where: { id: result.goodsReceipt.id },
          data: {
            efrisSubmitted: true,
            efrisStatus: 'SUBMITTED',
            efrisReference: efrisResponse.reference_number || null,
          },
        });
      } catch (efrisError: any) {
        console.error('EFRIS submission error:', efrisError);
        return NextResponse.json(
          {
            success: true,
            data: result,
            warning: `Goods receipt created but EFRIS submission failed: ${efrisError.message}`,
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        efrisResponse,
      },
    });
  } catch (error: any) {
    console.error('Error creating goods receipt:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create goods receipt' },
      { status: 400 }
    );
  }
}
