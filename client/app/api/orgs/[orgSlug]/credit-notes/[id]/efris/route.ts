import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/orgs/[orgSlug]/credit-notes/[id]/efris
 * Submit credit note to EFRIS (Uganda only)
 */
export async function POST(req: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const user = await getCurrentUser(req);
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

    // Get EFRIS settings
    const settings = await prisma.efrISSettings.findFirst({
      where: { organizationId: org.id }
    });

    if (!settings || !settings.isConfigured) {
      return NextResponse.json({ success: false, error: 'EFRIS not configured' }, { status: 400 });
    }

    // Call EFRIS API
    const efrisResponse = await fetch('http://localhost:8001/api/efris/credit-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tin: settings.tin,
        deviceNo: settings.deviceNo,
        privateKey: settings.privateKey,
        creditNote: {
          creditNoteNumber: creditNote.creditNoteNumber,
          creditDate: creditNote.creditDate,
          originalInvoiceFDN: creditNote.invoice?.efrisFDN || null,
          customer: {
            name: creditNote.customer.companyName || `${creditNote.customer.firstName} ${creditNote.customer.lastName}`,
            tin: creditNote.customer.tin,
            mobile: creditNote.customer.mobile,
            address: creditNote.customer.billingAddress
          },
          items: creditNote.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            total: item.lineTotal
          })),
          subtotal: creditNote.subtotal,
          totalTax: creditNote.totalTax,
          total: creditNote.totalAmount
        }
      })
    });

    if (!efrisResponse.ok) {
      const errorData = await efrisResponse.json();
      return NextResponse.json({ 
        success: false, 
        error: `EFRIS submission failed: ${errorData.error || 'Unknown error'}` 
      }, { status: 500 });
    }

    const efrisData = await efrisResponse.json();

    // Update credit note with EFRIS details
    const updated = await prisma.creditNote.update({
      where: { id: params.id },
      data: {
        efrisFDN: efrisData.fdn,
        efrisSubmittedAt: new Date(),
        efrisVerificationUrl: efrisData.verificationUrl
      },
      include: {
        customer: true,
        invoice: true,
        lineItems: true
      }
    });

    return NextResponse.json({ success: true, data: updated, efris: efrisData });
  } catch (error: any) {
    console.error('Error submitting to EFRIS:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
