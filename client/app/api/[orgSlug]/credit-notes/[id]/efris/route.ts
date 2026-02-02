import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { EfrisApiService } from '@/lib/services/efris/efris-api.service';

/**
 * POST /api/[orgSlug]/credit-notes/[id]/efris
 * Submit a credit note to EFRIS
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);
    const creditNoteId = params.id;

    // Fetch the credit note with line items and customer
    const creditNote = await prisma.creditNote.findFirst({
      where: {
        id: creditNoteId,
        organizationId,
      },
      include: {
        customer: true,
        invoice: true,
        lineItems: true,
      },
    });

    if (!creditNote) {
      return NextResponse.json(
        { error: 'Credit note not found' },
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

    // Prepare credit note data for EFRIS
    const customerName = creditNote.customer.companyName || 
      `${creditNote.customer.firstName} ${creditNote.customer.lastName}`;
    
    const efrisResponse = await efrisService.submitCreditNote({
      credit_note_number: creditNote.creditNoteNumber,
      original_invoice_number: creditNote.invoice?.invoiceNumber || '',
      customer_name: customerName,
      customer_tin: '',
      credit_date: creditNote.creditDate.toISOString().split('T')[0],
      reason: creditNote.reason,
      items: creditNote.lineItems.map((item: any) => ({
        item_name: item.description,
        quantity: item.quantity?.toNumber() || 0,
        unit_price: item.unitPrice?.toNumber() || 0,
        tax_rate: item.taxRate?.toNumber() || 0,
        tax_amount: 0,
        total: (item.quantity?.toNumber() || 0) * (item.unitPrice?.toNumber() || 0),
      })),
      total_amount: creditNote.totalAmount?.toNumber() || 0,
    });

    // Update credit note with EFRIS submission info if needed
    // (You might want to add fields to store EFRIS credit note ID)

    return NextResponse.json({
      success: true,
      message: 'Credit note submitted to EFRIS successfully',
      efrisResponse,
    });
  } catch (error: any) {
    console.error('Error submitting credit note to EFRIS:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit credit note to EFRIS' },
      { status: 500 }
    );
  }
}
