import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { CollectionsAgingService } from '@/services/collections-aging.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await requireAuth(params.orgSlug);
    
    const { searchParams } = new URL(request.url);
    const asOfDateParam = searchParams.get('asOfDate');
    const currency = searchParams.get('currency') || undefined;
    
    const asOfDate = asOfDateParam ? new Date(asOfDateParam) : new Date();

    const result = await CollectionsAgingService.getAgedReceivables(
      user.organizationId,
      asOfDate,
      currency
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error generating aged receivables:', error);
    return NextResponse.json(
      { error: 'Failed to generate aged receivables report' },
      { status: 500 }
    );
  }
}
