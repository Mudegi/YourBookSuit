import { NextRequest, NextResponse } from 'next/server';
import { SafetyStockService, SafetyStockCalculationParams } from '@/services/planning/safety-stock.service';
import { LocalizationService } from '@/services/planning/localization.service';
import { SafetyStockMethod } from '@prisma/client';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { valid, userId, organizationId, role, error } = await verifyAuth(request);
    const { searchParams } = new URL(request.url);
    
    const orgId = searchParams.get('orgId');
    const productId = searchParams.get('productId');
    const warehouseId = searchParams.get('warehouseId');
    const method = searchParams.get('method') as SafetyStockMethod;
    const serviceLevel = searchParams.get('serviceLevel');
    const leadTimeDays = searchParams.get('leadTimeDays');
    // Note: country will be determined from organization settings

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Get organization ID - handle both direct ID and slug
    let organization;
    try {
      organization = await prisma.organization.findFirst({
        where: {
          OR: [
            { id: orgId },
            { slug: orgId }
          ]
        },
        select: { id: true, homeCountry: true, baseCurrency: true }
      });
    } catch (error) {
      console.error('Error finding organization:', error);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const actualOrgId = organization.id;

    // Get regional risk multiplier using organization's home country
    const localizationService = new LocalizationService();
    const regionalRiskMultiplier = localizationService.getRegionalRiskMultiplier(organization.homeCountry || 'US');

    const params: SafetyStockCalculationParams = {
      productId,
      warehouseId: warehouseId || undefined,
      serviceLevel: serviceLevel ? parseInt(serviceLevel) : undefined,
      leadTimeDays: leadTimeDays ? parseInt(leadTimeDays) : undefined,
      regionalRiskMultiplier,
      organizationId: actualOrgId,
    };

    const safetyStockService = new SafetyStockService();

    if (method) {
      // Calculate for specific method
      const result = await safetyStockService.calculateSafetyStock(method, params);
      return NextResponse.json({ result });
    } else {
      // Calculate for all methods
      const results = await safetyStockService.calculateAllMethods(params);
      const availableMethods = safetyStockService.getAvailableMethods();
      
      return NextResponse.json({ 
        results, 
        availableMethods,
        regionalRiskMultiplier 
      });
    }
  } catch (error) {
    console.error('Error in safety stock calculation API:', error);
    return NextResponse.json(
      { error: 'Failed to calculate safety stock' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { valid, userId, organizationId: authOrgId, role, error } = await verifyAuth(request);
    const body = await request.json();
    
    const {
      productId,
      warehouseId,
      organizationId,
      safetyStockQty,
      calculationMethod,
      serviceLevel,
      leadTimeDays,
      reviewPeriodDays,
      effectiveFrom,
      effectiveTo,
      notes
    } = body;

    if (!productId || !organizationId || safetyStockQty === undefined) {
      return NextResponse.json(
        { error: 'Product ID, Organization ID, and safety stock quantity are required' },
        { status: 400 }
      );
    }

    // Deactivate existing safety stock records
    await prisma.safetyStock.updateMany({
      where: {
        productId,
        warehouseId: warehouseId || null,
        organizationId,
        isActive: true,
      },
      data: { isActive: false },
    });

    // Create new safety stock record
    const safetyStock = await prisma.safetyStock.create({
      data: {
        productId,
        warehouseId: warehouseId || null,
        organizationId,
        safetyStockQty,
        calculationMethod: calculationMethod || SafetyStockMethod.FIXED,
        serviceLevel,
        leadTimeDays,
        reviewPeriodDays,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        notes,
        isActive: true,
      },
      include: {
        product: true,
        warehouse: true
      }
    });

    return NextResponse.json({ safetyStock });
  } catch (error) {
    console.error('Error creating safety stock record:', error);
    return NextResponse.json(
      { error: 'Failed to create safety stock record' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { valid, userId, organizationId: authOrgId, role, error } = await verifyAuth(request);
    const body = await request.json();
    
    const {
      id,
      safetyStockQty,
      calculationMethod,
      serviceLevel,
      leadTimeDays,
      reviewPeriodDays,
      effectiveTo,
      notes,
      isActive
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Safety stock ID is required' }, { status: 400 });
    }

    const updatedSafetyStock = await prisma.safetyStock.update({
      where: { id },
      data: {
        safetyStockQty,
        calculationMethod,
        serviceLevel,
        leadTimeDays,
        reviewPeriodDays,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        notes,
        isActive,
        updatedAt: new Date(),
      },
      include: {
        product: true,
        warehouse: true
      }
    });

    return NextResponse.json({ safetyStock: updatedSafetyStock });
  } catch (error) {
    console.error('Error updating safety stock record:', error);
    return NextResponse.json(
      { error: 'Failed to update safety stock record' },
      { status: 500 }
    );
  }
}