import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { Permission } from '@/lib/permissions';
import { z } from 'zod';

const serviceWorkOrderSchema = z.object({
  customerId: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  serviceLocation: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  scheduledStart: z.coerce.date().optional(),
  scheduledEnd: z.coerce.date().optional(),
  technicianId: z.string().optional(),
  description: z.string().min(1),
  slaId: z.string().optional(),
});

// GET /api/[orgSlug]/field-service/work-orders
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.VIEW_SERVICE_ORDERS);

    const workOrders = await prisma.serviceWorkOrder.findMany({
      where: { organizationId: org.id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        technician: { select: { id: true, name: true, email: true } },
        sla: { select: { id: true, name: true, responseTime: true, resolutionTime: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const data = workOrders.map((wo) => ({
      id: wo.id,
      workOrderNumber: wo.workOrderNumber,
      customerId: wo.customerId,
      customerName: wo.customer?.companyName || `${wo.customer?.firstName} ${wo.customer?.lastName}` || wo.contactName,
      contactPhone: wo.contactPhone,
      serviceLocation: wo.serviceLocation,
      priority: wo.priority,
      status: wo.status,
      scheduledStart: wo.scheduledStart,
      scheduledEnd: wo.scheduledEnd,
      actualStart: wo.actualStart,
      actualEnd: wo.actualEnd,
      technicianName: wo.technician?.name,
      description: wo.description,
      resolution: wo.resolution,
      laborHours: wo.laborHours ? Number(wo.laborHours) : null,
      totalCost: wo.totalCost ? Number(wo.totalCost) : null,
      slaName: wo.sla?.name,
      slaCompliant: wo.slaCompliant,
      createdAt: wo.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error listing service work orders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch service work orders' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/field-service/work-orders
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.MANAGE_SERVICE_ORDERS);

    const body = await request.json();
    const parsed = serviceWorkOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    // Generate work order number
    const count = await prisma.serviceWorkOrder.count({ where: { organizationId: org.id } });
    const workOrderNumber = `SWO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // Validate optional relations
    if (input.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: input.customerId, organizationId: org.id },
      });
      if (!customer) {
        return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
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

    const created = await prisma.serviceWorkOrder.create({
      data: {
        organizationId: org.id,
        workOrderNumber,
        customerId: input.customerId,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        serviceLocation: input.serviceLocation,
        priority: input.priority,
        scheduledStart: input.scheduledStart,
        scheduledEnd: input.scheduledEnd,
        technicianId: input.technicianId,
        description: input.description,
        slaId: input.slaId,
        status: 'SCHEDULED',
      },
    });

    return NextResponse.json({ success: true, data: { id: created.id, workOrderNumber } }, { status: 201 });
  } catch (error) {
    console.error('Error creating service work order:', error);
    return NextResponse.json({ success: false, error: 'Failed to create service work order' }, { status: 500 });
  }
}
