import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import { Permission } from '@/lib/permissions';
import { WarehouseService } from '@/services/warehouse/warehouse.service';

const transferSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  fromWarehouseId: z.string().min(1, 'Source warehouse is required'),
  toWarehouseId: z.string().min(1, 'Destination warehouse is required'),
  quantity: z.number().positive('Quantity must be positive'),
  notes: z.string().optional(),
  referenceNumber: z.string().optional(),
});

// POST /api/[orgSlug]/warehouse/transfers
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.MANAGE_WAREHOUSE);

    const body = await request.json();
    const parsed = transferSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const result = await WarehouseService.warehouseTransfer({
      organizationId: org.id,
      ...parsed.data,
      performedById: user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        transferGroupId: result.transferGroupId,
        isCrossBranch: result.isCrossBranch,
        fromWarehouse: result.fromWarehouse,
        toWarehouse: result.toWarehouse,
        product: result.product,
        quantity: result.quantity,
        totalValue: result.totalValue,
      },
    });
  } catch (error: any) {
    console.error('Error creating warehouse transfer:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create transfer' },
      { status: 500 }
    );
  }
}
