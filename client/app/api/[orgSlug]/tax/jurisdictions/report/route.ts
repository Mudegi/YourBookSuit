/**
 * API: Tax Summary Report by Jurisdiction
 * GET /api/[orgSlug]/tax/jurisdictions/report - Generate tax summary report
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { TaxService } from '@/lib/tax/tax-service';
import { hasPermission, Permission } from '@/lib/permissions';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(payload.role, Permission.VIEW_TAX_REPORTS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const report = await TaxService.generateTaxSummaryReport(
      organization.id,
      new Date(startDate),
      new Date(endDate)
    );

    // Convert to CSV format
    const csvHeaders = [
      'Jurisdiction Name',
      'Jurisdiction Code',
      'Country',
      'Country Code',
      'Tax Authority',
      'Total Tax Collected',
      'Total Transactions',
      'Average Tax Rate'
    ];

    const csvRows = report.map((item: any) => [
      item.jurisdictionName,
      item.jurisdictionCode,
      item.country,
      item.countryCode,
      item.taxAuthority,
      item.totalTaxCollected,
      item.totalTransactions,
      item.averageTaxRate
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="tax-summary-report-${startDate}-to-${endDate}.csv"`
      }
    });
  } catch (error: any) {
    console.error('Error generating tax summary report:', error);
    return NextResponse.json(
      { error: 'Failed to generate tax summary report', details: error.message },
      { status: 500 }
    );
  }
}