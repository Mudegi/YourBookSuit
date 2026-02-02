import { NextRequest, NextResponse } from 'next/server';
import { InvoiceAnalyticsService } from '@/lib/services/invoice/InvoiceAnalyticsService';
import { requirePermission } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await requirePermission(params.orgSlug, 'INVOICES.VIEW');

    const metrics = await InvoiceAnalyticsService.getMetrics(user.organizationId);

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('Error fetching invoice metrics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
