import { NextRequest, NextResponse } from 'next/server';
import { IntelligentInvoiceService } from '@/lib/services/invoice/IntelligentInvoiceService';
import { requirePermission } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    // Check permissions
    const user = await requirePermission(params.orgSlug, 'INVOICES.CREATE');
    
    const body = await request.json();
    const { customerId, invoiceDate, dueDate, currency, items } = body;

    // Create service instance
    const invoiceService = new IntelligentInvoiceService();

    // Validate invoice
    const validation = await invoiceService.validateInvoice({
      organizationId: user.organizationId,
      customerId,
      invoiceDate: new Date(invoiceDate),
      dueDate: new Date(dueDate),
      currency,
      items: items.map((item: any) => ({
        productId: item.productId,
        serviceId: item.serviceId,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: item.unitPrice ? parseFloat(item.unitPrice) : undefined,
        discount: item.discount ? parseFloat(item.discount) : undefined,
        discountPercent: item.discountPercent ? parseFloat(item.discountPercent) : undefined,
        taxExempt: item.taxExempt || false,
        taxExemptReason: item.taxExemptReason,
      })),
    });

    return NextResponse.json(validation);
  } catch (error: any) {
    console.error('Invoice validation error:', error);
    return NextResponse.json(
      { error: error.message || 'Validation failed' },
      { status: 500 }
    );
  }
}
