import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BankFeedService } from '@/services/banking/bank-feed.service';

/**
 * PUT    /api/orgs/[orgSlug]/banking/bank-feeds/rules/[id] — update a rule
 * DELETE /api/orgs/[orgSlug]/banking/bank-feeds/rules/[id] — delete a rule
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const body = await request.json();
    const rule = await BankFeedService.updateRule(params.id, org.id, body);
    return NextResponse.json({ success: true, rule });
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    await BankFeedService.deleteRule(params.id, org.id);
    return NextResponse.json({ success: true, message: 'Rule deleted' });
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
