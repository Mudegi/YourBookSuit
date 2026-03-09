import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import { Permission } from '@/lib/permissions';
import { WarehouseService } from '@/services/warehouse/warehouse.service';

const warehouseSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: z.enum([
    'GENERAL', 'MANUFACTURING', 'RECEIVING', 'SHIPPING',
    'QA_HOLD', 'THIRD_PARTY', 'TRANSIT', 'DAMAGED', 'QUARANTINE',
  ]).default('GENERAL'),
  isDefault: z.boolean().default(false),
  branchId: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  managerId: z.string().optional(),
  capacityVolume: z.number().optional(),
  capacityWeight: z.number().optional(),
});

// GET /api/[orgSlug]/warehouse/warehouses
export async function GET(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.VIEW_WAREHOUSE);

    const url = new URL(req.url);
    const branchId = url.searchParams.get('branchId') || undefined;
    const type = url.searchParams.get('type') as any || undefined;
    const search = url.searchParams.get('search') || undefined;
    const isActive = url.searchParams.get('isActive');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const result = await WarehouseService.list({
      organizationId: org.id,
      branchId,
      type,
      isActive: isActive !== null ? isActive === 'true' : undefined,
      search,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error listing warehouses:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch warehouses' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/warehouse/warehouses
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.MANAGE_WAREHOUSE);
    const body = await request.json();
    const parsed = warehouseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    const warehouse = await WarehouseService.create({
      organizationId: org.id,
      ...input,
    });

    return NextResponse.json({ success: true, data: warehouse }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating warehouse:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Warehouse code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create warehouse' },
      { status: 500 }
    );
  }
}
