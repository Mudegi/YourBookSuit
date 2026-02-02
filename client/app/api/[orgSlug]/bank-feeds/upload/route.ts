import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { parse } from 'csv-parse/sync';

// CSV parsing utilities
function parseCSVTransactions(csvContent: string) {
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    return records.map((record: any) => ({
      transactionDate: new Date(record.date || record.transactionDate),
      amount: parseFloat(record.amount),
      description: record.description || record.memo,
      payee: record.payee || record.name,
      referenceNo: record.reference || record.refNo,
      transactionType: record.type?.toUpperCase() === 'CREDIT' ? 'CREDIT' : 'DEBIT',
      externalId: record.externalId || record.id,
      status: 'PENDING',
    }));
  } catch (error) {
    throw new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// OFX parsing stub (basic implementation)
function parseOFXTransactions(ofxContent: string) {
  const transactions = [];
  
  // Simple OFX parser - extracts STMTTRN blocks
  const stmtTrnRegex = /<STMTTRN>[\s\S]*?<\/STMTTRN>/g;
  const matches = ofxContent.match(stmtTrnRegex);

  if (!matches) return transactions;

  for (const match of matches) {
    try {
      const trnType = match.match(/<TRNTYPE>(.*?)<\/TRNTYPE>/)?.[1] || 'DEBIT';
      const dtPosted = match.match(/<DTPOSTED>(.*?)<\/DTPOSTED>/)?.[1] || '';
      const amount = match.match(/<TRNAMT>(.*?)<\/TRNAMT>/)?.[1] || '0';
      const fitId = match.match(/<FITID>(.*?)<\/FITID>/)?.[1] || '';
      const name = match.match(/<NAME>(.*?)<\/NAME>/)?.[1] || '';
      const memo = match.match(/<MEMO>(.*?)<\/MEMO>/)?.[1] || '';

      transactions.push({
        transactionDate: parseOFXDate(dtPosted),
        amount: Math.abs(parseFloat(amount)),
        description: memo || name,
        payee: name,
        transactionType: parseFloat(amount) >= 0 ? 'CREDIT' : 'DEBIT',
        externalId: fitId,
        status: 'PENDING',
      });
    } catch (e) {
      console.warn('Failed to parse OFX transaction:', e);
    }
  }

  return transactions;
}

// Convert OFX date format (YYYYMMDD or YYYYMMDDHHMMSS) to Date
function parseOFXDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  const hour = parseInt(dateStr.substring(8, 10)) || 0;
  const minute = parseInt(dateStr.substring(10, 12)) || 0;
  const second = parseInt(dateStr.substring(12, 14)) || 0;

  return new Date(year, month, day, hour, minute, second);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify org membership
    await requireOrgMembership(user.id, params.orgSlug);

    // Get org
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const bankAccountId = formData.get('bankAccountId') as string;
    const feedName = formData.get('feedName') as string;
    const feedType = (formData.get('feedType') as string) || 'CSV';

    if (!file || !bankAccountId || !feedName) {
      return NextResponse.json(
        { error: 'Missing required fields: file, bankAccountId, feedName' },
        { status: 400 }
      );
    }

    // Verify bank account belongs to org
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });
    if (!bankAccount || bankAccount.organizationId !== org.id) {
      return NextResponse.json(
        { error: 'Bank account not found or does not belong to this organization' },
        { status: 404 }
      );
    }

    // Read file content
    const fileContent = await file.text();

    // Parse transactions based on file type
    let parsedTransactions;
    if (feedType.toUpperCase() === 'CSV') {
      parsedTransactions = parseCSVTransactions(fileContent);
    } else if (feedType.toUpperCase() === 'OFX') {
      parsedTransactions = parseOFXTransactions(fileContent);
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Supported types: CSV, OFX' },
        { status: 400 }
      );
    }

    if (parsedTransactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found in file' },
        { status: 400 }
      );
    }

    // Create bank feed record
    const bankFeed = await prisma.bankFeed.create({
      data: {
        organizationId: org.id,
        bankAccountId,
        feedName,
        feedType,
        status: 'ACTIVE',
        lastSyncAt: new Date(),
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Create bank transactions
    const createdTransactions = await Promise.all(
      parsedTransactions.map((txn) =>
        prisma.bankTransaction.create({
          data: {
            organizationId: org.id,
            bankFeedId: bankFeed.id,
            ...txn,
            confidenceScore: 0, // Will be populated by matching logic
          },
        })
      )
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'CREATE',
        entityType: 'BANK_FEED_UPLOAD',
        entityId: bankFeed.id,
        changes: {
          feedName,
          feedType,
          transactionCount: parsedTransactions.length,
        },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        bankFeed,
        transactionsCreated: createdTransactions.length,
        transactions: createdTransactions,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Bank feed upload error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireOrgMembership(user.id, params.orgSlug);

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const bankFeeds = await prisma.bankFeed.findMany({
      where: { organizationId: org.id },
      include: {
        bankAccount: true,
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ bankFeeds });
  } catch (error) {
    console.error('Get bank feeds error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bank feeds' },
      { status: 500 }
    );
  }
}
