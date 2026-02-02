// MTN MoMo (Uganda) lightweight stub
import crypto from 'crypto';

const momoApiKey = process.env.MTN_MOMO_API_KEY;
const momoApiUser = process.env.MTN_MOMO_USER;
const momoCollectionUrl = process.env.MTN_MOMO_COLLECTION_URL || 'https://sandbox.momodeveloper.mtn.com/collection';

export type MomoInitiateRequest = {
  externalId: string;
  amount: string;
  currency: string;
  payer: { partyIdType: 'MSISDN'; partyId: string };
  payerMessage?: string;
  payeeNote?: string;
};

export async function initiateMomoPayment(body: MomoInitiateRequest) {
  if (!momoApiKey || !momoApiUser) throw new Error('MTN MoMo credentials not configured');
  // Stub: in real impl, obtain access token then call /requesttopay
  return {
    status: 'PENDING',
    providerReference: `momo-${Date.now()}`,
    ...body,
  };
}

export function verifyMomoSignature(raw: string, signature?: string) {
  if (!signature) return false;
  // Placeholder: MoMo typically uses API token, not webhook HMAC; adjust per provider docs
  const secret = process.env.MTN_MOMO_WEBHOOK_SECRET;
  if (!secret) return true;
  const h = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return h === signature;
}
