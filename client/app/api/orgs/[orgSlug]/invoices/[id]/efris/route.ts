import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { EfrisApiService, EfrisInvoiceRequest } from '@/lib/services/efris/efris-api.service';

/**
 * POST /api/orgs/[orgSlug]/invoices/[id]/efris
 * 
 * Submit an invoice to EFRIS for fiscalization
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    // Check authentication
    const { organizationId } = await requireAuth(params.orgSlug);

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

    const credentials = efrisConfig.credentials as any;
    const efrisApiKey = credentials?.efrisApiKey || credentials?.apiKey;
    
    if (!efrisApiKey || !efrisConfig.apiEndpoint) {
      return NextResponse.json(
        { error: 'EFRIS API credentials are not configured' },
        { status: 400 }
      );
    }

    // Get the invoice with all related data
    const invoice = await prisma.invoice.findUnique({
      where: {
        id: params.id,
        organizationId,
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            service: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if already submitted
    if (invoice.efrisFDN) {
      return NextResponse.json(
        { 
          error: 'Invoice has already been submitted to EFRIS',
          fdn: invoice.efrisFDN,
          qrCode: invoice.efrisQRCode,
        },
        { status: 400 }
      );
    }

    // Check invoice status
    if (invoice.status === 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot submit a draft invoice to EFRIS' },
        { status: 400 }
      );
    }

    // Initialize EFRIS service
    const efrisService = new EfrisApiService({
      apiBaseUrl: efrisConfig.apiEndpoint,
      apiKey: efrisApiKey,
      enabled: efrisConfig.isActive,
    });

    // Prepare invoice data for EFRIS
    const efrisInvoiceData: EfrisInvoiceRequest = {
      invoice_number: invoice.invoiceNumber,
      invoice_date: invoice.invoiceDate.toISOString().split('T')[0],
      customer_name: invoice.customer.companyName || 
                     `${invoice.customer.firstName || ''} ${invoice.customer.lastName || ''}`.trim(),
      customer_tin: invoice.customer.taxIdNumber || undefined,
      customer_address: typeof invoice.customer.billingAddress === 'string' 
        ? invoice.customer.billingAddress 
        : invoice.customer.billingAddress 
          ? JSON.stringify(invoice.customer.billingAddress) 
          : undefined,
      customer_email: invoice.customer.email || undefined,
      customer_phone: invoice.customer.phone || undefined,
      items: invoice.items.map(item => {
        const netAmount = parseFloat(item.netAmount?.toString() || '0');
        const quantity = parseFloat(item.quantity.toString());
        const taxAmount = parseFloat(item.taxAmount?.toString() || '0');
        const discount = parseFloat(item.discount?.toString() || '0');
        
        return {
          item_name: item.description,
          item_code: item.product?.sku || item.serviceId || undefined,
          quantity,
          unit_price: netAmount / quantity,
          total: netAmount,
          tax_rate: item.taxRate ? parseFloat(item.taxRate.toString()) / 100 : 0,
          tax_amount: taxAmount,
          discount,
        };
      }),
      total_amount: parseFloat(invoice.subtotal.toString()),
      total_tax: parseFloat(invoice.taxAmount.toString()),
      currency: invoice.currency,
      notes: invoice.notes || undefined,
    };

    // Submit to EFRIS
    const efrisResponse = await efrisService.submitInvoice(efrisInvoiceData);

    if (!efrisResponse.success) {
      // Update invoice with error
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          eInvoiceStatus: 'REJECTED',
          eInvoiceResponse: efrisResponse as any,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: efrisResponse.message || 'EFRIS submission failed',
          errorCode: efrisResponse.error_code,
        },
        { status: 400 }
      );
    }

    // Update invoice with EFRIS data
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        efrisFDN: efrisResponse.fdn,
        efrisQRCode: efrisResponse.qr_code,
        eInvoiceStatus: 'ACCEPTED',
        eInvoiceSubmittedAt: new Date(),
        eInvoiceResponse: efrisResponse as any,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice successfully submitted to EFRIS',
      fdn: efrisResponse.fdn,
      verificationCode: efrisResponse.verification_code,
      qrCode: efrisResponse.qr_code,
      fiscalizedAt: efrisResponse.fiscalized_at,
    });

  } catch (error: any) {
    console.error('EFRIS submission error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to submit invoice to EFRIS',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
