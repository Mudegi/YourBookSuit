import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import { initiateMomoPayment } from '@/services/payments/mtn-momo';

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await requireOrgMembership(user.id, params.orgSlug);

    const body = await req.json();
    const result = await initiateMomoPayment(body);
    return NextResponse.json({ ok: true, payment: result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to initiate payment' }, { status: 400 });
  }
}
