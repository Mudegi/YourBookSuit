import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { journalListService } from '@/services/accounting/journal-list.service';
import { JournalEntryService } from '@/services/accounting/journal-entry.service';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    // Permission: VIEW General Ledger
    const res = await requirePermission(
      request, 
      { orgSlug: params.orgSlug }, 
      PermissionSections.GENERAL_LEDGER, 
      PermissionActions.VIEW
    );
    if (!res.ok) return res.response;
    
    const organizationId = res.organizationId;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Build filters from query parameters
    const filters: any = {};
    
    // Accounting Period
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      filters.accountingPeriod = {
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      };
    }
    
    // Other filters
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

    // Fetch journal entries using the service
    const result = await journalListService.getJournalEntries(
      organizationId,
      filters,
      { page, limit }
    );

    return NextResponse.json({
      success: true,
      entries: result.entries,
      total: result.total,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
      organizationSettings: result.organizationSettings,
      localizationMetadata: result.localizationMetadata,
    });

  } catch (error) {
    console.error('Error fetching journal entries:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch journal entries',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[orgSlug]/journal-entries
 * Create a new journal entry with full validation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requireAuth(params.orgSlug);
    const body = await request.json();

    // Validate required fields
    if (!body.journalDate) {
      return NextResponse.json(
        { success: false, error: 'Journal date is required' },
        { status: 400 }
      );
    }

    if (!body.entries || !Array.isArray(body.entries) || body.entries.length < 2) {
      return NextResponse.json(
        { success: false, error: 'At least 2 journal entry lines are required' },
        { status: 400 }
      );
    }

    // Validate all entries have required fields
    for (const entry of body.entries) {
      if (!entry.accountId || !entry.entryType || !entry.amount) {
        return NextResponse.json(
          { success: false, error: 'Each entry must have accountId, entryType, and amount' },
          { status: 400 }
        );
      }

      if (entry.amount <= 0) {
        return NextResponse.json(
          { success: false, error: 'Entry amounts must be greater than zero' },
          { status: 400 }
        );
      }
    }

    // Get organization base currency if not provided
    let currency = body.currency;
    let exchangeRate = body.exchangeRate || 1;

    if (!currency) {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { baseCurrency: true },
      });
      currency = org?.baseCurrency || 'UGX';
    }

    // Generate reference number if not provided
    let referenceNumber = body.referenceNumber;
    if (!referenceNumber) {
      referenceNumber = await JournalEntryService.generateReferenceNumber(organizationId);
    }

    // Calculate reversal date if requested
    let reversalDate = null;
    if (body.isReversal) {
      if (body.reversalDate) {
        reversalDate = new Date(body.reversalDate);
      } else {
        // Default: first day of next month
        const journalDate = new Date(body.journalDate);
        reversalDate = new Date(
          journalDate.getFullYear(),
          journalDate.getMonth() + 1,
          1
        );
      }
    }

    // Create the journal entry
    const result = await JournalEntryService.createJournalEntry({
      organizationId,
      userId,
      journalDate: new Date(body.journalDate),
      referenceNumber,
      journalType: body.journalType || 'General',
      currency,
      exchangeRate,
      description: body.description || '',
      notes: body.notes,
      isReversal: body.isReversal || false,
      reversalDate,
      entries: body.entries,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: body.isReversal
        ? 'Journal entry created with automatic reversal scheduled'
        : 'Journal entry created successfully',
    });
  } catch (error) {
    console.error('Error creating journal entry:', error);

    // Return specific error messages for validation failures
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create journal entry' },
      { status: 500 }
    );
  }
}