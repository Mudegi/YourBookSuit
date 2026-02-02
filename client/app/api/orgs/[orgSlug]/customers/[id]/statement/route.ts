import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { CustomerStatementService } from '@/services/customer-statement.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);
    
    const { searchParams } = new URL(request.url);
    const fromDateStr = searchParams.get('fromDate');
    const toDateStr = searchParams.get('toDate');
    const format = searchParams.get('format') || 'html'; // html or json

    if (!fromDateStr || !toDateStr) {
      return NextResponse.json(
        { error: 'fromDate and toDate are required' },
        { status: 400 }
      );
    }

    const fromDate = new Date(fromDateStr);
    const toDate = new Date(toDateStr);

    // Generate statement data
    const statementData = await CustomerStatementService.generateStatement(
      params.id,
      organizationId,
      fromDate,
      toDate
    );

    // Return JSON if requested
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: statementData,
      });
    }

    // Generate HTML for print/PDF
    const html = generateStatementHTML(statementData);

    // Return HTML that can be printed to PDF
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error generating statement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate statement' },
      { status: 500 }
    );
  }
}

/**
 * Generate print-friendly HTML for statement (can be printed to PDF from browser)
 */
function generateStatementHTML(data: any): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.statement.currency,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Customer Statement - ${data.customer.name}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
      @page { margin: 1cm; }
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.4;
      color: #1f2937;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    
    .company-info h1 {
      font-size: 24px;
      margin: 0 0 8px 0;
      color: #111827;
    }
    
    .company-info p {
      margin: 2px 0;
      font-size: 12px;
      color: #6b7280;
    }
    
    .customer-info {
      text-align: right;
    }
    
    .customer-info h3 {
      font-size: 14px;
      margin: 0 0 8px 0;
      color: #374151;
    }
    
    .customer-info p {
      margin: 2px 0;
      font-size: 12px;
      color: #6b7280;
    }
    
    .statement-title {
      text-align: center;
      font-size: 28px;
      font-weight: bold;
      margin: 30px 0 10px 0;
      color: #111827;
    }
    
    .statement-period {
      text-align: center;
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 30px;
    }
    
    .summary-box {
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 30px 0;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
    }
    
    .summary-item label {
      display: block;
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 4px;
      font-weight: 600;
    }
    
    .summary-item value {
      display: block;
      font-size: 16px;
      font-weight: 600;
      color: #111827;
    }
    
    .summary-item.amount-due {
      grid-column: 3;
      background: #fef3c7;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
    }
    
    .summary-item.amount-due value {
      font-size: 24px;
      color: #92400e;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 12px;
    }
    
    thead {
      background: #f9fafb;
    }
    
    th {
      text-align: left;
      padding: 12px 8px;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
      font-size: 11px;
      text-transform: uppercase;
    }
    
    th.right, td.right {
      text-align: right;
    }
    
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #f3f4f6;
    }
    
    tr.opening-balance {
      background: #f9fafb;
      font-weight: 600;
    }
    
    tr:hover {
      background: #f9fafb;
    }
    
    .balance-col {
      font-weight: 600;
      color: #111827;
    }
    
    .aging-summary {
      margin-top: 40px;
      page-break-inside: avoid;
    }
    
    .aging-summary h2 {
      font-size: 18px;
      margin: 0 0 15px 0;
      color: #111827;
    }
    
    .aging-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
    }
    
    .aging-bucket {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 15px;
      text-align: center;
    }
    
    .aging-bucket label {
      display: block;
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 6px;
      font-weight: 600;
    }
    
    .aging-bucket value {
      display: block;
      font-size: 16px;
      font-weight: 600;
      color: #111827;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 11px;
      color: #6b7280;
    }
    
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    
    .print-button:hover {
      background: #1d4ed8;
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">Print / Save as PDF</button>
  
  <div class="header">
    <div class="company-info">
      <h1>${data.organization.name}</h1>
      ${data.organization.legalName && data.organization.legalName !== data.organization.name 
        ? `<p>${data.organization.legalName}</p>` : ''}
      ${data.organization.address ? `<p>${data.organization.address}</p>` : ''}
      ${data.organization.phone ? `<p>Phone: ${data.organization.phone}</p>` : ''}
      ${data.organization.email ? `<p>Email: ${data.organization.email}</p>` : ''}
    </div>
    
    <div class="customer-info">
      <h3>Bill To:</h3>
      <p style="font-size: 14px; font-weight: 600; color: #111827;">${data.customer.name}</p>
      ${data.customer.accountNumber ? `<p>Account: ${data.customer.accountNumber}</p>` : ''}
      ${data.customer.billingAddress ? `<p>${data.customer.billingAddress}</p>` : ''}
      ${data.customer.phone ? `<p>Phone: ${data.customer.phone}</p>` : ''}
      ${data.customer.email ? `<p>Email: ${data.customer.email}</p>` : ''}
    </div>
  </div>
  
  <div class="statement-title">CUSTOMER STATEMENT</div>
  <div class="statement-period">
    Statement Period: ${formatDate(data.statement.fromDate)} to ${formatDate(data.statement.toDate)}
  </div>
  
  <div class="summary-box">
    <div class="summary-item">
      <label>Opening Balance</label>
      <value>${formatCurrency(data.statement.openingBalance)}</value>
    </div>
    <div class="summary-item">
      <label>Total Invoiced</label>
      <value>${formatCurrency(data.statement.totalInvoiced)}</value>
    </div>
    <div class="summary-item">
      <label>Total Paid</label>
      <value>${formatCurrency(data.statement.totalPaid)}</value>
    </div>
    <div class="summary-item amount-due">
      <label>Amount Due</label>
      <value>${formatCurrency(data.statement.closingBalance)}</value>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th style="width: 12%;">Date</th>
        <th style="width: 15%;">Reference</th>
        <th style="width: 30%;">Description</th>
        <th class="right" style="width: 13%;">Debit</th>
        <th class="right" style="width: 13%;">Credit</th>
        <th class="right" style="width: 17%;">Balance</th>
      </tr>
    </thead>
    <tbody>
      ${data.transactions.map((trans: any) => `
        <tr ${trans.type === 'OPENING_BALANCE' ? 'class="opening-balance"' : ''}>
          <td>${formatDate(trans.date)}</td>
          <td>${trans.reference}</td>
          <td>${trans.description}</td>
          <td class="right">${trans.debit > 0 ? formatCurrency(trans.debit) : ''}</td>
          <td class="right">${trans.credit > 0 ? formatCurrency(trans.credit) : ''}</td>
          <td class="right balance-col">${formatCurrency(trans.balance)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="aging-summary">
    <h2>Aging Summary</h2>
    <div class="aging-grid">
      <div class="aging-bucket">
        <label>Current</label>
        <value>${formatCurrency(data.aging.current)}</value>
      </div>
      <div class="aging-bucket">
        <label>1-30 Days</label>
        <value>${formatCurrency(data.aging.days1to30)}</value>
      </div>
      <div class="aging-bucket">
        <label>31-60 Days</label>
        <value>${formatCurrency(data.aging.days31to60)}</value>
      </div>
      <div class="aging-bucket">
        <label>61-90 Days</label>
        <value>${formatCurrency(data.aging.days61to90)}</value>
      </div>
      <div class="aging-bucket">
        <label>90+ Days</label>
        <value>${formatCurrency(data.aging.days90plus)}</value>
      </div>
    </div>
  </div>
  
  <div class="footer">
    <p>Please remit payment to the address above. For questions about this statement, please contact us.</p>
    <p style="margin-top: 10px;">This statement is generated as of ${formatDate(data.statement.toDate)}</p>
  </div>
</body>
</html>
  `.trim();
}
