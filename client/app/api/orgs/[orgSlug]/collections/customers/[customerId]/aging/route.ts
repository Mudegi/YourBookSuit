import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { CollectionsAgingService } from '@/services/collections-aging.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; customerId: string } }
) {
  try {
    const user = await requireAuth(params.orgSlug);
    
    const { searchParams } = new URL(request.url);
    const asOfDateParam = searchParams.get('asOfDate');
    
    const asOfDate = asOfDateParam ? new Date(asOfDateParam) : new Date();

    const result = await CollectionsAgingService.getCustomerAging(
      params.customerId,
      user.organizationId,
      asOfDate
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error generating customer aging:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate customer aging report' },
      { status: 500 }
    );
  }
}
