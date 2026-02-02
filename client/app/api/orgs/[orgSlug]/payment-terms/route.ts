import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { PaymentTermsService } from '@/services/payment-terms.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await requireAuth(params.orgSlug);
    
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const terms = await PaymentTermsService.getAll(user.organizationId, includeInactive);

    return NextResponse.json({ success: true, data: terms });
  } catch (error) {
    console.error('Error fetching payment terms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment terms' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await requireAuth(params.orgSlug);
    const body = await request.json();

    const term = await PaymentTermsService.create(user.organizationId, body);

    return NextResponse.json({ success: true, data: term }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating payment term:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment term' },
      { status: 500 }
    );
  }
}
