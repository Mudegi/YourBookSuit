import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { Permission } from '@/lib/permissions';
import { z } from 'zod';

const maintenanceWorkOrderSchema = z.object({
  maintenancePlanId: z.string().optional(),
  assetId: z.string().optional(),
  maintenanceType: z.enum(['ROUTINE', 'REPAIR', 'INSPECTION', 'UPGRADE', 'EMERGENCY', 'PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  scheduledDate: z.coerce.date().optional(),
  technicianId: z.string().optional(),
  description: z.string().min(1),
});

// GET /api/[orgSlug]/maintenance/work-orders
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.VIEW_MAINTENANCE);

    const workOrders = await prisma.maintenanceWorkOrder.findMany({
      where: { organizationId: org.id },
      include: {
        maintenancePlan: { select: { id: true, planNumber: true, name: true } },
        asset: { select: { id: true, assetNumber: true, name: true } },
        technician: { select: { id: true, name: true } },
        spareParts: {
          include: {
            sparePart: { select: { partNumber: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const data = workOrders.map((wo) => ({
      id: wo.id,
      workOrderNumber: wo.workOrderNumber,
      maintenancePlanName: wo.maintenancePlan?.name,
      assetName: wo.asset?.name,
      assetNumber: wo.asset?.assetNumber,
      maintenanceType: wo.maintenanceType,
      priority: wo.priority,
      status: wo.status,
      scheduledDate: wo.scheduledDate,
      completedDate: wo.completedDate,
      technicianName: wo.technician?.name,
      description: wo.description,
      resolution: wo.resolution,
      laborHours: wo.laborHours ? Number(wo.laborHours) : null,
      totalCost: wo.totalCost ? Number(wo.totalCost) : null,
      downtimeHours: wo.downtimeHours ? Number(wo.downtimeHours) : null,
      sparePartsUsed: wo.spareParts.length,
      createdAt: wo.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error listing maintenance work orders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch maintenance work orders' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/maintenance/work-orders
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.MANAGE_MAINTENANCE);

    const body = await request.json();
    const parsed = maintenanceWorkOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    // Generate work order number
    const count = await prisma.maintenanceWorkOrder.count({ where: { organizationId: org.id } });
    const workOrderNumber = `MWO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // Validate optional relations
    if (input.assetId) {
      const asset = await prisma.asset.findFirst({
        where: { id: input.assetId, organizationId: org.id },
      });
      if (!asset) {
        return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
      }
    }

    if (input.maintenancePlanId) {
      const plan = await prisma.maintenancePlan.findFirst({
        where: { id: input.maintenancePlanId, organizationId: org.id },
      });
      if (!plan) {
        return NextResponse.json({ success: false, error: 'Maintenance plan not found' }, { status: 404 });
      }
    }

    if (input.technicianId) {
      const technician = await prisma.serviceTechnician.findFirst({
        where: { id: input.technicianId, organizationId: org.id },
      });
      if (!technician) {
        return NextResponse.json({ success: false, error: 'Technician not found' }, { status: 404 });
      }
    }

    const created = await prisma.maintenanceWorkOrder.create({
      data: {
        organizationId: org.id,
        workOrderNumber,
        maintenancePlanId: input.maintenancePlanId,
        assetId: input.assetId,
        maintenanceType: input.maintenanceType,
        priority: input.priority,
        scheduledDate: input.scheduledDate,
        technicianId: input.technicianId,
        description: input.description,
        status: 'SCHEDULED',
      },
    });

    return NextResponse.json({ success: true, data: { id: created.id, workOrderNumber } }, { status: 201 });
  } catch (error) {
    console.error('Error creating maintenance work order:', error);
    return NextResponse.json({ success: false, error: 'Failed to create maintenance work order' }, { status: 500 });
  }
}
