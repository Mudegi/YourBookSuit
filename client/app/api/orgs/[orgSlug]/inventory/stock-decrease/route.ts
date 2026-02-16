import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { EfrisApiService } from '@/lib/services/efris/efris-api.service';

/**
 * POST /api/orgs/[orgSlug]/inventory/stock-decrease
 * Create stock decrease adjustment with optional EFRIS submission
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);
    const body = await request.json();

    const { adjustType, stockInDate, remarks, items, submitToEfris = false } = body;

    // Validate required fields
    if (!adjustType) {
      return NextResponse.json(
        { error: 'Adjust type is required' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }

    // adjustType "104" (Others) requires remarks
    if (adjustType === '104' && !remarks) {
      return NextResponse.json(
        { error: 'Remarks are required for adjustType "104" (Others)' },
        { status: 400 }
      );
    }

    let efrisResponse = null;

    // Submit to EFRIS if requested
    if (submitToEfris) {
      // Get EFRIS configuration
      const efrisConfig = await prisma.eInvoiceConfig.findUnique({
        where: { organizationId },
      });

      if (!efrisConfig || !efrisConfig.isActive) {
        return NextResponse.json(
          { error: 'EFRIS integration is not configured or not active' },
          { status: 400 }
        );
      }

      if (efrisConfig.provider !== 'EFRIS') {
        return NextResponse.json(
          { error: 'E-invoice provider is not EFRIS' },
          { status: 400 }
        );
      }

      // Extract EFRIS credentials
      const credentials = efrisConfig.credentials as any;
      const efrisApiKey = credentials?.efrisApiKey || credentials?.apiKey;

      if (!efrisApiKey || !efrisConfig.apiEndpoint) {
        return NextResponse.json(
          { error: 'EFRIS API credentials not configured' },
          { status: 400 }
        );
      }

      // Initialize EFRIS service
      const efrisService = new EfrisApiService({
        apiBaseUrl: efrisConfig.apiEndpoint,
        apiKey: efrisApiKey,
        enabled: efrisConfig.isActive,
      });

      // Prepare EFRIS payload
      const efrisPayload = {
        operationType: '102', // Always 102 for decrease
        adjustType: adjustType,
        stockInDate: stockInDate || new Date().toISOString().split('T')[0],
        remarks: remarks || undefined,
        goodsStockInItem: items.map((item: any) => ({
          goodsCode: item.goodsCode || item.sku,
          measureUnit: item.measureUnit || '101',
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          remarks: item.remarks || undefined,
        })),
      };

      // Submit to EFRIS
      efrisResponse = await efrisService.submitStockDecrease(efrisPayload);

      // Check if submission was successful
      if (efrisResponse.returnStateInfo.returnCode !== '00') {
        return NextResponse.json(
          {
            success: false,
            error: efrisResponse.returnStateInfo.returnMessage || 'EFRIS submission failed',
          },
          { status: 400 }
        );
      }
    }

    // Create stock adjustment records in database for each item
    // This updates inventory and creates audit trail
    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: {
          organizationId,
          OR: [
            { sku: item.goodsCode || item.sku },
            { id: item.productId },
          ],
        },
      });

      if (product) {
        // Create stock movement record
        await prisma.stockMovement.create({
          data: {
            productId: product.id,
            movementType: 'ADJUSTMENT',
            quantity: -Math.abs(parseFloat(item.quantity)), // Negative for decrease
            referenceType: submitToEfris ? 'EFRIS_STOCK_DECREASE' : 'STOCK_DECREASE',
            referenceId: efrisResponse?.data?.referenceNumber || new Date().toISOString(),
            notes: `Stock Decrease - Type: ${getAdjustTypeLabel(adjustType)} - ${remarks || item.remarks || ''}`,
            movementDate: new Date(stockInDate || new Date()),
          },
        });

        // Update inventory item if tracking inventory
        if (product.trackInventory) {
          const inventoryItem = await prisma.inventoryItem.findFirst({
            where: { productId: product.id },
          });

          if (inventoryItem) {
            const newQuantity = parseFloat(inventoryItem.quantityOnHand.toString()) - Math.abs(parseFloat(item.quantity));
            await prisma.inventoryItem.update({
              where: { id: inventoryItem.id },
              data: {
                quantityOnHand: Math.max(0, newQuantity),
                quantityAvailable: Math.max(0, newQuantity - parseFloat(inventoryItem.quantityReserved.toString())),
              },
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: submitToEfris ? 'Stock decrease submitted to EFRIS successfully' : 'Stock decrease created successfully',
      efrisResponse: efrisResponse?.returnStateInfo,
      data: efrisResponse?.data,
    });
  } catch (error: any) {
    console.error('Error submitting stock decrease:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit stock decrease' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get human-readable label for adjust type
 */
function getAdjustTypeLabel(adjustType: string): string {
  const labels: Record<string, string> = {
    '101': 'Expired',
    '102': 'Damaged',
    '103': 'Personal Use',
    '104': 'Others',
    '105': 'Raw Materials',
  };
  return labels[adjustType] || adjustType;
}
