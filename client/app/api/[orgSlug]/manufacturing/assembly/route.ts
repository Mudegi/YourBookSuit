/**
 * POST /api/[orgSlug]/manufacturing/assembly
 * GET /api/[orgSlug]/manufacturing/assembly
 * 
 * Assembly Transaction Management
 * - POST: Execute a product assembly build
 * - GET: Retrieve assembly transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildProduct, listAssemblyTransactions, getAssemblyDetails } from '@/services/manufacturing/assembly.service';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const BuildProductSchema = z.object({
  bomId: z.string().cuid('Invalid BOM ID'),
  finishedProductId: z.string().cuid('Invalid product ID'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  assemblyDate: z.string().datetime().optional(),
  laborCost: z.number().nonnegative().optional(),
  overheadCost: z.number().nonnegative().optional(),
  wastageQuantity: z.number().nonnegative().optional(),
  wastageReasons: z.array(z.string()).optional(),
  wastageDescription: z.string().optional(),
  notes: z.string().optional(),
  attachments: z.array(z.string().url()).optional(),
});

// ============================================================================
// POST HANDLER - BUILD PRODUCT
// ============================================================================

async function handlePostBuildProduct(
  request: NextRequest,
  params: { orgSlug: string }
) {
  try {
    // Parse request body
    let payload;
    try {
      payload = await request.json();
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate payload
    const validationResult = BuildProductSchema.safeParse(payload);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Get organization by slug
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Services module should work for every package - remove package tier restriction
    // await ensurePackageAccess(org.id, [PackageTier.ADVANCED]);

    // Get current user (in real app, from session/auth)
    // For now, using a placeholder
    const userId = request.headers.get('x-user-id') || 'system';

    // Execute build product
    const result = await buildProduct(
      {
        organizationId: org.id,
        bomId: data.bomId,
        finishedProductId: data.finishedProductId,
        quantity: data.quantity,
        assemblyDate: data.assemblyDate ? new Date(data.assemblyDate) : undefined,
        laborCost: data.laborCost,
        overheadCost: data.overheadCost,
        wastageQuantity: data.wastageQuantity,
        wastageReasons: data.wastageReasons,
        wastageDescription: data.wastageDescription,
        notes: data.notes,
        attachments: data.attachments,
      },
      userId
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    // Handle specific error types
    if (error?.statusCode === 403) {
      return NextResponse.json(
        { error: 'Upgrade to YourBooks Advanced to run manufacturing assemblies' },
        { status: 403 }
      );
    }

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    if (error.message.includes('Insufficient') || error.message.includes('does not balance')) {
      return NextResponse.json(
        { error: error.message },
        { status: 422 } // Unprocessable Entity
      );
    }

    console.error('Assembly build error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create assembly transaction',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET HANDLER - LIST & RETRIEVE
// ============================================================================

async function handleGetAssemblies(
  request: NextRequest,
  params: { orgSlug: string }
) {
  try {
    // Get organization
    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Services module should work for every package - remove package tier restriction
    // await ensurePackageAccess(org.id, [PackageTier.ADVANCED]);

    // Parse query parameters
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // If specific ID requested, return single transaction
    if (id) {
      const assembly = await getAssemblyDetails(id, org.id);
      if (!assembly) {
        return NextResponse.json(
          { error: 'Assembly not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(assembly);
    }

    // List assemblies
    const assemblies = await listAssemblyTransactions(org.id, {
      status: status || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: Math.min(limit, 100), // Cap at 100
      offset,
    });

    // Get total count
    const total = await prisma.assemblyTransaction.count({
      where: { organizationId: org.id },
    });

    return NextResponse.json(
      {
        data: assemblies,
        pagination: {
          total,
          limit,
          offset,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error?.statusCode === 403) {
      return NextResponse.json(
        { error: 'Upgrade to YourBooks Advanced to view manufacturing assemblies' },
        { status: 403 }
      );
    }

    console.error('Assembly list error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve assemblies' },
      { status: 500 }
    );
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  return handlePostBuildProduct(request, params);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  return handleGetAssemblies(request, params);
}
