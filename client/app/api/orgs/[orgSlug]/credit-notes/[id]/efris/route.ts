import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EfrisApiService } from '@/lib/services/efris/efris-api.service';

/**
 * POST /api/orgs/[orgSlug]/credit-notes/[id]/efris
 *
 * Submit a credit note to EFRIS via the middleware's /submit-credit-note endpoint.
 *
 * Per the ERP Integration Guide:
 *   "Send only business data. The API builds the full EFRIS payload."
 *   - Send POSITIVE quantities (API negates them)
 *   - Send tax-inclusive unit_price
 *   - Don't build goodsDetails, taxDetails, summary, buyerDetails, etc.
 *   - T110 returns referenceNo, NOT an FDN (URA approval pending)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // ── 1. Load org ─────────────────────────────────────────────────────

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true, name: true, homeCountry: true },
    });

    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    if (org.homeCountry !== 'UG' && org.homeCountry !== 'UGANDA') {
      return NextResponse.json(
        { success: false, error: 'EFRIS is only available for Uganda organizations' },
        { status: 400 }
      );
    }

    // ── 2. Load EFRIS config + credit note in parallel ──────────────────

    const [efrisConfig, creditNote] = await Promise.all([
      prisma.eInvoiceConfig.findUnique({
        where: { organizationId: org.id },
      }),
      prisma.creditNote.findFirst({
        where: { id: params.id, organizationId: org.id },
        include: {
          customer: true,
          invoice: true,
          lineItems: {
            include: {
              product: true,
            },
          },
        },
      }),
    ]);

    // ── 3. Validations ──────────────────────────────────────────────────

    if (!efrisConfig || !efrisConfig.isActive) {
      return NextResponse.json({ success: false, error: 'EFRIS not configured or inactive' }, { status: 400 });
    }

    const credentials = efrisConfig.credentials as any;
    const efrisApiKey = credentials?.efrisApiKey || credentials?.apiKey;
    if (!efrisApiKey || !efrisConfig.apiEndpoint) {
      return NextResponse.json({ success: false, error: 'EFRIS API credentials not configured' }, { status: 400 });
    }

    if (!creditNote) {
      return NextResponse.json({ success: false, error: 'Credit note not found' }, { status: 404 });
    }

    if (creditNote.status !== 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'Only approved credit notes can be submitted to EFRIS' },
        { status: 400 }
      );
    }

    if (creditNote.efrisFDN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Credit note has already been submitted to EFRIS',
          fdn: creditNote.efrisFDN,
        },
        { status: 400 }
      );
    }

    if (!creditNote.invoice?.efrisFDN) {
      return NextResponse.json(
        {
          success: false,
          error: 'The original invoice must be submitted to EFRIS first. The original invoice FDN is required for credit note application.',
        },
        { status: 400 }
      );
    }

    // ── 4. Initialize EFRIS service ─────────────────────────────────────

    const efrisService = new EfrisApiService({
      apiBaseUrl: efrisConfig.apiEndpoint,
      apiKey: efrisApiKey,
      enabled: efrisConfig.isActive,
      testMode: credentials?.efrisTestMode ?? efrisConfig.testMode ?? true,
    });

    // ── 5. Build simple business payload ────────────────────────────────
    //
    // Per the Integration Guide:
    //   - Send POSITIVE quantities (API makes them negative)
    //   - unit_price = tax-inclusive price
    //   - tax_rate = number (18, 0, or -1 for exempt)
    //   - reason = text string (API auto-maps to reasonCode)
    //   - Don't send goodsDetails, taxDetails, summary, buyerDetails, etc.

    const customer = creditNote.customer;
    const customerName = customer.companyName ||
      `${customer.firstName || ''} ${customer.lastName || ''}`.trim();

    const totalAmount = parseFloat(creditNote.totalAmount?.toString() || '0');
    const totalTax = parseFloat(creditNote.taxAmount?.toString() || '0');

    const payload = {
      credit_note_number: creditNote.creditNoteNumber,
      credit_note_date: creditNote.creditDate.toISOString().split('T')[0],
      original_invoice_number: creditNote.invoice!.invoiceNumber,
      original_fdn: creditNote.invoice!.efrisFDN!,
      // Also send raw EFRIS field names in case middleware uses them directly
      oriInvoiceId: creditNote.invoice!.efrisFDN!,
      oriInvoiceNo: creditNote.invoice!.efrisFDN!,
      customer_name: customerName,
      customer_tin: customer.taxIdNumber || '',
      reason: creditNote.reason,
      currency: 'UGX',
      total_amount: totalAmount,
      total_tax: totalTax,
      items: creditNote.lineItems.map((item: any) => {
        const product = item.product;
        const qty = Math.abs(parseFloat(item.quantity?.toString() || '0'));
        const unitPrice = parseFloat(item.unitPrice?.toString() || '0');
        const taxRate = parseFloat(item.taxRate?.toString() || '0');

        return {
          item_name: item.description,
          item_code: product?.efrisItemCode || product?.sku || item.description,
          quantity: qty,                                      // POSITIVE — API negates
          unit_price: unitPrice,                              // Tax-inclusive price
          tax_rate: taxRate,                                  // 18, 0, or -1
          commodity_code: product?.goodsCategoryId || '',
        };
      }),
    };

    console.log('[EFRIS] Submitting credit note to middleware:', JSON.stringify(payload, null, 2));

    // ── 6. Submit to middleware ──────────────────────────────────────────

    const efrisResponse = await efrisService.submitCreditNoteApplication(payload);

    if (!efrisResponse.success) {
      await prisma.creditNote.update({
        where: { id: creditNote.id },
        data: {
          eInvoiceStatus: 'REJECTED',
          eInvoiceResponse: efrisResponse as any,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: efrisResponse.message || 'EFRIS credit note submission failed',
          errorCode: efrisResponse.error_code,
        },
        { status: 400 }
      );
    }

    // ── 7. Save response ────────────────────────────────────────────────
    //
    // Per the guide: T110 returns referenceNo, NOT an FDN.
    // Credit notes go through URA approval before getting their own FDN.

    const referenceNo = efrisResponse.referenceNo || efrisResponse.fdn;
    const verificationCode = efrisResponse.fiscal_data?.verification_code || efrisResponse.verification_code;
    const qrCode = efrisResponse.fiscal_data?.qr_code || efrisResponse.qr_code;

    await prisma.creditNote.update({
      where: { id: creditNote.id },
      data: {
        efrisFDN: referenceNo || null,
        efrisVerificationCode: verificationCode || null,
        efrisQRCode: qrCode || null,
        eInvoiceStatus: referenceNo ? 'ACCEPTED' : 'SUBMITTED',
        eInvoiceSubmittedAt: new Date(),
        eInvoiceResponse: efrisResponse as any,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Credit note submitted to EFRIS successfully',
      referenceNo,
      fdn: referenceNo,
      verificationCode,
      qrCode,
    });
  } catch (error: any) {
    console.error('[EFRIS] Credit note submission error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
