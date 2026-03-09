import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';
import { StockMovementService } from '@/services/inventory/stock-movement.service';

/* ─────────── Schemas ─────────── */

const movementCreateSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  movementType: z.enum(['PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'WRITE_OFF']),
  quantity: z.number().refine((q) => q !== 0, 'Quantity cannot be zero'),
  unitCost: z.number().min(0).optional(),
  warehouseLocation: z.string().default('Main'),
  branchId: z.string().optional(),
  warehouseId: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  movementDate: z.coerce.date().optional(),
});

const transferSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive('Quantity must be positive'),
  fromBranchId: z.string().min(1),
  toBranchId: z.string().min(1),
  fromWarehouseLocation: z.string().optional(),
  toWarehouseLocation: z.string().optional(),
  notes: z.string().optional(),
});

/* ─────────── GET ─────────── */

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);
    const { searchParams } = new URL(request.url);

    const filters = {
      organizationId,
      productId: searchParams.get('productId') || undefined,
      branchId: searchParams.get('branchId') || undefined,
      warehouseId: searchParams.get('warehouseId') || undefined,
      movementType: (searchParams.get('movementType') as any) || undefined,
      performedById: searchParams.get('performedById') || undefined,
      referenceType: searchParams.get('referenceType') || undefined,
      search: searchParams.get('search') || undefined,
      startDate: searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined,
      endDate: searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')! + 'T23:59:59.999Z')
        : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
    };

    // ── Stock Card mode: single product history ──
    if (searchParams.get('mode') === 'stock-card' && filters.productId) {
      const stockCard = await StockMovementService.getStockCard(
        organizationId,
        filters.productId,
        {
          branchId: filters.branchId,
          startDate: filters.startDate,
          endDate: filters.endDate,
        }
      );
      return NextResponse.json({ success: true, ...stockCard });
    }

    // ── Stats mode: KPI summary ──
    if (searchParams.get('mode') === 'stats') {
      const stats = await StockMovementService.getMovementStats(
        organizationId,
        filters.startDate,
        filters.endDate,
        filters.branchId
      );
      return NextResponse.json({ success: true, stats });
    }

    // ── Default: paginated movement list ──
    const result = await StockMovementService.getMovements(filters);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error fetching stock movements:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch movements' },
      { status: error.status || 500 }
    );
  }
}

/* ─────────── POST ─────────── */

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId, userId } = await requireAuth(params.orgSlug);
    const body = await request.json();

    // ── Transfer mode ──
    if (body.action === 'transfer') {
      const parsed = transferSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const result = await StockMovementService.transferStock({
        organizationId,
        ...parsed.data,
        performedById: userId,
      });
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    // ── Standard movement ──
    const parsed = movementCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await StockMovementService.recordMovement({
      organizationId,
      ...parsed.data,
      performedById: userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.movement.id,
          balanceAfter: result.balanceAfter,
          costOfGoodsSold: result.costOfGoodsSold,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating stock movement:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create movement' },
      { status: error.status || 500 }
    );
  }
}
