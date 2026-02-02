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

    // Fetch the bill with vendor
    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        organizationId,
      },
      include: {
        vendor: true,
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

    // Prepare purchase order data for EFRIS
    const efrisResponse = await efrisService.submitPurchaseOrder({
      po_number: bill.billNumber || `PO-${bill.id}`,
      vendor_name: bill.vendor.name,
      vendor_tin: (bill.vendor as any).taxId || '',
      order_date: bill.billDate.toISOString().split('T')[0],
      items: [],
      total_amount: bill.total?.toNumber() || 0,
    });

    // Update bill with EFRIS submission info if needed
    // (You might want to add fields to store EFRIS PO ID)

    return NextResponse.json({
      success: true,
      message: 'Purchase order submitted to EFRIS successfully',
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
