import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { EfrisApiService } from '@/lib/services/efris/efris-api.service';

/**
 * POST /api/orgs/[orgSlug]/products/[id]/efris
 * Register a product with EFRIS
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);
    const productId = params.id;

    // Fetch product and EFRIS config in PARALLEL (independent queries)
    const [product, efrisConfig] = await Promise.all([
      prisma.product.findFirst({
        where: {
          id: productId,
          organizationId,
        },
        include: {
          unitOfMeasure: true,
        },
      }),
      prisma.eInvoiceConfig.findUnique({
        where: { organizationId },
      }),
    ]);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if product is already registered
    if (product.efrisProductCode) {
      return NextResponse.json(
        { 
          error: 'Product is already registered with EFRIS',
          productCode: product.efrisProductCode,
        },
        { status: 400 }
      );
    }

    if (!efrisConfig || !efrisConfig.isActive) {
      return NextResponse.json(
        { error: 'EFRIS is not enabled for this organization' },
        { status: 400 }
      );
    }

    // Get API credentials from config
    const credentials = efrisConfig.credentials as any;
    const efrisApiKey = credentials?.efrisApiKey || process.env.EFRIS_API_KEY;
    
    if (!efrisApiKey || !efrisConfig.apiEndpoint) {
      return NextResponse.json(
        { error: 'EFRIS API credentials are not configured' },
        { status: 400 }
      );
    }

    // Initialize EFRIS service
    const efrisService = new EfrisApiService({
      apiBaseUrl: efrisConfig.apiEndpoint,
      apiKey: efrisApiKey,
      enabled: efrisConfig.isActive,
      testMode: efrisConfig.testMode,
    });

    // Prepare product data for EFRIS (matching API spec)
    // Field mapping logic:
    // - commodity_code = SKU (product code/category)
    // - item_code = Description (if not empty), else Name (fallback)
    const itemCode = (product.description && product.description.trim()) 
      ? product.description.trim() 
      : product.name;

    // Check for duplicate item_code in EFRIS
    // An item_code is used by another product if:
    // 1. Another product has the same description (when description is not empty), OR
    // 2. Another product has the same name (when their description is empty)
    const duplicateProducts = await prisma.product.findMany({
      where: {
        organizationId,
        id: { not: productId },
        OR: [
          // Match products where description matches our itemCode
          {
            description: {
              not: null,
              not: '',
            },
            description: itemCode,
          },
          // Match products where name matches our itemCode and they have no description
          {
            name: itemCode,
            OR: [
              { description: null },
              { description: '' },
            ],
          },
        ],
      },
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
      },
    });

    if (duplicateProducts.length > 0) {
      const duplicate = duplicateProducts[0];
      return NextResponse.json(
        { 
          error: `EFRIS item code "${itemCode}" is already in use by another product: ${duplicate.name} (SKU: ${duplicate.sku}). Each product must have a unique item code for EFRIS registration.`,
        },
        { status: 400 }
      );
    }

    // Map user-friendly unit codes to EFRIS T115 unit of measure codes
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
        // Length/distance items — countable units, use Stick
        'mtr': '101', 'meter': '101', 'meters': '101',
        'metre': '101', 'metres': '101', 'm': '101',
        'yrd': '101', 'yard': '101', 'yards': '101', 'yd': '101',
        'ft': '101', 'foot': '101', 'feet': '101',
        'inch': '101', 'inches': '101', 'in': '101',
        'cm': '101', 'centimeter': '101', 'centimeters': '101',
        'mm': '101', 'millimeter': '101', 'millimeters': '101',
        // Area/volume — countable, use Stick
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

    const efrisUnitCode = mapToEfrisUnitCode(
        product.unitOfMeasure?.code, 
        product.unitOfMeasure?.abbreviation,
        product.unitOfMeasure?.name
      );

    const hasExcise = !!product.exciseDutyCode;

    // Build payload matching the ORIGINAL working format
    // The middleware handles T130-level details (currency, pieceUnit, etc.) internally
    const efrisProductData: Record<string, any> = {
      item_code: itemCode,
      item_name: product.name,
      unit_price: product.purchasePrice ? product.purchasePrice.toString() : "0",
      commodity_code: product.sku,
      unit_of_measure: efrisUnitCode,
      have_excise_tax: hasExcise ? "101" : "102",
      description: product.description || undefined,
      stock_quantity: product.reorderLevel ? product.reorderLevel.toString() : undefined,
    };

    // Excise-only field — only include when have_excise_tax = "101"
    if (hasExcise) {
      efrisProductData.excise_duty_code = product.exciseDutyCode;
    }
    
    console.log('[EFRIS] Product data being sent:', JSON.stringify(efrisProductData, null, 2));

    // Validate required fields (unit_price is a string, parse it for validation)
    if (!efrisProductData.commodity_code || !efrisProductData.item_code || !efrisProductData.item_name || !efrisProductData.unit_price || parseFloat(efrisProductData.unit_price) <= 0) {
      return NextResponse.json(
        { 
          error: 'Product must have SKU (commodity code), name, and a valid purchase price (cost price) to register with EFRIS',
        },
        { status: 400 }
      );
    }

    // Validate excise duty configuration
    if (efrisProductData.have_excise_tax === "101" && !efrisProductData.excise_duty_code) {
      return NextResponse.json(
        { 
          error: 'Excise duty code is required when product is subject to excise duty',
        },
        { status: 400 }
      );
    }

    console.log('[EFRIS] Registering product:', {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      data: efrisProductData,
    });

    // Register with EFRIS
    const result = await efrisService.registerProduct(efrisProductData);

    if (!result.success) {
      console.error('[EFRIS] Registration failed:', result);
      return NextResponse.json(
        { 
          error: result.message || 'EFRIS registration failed',
          errorCode: result.error_code,
        },
        { status: 400 }
      );
    }

    // Update product with EFRIS product code and item code
    // Run DB writes in parallel where possible for speed
    const stockQty = efrisProductData.stock_quantity ? parseFloat(efrisProductData.stock_quantity) : 0;
    const now = new Date();

    const dbWrites: Promise<any>[] = [
      // Always: update product with EFRIS codes
      prisma.product.update({
        where: { id: product.id },
        data: {
          efrisProductCode: result.product_code,
          efrisItemCode: itemCode,
          goodsCategoryId: efrisProductData.commodity_code,
          efrisRegisteredAt: now,
        },
      }),
    ];

    // Conditionally: update inventory + create stock movement
    if (product.trackInventory && stockQty > 0) {
      dbWrites.push(
        (async () => {
          const inventoryItem = await prisma.inventoryItem.findFirst({
            where: { productId: product.id },
          });

          const inventoryData = {
            quantityOnHand: stockQty,
            quantityAvailable: stockQty,
            averageCost: product.purchasePrice || 0,
            totalValue: stockQty * Number(product.purchasePrice || 0),
          };

          const inventoryPromise = inventoryItem
            ? prisma.inventoryItem.update({ where: { id: inventoryItem.id }, data: inventoryData })
            : prisma.inventoryItem.create({
                data: { productId: product.id, warehouseLocation: 'Main', quantityReserved: 0, ...inventoryData },
              });

          const movementPromise = prisma.stockMovement.create({
            data: {
              productId: product.id,
              movementType: 'ADJUSTMENT',
              quantity: stockQty,
              unitCost: product.purchasePrice || 0,
              totalCost: stockQty * Number(product.purchasePrice || 0),
              referenceType: 'EFRIS_REGISTRATION',
              referenceId: result.product_code,
              notes: `Initial stock registered with EFRIS (Product Code: ${result.product_code})`,
              movementDate: now,
            },
          });

          return Promise.all([inventoryPromise, movementPromise]);
        })()
      );
    }

    const [updatedProduct] = await Promise.all(dbWrites);

    console.log('[EFRIS] Product registered successfully:', {
      productId: product.id,
      efrisProductCode: result.product_code,
      efrisStatus: result.efris_status,
      stockQuantity: stockQty,
    });

    return NextResponse.json({
      success: true,
      message: result.message || 'Product registered with EFRIS successfully',
      productCode: result.product_code,
      efrisStatus: result.efris_status,
      product: updatedProduct,
      stockQuantity: stockQty,
    });
  } catch (error: any) {
    console.error('Error registering product with EFRIS:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register product with EFRIS' },
      { status: 500 }
    );
  }
}
