import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { journalListService } from '@/services/accounting/journal-list.service';
import { JournalEntryService } from '@/services/accounting/journal-entry.service';
import prisma from '@/lib/prisma';

/**
 * GET /api/orgs/[orgSlug]/journal-entries
 * List journal entries with filtering, pagination, and enhanced metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build filters
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

    const result = await journalListService.getJournalEntries(
      organizationId,
      filters,
      { page, limit }
    );

    // Convert Decimal fields to numbers
    const entries = result.entries.map((entry: any) => ({
      ...entry,
      taxAmount: entry.taxAmount ? Number(entry.taxAmount) : null,
      ledgerEntries: entry.ledgerEntries.map((le: any) => ({
        ...le,
        amount: typeof le.amount === 'object' ? Number(le.amount) : le.amount,
        amountInBase: typeof le.amountInBase === 'object' ? Number(le.amountInBase) : le.amountInBase,
        exchangeRate: typeof le.exchangeRate === 'object' ? Number(le.exchangeRate) : le.exchangeRate,
      })),
    }));

    return NextResponse.json({
      success: true,
      entries,
      total: result.total,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
      organizationSettings: result.organizationSettings,
    });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch journal entries' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[orgSlug]/journal-entries
 * Create a new journal entry. Supports status: DRAFT or POSTED
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requireAuth(params.orgSlug);
    const body = await request.json();

    if (!body.journalDate) {
      return NextResponse.json({ success: false, error: 'Journal date is required' }, { status: 400 });
    }
    if (!body.description?.trim()) {
      return NextResponse.json({ success: false, error: 'Description is required' }, { status: 400 });
    }
    if (!body.entries || !Array.isArray(body.entries) || body.entries.length < 2) {
      return NextResponse.json({ success: false, error: 'At least 2 journal entry lines are required' }, { status: 400 });
    }

    for (const entry of body.entries) {
      if (!entry.accountId || !entry.entryType || !entry.amount) {
        return NextResponse.json({ success: false, error: 'Each line must have accountId, entryType, and amount' }, { status: 400 });
      }
      if (entry.amount <= 0) {
        return NextResponse.json({ success: false, error: 'All amounts must be greater than zero' }, { status: 400 });
      }
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { baseCurrency: true },
    });
    const currency = body.currency || org?.baseCurrency || 'UGX';
    const exchangeRate = body.exchangeRate || 1;

    const referenceNumber = body.referenceNumber || await JournalEntryService.generateReferenceNumber(organizationId);
    const requestedStatus = body.status || 'POSTED';

    // ── DRAFT: save without balance validation or COA balance updates ──
    if (requestedStatus === 'DRAFT') {
      const transactionNumber = await generateDraftNumber(organizationId);

      const transaction = await prisma.transaction.create({
        data: {
          organizationId,
          transactionNumber,
          transactionDate: new Date(body.journalDate),
          transactionType: 'JOURNAL_ENTRY',
          description: `[${body.journalType || 'General'}] ${body.description}`,
          notes: body.notes,
          referenceType: 'JOURNAL_ENTRY',
          referenceId: referenceNumber,
          status: 'DRAFT',
          branchId: body.branchId || null,
          createdById: userId,
          metadata: {
            journalType: body.journalType || 'General',
            reference: referenceNumber,
            currency,
            exchangeRate,
            isReversal: body.isReversal || false,
            reversalDate: body.isReversal ? body.reversalDate : null,
          },
          ledgerEntries: {
            create: body.entries.map((e: any) => ({
              accountId: e.accountId,
              entryType: e.entryType,
              amount: e.amount,
              currency,
              exchangeRate,
              amountInBase: e.amount * exchangeRate,
              description: e.description || body.description,
            })),
          },
        },
        include: {
          ledgerEntries: { include: { account: { select: { id: true, code: true, name: true, accountType: true } } } },
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          ...transaction,
          ledgerEntries: transaction.ledgerEntries.map((le: any) => ({
            ...le,
            amount: Number(le.amount),
            amountInBase: Number(le.amountInBase),
            exchangeRate: Number(le.exchangeRate),
          })),
        },
        message: 'Journal entry saved as draft',
      });
    }

    // ── POSTED: full validation + COA balance update via DoubleEntryService ──
    let reversalDate = null;
    if (body.isReversal) {
      reversalDate = body.reversalDate
        ? new Date(body.reversalDate)
        : new Date(new Date(body.journalDate).getFullYear(), new Date(body.journalDate).getMonth() + 1, 1);
    }

    const result = await JournalEntryService.createJournalEntry({
      organizationId,
      userId,
      journalDate: new Date(body.journalDate),
      referenceNumber,
      journalType: body.journalType || 'General',
      currency,
      exchangeRate,
      description: body.description,
      notes: body.notes,
      isReversal: body.isReversal || false,
      reversalDate,
      entries: body.entries,
    });

    if (body.branchId) {
      await prisma.transaction.update({
        where: { id: result.id },
        data: { branchId: body.branchId },
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: body.isReversal ? 'Journal entry posted with automatic reversal scheduled' : 'Journal entry posted successfully',
    });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    if (error instanceof Error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to create journal entry' }, { status: 500 });
  }
}

async function generateDraftNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const prefix = `JE-${year}-${month}`;

  const lastEntry = await prisma.transaction.findFirst({
    where: { organizationId, transactionType: 'JOURNAL_ENTRY', transactionNumber: { startsWith: prefix } },
    orderBy: { transactionNumber: 'desc' },
  });

  let seq = 1;
  if (lastEntry) {
    const parts = lastEntry.transactionNumber.split('-');
    seq = parseInt(parts[parts.length - 1]) + 1;
  }
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}
