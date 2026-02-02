import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    
    // Get organization
    const orgResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organizations?slug=${params.orgSlug}`, {
      headers: { Authorization: `Bearer ${session.token}` }
    });
    const orgData = await orgResponse.json();
    const organization = orgData.data?.[0];
    
    if (!organization) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    // Create customer payment
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/customer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`
      },
      body: JSON.stringify({
        organizationId: organization.id,
        customerId: body.customerId,
        amount: body.amount,
        paymentDate: body.paymentDate,
        paymentMethod: body.paymentMethod,
        bankAccountId: body.bankAccountId,
        referenceNumber: body.referenceNumber,
        allocations: body.allocations
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create payment');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      payment: data.data
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create customer payment error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
