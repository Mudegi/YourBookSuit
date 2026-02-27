import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { InterBranchTransferService } from '@/lib/inter-branch-transfer.service';

// GET /api/[orgSlug]/inter-branch-transfers/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } },
) {
  try {
    const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const transfer = await InterBranchTransferService.findById(params.id, org.id);
    return NextResponse.json(transfer);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Not found' }, { status: 404 });
  }
}

/**
 * PATCH /api/[orgSlug]/inter-branch-transfers/[id]
 * Body: { action: 'submit' | 'approve' | 'ship' | 'receive' | 'cancel', approvedById?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } },
) {
  try {
    const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const body = await req.json();
    const { action, approvedById } = body as { action: string; approvedById?: string };

    let result;
    switch (action) {
      case 'submit':
        result = await InterBranchTransferService.submit(params.id, org.id);
        break;
      case 'approve':
        result = await InterBranchTransferService.approve(params.id, org.id, approvedById ?? '');
        break;
      case 'ship':
        result = await InterBranchTransferService.ship(params.id, org.id);
        break;
      case 'receive':
        result = await InterBranchTransferService.receive(params.id, org.id);
        break;
      case 'cancel':
        result = await InterBranchTransferService.cancel(params.id, org.id);
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('PATCH IBT error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update transfer' }, { status: 500 });
  }
}
