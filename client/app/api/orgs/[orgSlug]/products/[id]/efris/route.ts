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

    // Fetch the product
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        organizationId,
      },
      include: {
        unitOfMeasure: true,
      },
    });

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

    // Get EFRIS configuration
    const efrisConfig = await prisma.eInvoiceConfig.findUnique({
      where: { organizationId },
    });

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

    // Map user-friendly unit codes to EFRIS codes
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
    const updatedProduct = await prisma.product.update({
      where: { id: product.id },
      data: {
        efrisProductCode: result.product_code,
        efrisItemCode: itemCode,  // Store the item code used for registration
        goodsCategoryId: efrisProductData.commodity_code, // Store the commodity code (SKU) used during registration
        efrisRegisteredAt: new Date(), // Current timestamp since API doesn't return registration_date
      },
    });

    // If stock_quantity was sent to EFRIS and product tracks inventory, update local inventory
    const stockQty = efrisProductData.stock_quantity ? parseFloat(efrisProductData.stock_quantity) : 0;
    if (product.trackInventory && stockQty > 0) {
      // Find or create inventory item
      let inventoryItem = await prisma.inventoryItem.findFirst({
        where: { productId: product.id },
      });

      if (inventoryItem) {
        // Update existing inventory item
        await prisma.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: {
            quantityOnHand: stockQty,
            quantityAvailable: stockQty,
            averageCost: product.purchasePrice || 0,
            totalValue: stockQty * Number(product.purchasePrice || 0),
          },
        });
      } else {
        // Create inventory item if it doesn't exist
        await prisma.inventoryItem.create({
          data: {
            productId: product.id,
            warehouseLocation: 'Main',
            quantityOnHand: stockQty,
            quantityReserved: 0,
            quantityAvailable: stockQty,
            averageCost: product.purchasePrice || 0,
            totalValue: stockQty * Number(product.purchasePrice || 0),
          },
        });
      }

      // Create stock movement record to document the initial stock from EFRIS registration
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          movementType: 'ADJUSTMENT',
          quantity: stockQty,
          unitCost: product.purchasePrice || 0,
          totalCost: stockQty * Number(product.purchasePrice || 0),
          referenceType: 'EFRIS_REGISTRATION',
          referenceId: result.product_code,
          notes: `Initial stock quantity registered with EFRIS (Product Code: ${result.product_code})`,
          movementDate: new Date(),
        },
      });

      console.log('[EFRIS] Inventory updated with stock quantity:', stockQty);
    }

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
