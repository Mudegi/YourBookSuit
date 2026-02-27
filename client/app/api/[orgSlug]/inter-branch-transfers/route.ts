import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { InterBranchTransferService } from '@/lib/inter-branch-transfer.service';

// GET /api/[orgSlug]/inter-branch-transfers
export async function GET(
  req: NextRequest,
  { params }: { params: { orgSlug: string } },
) {
  try {
    const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const branchId = req.nextUrl.searchParams.get('branchId') ?? undefined;
    const transfers = await InterBranchTransferService.list(org.id, branchId);
    return NextResponse.json(transfers);
  } catch (error: any) {
    console.error('GET IBTs error:', error);
    return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/inter-branch-transfers
export async function POST(
  req: NextRequest,
  { params }: { params: { orgSlug: string } },
) {
  try {
    const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const body = await req.json();
    const transfer = await InterBranchTransferService.create({
      organizationId: org.id,
      fromBranchId: body.fromBranchId,
      toBranchId: body.toBranchId,
      notes: body.notes,
      requestedById: body.requestedById,
      clearingAccountId: body.clearingAccountId,
      items: body.items ?? [],
    });
    return NextResponse.json(transfer, { status: 201 });
  } catch (error: any) {
    console.error('POST IBT error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create transfer' }, { status: 500 });
  }
}
