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

    // Fetch EFRIS config and invoice in PARALLEL (independent queries)
    const [efrisConfig, invoice] = await Promise.all([
      prisma.eInvoiceConfig.findUnique({
        where: { organizationId },
      }),
      prisma.invoice.findUnique({
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
      }),
    ]);

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

        // Get unit of measure code - EFRIS T115 unit codes
        // CONFIRMED from EFRIS API — only 9 codes exist:
        //   101 = Stick (countable items: pieces, units, boxes, bags, etc.)
        //   102 = Litre
        //   103 = Kg
        //   104 = User per day of access
        //   105 = Minute
        //   106 = 1000 sticks
        //   107 = 50kgs
        //   108 = - (reserved)
        //   109 = g (gram)
        const mapToEfrisUnitCode = (unitCode?: string, unitAbbr?: string, unitName?: string): string => {
          const input = (unitCode || unitAbbr || unitName || '').toLowerCase().trim();
          
          console.log('[EFRIS] Unit Mapping - Input:', { unitCode, unitAbbr, unitName, input });
          
          const efrisUnitMap: { [key: string]: string } = {
            // === 101: Stick — ALL countable/discrete items ===
            'stick': '101', 'sticks': '101',
            'pcs': '101', 'pc': '101', 'piece': '101', 'pieces': '101', 'pce': '101',
            'unit': '101', 'units': '101', 'ea': '101', 'each': '101', 'pp': '101',
            'item': '101', 'items': '101',
            'pr': '101', 'pair': '101', 'pairs': '101',
            'box': '101', 'boxes': '101', 'bx': '101',
            'bag': '101', 'bags': '101', 'bg': '101',
            'sack': '101', 'sacks': '101', 'sa': '101',
            'carton': '101', 'cartons': '101', 'ct': '101', 'ctn': '101',
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
            'tablet': '101', 'tablets': '101',
            'capsule': '101', 'capsules': '101',
            'tube': '101', 'tubes': '101',
            'ream': '101', 'reams': '101',
            'dzn': '101', 'dz': '101', 'dozen': '101', 'dozens': '101',
            // Length/distance/area/volume items — countable, use Stick
            'mtr': '101', 'meter': '101', 'meters': '101',
            'metre': '101', 'metres': '101', 'm': '101',
            'yrd': '101', 'yard': '101', 'yards': '101', 'yd': '101',
            'ft': '101', 'foot': '101', 'feet': '101',
            'inch': '101', 'inches': '101', 'in': '101',
            'cm': '101', 'centimeter': '101', 'centimeters': '101',
            'mm': '101', 'millimeter': '101', 'millimeters': '101',
            'm2': '101', 'sqm': '101', 'ft2': '101', 'sqft': '101',
            'acre': '101', 'hectare': '101', 'ha': '101',
            'm3': '101', 'cum': '101',
            // Time/service — countable, use Stick
            'hour': '101', 'hours': '101', 'hr': '101', 'hrs': '101',
            'day': '101', 'days': '101',
            
            // === 102: Litre — liquid volumes ===
            'l': '102', 'ltr': '102', 'litre': '102', 'litres': '102',
            'liter': '102', 'liters': '102',
            'gallon': '102', 'gallons': '102', 'gal': '102',
            'pint': '102', 'pints': '102', 'pt': '102',
            'cup': '102', 'cups': '102',
            'ml': '102', 'millilitre': '102', 'millilitres': '102',
            'milliliter': '102', 'milliliters': '102',
            'tbsp': '102', 'tsp': '102',
            
            // === 103: Kg — weight ===
            'kg': '103', 'kgs': '103', 'kilogram': '103', 'kilograms': '103',
            'kgm': '103',
            'ton': '103', 'tons': '103', 'tonne': '103', 'tonnes': '103', 'mt': '103',
            'metric_ton': '103',
            'lb': '103', 'lbs': '103', 'pound': '103', 'pounds': '103',
            'oz': '103', 'ounce': '103', 'ounces': '103',
            
            // === 104: User per day of access (OTT/telecom) ===
            'user': '104', 'users': '104', 'access': '104', 'ott': '104',
            
            // === 105: Minute — time-based ===
            'min': '105', 'minute': '105', 'minutes': '105',
            
            // === 106: 1000 sticks (bulk cigarettes) ===
            'th': '106', 'thousand': '106', 'thousands': '106',
            '1000sticks': '106', '1000stick': '106', 'thousand_sticks': '106',
            
            // === 107: 50kgs (bulk weight) ===
            '50kg': '107', '50kgs': '107', 'fifty_kg': '107',
            
            // === 108: reserved (-) ===
            
            // === 109: g (gram) ===
            'g': '109', 'gram': '109', 'grams': '109', 'grm': '109',
            'mg': '109', 'milligram': '109',
          };
          
          // First check if input matches a mapped value
          if (efrisUnitMap[input]) {
            const mapped = efrisUnitMap[input];
            console.log('[EFRIS] Unit Mapping - Found in map:', mapped);
            return mapped;
          }
          
          // If input is already a 3-digit code (101-109), use it directly
          if (/^\d{3}$/.test(input) && parseInt(input) >= 101 && parseInt(input) <= 109) {
            console.log('[EFRIS] Unit Mapping - Already EFRIS code:', input);
            return input;
          }
          
          // Default to Stick (101) — EFRIS generic countable unit
          const defaultCode = '101';
          console.log('[EFRIS] Unit Mapping - Using default Stick (101) for:', input);
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
          vatApplicableFlag: (item.taxRateConfig?.efrisTaxCategoryCode === "11") ? "0" : "1", // 0 only for VAT out of scope
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
      // Must handle different tax categories: Standard(01), Zero-rated(02), Exempt(03), Deemed(04), Excise(05), etc.
      ...(() => {
        // === TAX DETAILS ===
        const taxDetails: any[] = [];

        // --- Group items by EFRIS VAT tax category ---
        const vatGroups: Record<string, {
          taxCategoryCode: string;
          taxRate: number;
          taxRateName: string;
          netAmount: number;   // Before VAT (but after excise)
          taxAmount: number;   // VAT only
          grossAmount: number; // Full gross
        }> = {};

        const categoryNames: Record<string, string> = {
          '01': 'Standard Rate (18%)',
          '02': 'Zero Rate (0%)',
          '03': 'Exempt',
          '04': 'Deemed (18%)',
          '11': 'VAT out of Scope',
        };

        invoice.items.forEach((item, index) => {
          // Determine EFRIS tax category from TaxRate config, or fall back to rate-based detection
          const efrisTaxCategory = item.taxRateConfig?.efrisTaxCategoryCode ||
            (parseFloat(item.taxRate?.toString() || '0') > 0 ? '01' : '02');

          const itemTaxRateDecimal = parseFloat(item.taxRate?.toString() || '0') / 100;
          const grossTotal = parseFloat(item.total.toString());
          const taxAmount = parseFloat(item.taxAmount?.toString() || '0');

          // netAmount for VAT = grossTotal minus VAT
          // This correctly includes excise (excise is part of the VAT base)
          const netBeforeVAT = grossTotal - taxAmount;

          if (!vatGroups[efrisTaxCategory]) {
            vatGroups[efrisTaxCategory] = {
              taxCategoryCode: efrisTaxCategory,
              taxRate: itemTaxRateDecimal,
              taxRateName: categoryNames[efrisTaxCategory] || `Tax Category ${efrisTaxCategory}`,
              netAmount: 0,
              taxAmount: 0,
              grossAmount: 0,
            };
          }

          vatGroups[efrisTaxCategory].netAmount += netBeforeVAT;
          vatGroups[efrisTaxCategory].taxAmount += taxAmount;
          vatGroups[efrisTaxCategory].grossAmount += grossTotal;
        });

        // Add a tax_details entry for each VAT category group
        for (const group of Object.values(vatGroups)) {
          taxDetails.push({
            taxCategoryCode: group.taxCategoryCode,
            netAmount: group.netAmount.toFixed(2),
            taxRate: group.taxRate.toFixed(2),
            taxAmount: group.taxAmount.toFixed(2),
            grossAmount: group.grossAmount.toFixed(2),
            exciseUnit: "",
            exciseCurrency: "UGX",
            taxRateName: group.taxRateName,
          });
        }

        // --- Excise category (05) ---
        const totalExciseTax = itemExciseData.reduce((sum, excise) => sum + excise.exciseTax, 0);

        if (totalExciseTax > 0) {
          // For excise: netAmount is base BEFORE excise (not before VAT)
          const exciseNetAmount = invoice.items.reduce((sum, item, idx) => {
            if (itemExciseData[idx].hasExcise) {
              const grossTotal = parseFloat(item.total.toString());
              const taxAmount = parseFloat(item.taxAmount?.toString() || '0');
              const netBeforeVAT = grossTotal - taxAmount;
              // Subtract excise to get base before excise
              return sum + (netBeforeVAT - itemExciseData[idx].exciseTax);
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
        // grossAmount = actual invoice total
        const summaryGrossAmount = invoice.items.reduce((sum, item) => {
          return sum + parseFloat(item.total.toString());
        }, 0);
        // taxAmount = sum of ALL tax_details entries (VAT + excise)
        const summaryTaxAmount = taxDetails.reduce((sum, td) => sum + parseFloat(td.taxAmount), 0);
        // netAmount = grossAmount minus ALL taxes (base before any tax)
        const summaryNetAmount = summaryGrossAmount - summaryTaxAmount;

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
