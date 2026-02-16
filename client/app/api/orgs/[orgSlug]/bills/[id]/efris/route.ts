import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { EfrisApiService } from '@/lib/services/efris/efris-api.service';

/**
 * POST /api/orgs/[orgSlug]/bills/[id]/efris
 * Submit a bill/purchase order to EFRIS
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);
    const billId = params.id;

    // Fetch the bill with items
    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        organizationId,
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

    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    // Get EFRIS configuration
    const config = await prisma.eInvoiceConfig.findFirst({
      where: {
        organizationId,
        isActive: true,
      },
    });

    if (!config) {
      return NextResponse.json(
        { error: 'EFRIS is not configured for this organization' },
        { status: 400 }
      );
    }

    // Extract EFRIS credentials from config
    const credentials = config.credentials as any;
    const efrisApiKey = credentials?.efrisApiKey || credentials?.apiKey;
    
    if (!efrisApiKey || !config.apiEndpoint) {
      return NextResponse.json(
        { error: 'EFRIS API credentials not configured' },
        { status: 400 }
      );
    }

    // Initialize EFRIS service
    const efrisService = new EfrisApiService({
      apiBaseUrl: config.apiEndpoint,
      apiKey: efrisApiKey,
      enabled: config.isActive,
    });

    // Prepare stock increase data for EFRIS (goods receipt)
    // Must fetch products to get their stored EFRIS item codes
    const billItemsWithProducts = await Promise.all(
      bill.items.map(async (item: any) => {
        let efrisItemCode = item.description || 'UNKNOWN';
        
        if (item.productId) {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { efrisItemCode: true, sku: true, name: true, description: true },
          });
          
          if (product?.efrisItemCode) {
            // Use the stored EFRIS item code from product registration
            efrisItemCode = product.efrisItemCode;
          } else if (product) {
            // Fallback: use product description or name (same logic as registration)
            efrisItemCode = (product.description && product.description.trim())
              ? product.description.trim()
              : product.name || 'UNKNOWN';
          }
        }
        
        return {
          item_code: efrisItemCode,
          quantity: parseFloat(item.quantity?.toString() || '0'),
          unit_price: parseFloat(item.unitPrice?.toString() || '0'),
          remarks: item.description || 'Purchase from supplier',
        };
      })
    );

    const stockIncreaseData = {
      stock_movement_date: bill.billDate.toISOString().split('T')[0],
      supplier_name: bill.vendor.companyName,
      supplier_tin: bill.vendor.taxId || '',
      stock_in_type: (bill as any).stockInType || \"102\", // Use bill's stockInType or default to Local Purchase
      items: billItemsWithProducts,
      remarks: `Bill ${bill.billNumber} - Purchase from ${bill.vendor.companyName}`,
    };

    // Submit stock increase to EFRIS
    const efrisResponse = await efrisService.stockIncrease(stockIncreaseData);

    // Update bill with EFRIS submission info
    await prisma.bill.update({
      where: { id: bill.id },
      data: {
        efrisSubmitted: true,
        efrisStatus: efrisResponse.success ? 'SUBMITTED' : 'FAILED',
        efrisReference: efrisResponse.message,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Stock increase submitted to EFRIS successfully',
      efrisResponse,
    });
  } catch (error: any) {
    console.error('Error submitting purchase order to EFRIS:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit purchase order to EFRIS' },
      { status: 500 }
    );
  }
}
