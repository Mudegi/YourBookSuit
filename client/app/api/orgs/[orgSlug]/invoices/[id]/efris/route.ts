import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { EfrisApiService } from '@/lib/services/efris/efris-api.service';

/**
 * POST /api/orgs/[orgSlug]/invoices/[id]/efris
 * 
 * Submit an invoice to EFRIS for fiscalization with complete T109 tax mapping
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    // Check authentication
    const { organizationId } = await requireAuth(params.orgSlug);

    // Get EFRIS configuration
    const efrisConfig = await prisma.eInvoiceConfig.findUnique({
      where: { organizationId },
    });

    if (!efrisConfig || !efrisConfig.isActive) {
      return NextResponse.json(
        { error: 'EFRIS integration is not configured or not active' },
        { status: 400 }
      );
    }

    if (efrisConfig.provider !== 'EFRIS') {
      return NextResponse.json(
        { error: 'E-invoice provider is not EFRIS' },
        { status: 400 }
      );
    }

    const credentials = efrisConfig.credentials as any;
    const efrisApiKey = credentials?.efrisApiKey || credentials?.apiKey;
    
    if (!efrisApiKey || !efrisConfig.apiEndpoint) {
      return NextResponse.json(
        { error: 'EFRIS API credentials are not configured' },
        { status: 400 }
      );
    }

    // Get the invoice with all related data including tax rates
    const invoice = await prisma.invoice.findUnique({
      where: {
        id: params.id,
        organizationId,
      },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              include: {
                unitOfMeasure: true,
              },
            },
            service: true,
            taxRateConfig: true, // Include tax rate configuration
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if already submitted
    if (invoice.efrisFDN) {
      return NextResponse.json(
        { 
          error: 'Invoice has already been submitted to EFRIS',
          fdn: invoice.efrisFDN,
          qrCode: invoice.efrisQRCode,
        },
        { status: 400 }
      );
    }

    // Check invoice status
    if (invoice.status === 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot submit a draft invoice to EFRIS' },
        { status: 400 }
      );
    }

    // Validate that invoice items use EFRIS-enabled tax rates (TaxRate, not TaxAgencyRate)
    // This should not happen if organization is properly configured, but check anyway
    const itemsWithoutEfrisConfig = invoice.items.filter(item => 
      !item.taxRateConfig && item.taxAmount > 0
    );
    
    if (itemsWithoutEfrisConfig.length > 0) {
      return NextResponse.json(
        { 
          error: 'This invoice cannot be submitted to EFRIS because some items are missing EFRIS tax configuration.',
          details: 'Please ensure your organization uses EFRIS-enabled tax rates (Settings → Taxes → Tax Rates).',
          itemsAffected: itemsWithoutEfrisConfig.map(i => i.description),
        },
        { status: 400 }
      );
    }

    // Initialize EFRIS service
    const efrisService = new EfrisApiService({
      apiBaseUrl: efrisConfig.apiEndpoint,
      apiKey: efrisApiKey,
      enabled: efrisConfig.isActive,
      testMode: credentials?.efrisTestMode ?? efrisConfig.testMode ?? true,
    });

    // Pre-compute excise data for each invoice item from Product model (DB-registered EFRIS data)
    // This makes excise amounts accessible in items, tax_details, and summary sections
    const itemExciseData = invoice.items.map((item) => {
      const exciseDutyCode = item.product?.exciseDutyCode;
      if (!exciseDutyCode) {
        return { hasExcise: false, exciseTax: 0, exciseRate: 0, exciseRule: '1', exciseDutyCode: '', exciseUnit: '' };
      }

      const quantity = parseFloat(item.quantity.toString());
      const netAmount = parseFloat(item.netAmount?.toString() || '0');
      const exciseRate = parseFloat(item.product?.exciseRate?.toString() || '0');
      const exciseRule = item.product?.exciseRule || '1';
      const exciseUnit = item.product?.exciseUnit || '102';

      let exciseTax = 0;
      if (exciseRule === '1') {
        // Percentage-based excise
        exciseTax = netAmount * exciseRate;
      } else if (exciseRule === '2') {
        // Quantity-based excise
        const pack = parseFloat(item.product?.pack?.toString() || '1');
        const stick = parseFloat(item.product?.stick?.toString() || '1');
        exciseTax = quantity * exciseRate * pack * stick;
      }

      return { hasExcise: true, exciseTax, exciseRate, exciseRule, exciseDutyCode, exciseUnit };
    });

    // Build complete EFRIS invoice payload (T109 format)
    const efrisInvoiceData = {
      invoice_number: invoice.invoiceNumber,
      invoice_date: invoice.invoiceDate.toISOString().split('T')[0],
      customer_name: invoice.customer.companyName || 
                     `${invoice.customer.firstName || ''} ${invoice.customer.lastName || ''}`.trim(),
      customer_tin: invoice.customer.taxIdNumber || undefined,
      customer_address: typeof invoice.customer.billingAddress === 'string' 
        ? invoice.customer.billingAddress 
        : invoice.customer.billingAddress 
          ? JSON.stringify(invoice.customer.billingAddress) 
          : undefined,
      customer_email: invoice.customer.email || undefined,
      customer_phone: invoice.customer.phone || undefined,
      buyer_type: invoice.customer.taxIdNumber ? "0" : "1", // 0=Business (has TIN), 1=Individual
      payment_method: "102", // Default to Credit - could be made dynamic later
      currency: invoice.currency,
      
      items: invoice.items.map((item, index) => {
        const quantity = parseFloat(item.quantity.toString());
        const netAmount = parseFloat(item.netAmount?.toString() || '0');
        const taxAmount = parseFloat(item.taxAmount?.toString() || '0');
        const discount = parseFloat(item.discount?.toString() || '0');

        // Use registered EFRIS item code if available, otherwise derive it the same way as during registration
        let itemCode: string;
        if (item.product?.efrisItemCode) {
          // Use the item code that was registered with EFRIS
          itemCode = item.product.efrisItemCode;
        } else if (item.product) {
          // Fallback: derive it the same way as during registration
          itemCode = (item.product.description && item.product.description.trim())
            ? item.product.description.trim()
            : item.product.name;
        } else {
          // Service or fallback
          itemCode = item.description;
        }

        // Get unit of measure code - use EFRIS mapping logic (complete version from product registration)
        const mapToEfrisUnitCode = (unitCode?: string, unitAbbr?: string, unitName?: string): string => {
          const input = (unitCode || unitAbbr || unitName || '').toLowerCase().trim();
          
          console.log('[EFRIS] Unit Mapping - Input:', { unitCode, unitAbbr, unitName, input });
          
          // EFRIS unit code mapping - maps our system codes to EFRIS 3-digit codes
          // Most EFRIS codes are passed through as-is, but common aliases are mapped
          const efrisUnitMap: { [key: string]: string } = {
            // === EFRIS T115 rateUnit Codes (per EFRIS documentation) ===
            
            // EFRIS 101: per stick (countable units - cigarettes, sticks, etc.)
            'stick': '101', 'sticks': '101',
            
            // EFRIS 102: per litre (liquids/beverages) ← FIXED: was incorrectly '104'!
            'l': '102', 'ltr':  '102', 'ltr2': '102', 'litre': '102', 'litres': '102', 
            'liter': '102', 'liters': '102',
            
            // EFRIS 103: per kg (weight)
            'kg': '103', 'kgs': '103', 'kilogram': '103', 'kilograms': '103', 'kgm': '103',
            'kgm2': '103', 'gram': '103', 'grams': '103', 'grm': '103', 'g': '103',
            
            // EFRIS 104: per user per day of access (telecom/OTT services)
            'user': '104', 'users': '104', 'access': '104', 'ott': '104',
            
            // EFRIS 105: per minute (time-based services)
            'min': '105', 'minute': '105', 'minutes': '105',
            
            // EFRIS 106: per 1,000 sticks (bulk cigarettes)
            'th': '106', 'thousand': '106', 'thousands': '106', '1000sticks': '106',
            '1000stick': '106', 'thousand_sticks': '106',
            
            // EFRIS 107: per 50kgs (bulk weight)
            '50kg': '107', '50kgs': '107', 'fifty_kg': '107',
            
            // EFRIS 108: undefined/reserved (-)
            
            // EFRIS 109: per 1 g (small weight measurements)
            '1g': '109', '1gram': '109', 'gram_unit': '109',
            
            // === General Units (map to closest EFRIS code) ===
            
            // Pieces/Units - map to stick (101) as closest countable unit
            'pcs': '101', 'pc': '101', 'piece': '101', 'pieces': '101', 'pce': '101',
            'unit': '101', 'units': '101', 'ea': '101', 'each': '101', 'pp': '101',
            'item': '101', 'items': '101',
            'pr': '101', 'pair': '101', 'pairs': '101',  // Pair → Stick (countable)
            
            // Packaging/Container units - map to stick (101) as countable
            'box': '101', 'boxes': '101', 'bx': '101',
            'bag': '101', 'bags': '101', 'bg': '101',
            'sack': '101', 'sacks': '101', 'sa': '101',
            'carton': '101', 'cartons': '101', 'ct': '101',
            'crate': '101', 'crates': '101', 'cr': '101',
            'case': '101', 'cases': '101', 'cs': '101',
            'pack': '101', 'packs': '101', 'pk': '101',
            'packet': '101', 'packets': '101', 'pa': '101',
            'bundle': '101', 'bundles': '101', 'be': '101',
            'roll': '101', 'rolls': '101', 'ro': '101',
            'sheet': '101', 'sheets': '101', 'st': '101',
            'bottle': '101', 'bottles': '101', 'bo': '101',
            'tin': '101', 'tins': '101', 'tn': '101',
            'can': '101', 'cans': '101', 'ca': '101',
            'jar': '101', 'jars': '101',
            'set': '101', 'sets': '101',
            'pallet': '101', 'pallets': '101', 'plt': '101',
            'drum': '101', 'drums': '101',
            'barrel': '101', 'barrels': '101',
            'container': '101', 'containers': '101',
            
            // Length/Distance - map to stick (101) for countable lengths
            'mtr': '101', 'mtr2': '101', 'meter': '101', 'meters': '101',
            'metre': '101', 'metres': '101', 'm': '101',
            'yrd': '101', 'yrd2': '101', 'yard': '101', 'yards': '101',
            'ft': '101', 'foot': '101', 'feet': '101',
            'inch': '101', 'inches': '101', 'in': '101',
            'cm': '101', 'centimeter': '101', 'centimeters': '101',
            'mm': '101', 'millimeter': '101', 'millimeters': '101',
            
            // Quantity groupings - map to stick (101) as countable
            'dzn': '101', 'dzn2': '101', 'dz': '101', 'dozen': '101',
            
            // Weight (heavy) - map to kg (103)
            'ton': '103', 'tons': '103', 'tonne': '103', 'tonnes': '103', 'mt': '103',
            
            // Time units - map to minute (105)
            'hour': '105', 'hours': '105', 'hr': '105', 'hrs': '105',
          };
          
          // First check if input matches a mapped value
          if (efrisUnitMap[input]) {
            const mapped = efrisUnitMap[input];
            console.log('[EFRIS] Unit Mapping - Found in map:', mapped);
            return mapped;
          }
          
          // If input is already a 3-digit code (101-199), use it directly
          if (/^\d{3}$/.test(input)) {
            console.log('[EFRIS] Unit Mapping - Already EFRIS code:', input);
            return input;
          }
          
          // If input is a letter code (like 'pp', 'pa', 'ot', etc.), try to map it
          // Many EFRIS codes are 2-letter codes that should be passed through
          // Default to Stick (101) for countable items if we can't determine the unit
          const defaultCode = '101';
          console.log('[EFRIS] Unit Mapping - Using default:', defaultCode);
          return defaultCode;
        };

        const unitOfMeasure = mapToEfrisUnitCode(
          item.product?.unitOfMeasure?.code,
          item.product?.unitOfMeasure?.abbreviation,
          item.product?.unitOfMeasure?.name
        );

        // Check if item has excise duty - use pre-computed data from Product model
        const exciseInfo = itemExciseData[index];
        const hasExcise = exciseInfo.hasExcise;

        const itemData: any = {
          item: item.description,                                    // Product display name
          itemCode: itemCode,                                        // EFRIS registered item code  
          qty: quantity.toString(),                                  // Quantity as string
          unitOfMeasure: unitOfMeasure,                             // Unit code from product
          unitPrice: ((netAmount + taxAmount) / quantity).toFixed(2), // GROSS unit price (tax-inclusive)
          total: (netAmount + taxAmount).toFixed(2),                // GROSS total (tax-inclusive)
          taxRate: item.taxRate ? (parseFloat(item.taxRate.toString()) / 100).toFixed(2) : '0.00', // Tax rate as string
          tax: taxAmount.toFixed(2),                                // Tax amount as string
          orderNumber: index.toString(),                           // Sequential order number starting from 0
          discountFlag: discount > 0 ? "1" : "2",                  // 1=has discount, 2=no discount
          deemedFlag: "2",                                          // 2=not deemed (standard)
          exciseFlag: hasExcise ? "1" : "2",                       // 1=has excise, 2=no excise
          goodsCategoryId: item.product?.goodsCategoryId || item.product?.sku || "", // EFRIS commodity category from DB
          goodsCategoryName: item.product?.category || item.product?.name || "General", // Product category from DB
          vatApplicableFlag: taxAmount > 0 ? "1" : "0",            // 1=VAT applies, 0=no VAT
        };

        // Add discount fields if item has discount
        if (discount > 0) {
          itemData.discountTotal = discount.toFixed(2);
          itemData.discountTaxRate = item.taxRate ? (parseFloat(item.taxRate.toString()) / 100).toFixed(2) : '0.00';
        }

        // Add excise fields from Product model's registered EFRIS data
        if (hasExcise) {
          const exciseRate = exciseInfo.exciseRate;
          const exciseRule = exciseInfo.exciseRule;
          const exciseTax = exciseInfo.exciseTax;

          itemData.categoryId = exciseInfo.exciseDutyCode;          // Excise duty code from DB
          itemData.categoryName = "Excise Duty";                    // Standard excise category name
          itemData.exciseRate = exciseRate.toString();              // Excise rate from DB
          itemData.exciseRule = exciseRule;                         // 1=percentage, 2=quantity from DB
          itemData.exciseTax = exciseTax.toFixed(2);               // Computed excise tax amount
          itemData.exciseUnit = exciseInfo.exciseUnit || unitOfMeasure; // Excise unit from DB
          itemData.exciseCurrency = "UGX";                          // Currency
          itemData.exciseRateName = exciseRule === '1' 
            ? `${(exciseRate * 100).toFixed(1)}%` 
            : `UGX${exciseRate} per unit`;
          
          if (exciseRule === '2') {
            itemData.pack = item.product?.pack?.toString() || '1';
            itemData.stick = item.product?.stick?.toString() || '1';
          }
        }

        return itemData;
      }),
      
      // Compute tax_details and summary together to guarantee consistency
      // EFRIS requires: summary.taxAmount === sum of all taxDetails[].taxAmount
      ...(() => {
        // === TAX DETAILS ===
        const taxDetails: any[] = [];

        // Calculate VAT amounts from items
        const totalVATAmount = invoice.items.reduce((sum, item) => {
          return sum + parseFloat(item.taxAmount?.toString() || '0');
        }, 0);

        // Calculate net amount for VAT (before any taxes)
        const totalVATNetAmount = invoice.items.reduce((sum, item) => {
          const grossTotal = parseFloat(item.total.toString());
          return sum + Math.round((grossTotal / 1.18) * 100) / 100;
        }, 0);

        // VAT category
        if (totalVATAmount > 0) {
          taxDetails.push({
            taxCategoryCode: "01",
            netAmount: totalVATNetAmount.toFixed(2),
            taxRate: "0.18",
            taxAmount: totalVATAmount.toFixed(2),
            grossAmount: (totalVATNetAmount + totalVATAmount).toFixed(2),
            taxRateName: "Standard Rate (18%)"
          });
        }

        // Calculate excise amounts from pre-computed product excise data
        const totalExciseTax = itemExciseData.reduce((sum, excise) => sum + excise.exciseTax, 0);

        // Excise category
        if (totalExciseTax > 0) {
          // For excise: netAmount is base BEFORE excise (not before VAT)
          const exciseNetAmount = invoice.items.reduce((sum, item, idx) => {
            if (itemExciseData[idx].hasExcise) {
              const grossTotal = parseFloat(item.total.toString());
              const baseBeforeVAT = Math.round((grossTotal / 1.18) * 100) / 100;
              // Subtract excise to get base before excise
              return sum + (baseBeforeVAT - itemExciseData[idx].exciseTax);
            }
            return sum;
          }, 0);

          const firstExciseProduct = invoice.items.find((_, idx) => itemExciseData[idx].hasExcise)?.product;

          taxDetails.push({
            taxCategoryCode: "05",
            netAmount: exciseNetAmount.toFixed(2),
            taxRate: "0",
            taxAmount: totalExciseTax.toFixed(2),
            grossAmount: (exciseNetAmount + totalExciseTax).toFixed(2),
            exciseUnit: firstExciseProduct?.exciseUnit || "102",
            exciseCurrency: "UGX",
            taxRateName: "Excise Duty"
          });
        }

        // === SUMMARY ===
        // For items with excise: netAmount must be base BEFORE all taxes (excise + VAT)
        // grossAmount must equal the actual invoice total (not netAmount + taxAmount)
        const summaryNetAmount = invoice.items.reduce((sum, item, idx) => {
          const grossTotal = parseFloat(item.total.toString());
          const baseBeforeVAT = Math.round((grossTotal / 1.18) * 100) / 100;
          // If item has excise, subtract it to get base before ALL taxes
          const exciseTax = itemExciseData[idx].exciseTax;
          return sum + (baseBeforeVAT - exciseTax);
        }, 0);
        const summaryTaxAmount = taxDetails.reduce((sum, td) => sum + parseFloat(td.taxAmount), 0);
        // grossAmount should be the actual invoice total (all items' gross totals)
        const summaryGrossAmount = invoice.items.reduce((sum, item) => {
          return sum + parseFloat(item.total.toString());
        }, 0);

        return {
          tax_details: taxDetails,
          summary: {
            netAmount: Math.round(summaryNetAmount).toString(),        // Whole number per T109 spec
            taxAmount: Math.round(summaryTaxAmount).toString(),        // Whole number per T109 spec
            grossAmount: Math.round(summaryGrossAmount).toString(),    // Whole number per T109 spec
            itemCount: invoice.items.length.toString(),
            modeCode: "0",
            remarks: invoice.notes || "",
            qrCode: ""
          }
        };
      })(),
      
      // Use invoice.total directly - it already includes all taxes (VAT + excise if applicable)
      // Don't recalculate to avoid adding excise twice
      total_amount: parseFloat(invoice.total.toString()),
      total_tax: (() => {
        const vatTax = parseFloat(invoice.taxAmount.toString());
        const totalExcise = itemExciseData.reduce((sum, e) => sum + e.exciseTax, 0);
        return vatTax + totalExcise;
      })(),
      currency: invoice.currency,
      notes: invoice.notes || undefined,
    };

    console.log('[EFRIS] Submitting invoice (T109 format):', JSON.stringify(efrisInvoiceData, null, 2));

    // Submit to EFRIS
    const efrisResponse = await efrisService.submitInvoice(efrisInvoiceData);

    if (!efrisResponse.success) {
      // Update invoice with error
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          eInvoiceStatus: 'REJECTED',
          eInvoiceResponse: efrisResponse as any,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: efrisResponse.message || 'EFRIS submission failed',
          errorCode: efrisResponse.error_code,
        },
        { status: 400 }
      );
    }

    // Update invoice with EFRIS data - extract from fiscal_data object
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        efrisFDN: efrisResponse.fiscal_data?.fdn || efrisResponse.fdn,
        efrisVerificationCode: efrisResponse.fiscal_data?.verification_code || efrisResponse.verification_code,
        efrisQRCode: efrisResponse.fiscal_data?.qr_code || efrisResponse.qr_code,
        eInvoiceStatus: 'ACCEPTED',
        eInvoiceSubmittedAt: new Date(),
        eInvoiceResponse: efrisResponse as any,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice successfully submitted to EFRIS',
      fdn: efrisResponse.fiscal_data?.fdn || efrisResponse.fdn,
      verificationCode: efrisResponse.fiscal_data?.verification_code || efrisResponse.verification_code,
      qrCode: efrisResponse.fiscal_data?.qr_code || efrisResponse.qr_code,
      fiscalizedAt: efrisResponse.fiscalized_at,
      invoiceNumber: invoice.invoiceNumber,
      // Include the full EFRIS response for display purposes
      fullEfrisResponse: efrisResponse,
    });

  } catch (error: any) {
    console.error('EFRIS submission error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to submit invoice to EFRIS',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
