import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BankFeedService } from '@/services/banking/bank-feed.service';

/* ═══════════ Simple CSV Parser ═══════════ */

function parseCSVString(csv: string): Record<string, string>[] {
  const lines = csv.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

/* ═══════════ CSV / OFX Parsers ═══════════ */

function parseCSVTransactions(csv: string) {
  try {
    const records = parseCSVString(csv);
    return records.map((r: any) => ({
      transactionDate: new Date(r.date || r.transactionDate || r.Date || r.TransactionDate),
      amount: parseFloat(r.amount || r.Amount || '0'),
      description: r.description || r.memo || r.Description || r.Memo || '',
      payee: r.payee || r.name || r.Payee || r.Name || undefined,
      referenceNo: r.reference || r.refNo || r.Reference || r.RefNo || undefined,
      externalId: r.externalId || r.id || r.Id || undefined,
    }));
  } catch (err: any) {
    throw new Error(`CSV parse error: ${err.message}`);
  }
}

function parseOFXTransactions(ofx: string) {
  const txns: any[] = [];
  const blocks = ofx.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g) || [];
  for (const block of blocks) {
    try {
      const amount = parseFloat(block.match(/<TRNAMT>(.*?)[\r\n<]/)?.[1] || '0');
      const dtStr = block.match(/<DTPOSTED>(.*?)[\r\n<]/)?.[1] || '';
      const name = block.match(/<NAME>(.*?)[\r\n<]/)?.[1] || '';
      const memo = block.match(/<MEMO>(.*?)[\r\n<]/)?.[1] || '';
      const fitId = block.match(/<FITID>(.*?)[\r\n<]/)?.[1] || '';

      const y = parseInt(dtStr.substring(0, 4));
      const m = parseInt(dtStr.substring(4, 6)) - 1;
      const d = parseInt(dtStr.substring(6, 8));

      txns.push({
        transactionDate: new Date(y, m, d),
        amount,
        description: memo || name,
        payee: name || undefined,
        externalId: fitId || undefined,
      });
    } catch { /* skip malformed */ }
  }
  return txns;
}

/* ═══════════ GET — list feeds ═══════════ */

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const feeds = await BankFeedService.getFeeds(org.id);
    return NextResponse.json({ success: true, feeds });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ═══════════ POST — upload / import ═══════════ */

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const contentType = request.headers.get('content-type') || '';
    let bankAccountId: string;
    let feedName: string;
    let feedType: string;
    let parsedTxns: any[];

    if (contentType.includes('multipart/form-data')) {
      // File upload
      const formData = await request.formData();
      const file = formData.get('file') as File;
      bankAccountId = formData.get('bankAccountId') as string;
      feedName = formData.get('feedName') as string;
      feedType = (formData.get('feedType') as string) || 'CSV';

      if (!file || !bankAccountId || !feedName) {
        return NextResponse.json({ error: 'file, bankAccountId, feedName required' }, { status: 400 });
      }

      const content = await file.text();
      parsedTxns = feedType.toUpperCase() === 'OFX'
        ? parseOFXTransactions(content)
        : parseCSVTransactions(content);
    } else {
      // JSON body (for API/programmatic imports)
      const body = await request.json();
      bankAccountId = body.bankAccountId;
      feedName = body.feedName;
      feedType = body.feedType || 'API';
      parsedTxns = (body.transactions || []).map((t: any) => ({
        transactionDate: new Date(t.transactionDate),
        amount: parseFloat(t.amount),
        description: t.description || '',
        payee: t.payee,
        referenceNo: t.referenceNo,
        externalId: t.externalId,
      }));

      if (!bankAccountId || !feedName) {
        return NextResponse.json({ error: 'bankAccountId, feedName required' }, { status: 400 });
      }
    }

    if (!parsedTxns || parsedTxns.length === 0) {
      return NextResponse.json({ error: 'No transactions found in the imported data' }, { status: 400 });
    }

    const result = await BankFeedService.importFeed({
      organizationId: org.id,
      bankAccountId,
      feedName,
      feedType: feedType as any,
      transactions: parsedTxns,
      metadata: { importedAt: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      feedId: result.feed.id,
      imported: result.imported,
      skipped: result.skipped,
      total: result.total,
    }, { status: 201 });
  } catch (err: any) {
    console.error('Bank feed import error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
