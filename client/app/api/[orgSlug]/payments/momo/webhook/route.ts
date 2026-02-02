import { NextResponse } from 'next/server';
import { verifyMomoSignature } from '@/services/payments/mtn-momo';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const raw = await req.text();
  const signature = req.headers.get('x-momo-signature') || undefined;
  const valid = verifyMomoSignature(raw, signature);
  if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  let json: any = {};
  try {
    json = JSON.parse(raw);
  } catch {
    // keep empty
  }

  const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  const reference = json?.referenceId || json?.reference || json?.financialTransactionId || json?.externalId || null;
  const status = json?.status || json?.currentState || 'RECEIVED';

  let paymentId: string | null = null;
  if (reference) {
    const payment = await prisma.payment.findFirst({
      where: {
        organizationId: org.id,
        OR: [
          { paymentNumber: reference },
          { referenceNumber: reference },
        ],
      },
    });
    if (payment) paymentId = payment.id;
  }

  await prisma.paymentEvent.create({
    data: {
      organizationId: org.id,
      provider: 'MTN_MOMO',
      eventType: json?.event ?? json?.type ?? null,
      status,
      reference: reference ?? null,
      externalId: json?.externalId ?? null,
      payload: json,
      rawPayload: raw,
      paymentId,
    },
  });

  return NextResponse.json({ ok: true });
}
