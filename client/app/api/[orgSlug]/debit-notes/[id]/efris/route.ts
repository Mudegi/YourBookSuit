import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { EfrisApiService } from '@/lib/services/efris/efris-api.service';

/**
 * POST /api/[orgSlug]/debit-notes/[id]/efris
 * Submit a debit note to EFRIS
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);
    const debitNoteId = params.id;

    // Fetch the debit note with line items and customer
    const debitNote = await prisma.debitNote.findFirst({
      where: {
        id: debitNoteId,
        organizationId,
      },
      include: {
        customer: true,
        invoice: true,
        lineItems: true,
      },
    });

    if (!debitNote) {
      return NextResponse.json(
        { error: 'Debit note not found' },
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

    // Prepare debit note data for EFRIS
    const customerName = debitNote.customer.companyName || 
      `${debitNote.customer.firstName} ${debitNote.customer.lastName}`;
    
    const efrisResponse = await efrisService.submitDebitNote({
      debit_note_number: debitNote.debitNoteNumber,
      debit_note_date: debitNote.debitDate.toISOString().split('T')[0],
      original_invoice_number: debitNote.invoice?.invoiceNumber || '',
      original_fdn: '',
      customer_name: customerName,
      customer_tin: '',
      reason: debitNote.reason,
      items: debitNote.lineItems.map((item: any) => ({
        item_name: item.description,
        quantity: item.quantity?.toNumber() || 0,
        unit_price: item.unitPrice?.toNumber() || 0,
        tax_rate: item.taxRate?.toNumber() || 0,
        tax_amount: 0,
        total: (item.quantity?.toNumber() || 0) * (item.unitPrice?.toNumber() || 0),
      })),
      total_amount: debitNote.totalAmount?.toNumber() || 0,
      total_tax: 0,
      currency: 'UGX',
    });

    // Update debit note with EFRIS submission info if needed
    // (You might want to add fields to store EFRIS debit note ID)

    return NextResponse.json({
      success: true,
      message: 'Debit note submitted to EFRIS successfully',
      efrisResponse,
    });
  } catch (error: any) {
    console.error('Error submitting debit note to EFRIS:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit debit note to EFRIS' },
      { status: 500 }
    );
  }
}
