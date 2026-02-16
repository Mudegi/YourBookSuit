import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { InvoiceService } from '@/services/accounts-receivable/invoice.service';
import { InvoiceAnalyticsService } from '@/lib/services/invoice/InvoiceAnalyticsService';
import { PaymentTermsService } from '@/services/payment-terms.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const customerId = searchParams.get('customerId') || undefined;
    const branchId = searchParams.get('branchId') || undefined;
    const salespersonId = searchParams.get('salespersonId') || undefined;
    const agingDays = searchParams.get('agingDays') ? parseInt(searchParams.get('agingDays')!) : undefined;
    const search = searchParams.get('search') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    // Use analytics service for filtering
    const result = await InvoiceAnalyticsService.getInvoices(
      organizationId,
      {
        status,
        customerId,
        branchId,
        salespersonId,
        agingDays,
        search,
      },
      page,
      limit
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const body = await request.json();
    const { organizationId, userId } = await requireAuth(params.orgSlug);

    // Validate required fields
    if (!body.customerId || !body.invoiceDate || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if customer exists and fetch payment term
    const customer = await prisma.customer.findFirst({
      where: {
        id: body.customerId,
        organizationId,
      },
      include: {
        paymentTerm: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Calculate due date from payment terms if not provided
    let dueDate: Date;
    if (body.dueDate) {
      dueDate = new Date(body.dueDate);
    } else {
      // Use customer's payment term, or organization's default, or fallback to NET30
      let paymentTerm = customer.paymentTerm;
      
      if (!paymentTerm) {
        // Try to get organization's default payment term
        paymentTerm = await PaymentTermsService.getDefault(organizationId);
      }
      
      if (paymentTerm) {
        dueDate = PaymentTermsService.calculateDueDate(
          new Date(body.invoiceDate),
          paymentTerm.daysUntilDue
        );
      } else {
        // Fallback to NET30 if no payment terms configured
        dueDate = PaymentTermsService.calculateDueDate(
          new Date(body.invoiceDate),
          30
        );
      }
    }

    // Fetch tax rates if taxRateId is provided to get the actual rate percentage
    // Determine which tax system to use based on organization settings
    
    // Check organization country and EFRIS status
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { 
        homeCountry: true,
        eInvoiceConfig: {
          select: {
            isActive: true,
            provider: true,
          },
        },
      },
    });

    const isUganda = organization?.homeCountry === 'UG';
    const efrisEnabled = isUganda && 
                         organization?.eInvoiceConfig?.isActive && 
                         organization?.eInvoiceConfig?.provider === 'EFRIS';
    
    const taxRatesMap = new Map<string, number>();
    const uniqueTaxRateIds = [...new Set(body.items.map((item: any) => item.taxRateId).filter(Boolean))];
    
    console.log('🔍 Tax Rate IDs found:', uniqueTaxRateIds);
    console.log('🌍 Tax System:', efrisEnabled ? 'EFRIS (TaxRate)' : 'Legacy (TaxAgencyRate)');
    
    if (uniqueTaxRateIds.length > 0) {
      if (efrisEnabled) {
        // Uganda with EFRIS - Use TaxRate table
        const rates = await prisma.taxRate.findMany({
          where: {
            id: { in: uniqueTaxRateIds },
            organizationId,
          },
          select: {
            id: true,
            rate: true,
          },
        });
        
        rates.forEach(tr => taxRatesMap.set(tr.id, Number(tr.rate)));
      } else {
        // All other cases - Use TaxAgencyRate table
        const rates = await prisma.taxAgencyRate.findMany({
          where: {
            id: { in: uniqueTaxRateIds },
            taxAgency: {
              organizationId,
            },
          },
          select: {
            id: true,
            rate: true,
          },
        });
        
        rates.forEach(tr => taxRatesMap.set(tr.id, Number(tr.rate)));
      }
      
      console.log('📊 Tax Rates fetched:', Array.from(taxRatesMap.entries()));
    }

    // Use InvoiceService to create invoice
    const mappedItems = body.items.map((item: any, index: number) => ({
      productId: item.productId,
      serviceId: item.serviceId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      discountType: item.discountType || 'AMOUNT',
      taxRate: item.taxRateId ? (taxRatesMap.get(item.taxRateId) || 0) : 0,
      // Set the appropriate foreign key based on tax system
      taxRateId: efrisEnabled ? item.taxRateId : undefined,
      taxAgencyRateId: !efrisEnabled ? item.taxRateId : undefined,
      taxLines: item.taxLines || [],
    }));
    
    console.log('🧾 Mapped items with tax:', mappedItems);
    console.log('💰 Tax Calculation Method:', body.taxCalculationMethod || 'EXCLUSIVE');
    console.log('📝 First item details:', {
      description: mappedItems[0]?.description,
      quantity: mappedItems[0]?.quantity,
      unitPrice: mappedItems[0]?.unitPrice,
      taxRate: mappedItems[0]?.taxRate,
      method: body.taxCalculationMethod || 'EXCLUSIVE',
      isInclusive: body.taxCalculationMethod === 'INCLUSIVE',
    });
    
    const result = await InvoiceService.createInvoice({
      organizationId,
      customerId: body.customerId,
      invoiceDate: new Date(body.invoiceDate),
      dueDate: dueDate,
      taxCalculationMethod: body.taxCalculationMethod || 'EXCLUSIVE',
      reference: body.reference,
      notes: body.notes,
      items: mappedItems,
      createdById: userId,
    });

    console.log('Invoice service result:', JSON.stringify({
      hasInvoice: !!result.invoice,
      invoiceId: result.invoice?.id,
      invoiceNumber: result.invoice?.invoiceNumber,
    }, null, 2));

    return NextResponse.json(result.invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
