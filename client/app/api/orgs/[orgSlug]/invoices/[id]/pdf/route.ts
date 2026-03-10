import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { formatCurrency } from '@/lib/utils';

/**
 * GET /api/orgs/[orgSlug]/invoices/[id]/pdf
 * Returns a print-ready HTML invoice that can be converted to PDF via the browser
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, organizationId },
      include: {
        customer: true,
        Branch: true,
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: { select: { name: true, sku: true } },
            service: { select: { name: true } },
            warehouse: { select: { name: true, code: true } },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, address: true, phone: true, email: true, logoUrl: true, baseCurrency: true },
    });

    const curr = invoice.currency || org?.baseCurrency || 'USD';
    const fmtCurrency = (amount: number | string | { toNumber?: () => number }) => {
      const num = typeof amount === 'object' && amount?.toNumber ? amount.toNumber() : Number(amount);
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr, minimumFractionDigits: 2 }).format(num);
    };

    const customerName = invoice.customer.companyName
      || `${invoice.customer.firstName || ''} ${invoice.customer.lastName || ''}`.trim()
      || 'Customer';

    const itemsHtml = invoice.items.map((item, idx) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${idx + 1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.description)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${Number(item.quantity)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtCurrency(item.unitPrice)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${Number(item.discount) > 0 ? fmtCurrency(item.discount) : '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${Number(item.taxAmount) > 0 ? fmtCurrency(item.taxAmount) : '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${fmtCurrency(item.total)}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; margin: 0; padding: 0; background: #f9fafb; }
    .invoice-container { max-width: 800px; margin: 20px auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding: 32px; border-bottom: 3px solid #1f2937; }
    .company-info h2 { margin: 0 0 4px 0; font-size: 20px; }
    .company-info p { margin: 2px 0; font-size: 12px; color: #6b7280; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { margin: 0; font-size: 28px; color: #1f2937; letter-spacing: 2px; }
    .invoice-meta { margin-top: 8px; font-size: 12px; color: #6b7280; }
    .invoice-meta strong { color: #1f2937; }
    .addresses { display: flex; justify-content: space-between; padding: 24px 32px; }
    .address-block p { margin: 2px 0; font-size: 13px; }
    .address-block .label { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .totals { display: flex; justify-content: flex-end; padding: 24px 32px; }
    .totals-table { width: 280px; }
    .totals-table .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .totals-table .total-row { border-top: 2px solid #1f2937; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 700; }
    .footer { padding: 24px 32px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
    .print-btn { position: fixed; bottom: 24px; right: 24px; padding: 12px 24px; background: #1f2937; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; z-index: 100; }
    .print-btn:hover { background: #374151; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
  <div class="invoice-container">
    <div class="header">
      <div class="company-info">
        ${org?.logoUrl ? `<img src="${escapeHtml(org.logoUrl)}" alt="Logo" style="height:48px;margin-bottom:8px;" />` : ''}
        <h2>${escapeHtml(org?.name || 'Company')}</h2>
        ${org?.address ? `<p>${escapeHtml(org.address)}</p>` : ''}
        ${org?.phone ? `<p>${escapeHtml(org.phone)}</p>` : ''}
        ${org?.email ? `<p>${escapeHtml(org.email)}</p>` : ''}
      </div>
      <div class="invoice-title">
        <h1>INVOICE</h1>
        <div class="invoice-meta">
          <p><strong>${escapeHtml(invoice.invoiceNumber)}</strong></p>
          <p>Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          <p>Due: ${new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          ${invoice.reference ? `<p>Ref: ${escapeHtml(invoice.reference)}</p>` : ''}
          <p style="margin-top:8px;padding:4px 10px;background:${invoice.status === 'PAID' ? '#dcfce7' : invoice.status === 'SENT' ? '#dbeafe' : '#f3f4f6'};border-radius:4px;display:inline-block;font-weight:600;font-size:11px;">${invoice.status}</p>
        </div>
      </div>
    </div>

    <div class="addresses">
      <div class="address-block">
        <p class="label">Bill To</p>
        <p style="font-weight:600;">${escapeHtml(customerName)}</p>
        ${invoice.customer.email ? `<p>${escapeHtml(invoice.customer.email)}</p>` : ''}
        ${invoice.customer.phone ? `<p>${escapeHtml(invoice.customer.phone)}</p>` : ''}
      </div>
      ${invoice.Branch ? `
      <div class="address-block" style="text-align:right;">
        <p class="label">Branch</p>
        <p style="font-weight:600;">${escapeHtml(invoice.Branch.name)}</p>
      </div>
      ` : ''}
    </div>

    <div style="padding:0 32px 24px;">
      <table>
        <thead>
          <tr>
            <th style="width:40px;">#</th>
            <th>Description</th>
            <th style="text-align:center;width:60px;">Qty</th>
            <th style="text-align:right;width:100px;">Rate</th>
            <th style="text-align:right;width:80px;">Discount</th>
            <th style="text-align:right;width:80px;">Tax</th>
            <th style="text-align:right;width:100px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <div class="totals">
      <div class="totals-table">
        <div class="row"><span>Subtotal</span><span>${fmtCurrency(invoice.subtotal)}</span></div>
        ${Number(invoice.discountAmount) > 0 ? `<div class="row"><span>Discount</span><span style="color:#dc2626;">-${fmtCurrency(invoice.discountAmount)}</span></div>` : ''}
        ${Number(invoice.taxAmount) > 0 ? `<div class="row"><span>Tax</span><span>${fmtCurrency(invoice.taxAmount)}</span></div>` : ''}
        <div class="row total-row"><span>Total Due</span><span>${fmtCurrency(invoice.total)}</span></div>
        <div class="row" style="font-size:11px;color:#6b7280;"><span></span><span>${curr}</span></div>
      </div>
    </div>

    ${invoice.notes ? `
    <div class="footer">
      <p style="font-weight:600;margin-bottom:4px;">Notes</p>
      <p style="white-space:pre-wrap;">${escapeHtml(invoice.notes)}</p>
    </div>
    ` : ''}

    ${invoice.terms ? `
    <div class="footer" style="border-top:none;padding-top:0;">
      <p style="font-weight:600;margin-bottom:4px;">Terms & Conditions</p>
      <p style="white-space:pre-wrap;">${escapeHtml(invoice.terms)}</p>
    </div>
    ` : ''}
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice PDF' },
      { status: 500 }
    );
  }
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
