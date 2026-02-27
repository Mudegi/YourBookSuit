import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BankFeedService } from '@/services/banking/bank-feed.service';

/**
 * GET  /api/orgs/[orgSlug]/banking/bank-feeds/rules — list all rules
 * POST /api/orgs/[orgSlug]/banking/bank-feeds/rules — create a new rule
 */

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

    const sp = new URL(request.url).searchParams;
    const includeInactive = sp.get('includeInactive') === 'true';

    const rules = await BankFeedService.getRules(org.id, includeInactive);
    return NextResponse.json({ success: true, rules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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

    const body = await request.json();

    if (!body.ruleName || !body.conditionValue) {
      return NextResponse.json({ error: 'ruleName and conditionValue are required' }, { status: 400 });
    }

    const rule = await BankFeedService.createRule({
      organizationId: org.id,
      ruleName: body.ruleName,
      description: body.description,
      priority: body.priority,
      conditionField: body.conditionField || 'description',
      conditionOperator: body.conditionOperator || 'contains',
      conditionValue: body.conditionValue,
      categoryAccountId: body.categoryAccountId,
      taxRateId: body.taxRateId,
      payee: body.payee,
    });

    return NextResponse.json({ success: true, rule }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
