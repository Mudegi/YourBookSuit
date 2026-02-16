import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EfrisApiService } from '@/lib/services/efris/efris-api.service';

/**
 * POST /api/orgs/[orgSlug]/credit-notes/[id]/efris
 * Submit credit note to EFRIS (Uganda only)
 */
export async function POST(req: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true, name: true, homeCountry: true }
    });

    if (!org) return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });

    // Check if Uganda
    if (org.homeCountry !== 'UG' && org.homeCountry !== 'UGANDA') {
      return NextResponse.json({ success: false, error: 'EFRIS is only available for Uganda organizations' }, { status: 400 });
    }

    const creditNote = await prisma.creditNote.findFirst({
      where: { id: params.id, organizationId: org.id },
      include: {
        customer: true,
        invoice: true,
        lineItems: true
      }
    });

    if (!creditNote) {
      return NextResponse.json({ success: false, error: 'Credit note not found' }, { status: 404 });
    }

    if (creditNote.status !== 'APPROVED') {
      return NextResponse.json({ success: false, error: 'Only approved credit notes can be submitted to EFRIS' }, { status: 400 });
    }

    // Get EFRIS configuration
    const efrisConfig = await prisma.eInvoiceConfig.findUnique({
      where: { organizationId: org.id }
    });

    if (!efrisConfig || !efrisConfig.isActive) {
      return NextResponse.json({ success: false, error: 'EFRIS not configured' }, { status: 400 });
    }

    const credentials = efrisConfig.credentials as any;
    const efrisApiKey = credentials?.efrisApiKey || credentials?.apiKey;
    
    if (!efrisApiKey || !efrisConfig.apiEndpoint) {
      return NextResponse.json({ success: false, error: 'EFRIS API credentials not configured' }, { status: 400 });
    }

    // Initialize EFRIS service
    const efrisService = new EfrisApiService({
      apiBaseUrl: efrisConfig.apiEndpoint,
      apiKey: efrisApiKey,
      enabled: efrisConfig.isActive,
    });

    // Prepare credit note data for EFRIS
    const customerName = creditNote.customer.companyName || 
      `${creditNote.customer.firstName} ${creditNote.customer.lastName}`;
    
    // Check if already submitted
    if (creditNote.efrisFDN) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Credit note has already been submitted to EFRIS',
          fdn: creditNote.efrisFDN,
          qrCode: creditNote.efrisQRCode,
        },
        { status: 400 }
      );
    }

    const efrisData = await efrisService.submitCreditNote({
      credit_note_number: creditNote.creditNoteNumber,
      credit_note_date: creditNote.creditDate.toISOString().split('T')[0],
      original_invoice_number: creditNote.invoice?.invoiceNumber || '',
      original_fdn: creditNote.invoice?.efrisFDN || '',
      customer_name: customerName,
      customer_tin: creditNote.customer.taxIdNumber || undefined,
      items: creditNote.lineItems.map((item: any) => ({
        item_name: item.description,
        quantity: parseFloat(item.quantity?.toString() || '0'),
        unit_price: parseFloat(item.unitPrice?.toString() || '0'),
        tax_rate: parseFloat(item.taxRate?.toString() || '0'),
        tax_amount: parseFloat(item.taxAmount?.toString() || '0'),
        total: parseFloat(item.totalAmount?.toString() || '0'),
      })),
      total_amount: parseFloat(creditNote.subtotal?.toString() || '0'),
      total_tax: parseFloat(creditNote.taxAmount?.toString() || '0'),
      currency: 'UGX',
      reason: creditNote.reason || creditNote.description,
    });

    if (!efrisData.success) {
      // Update credit note with error
      await prisma.creditNote.update({
        where: { id: creditNote.id },
        data: {
          eInvoiceStatus: 'REJECTED',
          eInvoiceResponse: efrisData as any,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: efrisData.message || 'EFRIS submission failed',
          errorCode: efrisData.error_code,
        },
        { status: 400 }
      );
    }

    // Update credit note with EFRIS data
    await prisma.creditNote.update({
      where: { id: creditNote.id },
      data: {
        efrisFDN: efrisData.fdn,
        efrisQRCode: efrisData.qr_code,
        efrisVerificationCode: efrisData.verification_code,
        eInvoiceStatus: 'ACCEPTED',
        eInvoiceSubmittedAt: new Date(),
        eInvoiceResponse: efrisData as any,
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Credit note submitted to EFRIS successfully',
      fdn: efrisData.fdn,
      verificationCode: efrisData.verification_code,
      qrCode: efrisData.qr_code,
    });
  } catch (error: any) {
    console.error('Error submitting to EFRIS:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
