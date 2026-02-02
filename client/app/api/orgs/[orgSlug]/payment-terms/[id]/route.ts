import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { PaymentTermsService } from '@/services/payment-terms.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await requireAuth(params.orgSlug);

    const term = await PaymentTermsService.getById(params.id, user.organizationId);

    if (!term) {
      return NextResponse.json(
        { error: 'Payment term not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: term });
  } catch (error) {
    console.error('Error fetching payment term:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment term' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await requireAuth(params.orgSlug);
    const body = await request.json();

    const term = await PaymentTermsService.update(
      params.id,
      user.organizationId,
      body
    );

    return NextResponse.json({ success: true, data: term });
  } catch (error: any) {
    console.error('Error updating payment term:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update payment term' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await requireAuth(params.orgSlug);

    await PaymentTermsService.delete(params.id, user.organizationId);

    return NextResponse.json({ success: true, message: 'Payment term deleted' });
  } catch (error: any) {
    console.error('Error deleting payment term:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete payment term' },
      { status: 500 }
    );
  }
}
