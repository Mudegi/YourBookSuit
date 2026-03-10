import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { sendEmail } from '@/lib/notifications';

/**
 * POST /api/orgs/[orgSlug]/invoices/[id]/send
 * Sends the invoice to the customer's email with a link to the PDF view
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, organizationId },
      include: {
        customer: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const customerEmail = invoice.customer.email;
    if (!customerEmail) {
      return NextResponse.json(
        { error: 'Customer does not have an email address' },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, slug: true },
    });

    const orgName = org?.name || 'Our Company';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const pdfUrl = `${baseUrl}/api/orgs/${params.orgSlug}/invoices/${params.id}/pdf`;

    const customerName = invoice.customer.companyName
      || `${invoice.customer.firstName || ''} ${invoice.customer.lastName || ''}`.trim()
      || 'Customer';

    const curr = invoice.currency || 'USD';
    const totalFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 2,
    }).format(Number(invoice.total));

    const subject = `Invoice ${invoice.invoiceNumber} from ${orgName}`;
    const body = [
      `Dear ${customerName},`,
      '',
      `Please find your invoice ${invoice.invoiceNumber} from ${orgName}.`,
      '',
      `Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      `Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      `Amount Due: ${totalFormatted}`,
      '',
      `View your invoice here: ${pdfUrl}`,
      '',
      `Thank you for your business.`,
      '',
      `Best regards,`,
      orgName,
    ].join('\n');

    await sendEmail(customerEmail, subject, body);

    // Update invoice status to SENT if currently DRAFT
    if (invoice.status === 'DRAFT') {
      await prisma.invoice.update({
        where: { id: params.id },
        data: { status: 'SENT' },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Invoice sent to ${customerEmail}`,
    });
  } catch (error) {
    console.error('Error sending invoice:', error);
    return NextResponse.json(
      { error: 'Failed to send invoice' },
      { status: 500 }
    );
  }
}
