import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BankingService } from '@/services/banking/banking.service';

/**
 * POST /api/orgs/[orgSlug]/banking/transfers
 * Transfer funds between bank accounts
 */
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

    // Basic validation
    if (!body.fromBankAccountId) return NextResponse.json({ error: 'Source account is required' }, { status: 400 });
    if (!body.toBankAccountId) return NextResponse.json({ error: 'Destination account is required' }, { status: 400 });
    if (!body.amount || parseFloat(body.amount) <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });

    const result = await BankingService.transferFunds({
      organizationId: org.id,
      fromBankAccountId: body.fromBankAccountId,
      toBankAccountId: body.toBankAccountId,
      amount: parseFloat(body.amount),
      transferDate: body.transferDate ? new Date(body.transferDate) : new Date(),
      reference: body.reference || undefined,
      notes: body.notes || undefined,
      createdBy: body.createdBy || 'system',
    });

    return NextResponse.json({ ...result }, { status: 201 });
  } catch (error: any) {
    console.error('Banking transfer error:', error.message);
    const status = error.message?.includes('Insufficient') ? 400
      : error.message?.includes('not found') ? 404
      : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
