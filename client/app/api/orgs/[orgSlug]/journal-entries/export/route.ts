import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { journalListService } from '@/services/accounting/journal-list.service';
import * as XLSX from 'xlsx';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    // Parse query parameters (same as the main list endpoint)
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel';
    
    // Build filters from query parameters
    const filters: any = {};
    
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      filters.accountingPeriod = {
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      };
    }
    
    const branchId = searchParams.get('branchId');
    const transactionType = searchParams.get('transactionType');
    const status = searchParams.get('status');
    const createdBy = searchParams.get('createdBy');
    const search = searchParams.get('search');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    
    if (branchId) filters.branchId = branchId;
    if (transactionType) filters.transactionType = transactionType;
    if (status) filters.status = status;
    if (createdBy) filters.createdBy = createdBy;
    if (search) filters.search = search;
    
    if (minAmount || maxAmount) {
      filters.amountRange = {
        ...(minAmount && { min: parseFloat(minAmount) }),
        ...(maxAmount && { max: parseFloat(maxAmount) }),
      };
    }

    // Fetch all journal entries (no pagination for export)
    const result = await journalListService.getJournalEntries(
      organizationId,
      filters,
      { page: 1, limit: 10000 } // Large limit for export
    );

    if (format === 'excel') {
      return await generateExcelExport(result);
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported export format' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error exporting journal entries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export journal entries' },
      { status: 500 }
    );
  }
}

async function generateExcelExport(result: any) {
  const { entries, organizationSettings } = result;
  
  // Prepare data for Excel
  const summaryData = entries.map((entry: any) => ({
    'Journal ID': entry.metadata.reference,
    'Date': new Date(entry.transactionDate).toLocaleDateString(),
    'Status': entry.status,
    'Source/Type': entry.transactionType.replace('_', ' '),
    'Description': entry.description,
    'Amount': entry.metadata.baseCurrencyEquivalent,
    'Currency': entry.metadata.baseCurrency,
    'Foreign Amount': entry.metadata.foreignAmount || '',
    'Foreign Currency': entry.metadata.foreignCurrency || '',
    'Created By': `${entry.createdBy.firstName} ${entry.createdBy.lastName}`,
    'Approved By': entry.approvedBy ? `${entry.approvedBy.firstName} ${entry.approvedBy.lastName}` : '',
    'Branch': entry.branch?.name || '',
    'Balanced': entry.metadata.isBalanced ? 'Yes' : 'No',
    'Attachments': entry.attachments.length,
    'Last Modified': new Date(entry.metadata.auditTrail.lastModified).toLocaleString(),
    'Modified By': entry.metadata.auditTrail.lastModifiedBy,
  }));

  // Prepare detailed ledger entries
  const detailData: any[] = [];
  entries.forEach((entry: any) => {
    entry.ledgerEntries.forEach((ledger: any) => {
      detailData.push({
        'Journal ID': entry.metadata.reference,
        'Date': new Date(entry.transactionDate).toLocaleDateString(),
        'Account Code': ledger.account.code,
        'Account Name': ledger.account.name,
        'Account Type': ledger.account.accountType,
        'Debit': ledger.entryType === 'DEBIT' ? ledger.amount : '',
        'Credit': ledger.entryType === 'CREDIT' ? ledger.amount : '',
        'Currency': ledger.currency,
        'Description': entry.description,
      });
    });
  });

  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Add summary sheet
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Journal Entries Summary');
  
  // Add detailed ledger entries sheet
  const detailSheet = XLSX.utils.json_to_sheet(detailData);
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Ledger Entries Detail');
  
  // Add metadata sheet
  const metadataSheet = XLSX.utils.json_to_sheet([
    { Field: 'Export Date', Value: new Date().toLocaleString() },
    { Field: 'Base Currency', Value: organizationSettings.baseCurrency },
    { Field: 'Home Country', Value: organizationSettings.homeCountry },
    { Field: 'Total Entries', Value: entries.length },
    { Field: 'Fiscal Year Start', Value: `Month ${organizationSettings.fiscalYearStart}` },
  ]);
  XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Export Info');

  // Generate Excel buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  // Return Excel file
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="journal-entries-${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  });
}